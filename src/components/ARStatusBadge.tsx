import React, { useState } from 'react';
import { Loader2, AlertCircle, Cpu, Wifi, WifiOff } from 'lucide-react';
import { resetMediaPipe } from '@/lib/mediapipe-loader';

interface Props {
  isLoading:       boolean;
  isReady:         boolean;
  error:           string | null;
  loadingProgress: number;
  faceLandmarks:   unknown | null;
  handLandmarks:   unknown[] | null;
}

export function ARStatusBadge({
  isLoading, isReady, error, loadingProgress, faceLandmarks, handLandmarks,
}: Props) {
  const [dismissed, setDismissed] = useState(false);

  if (!isLoading && !isReady && !error) return null;
  if (dismissed && !isLoading && !isReady) return null;

  if (error) {
    return (
      <div className="fixed top-4 right-4 z-50 flex flex-col items-end gap-1.5 animate-in fade-in slide-in-from-right-2 duration-300">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-900/50 border border-red-500/50 backdrop-blur-md shadow-lg">
          <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
          <span className="text-[10px] text-red-300 font-medium">AR Offline</span>
          <button
            onClick={() => { resetMediaPipe(); window.location.reload(); }}
            className="text-[10px] text-red-200/70 hover:text-white underline ml-1 transition-colors"
          >
            Retry
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="text-red-400/50 hover:text-red-300 text-xs ml-0.5 transition-colors"
          >
            ✕
          </button>
        </div>
        <p className="text-[9px] text-red-400/60 pr-1 max-w-[220px] text-right leading-tight">
          {String(error).slice(0, 80)}
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="fixed top-4 right-4 z-50 flex flex-col items-end gap-1.5 animate-in fade-in slide-in-from-right-2 duration-300">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-900/40 border border-amber-500/30 backdrop-blur-md shadow-lg">
          <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin flex-shrink-0" />
          <span className="text-[10px] text-amber-300 font-medium">Loading AR…</span>
          <span className="text-[10px] text-amber-400/60 tabular-nums">{loadingProgress}%</span>
        </div>
        <div className="w-44 h-0.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-rose-500 rounded-full transition-all duration-500"
            style={{ width: `${loadingProgress}%` }}
          />
        </div>
        <p className="text-[9px] text-white/25 pr-1">Loading face & hand models…</p>
      </div>
    );
  }

  // Ready — compact tracking indicator
  const hasFace = !!faceLandmarks;
  const hasHand = handLandmarks && (handLandmarks as unknown[]).length > 0;

  return (
    <div
      className="fixed top-4 right-4 z-50 flex items-center gap-2 px-2.5 py-1.5 rounded-full backdrop-blur-md border transition-all duration-300 animate-in fade-in duration-500"
      style={{
        background: 'rgba(0,0,0,0.45)',
        borderColor: hasFace ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.08)',
      }}
    >
      {/* Face dot */}
      <div className="flex items-center gap-1">
        <div
          className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
            hasFace
              ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]'
              : 'bg-white/15'
          }`}
        />
        <span className="text-[9px] text-white/40 font-medium">face</span>
      </div>

      <div className="w-px h-3 bg-white/10" />

      {/* Hand dot */}
      <div className="flex items-center gap-1">
        <div
          className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
            hasHand
              ? 'bg-violet-400 shadow-[0_0_6px_rgba(167,139,250,0.9)]'
              : 'bg-white/15'
          }`}
        />
        <span className="text-[9px] text-white/40 font-medium">hand</span>
      </div>

      <div className="w-px h-3 bg-white/10" />

      <Cpu className="w-3 h-3 text-primary/60" />
    </div>
  );
}
