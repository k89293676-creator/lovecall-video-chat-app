import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Camera, Mic, MicOff, VideoOff, RefreshCw, CheckCircle,
  AlertTriangle, ChevronDown, Loader2, Lock, ArrowRight,
} from 'lucide-react';
import {
  getUserMediaSafe, getUserMediaWithDevices, enumerateDevices,
  classifyError, getBrowserName, type MediaError, type AcquiredMedia, type DeviceList,
} from '@/lib/media-permissions';

interface MediaPermissionGateProps {
  onReady: (media: AcquiredMedia) => void;
}

type GateState = 'requesting' | 'ready' | 'error' | 'audio-only';

export function MediaPermissionGate({ onReady }: MediaPermissionGateProps) {
  const previewRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [gateState, setGateState] = useState<GateState>('requesting');
  const [mediaInfo, setMediaInfo] = useState<AcquiredMedia | null>(null);
  const [mediaError, setMediaError] = useState<MediaError | null>(null);
  const [devices, setDevices] = useState<DeviceList>({ cameras: [], microphones: [] });
  const [selectedCamera, setSelectedCamera] = useState('');
  const [selectedMic, setSelectedMic] = useState('');
  const [switching, setSwitching] = useState(false);

  const browser = getBrowserName();

  const stopCurrentStream = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

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
    }
  }, []);

  useEffect(() => {
    requestMedia();
    return stopCurrentStream;
  }, []);

  const switchDevices = useCallback(async (cameraId: string, micId: string) => {
    setSwitching(true);
    stopCurrentStream();
    try {
      const info = await getUserMediaWithDevices(
        cameraId || undefined,
        micId || undefined,
      );
      applyStream(info);
    } catch {
      // ignore — keep current
    } finally {
      setSwitching(false);
    }
  }, []);

  const handleCameraChange = (deviceId: string) => {
    setSelectedCamera(deviceId);
    switchDevices(deviceId, selectedMic);
  };

  const handleMicChange = (deviceId: string) => {
    setSelectedMic(deviceId);
    switchDevices(selectedCamera, deviceId);
  };

  const handleEnter = () => {
    if (!mediaInfo) return;
    // Transfer ownership — don't stop
    streamRef.current = null;
    onReady(mediaInfo);
  };

  return (
    <div className="relative w-full h-[100dvh] flex items-center justify-center bg-gradient-romantic overflow-hidden">
      {/* Background shimmer */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(225,29,72,0.08)_0%,transparent_70%)] pointer-events-none" />

      <div className="z-10 w-full max-w-md mx-auto px-4 flex flex-col gap-6 animate-in fade-in zoom-in duration-500">

        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/20 text-primary mb-3">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-white tracking-tight">Getting Ready</h2>
          <p className="text-white/50 text-sm mt-1">
            Allow camera &amp; microphone to continue
          </p>
        </div>

        {/* Camera preview / state card */}
        <div className="glass-panel rounded-2xl overflow-hidden">
          {/* Preview area */}
          <div className="relative bg-black/60 aspect-video flex items-center justify-center">
            <video
              ref={previewRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover scale-x-[-1] transition-opacity duration-300 ${gateState === 'ready' ? 'opacity-100' : 'opacity-0'}`}
            />

            {gateState === 'requesting' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-white/60 text-sm">Requesting access…</p>
              </div>
            )}

            {gateState === 'audio-only' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <Mic className="w-8 h-8 text-primary animate-pulse" />
                </div>
                <p className="text-white/60 text-sm">Audio only — no camera detected</p>
              </div>
            )}

            {gateState === 'error' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6">
                <AlertTriangle className="w-10 h-10 text-red-400" />
                <p className="text-white font-semibold text-center">{mediaError?.title}</p>
                <p className="text-white/50 text-xs text-center leading-relaxed">{mediaError?.description}</p>
              </div>
            )}

            {/* Status badges */}
            <div className="absolute top-3 left-3 flex gap-2">
              <StatusBadge
                icon={gateState === 'ready' ? <Camera className="w-3 h-3" /> : <VideoOff className="w-3 h-3" />}
                label="Camera"
                ok={gateState === 'ready'}
                pending={gateState === 'requesting'}
              />
              <StatusBadge
                icon={<Mic className="w-3 h-3" />}
                label="Mic"
                ok={gateState === 'ready' || gateState === 'audio-only'}
                pending={gateState === 'requesting'}
              />
            </div>
          </div>

          {/* Device pickers — only show when we have labelled devices */}
          {(gateState === 'ready' || gateState === 'audio-only') && devices.cameras.length + devices.microphones.length > 0 && (
            <div className="p-4 border-t border-white/10 flex flex-col gap-3">
              {devices.cameras.length > 0 && (
                <DevicePicker
                  icon={<Camera className="w-3.5 h-3.5" />}
                  label="Camera"
                  devices={devices.cameras}
                  value={selectedCamera}
                  onChange={handleCameraChange}
                  disabled={switching}
                />
              )}
              {devices.microphones.length > 0 && (
                <DevicePicker
                  icon={<Mic className="w-3.5 h-3.5" />}
                  label="Microphone"
                  devices={devices.microphones}
                  value={selectedMic}
                  onChange={handleMicChange}
                  disabled={switching}
                />
              )}
            </div>
          )}

          {/* Browser hint when denied */}
          {gateState === 'error' && mediaError?.browserHint && (
            <div className="p-4 border-t border-white/10">
              <p className="text-xs text-white/40 leading-relaxed">
                <span className="text-white/60 font-medium">{browser}: </span>
                {mediaError.browserHint}
              </p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        {gateState === 'error' ? (
          <div className="flex flex-col gap-3">
            {mediaError?.canRetry && (
              <Button onClick={requestMedia} className="w-full h-12 text-sm font-medium">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            )}
            {/* Always let them join audio-only as last resort */}
            <button
              onClick={async () => {
                try {
                  const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
                  onReady({ stream, hasVideo: false, hasAudio: true });
                } catch {
                  // If even mic fails, create a silent stream
                  const ctx = new AudioContext();
                  const dst = ctx.createMediaStreamDestination();
                  onReady({ stream: dst.stream, hasVideo: false, hasAudio: false });
                }
              }}
              className="text-xs text-white/30 hover:text-white/60 transition-colors underline underline-offset-2 text-center"
            >
              Continue without camera or microphone
            </button>
          </div>
        ) : (
          <Button
            onClick={handleEnter}
            disabled={gateState === 'requesting' || switching}
            className="w-full h-12 text-sm font-medium relative overflow-hidden"
            style={{ boxShadow: '0 0 20px rgba(225,29,72,0.4)' }}
          >
            {switching ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Switching device…</>
            ) : (
              <><ArrowRight className="w-4 h-4 mr-2" />Enter Room</>
            )}
          </Button>
        )}

        {/* HTTPS notice */}
        {window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && (
          <p className="text-center text-xs text-yellow-400/70 flex items-center justify-center gap-1.5">
            <AlertTriangle className="w-3 h-3" />
            Camera requires HTTPS — use the secure link
          </p>
        )}
      </div>
    </div>
  );
}

function StatusBadge({
  icon, label, ok, pending,
}: { icon: React.ReactNode; label: string; ok: boolean; pending: boolean }) {
  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs backdrop-blur-md border transition-colors ${
      pending ? 'bg-white/5 border-white/10 text-white/40'
      : ok    ? 'bg-green-500/20 border-green-500/30 text-green-400'
              : 'bg-red-500/20 border-red-500/30 text-red-400'
    }`}>
      {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : ok ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
      {icon}
      <span>{label}</span>
    </div>
  );
}

function DevicePicker({
  icon, label, devices, value, onChange, disabled,
}: {
  icon: React.ReactNode; label: string;
  devices: MediaDeviceInfo[]; value: string;
  onChange: (id: string) => void; disabled: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-white/40 flex-shrink-0">{icon}</span>
      <span className="text-xs text-white/40 w-16 flex-shrink-0">{label}</span>
      <div className="relative flex-1">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          className="w-full appearance-none bg-black/40 border border-white/10 text-white/80 text-xs rounded-lg px-3 py-2 pr-7 cursor-pointer focus:outline-none focus:border-primary/50 disabled:opacity-50"
        >
          {devices.map(d => (
            <option key={d.deviceId} value={d.deviceId} className="bg-zinc-900">
              {d.label || `${label} ${devices.indexOf(d) + 1}`}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30 pointer-events-none" />
      </div>
    </div>
  );
}
