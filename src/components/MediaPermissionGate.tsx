import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Camera, Mic, VideoOff, RefreshCw, CheckCircle,
  AlertTriangle, ChevronDown, Loader2, ArrowRight, ShieldCheck, Info,
} from 'lucide-react';
import {
  getUserMediaSafe, getUserMediaWithDevices, enumerateDevices,
  classifyError, getBrowserName, isIOS,
  type MediaError, type AcquiredMedia, type DeviceList,
} from '@/lib/media-permissions';

interface MediaPermissionGateProps {
  onReady: (media: AcquiredMedia) => void;
}

type GateState = 'intro' | 'requesting' | 'ready' | 'error' | 'audio-only';

export function MediaPermissionGate({ onReady }: MediaPermissionGateProps) {
  const previewRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [gateState, setGateState] = useState<GateState>('intro');
  const [mediaInfo, setMediaInfo]   = useState<AcquiredMedia | null>(null);
  const [mediaError, setMediaError] = useState<MediaError | null>(null);
  const [devices, setDevices]       = useState<DeviceList>({ cameras: [], microphones: [] });
  const [selectedCamera, setSelectedCamera] = useState('');
  const [selectedMic, setSelectedMic]       = useState('');
  const [switching, setSwitching]   = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const browser = getBrowserName();
  const ios     = isIOS();
  const isChromeLike = !ios && (browser === 'Chrome' || browser === 'Edge' || browser === 'Chromium');

  const stopCurrentStream = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  useEffect(() => () => stopCurrentStream(), []);

  const applyStream = (info: AcquiredMedia) => {
    streamRef.current = info.stream;
    setMediaInfo(info);
    setGateState(info.hasVideo ? 'ready' : 'audio-only');
    if (previewRef.current && info.hasVideo) {
      previewRef.current.srcObject = info.stream;
    }
    enumerateDevices().then(d => {
      setDevices(d);
      const camTrack = info.stream.getVideoTracks()[0];
      const micTrack = info.stream.getAudioTracks()[0];
      if (camTrack) setSelectedCamera(camTrack.getSettings().deviceId ?? '');
      if (micTrack) setSelectedMic(micTrack.getSettings().deviceId ?? '');
    });
  };

  const requestMedia = useCallback(async () => {
    setGateState('requesting');
    setMediaError(null);
    stopCurrentStream();
    try {
      const info = await getUserMediaSafe();
      applyStream(info);
    } catch (err) {
      setMediaError(classifyError(err));
      setGateState('error');
      setRetryCount(r => r + 1);
    }
  }, []);

  const switchDevices = useCallback(async (cameraId: string, micId: string) => {
    setSwitching(true);
    stopCurrentStream();
    try {
      const info = await getUserMediaWithDevices(cameraId || undefined, micId || undefined);
      applyStream(info);
    } catch { /* keep current */ }
    finally { setSwitching(false); }
  }, []);

  const handleEnter = () => {
    if (!mediaInfo) return;
    streamRef.current = null;
    onReady(mediaInfo);
  };

  const continueAudioOnly = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
      onReady({ stream, hasVideo: false, hasAudio: true });
    } catch {
      const ctx = new AudioContext();
      onReady({ stream: ctx.createMediaStreamDestination().stream, hasVideo: false, hasAudio: false });
    }
  };

  return (
    <div className="relative w-full h-[100dvh] flex items-center justify-center bg-gradient-romantic overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(225,29,72,0.08)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-500/5 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDelay: '1.2s' }} />

      <div className="z-10 w-full max-w-md mx-auto px-4 flex flex-col gap-5 animate-in fade-in zoom-in duration-500">

        {/* App header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/30 to-rose-500/20 border border-primary/30 shadow-[0_0_30px_rgba(225,29,72,0.3)] mb-3">
            <span className="text-3xl">💞</span>
          </div>
          <h2 className="text-2xl font-serif font-bold text-white tracking-tight">LoveCall</h2>
          <p className="text-white/50 text-sm mt-1">Private · P2P Encrypted · Just the two of you</p>
        </div>

        {/* ── INTRO ── */}
        {gateState === 'intro' && (
          <div className="flex flex-col gap-4">
            <div className="glass-panel rounded-2xl overflow-hidden divide-y divide-white/5">
              <div className="flex items-center gap-4 p-4">
                <div className="w-11 h-11 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Camera className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">Camera</p>
                  <p className="text-xs text-white/40 mt-0.5">For your video feed and AR effects</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4">
                <div className="w-11 h-11 rounded-xl bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                  <Mic className="w-5 h-5 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">Microphone</p>
                  <p className="text-xs text-white/40 mt-0.5">For voice during your call</p>
                </div>
              </div>
            </div>

            {/* iOS tip */}
            {ios && (
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-300/80 leading-relaxed">
                  <span className="font-semibold text-blue-300">Safari will ask permission</span> — tap <span className="font-semibold text-blue-300">"Allow"</span> when the prompt appears at the top of the screen.
                </p>
              </div>
            )}

            {/* Chrome tip */}
            {isChromeLike && (
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-300/80 leading-relaxed">
                  <span className="font-semibold text-blue-300">Chrome will show a popup</span> — click <span className="font-semibold text-blue-300">"Allow"</span> to continue.
                </p>
              </div>
            )}

            <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-emerald-500/8 border border-emerald-500/20">
              <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-emerald-300/80 leading-relaxed">
                Video and audio go peer-to-peer directly to your partner — never stored or routed through any server.
              </p>
            </div>

            <Button
              onClick={requestMedia}
              className="w-full rounded-2xl bg-gradient-to-r from-primary to-rose-500 hover:opacity-90 text-white font-semibold text-base shadow-[0_0_28px_rgba(225,29,72,0.45)] transition-all duration-300 py-4 h-auto"
            >
              <Camera className="w-5 h-5 mr-2" />
              Allow Camera &amp; Microphone
            </Button>
            <p className="text-center text-[10px] text-white/25">
              {ios ? 'Tap "Allow" in the Safari prompt that appears' : 'Your browser will ask for permission once'}
            </p>
          </div>
        )}

        {/* ── REQUESTING ── */}
        {gateState === 'requesting' && (
          <div className="glass-panel rounded-2xl p-8 flex flex-col items-center gap-5">
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-2 border-primary/30 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
              </div>
              <div className="absolute inset-0 rounded-full border-2 border-primary/15 animate-ping" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-white font-semibold">Waiting for permission…</p>
              <p className="text-sm text-white/40 leading-relaxed">
                {ios
                  ? 'Look for the prompt at the top of Safari and tap "Allow"'
                  : isChromeLike
                    ? 'Look for the popup at the top of Chrome and click "Allow"'
                    : 'Allow camera & microphone access in the browser prompt'}
              </p>
            </div>
            {/* Visual hint mockup */}
            <div className="w-full max-w-xs p-3 rounded-xl bg-black/40 border border-white/10 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Camera className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <div className="h-2.5 bg-white/10 rounded-full w-3/4 mb-1.5" />
                <div className="h-2 bg-white/6 rounded-full w-1/2" />
              </div>
              <div className="px-2.5 py-1 rounded-md bg-blue-500/20 border border-blue-500/30 text-[10px] text-blue-300 font-semibold flex-shrink-0">
                Allow
              </div>
            </div>
          </div>
        )}

        {/* ── READY / AUDIO-ONLY ── */}
        {(gateState === 'ready' || gateState === 'audio-only') && (
          <div className="glass-panel rounded-2xl overflow-hidden">
            <div className="relative bg-black/60 aspect-video flex items-center justify-center">
              <video
                ref={previewRef}
                autoPlay playsInline muted
                className={`w-full h-full object-cover scale-x-[-1] transition-opacity duration-300 ${gateState === 'ready' ? 'opacity-100' : 'opacity-0'}`}
              />
              {gateState === 'audio-only' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                    <Mic className="w-8 h-8 text-primary animate-pulse" />
                  </div>
                  <p className="text-white/60 text-sm">Audio only — no camera detected</p>
                </div>
              )}
              <div className="absolute top-3 left-3 flex gap-2">
                <StatusBadge icon={<Camera className="w-3 h-3" />} label="Camera" ok={gateState === 'ready'} />
                <StatusBadge icon={<Mic className="w-3 h-3" />} label="Mic" ok={true} />
              </div>
            </div>
            {devices.cameras.length + devices.microphones.length > 0 && (
              <div className="p-4 border-t border-white/10 flex flex-col gap-3">
                {devices.cameras.length > 0 && (
                  <DevicePicker icon={<Camera className="w-3.5 h-3.5" />} label="Camera"
                    devices={devices.cameras} value={selectedCamera}
                    onChange={id => { setSelectedCamera(id); switchDevices(id, selectedMic); }}
                    disabled={switching} />
                )}
                {devices.microphones.length > 0 && (
                  <DevicePicker icon={<Mic className="w-3.5 h-3.5" />} label="Microphone"
                    devices={devices.microphones} value={selectedMic}
                    onChange={id => { setSelectedMic(id); switchDevices(selectedCamera, id); }}
                    disabled={switching} />
                )}
              </div>
            )}
          </div>
        )}

        {/* ── ERROR ── */}
        {gateState === 'error' && (
          <div className="glass-panel rounded-2xl overflow-hidden">
            <div className="p-5 flex flex-col items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                <AlertTriangle className="w-7 h-7 text-red-400" />
              </div>
              <div className="text-center space-y-1.5">
                <p className="text-white font-semibold">{mediaError?.title ?? 'Permission Denied'}</p>
                <p className="text-sm text-white/50 leading-relaxed">{mediaError?.description}</p>
              </div>

              {/* Step-by-step fix */}
              {mediaError?.steps && mediaError.steps.length > 0 && (
                <div className="w-full p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-3">
                  <p className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" />
                    {ios ? 'How to allow in Safari (iOS)' : `How to allow in ${browser}`}
                  </p>
                  <ol className="space-y-2.5">
                    {mediaError.steps.map((step, i) => (
                      <li key={i} className="flex gap-3 text-[12px] text-amber-200/80 leading-snug">
                        <span className="w-5 h-5 rounded-full bg-amber-500/30 text-amber-300 font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── BUTTONS ── */}
        {gateState === 'error' && (
          <div className="flex flex-col gap-3">
            <Button
              onClick={requestMedia}
              className="w-full h-12 text-sm font-semibold bg-gradient-to-r from-primary to-rose-500 hover:opacity-90 shadow-[0_0_20px_rgba(225,29,72,0.35)]"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again{retryCount > 1 ? ` (${retryCount})` : ''}
            </Button>
            <button
              onClick={() => setGateState('intro')}
              className="text-xs text-white/40 hover:text-white/70 transition-colors text-center py-1"
            >
              ← Back
            </button>
            <button
              onClick={continueAudioOnly}
              className="text-xs text-white/25 hover:text-white/50 transition-colors underline underline-offset-2 text-center"
            >
              Continue without camera or microphone
            </button>
          </div>
        )}

        {(gateState === 'ready' || gateState === 'audio-only') && (
          <Button
            onClick={handleEnter}
            disabled={switching}
            className="w-full h-12 text-sm font-semibold"
            style={{ boxShadow: '0 0 20px rgba(225,29,72,0.35)' }}
          >
            {switching
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Switching device…</>
              : <><ArrowRight className="w-4 h-4 mr-2" />Enter Room</>
            }
          </Button>
        )}

        {window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && (
          <p className="text-center text-xs text-yellow-400/70 flex items-center justify-center gap-1.5">
            <AlertTriangle className="w-3 h-3" />
            Camera requires HTTPS — open this app over a secure connection
          </p>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ icon, label, ok }: { icon: React.ReactNode; label: string; ok: boolean }) {
  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs backdrop-blur-md border ${
      ok ? 'bg-green-500/20 border-green-500/30 text-green-400' : 'bg-red-500/20 border-red-500/30 text-red-400'
    }`}>
      {ok ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
      {icon}
      <span>{label}</span>
    </div>
  );
}

function DevicePicker({ icon, label, devices, value, onChange, disabled }: {
  icon: React.ReactNode; label: string;
  devices: MediaDeviceInfo[]; value: string;
  onChange: (id: string) => void; disabled: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-white/40 flex-shrink-0">{icon}</span>
      <span className="text-xs text-white/40 w-20 flex-shrink-0">{label}</span>
      <div className="relative flex-1">
        <select
          value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
          className="w-full appearance-none bg-black/40 border border-white/10 text-white/80 text-xs rounded-lg px-3 py-2 pr-7 cursor-pointer focus:outline-none focus:border-primary/50 disabled:opacity-50"
        >
          {devices.map((d, i) => (
            <option key={d.deviceId} value={d.deviceId} className="bg-zinc-900">
              {d.label || `${label} ${i + 1}`}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30 pointer-events-none" />
      </div>
    </div>
  );
}
