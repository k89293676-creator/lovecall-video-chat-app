import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useLocation } from 'wouter';
import { useRoomStore } from '@/store/room-store';
import { usePeer } from '@/hooks/use-peer';
import { Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, Copy, Check, Camera, Maximize, Minimize, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Toolbox } from '@/components/Toolbox';
import { CanvasOverlay } from '@/components/CanvasOverlay';
import { ModeParticles } from '@/components/ModeParticles';
import { PrivacyMode } from '@/components/PrivacyMode';
import { RippleCanvas } from '@/components/RippleCanvas';
import { AchievementToast } from '@/components/AchievementToast';
import { EmojiReactions } from '@/components/EmojiReactions';
import { MediaPermissionGate } from '@/components/MediaPermissionGate';
import { ChatPanel } from '@/components/ChatPanel';
import { GestureLayer } from '@/components/GestureLayer';
import { ARFaceOverlay, spawnHearts, spawnParticles, spawnStars } from '@/components/ARFaceOverlay';
import { GestureIndicator } from '@/components/GestureIndicator';
import { ARStatusBadge } from '@/components/ARStatusBadge';
import { ARFilterCarousel } from '@/components/ARFilterCarousel';
import { buildFilterStyle } from '@/components/VideoFilter';
import { getModeConfig } from '@/lib/modes';
import { checkAndUnlock } from '@/lib/achievements';
import { useAR } from '@/hooks/use-ar';
import type { GestureName } from '@/hooks/use-gestures';
import type { AcquiredMedia } from '@/lib/media-permissions';

interface FloatingReaction { id: string; emoji: string; x: number; }

const QUALITY_CONFIG = {
  excellent: { color: 'text-emerald-400', bg: 'bg-emerald-400', label: 'Excellent', dot: 'bg-emerald-400' },
  good:      { color: 'text-green-400',   bg: 'bg-green-400',   label: 'Good',      dot: 'bg-green-400' },
  fair:      { color: 'text-yellow-400',  bg: 'bg-yellow-400',  label: 'Fair',      dot: 'bg-yellow-400' },
  poor:      { color: 'text-red-400',     bg: 'bg-red-400',     label: 'Poor',      dot: 'bg-red-400' },
  unknown:   { color: 'text-white/30',    bg: 'bg-white/30',    label: '',          dot: 'bg-white/30' },
};

export default function Room() {
  const { id } = useParams<{ id: string }>();
  const [_, setLocation] = useLocation();
  const store = useRoomStore();
  const [mediaReady, setMediaReady] = useState(!!store.localStream);
  const [copied, setCopied] = useState(false);
  const [pendingAchievement, setPendingAchievement] = useState<{ title: string; emoji: string; description?: string } | null>(null);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [captureFlash, setCaptureFlash] = useState(false);
  const [showVibes, setShowVibes] = useState(false);
  const rootRef       = useRef<HTMLDivElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const { sendMessage, sendTyping } = usePeer(mediaReady ? id : null);
  const [lastARGesture, setLastARGesture] = useState<GestureName>('none');

  const floatEmoji = useCallback((emoji: string) => {
    const rid = `${Date.now()}-${Math.random()}`;
    setFloatingReactions(f => [...f, { id: rid, emoji, x: 40 + Math.random() * 20 }]);
    setTimeout(() => setFloatingReactions(f => f.filter(r => r.id !== rid)), 3000);
  }, []);

  const toggleEffectTimed = useCallback((effectId: string, duration: number) => {
    const s = useRoomStore.getState();
    if (!s.activeEffects.includes(effectId)) s.toggleEffect(effectId);
    setTimeout(() => {
      if (useRoomStore.getState().activeEffects.includes(effectId))
        useRoomStore.getState().toggleEffect(effectId);
    }, duration);
  }, []);

  const handleARGesture = useCallback((gesture: GestureName) => {
    setLastARGesture(gesture);
    setTimeout(() => setLastARGesture('none'), 2000);
    const state = useRoomStore.getState();
    const cx = window.innerWidth * 0.75;
    const cy = window.innerHeight * 0.6;

    switch (gesture) {
      case 'open_palm':    toggleEffectTimed('ar_particles', 5000); break;
      case 'pinch':        state.toggleEffect('filter_blindfold'); break;
      case 'peace': {
        const emoji = ['❤️','💕','💗'][Math.floor(Math.random()*3)];
        floatEmoji(emoji); spawnHearts(cx, cy, 8);
        sendMessage?.({ type: 'reaction', emoji }); break;
      }
      case 'thumbs_up':
        floatEmoji('👍'); sendMessage?.({ type: 'reaction', emoji: '👍' }); break;
      case 'thumbs_down':
        state.toggleEffect('filter_contrast_boost'); floatEmoji('👎'); break;
      case 'fist':
        state.toggleEffect('privacy'); floatEmoji('✊'); break;
      case 'ok_sign':
        state.toggleEffect('filter_blur'); floatEmoji('👌'); break;
      case 'rock_on':
        toggleEffectTimed('ar_rock', 6000);
        for (let i=0;i<3;i++) setTimeout(()=>spawnStars(cx+(Math.random()-0.5)*200, cy+(Math.random()-0.5)*200, 6), i*300);
        floatEmoji('🤘'); sendMessage?.({ type: 'reaction', emoji: '🤘' }); break;
      case 'call_me':
        floatEmoji('🤙'); sendMessage?.({ type: 'reaction', emoji: '🤙' }); break;
      case 'spider_man':
        toggleEffectTimed('ar_particles', 4000);
        for (let i=0;i<5;i++) setTimeout(()=>spawnParticles(cx+(Math.random()-0.5)*300, cy+(Math.random()-0.5)*300, 8, 0), i*200);
        floatEmoji('🕷️'); break;
      case 'l_shape':      state.toggleEffect('ar_head_indicator'); floatEmoji('🫵'); break;
      case 'heart_hand':
        spawnHearts(cx, cy-100, 12); spawnHearts(cx+50, cy, 8);
        floatEmoji('🫶'); sendMessage?.({ type: 'reaction', emoji: '❤️' }); break;
      case 'crossed_fingers':
        floatEmoji('🤞'); spawnStars(cx, cy, 10);
        sendMessage?.({ type: 'reaction', emoji: '🤞' }); break;
      case 'point':
        state.setDrawingMode(!state.isDrawingMode); floatEmoji('☝️'); break;
    }
  }, [sendMessage, floatEmoji, toggleEffectTimed]);

  const handleFaceSmile   = useCallback(() => { spawnHearts(window.innerWidth*0.75, window.innerHeight*0.55, 5); floatEmoji('😊'); }, [floatEmoji]);
  const handleMouthOpen   = useCallback(() => { spawnStars(window.innerWidth*0.75, window.innerHeight*0.6, 6); floatEmoji('😮'); }, [floatEmoji]);
  const handleEyeBrowRaise = useCallback(() => { floatEmoji('🤨'); }, [floatEmoji]);

  const handleBlink = useCallback((side: 'left'|'right'|'both') => {
    if (side==='both') {
      const s = useRoomStore.getState();
      s.toggleEffect('filter_vignette');
      setTimeout(()=>{ if(useRoomStore.getState().activeEffects.includes('filter_vignette')) useRoomStore.getState().toggleEffect('filter_vignette'); }, 2000);
    }
    floatEmoji(side==='both'?'😉':'👁️');
  }, [floatEmoji]);

  const handleHeadTilt = useCallback((angle: number) => {
    const s = useRoomStore.getState();
    if (angle>18) { s.toggleEffect('filter_warmth'); floatEmoji('🌞'); }
    else if (angle<-18) { s.toggleEffect('filter_cool'); floatEmoji('❄️'); }
  }, [floatEmoji]);

  const anyARActive = store.activeEffects.some(e =>
    e.startsWith('ar_') || e === 'filter_motion_bloom' || e === 'filter_light_trails',
  );
  const arEnabled = mediaReady && (store.gestureMode || anyARActive);

  const arState = useAR({
    videoRef: localVideoRef as React.RefObject<HTMLVideoElement>,
    enabled: arEnabled,
    onGesture: handleARGesture,
    onSmile: handleFaceSmile,
    onMouthOpen: handleMouthOpen,
    onBlink: handleBlink,
    onEyeBrowRaise: handleEyeBrowRaise,
    onHeadTilt: handleHeadTilt,
  });

  const modeConfig  = getModeConfig(store.mode);
  const filterStyle = buildFilterStyle(store.videoFilter, store.brightness, store.warmth, store.contrast);

  const handleMediaReady = useCallback((media: AcquiredMedia) => {
    store.setLocalStream(media.stream);
    setMediaReady(true);
  }, [store]);

  useEffect(() => {
    if (localVideoRef.current && store.localStream) localVideoRef.current.srcObject = store.localStream;
  }, [store.localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && store.remoteStream) remoteVideoRef.current.srcObject = store.remoteStream;
  }, [store.remoteStream]);

  useEffect(() => {
    if (store.connectionStatus==='connected') {
      const ach = checkAndUnlock('connect');
      if (ach) setPendingAchievement(ach);
    }
  }, [store.connectionStatus]);

  useEffect(() => {
    const handler = (e: CustomEvent<{emoji:string}>) => {
      const rid = `${Date.now()}-${Math.random()}`;
      setFloatingReactions(f => [...f, { id: rid, emoji: e.detail.emoji, x: 55+Math.random()*15 }]);
      setTimeout(() => setFloatingReactions(f => f.filter(r => r.id!==rid)), 3000);
    };
    window.addEventListener('peer-reaction' as any, handler as any);
    return () => window.removeEventListener('peer-reaction' as any, handler as any);
  }, []);

  // Keyboard shortcuts: K=mic, V=video, D=draw, F=fullscreen, Esc=close panels
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'k' || e.key === 'K') { store.toggleAudio(); }
      else if (e.key === 'v' || e.key === 'V') { store.toggleVideo(); }
      else if (e.key === 'd' || e.key === 'D') { store.setDrawingMode(!store.isDrawingMode); }
      else if (e.key === 'f' || e.key === 'F') {
        if (!document.fullscreenElement) rootRef.current?.requestFullscreen();
        else document.exitFullscreen();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [store]);

  const handleGestureReaction = useCallback((emoji: string) => {
    const rid = `${Date.now()}-${Math.random()}`;
    setFloatingReactions(f => [...f, { id: rid, emoji, x: 40+Math.random()*20 }]);
    setTimeout(() => setFloatingReactions(f => f.filter(r => r.id!==rid)), 3000);
  }, []);

  const handleAchievement = useCallback((ach: {title:string;emoji:string}) => setPendingAchievement(ach), []);
  const handleDisconnect = () => { store.disconnect(); setMediaReady(false); setLocation('/'); };

  const copyRoomId = () => {
    const shareUrl = `${window.location.origin}/room/${id}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true); setTimeout(()=>setCopied(false), 2000);
  };

  const capturePhoto = useCallback(() => {
    const video = store.remoteStream ? remoteVideoRef.current : localVideoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth||1280; canvas.height = video.videoHeight||720;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.drawImage(video,0,0,canvas.width,canvas.height);
    const link = document.createElement('a');
    link.download = `lovecall-${Date.now()}.png`; link.href = canvas.toDataURL('image/png'); link.click();
    setCaptureFlash(true); setTimeout(()=>setCaptureFlash(false), 500);
  }, [store.remoteStream]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) rootRef.current?.requestFullscreen();
    else document.exitFullscreen();
  }, []);

  useEffect(() => {
    const handler = ()=>setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return ()=>document.removeEventListener('fullscreenchange', handler);
  }, []);

  const qualityCfg = QUALITY_CONFIG[store.connectionQuality];

  if (!mediaReady) return <MediaPermissionGate onReady={handleMediaReady} />;

  return (
    <div ref={rootRef} className={`relative w-full h-[100dvh] overflow-hidden flex items-center justify-center ${modeConfig.bgClass}`}>
      {captureFlash && <div className="absolute inset-0 z-[100] bg-white pointer-events-none capture-flash" />}

      {floatingReactions.map(r => (
        <div key={r.id} className="fixed z-50 pointer-events-none select-none text-4xl animate-float-up" style={{left:`${r.x}%`,bottom:'8rem'}}>
          {r.emoji}
        </div>
      ))}

      <ModeParticles mode={store.mode} active={true} />

      {/* Remote video — full background */}
      <div className="absolute inset-0 z-0">
        {store.remoteStream ? (
          <video ref={remoteVideoRef} autoPlay playsInline
            className="w-full h-full object-cover"
            style={{ filter: filterStyle!=='none' ? filterStyle : undefined }} />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <div className="z-10 flex flex-col items-center p-8 glass-panel rounded-3xl animate-in fade-in zoom-in duration-700">
              <div className="relative w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mb-6">
                <div className="absolute inset-0 rounded-full border-2 border-primary/50 animate-ping" style={{animationDuration:'2s'}} />
                <div className="w-16 h-16 rounded-full bg-primary/40 flex items-center justify-center animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-primary" style={{boxShadow:`0 0 20px ${modeConfig.primaryColor}`}} />
                </div>
              </div>
              <h2 className="text-3xl font-serif text-white mb-2 tracking-wide">Waiting for partner</h2>
              <p className="text-white/60 font-light mb-8">Share this code to connect</p>
              <div className="flex items-center gap-3 bg-black/40 p-2 pl-6 rounded-2xl border border-white/10">
                <span className="font-mono text-2xl tracking-widest text-primary font-semibold">{id}</span>
                <Button size="icon" variant="ghost" className="rounded-xl w-12 h-12 bg-white/5 hover:bg-white/10 hover:text-primary" onClick={copyRoomId}>
                  {copied ? <Check className="w-5 h-5 text-green-400"/> : <Copy className="w-5 h-5"/>}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <CanvasOverlay sendMessage={sendMessage} />

      <ARFaceOverlay
        faceLandmarks={arState.faceLandmarks}
        handLandmarks={arState.handLandmarks}
        headPose={arState.headPose}
        faceExpression={arState.faceExpression}
        videoRef={localVideoRef as React.RefObject<HTMLVideoElement>}
      />

      <GestureIndicator gesture={lastARGesture} />
      <ARStatusBadge
        isLoading={arState.isLoading} isReady={arState.isReady}
        error={arState.error} loadingProgress={arState.loadingProgress}
        faceLandmarks={arState.faceLandmarks} handLandmarks={arState.handLandmarks}
      />
      <GestureLayer videoRef={localVideoRef as React.RefObject<HTMLVideoElement>} onGestureReaction={handleGestureReaction} sendMessage={sendMessage} />
      <ARFilterCarousel visible={showVibes} onClose={()=>setShowVibes(false)} sendMessage={sendMessage} />
      <RippleCanvas onAchievement={handleAchievement} sendMessage={sendMessage} />
      <PrivacyMode />
      <Toolbox onAchievement={handleAchievement} sendMessage={sendMessage} />
      <EmojiReactions sendMessage={sendMessage} />
      <ChatPanel sendMessage={sendMessage} sendTyping={sendTyping} />
      <AchievementToast achievement={pendingAchievement} onDone={()=>setPendingAchievement(null)} />

      {/* Local Video PIP */}
      <div
        className="absolute bottom-[88px] right-6 z-20 group transition-all duration-300 hover:scale-105"
        style={{
          width: 128, height: 192,
          borderRadius: 20,
          overflow: 'hidden',
          border: `1.5px solid ${modeConfig.primaryColor}35`,
          boxShadow: `0 8px 32px rgba(0,0,0,0.55), 0 0 24px ${modeConfig.glowColor}`,
        }}
      >
        {store.localStream ? (
          <video
            ref={localVideoRef} autoPlay playsInline muted
            className="w-full h-full object-cover scale-x-[-1]"
            style={{ filter: filterStyle !== 'none' ? filterStyle : undefined }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-zinc-950">
            <VideoOff className="w-8 h-8 text-white/25" />
          </div>
        )}

        {/* Top status badge */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div
            className="px-1.5 py-0.5 rounded-full text-[11px] font-medium"
            style={{
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            {modeConfig.emoji}
          </div>
        </div>

        {/* Bottom status indicators */}
        <div className="absolute bottom-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {!store.audioEnabled && (
            <div
              className="p-1 rounded-lg"
              style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <MicOff className="w-3 h-3 text-red-400" />
            </div>
          )}
          {!store.videoEnabled && (
            <div
              className="p-1 rounded-lg"
              style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <VideoOff className="w-3 h-3 text-red-400" />
            </div>
          )}
        </div>

        {/* Motion glow */}
        {store.motionData && store.gestureMode && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              borderRadius: 20,
              boxShadow: `inset 0 0 ${Math.round(store.motionData.area * 40 + 4)}px ${modeConfig.primaryColor}55`,
              opacity: store.motionData.area * 5,
            }}
          />
        )}
      </div>

      {/* Bottom control bar */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30">
        <div
          className="glass-panel-strong flex items-center gap-1.5 px-4 py-3 rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.55)]"
          style={{ border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={store.toggleAudio}
                className={`ctrl-btn ${!store.audioEnabled ? 'danger' : ''}`}
                style={!store.audioEnabled ? { width: 48, height: 48, borderRadius: 14 } : {}}
              >
                {store.audioEnabled ? <Mic className="w-[18px] h-[18px]" /> : <MicOff className="w-[18px] h-[18px]" />}
              </button>
            </TooltipTrigger>
            <TooltipContent><p>{store.audioEnabled ? 'Mute (K)' : 'Unmute (K)'}</p></TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={store.toggleVideo}
                className={`ctrl-btn ${!store.videoEnabled ? 'danger' : ''}`}
                style={!store.videoEnabled ? { width: 48, height: 48, borderRadius: 14 } : {}}
              >
                {store.videoEnabled ? <VideoIcon className="w-[18px] h-[18px]" /> : <VideoOff className="w-[18px] h-[18px]" />}
              </button>
            </TooltipTrigger>
            <TooltipContent><p>{store.videoEnabled ? 'Stop Video (V)' : 'Start Video (V)'}</p></TooltipContent>
          </Tooltip>

          <div className="w-px h-6 bg-white/10 mx-1" />

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setShowVibes(v => !v)}
                className={`ctrl-btn ${showVibes ? 'active' : ''}`}
              >
                <Sparkles className="w-[18px] h-[18px]" />
              </button>
            </TooltipTrigger>
            <TooltipContent><p>AR Vibes</p></TooltipContent>
          </Tooltip>

          <div className="w-px h-6 bg-white/10 mx-1" />

          {/* End call — center focal button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleDisconnect}
                className="relative flex items-center justify-center w-[52px] h-[52px] rounded-[16px] transition-all duration-200 hover:scale-[1.06] active:scale-[0.95]"
                style={{
                  background: 'linear-gradient(135deg, hsl(0 84% 55%) 0%, hsl(0 84% 45%) 100%)',
                  boxShadow: '0 4px 20px rgba(239,68,68,0.45), 0 0 0 1px rgba(255,255,255,0.1) inset',
                }}
              >
                <PhoneOff className="w-5 h-5 text-white" />
              </button>
            </TooltipTrigger>
            <TooltipContent><p>End Call</p></TooltipContent>
          </Tooltip>

          <div className="w-px h-6 bg-white/10 mx-1" />

          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={capturePhoto} className="ctrl-btn">
                <Camera className="w-[18px] h-[18px]" />
              </button>
            </TooltipTrigger>
            <TooltipContent><p>Capture Photo</p></TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={toggleFullscreen} className="ctrl-btn">
                {isFullscreen ? <Minimize className="w-[18px] h-[18px]" /> : <Maximize className="w-[18px] h-[18px]" />}
              </button>
            </TooltipTrigger>
            <TooltipContent><p>{isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}</p></TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Status bar */}
      <div className="absolute top-4 right-4 z-30">
        <div
          className="glass-panel flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs"
          style={{ border: '1px solid rgba(255,255,255,0.09)' }}
        >
          <span className="text-base leading-none">{modeConfig.emoji}</span>
          <span className="text-white/45 font-medium">{modeConfig.moodLabel}</span>

          {store.connectionStatus === 'connected' && (
            <>
              <div className="w-px h-3.5 bg-white/15" />
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-1.5 h-1.5 rounded-full ${qualityCfg.dot}`}
                  style={{ boxShadow: `0 0 6px currentColor`, animation: 'soft-pulse 2s ease-in-out infinite' }}
                />
                <span className={`${qualityCfg.color} font-semibold`}>
                  {qualityCfg.label || 'Live'}
                </span>
              </div>
            </>
          )}
          {store.connectionStatus === 'connecting' && (
            <>
              <div className="w-px h-3.5 bg-white/15" />
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-soft-pulse" />
                <span className="text-yellow-400/80 font-medium">Connecting…</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Drawing mode hint */}
      {store.isDrawingMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <div
            className="glass-panel px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2"
            style={{
              color: 'hsl(var(--primary))',
              border: '1px solid hsl(var(--primary) / 0.3)',
              boxShadow: '0 0 16px hsl(var(--primary) / 0.2)',
            }}
          >
            <span>✏️</span>
            Drawing Mode
            <span className="text-white/30 font-normal">· Ctrl+Z undo · D to stop</span>
          </div>
        </div>
      )}

      <KeyboardHint />
    </div>
  );
}

function KeyboardHint() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(t);
  }, []);
  if (!visible) return null;
  return (
    <div className="absolute bottom-[88px] left-1/2 -translate-x-1/2 z-20 pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-700">
      <div
        className="glass-panel px-4 py-2 rounded-full text-[10px] text-white/28 flex items-center gap-3"
        style={{ border: '1px solid rgba(255,255,255,0.07)' }}
      >
        {[['K','mic'],['V','video'],['D','draw'],['F','fullscreen']].map(([key, label]) => (
          <span key={key} className="flex items-center gap-1">
            <kbd
              className="inline-flex items-center justify-center w-5 h-5 rounded text-[9px] font-bold text-white/50"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}
            >
              {key}
            </kbd>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
