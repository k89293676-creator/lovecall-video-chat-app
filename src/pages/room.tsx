import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useLocation } from 'wouter';
import { useRoomStore } from '@/store/room-store';
import { usePeer } from '@/hooks/use-peer';
import { Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, Copy, Check, Camera, Maximize, Minimize } from 'lucide-react';
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
import { buildFilterStyle } from '@/components/VideoFilter';
import { getModeConfig } from '@/lib/modes';
import { checkAndUnlock } from '@/lib/achievements';
import type { AcquiredMedia } from '@/lib/media-permissions';

interface FloatingReaction {
  id: string;
  emoji: string;
  x: number;
}

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
  const rootRef = useRef<HTMLDivElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const { sendMessage } = usePeer(mediaReady ? id : null);

  const modeConfig = getModeConfig(store.mode);
  const filterStyle = buildFilterStyle(store.videoFilter, store.brightness, store.warmth, store.contrast);

  const handleMediaReady = useCallback((media: AcquiredMedia) => {
    store.setLocalStream(media.stream);
    setMediaReady(true);
  }, [store]);

  useEffect(() => {
    if (localVideoRef.current && store.localStream) {
      localVideoRef.current.srcObject = store.localStream;
    }
  }, [store.localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && store.remoteStream) {
      remoteVideoRef.current.srcObject = store.remoteStream;
    }
  }, [store.remoteStream]);

  useEffect(() => {
    if (store.connectionStatus === 'connected') {
      const ach = checkAndUnlock('connect');
      if (ach) setPendingAchievement(ach);
    }
  }, [store.connectionStatus]);

  // Peer emoji reactions
  useEffect(() => {
    const handler = (e: CustomEvent<{ emoji: string }>) => {
      const reactId = `${Date.now()}-${Math.random()}`;
      const x = 55 + Math.random() * 15;
      setFloatingReactions(f => [...f, { id: reactId, emoji: e.detail.emoji, x }]);
      setTimeout(() => setFloatingReactions(f => f.filter(r => r.id !== reactId)), 3000);
    };
    window.addEventListener('peer-reaction' as any, handler as any);
    return () => window.removeEventListener('peer-reaction' as any, handler as any);
  }, []);

  const handleGestureReaction = useCallback((emoji: string) => {
    const reactId = `${Date.now()}-${Math.random()}`;
    const x = 40 + Math.random() * 20;
    setFloatingReactions(f => [...f, { id: reactId, emoji, x }]);
    setTimeout(() => setFloatingReactions(f => f.filter(r => r.id !== reactId)), 3000);
  }, []);

  const handleAchievement = useCallback((ach: { title: string; emoji: string }) => {
    setPendingAchievement(ach);
  }, []);

  const handleDisconnect = () => {
    store.disconnect();
    setMediaReady(false);
    setLocation('/');
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(id || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const capturePhoto = useCallback(() => {
    const video = store.remoteStream ? remoteVideoRef.current : localVideoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const link = document.createElement('a');
    link.download = `moonlight-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    setCaptureFlash(true);
    setTimeout(() => setCaptureFlash(false), 500);
  }, [store.remoteStream]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      rootRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  if (!mediaReady) {
    return <MediaPermissionGate onReady={handleMediaReady} />;
  }

  return (
    <div
      ref={rootRef}
      className={`relative w-full h-[100dvh] overflow-hidden flex items-center justify-center ${modeConfig.bgClass}`}
    >
      {/* Photo capture flash */}
      {captureFlash && (
        <div className="absolute inset-0 z-[100] bg-white pointer-events-none capture-flash" />
      )}

      {/* Floating reactions (peer + gesture) */}
      {floatingReactions.map(r => (
        <div key={r.id}
          className="fixed z-50 pointer-events-none select-none text-4xl animate-float-up"
          style={{ left: `${r.x}%`, bottom: '8rem' }}
        >
          {r.emoji}
        </div>
      ))}

      <ModeParticles mode={store.mode} active={true} />

      {/* Remote Video — full background */}
      <div className="absolute inset-0 z-0">
        {store.remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
            style={{ filter: filterStyle !== 'none' ? filterStyle : undefined }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <div className="z-10 flex flex-col items-center p-8 glass-panel rounded-3xl animate-in fade-in zoom-in duration-700">
              <div className="relative w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mb-6">
                <div className="absolute inset-0 rounded-full border-2 border-primary/50 animate-ping" style={{ animationDuration: '2s' }} />
                <div className="w-16 h-16 rounded-full bg-primary/40 flex items-center justify-center animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-primary" style={{ boxShadow: `0 0 20px ${modeConfig.primaryColor}` }} />
                </div>
              </div>
              <h2 className="text-3xl font-serif text-white mb-2 tracking-wide">Waiting for partner</h2>
              <p className="text-white/60 font-light mb-8">Share this code to connect</p>
              <div className="flex items-center gap-3 bg-black/40 p-2 pl-6 rounded-2xl border border-white/10">
                <span className="font-mono text-2xl tracking-widest text-primary font-semibold">{id}</span>
                <Button size="icon" variant="ghost"
                  className="rounded-xl w-12 h-12 bg-white/5 hover:bg-white/10 hover:text-primary"
                  onClick={copyRoomId}
                >
                  {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AR + Drawing overlay */}
      <CanvasOverlay />

      {/* Gesture layer — reads local video, fires gesture events */}
      <GestureLayer
        videoRef={localVideoRef}
        onGestureReaction={handleGestureReaction}
        sendMessage={sendMessage}
      />

      <RippleCanvas onAchievement={handleAchievement} sendMessage={sendMessage} />
      <PrivacyMode />
      <Toolbox onAchievement={handleAchievement} sendMessage={sendMessage} />
      <EmojiReactions sendMessage={sendMessage} />
      <ChatPanel sendMessage={sendMessage} />
      <AchievementToast achievement={pendingAchievement} onDone={() => setPendingAchievement(null)} />

      {/* Local Video PIP */}
      <div
        className="absolute bottom-24 right-6 w-32 h-48 md:w-44 md:h-64 bg-black rounded-2xl overflow-hidden shadow-2xl z-20 group transition-transform hover:scale-105"
        style={{
          border: `1px solid ${modeConfig.primaryColor}30`,
          boxShadow: `0 0 20px ${modeConfig.glowColor}`,
        }}
      >
        {store.localStream ? (
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover scale-x-[-1]"
            style={{ filter: filterStyle !== 'none' ? filterStyle : undefined }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-zinc-900">
            <VideoOff className="w-8 h-8 text-white/30" />
          </div>
        )}
        {/* Status badges */}
        <div className="absolute bottom-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!store.audioEnabled && (
            <div className="bg-black/50 p-1.5 rounded-md backdrop-blur-sm">
              <MicOff className="w-3.5 h-3.5 text-destructive" />
            </div>
          )}
          {!store.videoEnabled && (
            <div className="bg-black/50 p-1.5 rounded-md backdrop-blur-sm">
              <VideoOff className="w-3.5 h-3.5 text-destructive" />
            </div>
          )}
        </div>
        <div className="absolute top-2 right-2 text-sm opacity-0 group-hover:opacity-100 transition-opacity">
          {modeConfig.emoji}
        </div>
        {/* Gesture detection glow — indicates motion is being read from this feed */}
        {store.motionData && store.gestureMode && (
          <div
            className="absolute inset-0 pointer-events-none rounded-2xl transition-opacity duration-100"
            style={{
              boxShadow: `inset 0 0 ${Math.round(store.motionData.area * 40 + 4)}px ${modeConfig.primaryColor}60`,
              opacity: store.motionData.area * 5,
            }}
          />
        )}
      </div>

      {/* Bottom control bar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 glass-panel rounded-full px-6 py-3 flex items-center gap-3 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon"
              className={`rounded-full w-12 h-12 ${!store.audioEnabled ? 'bg-destructive/20 text-destructive hover:bg-destructive/30' : 'hover:bg-white/10 text-white'}`}
              onClick={store.toggleAudio}
            >
              {store.audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>{store.audioEnabled ? 'Mute' : 'Unmute'}</p></TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon"
              className={`rounded-full w-12 h-12 ${!store.videoEnabled ? 'bg-destructive/20 text-destructive hover:bg-destructive/30' : 'hover:bg-white/10 text-white'}`}
              onClick={store.toggleVideo}
            >
              {store.videoEnabled ? <VideoIcon className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>{store.videoEnabled ? 'Stop Video' : 'Start Video'}</p></TooltipContent>
        </Tooltip>

        <div className="w-px h-8 bg-white/10 mx-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="destructive" size="icon"
              className="rounded-full w-14 h-14 shadow-lg shadow-destructive/20 hover:shadow-destructive/40 hover:scale-105 transition-all"
              onClick={handleDisconnect}
            >
              <PhoneOff className="w-6 h-6" />
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>End Call</p></TooltipContent>
        </Tooltip>

        <div className="w-px h-8 bg-white/10 mx-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon"
              className="rounded-full w-12 h-12 hover:bg-white/10 text-white/60 hover:text-white"
              onClick={capturePhoto}
            >
              <Camera className="w-5 h-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>Capture Photo</p></TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon"
              className="rounded-full w-12 h-12 hover:bg-white/10 text-white/60 hover:text-white"
              onClick={toggleFullscreen}
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</p></TooltipContent>
        </Tooltip>
      </div>

      {/* Status bar — top right */}
      <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
        <div className="glass-panel px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs text-white/40">
          <span className="text-base">{modeConfig.emoji}</span>
          <span>{modeConfig.moodLabel}</span>
          {store.connectionStatus === 'connected' && (
            <>
              <span className="text-white/20">|</span>
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-green-400/70">Live</span>
            </>
          )}
          {store.connectionStatus === 'connecting' && (
            <>
              <span className="text-white/20">|</span>
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
              <span className="text-yellow-400/70">Connecting…</span>
            </>
          )}
        </div>
      </div>

      {/* Drawing mode indicator */}
      {store.isDrawingMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <div className="glass-panel px-4 py-1.5 rounded-full text-xs text-primary font-medium flex items-center gap-2">
            <span>✏️</span> Drawing Mode — Ctrl+Z to undo
          </div>
        </div>
      )}
    </div>
  );
}
