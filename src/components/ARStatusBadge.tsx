import React from 'react';
import { Cpu, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Props {
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
  loadingProgress: number;
  faceLandmarks: unknown | null;
  handLandmarks: unknown[] | null;
}

export function ARStatusBadge({ isLoading, isReady, error, loadingProgress, faceLandmarks, handLandmarks }: Props) {
  if (!isLoading && !isReady && !error) return null;

  if (error) {
    return (
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/20 border border-red-500/40 backdrop-blur-md">
        <AlertCircle className="w-3.5 h-3.5 text-red-400" />
        <span className="text-[10px] text-red-300 font-medium">AR Offline</span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="fixed top-4 right-4 z-50 flex flex-col items-end gap-1.5">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/15 border border-yellow-500/30 backdrop-blur-md">
          <Loader2 className="w-3.5 h-3.5 text-yellow-400 animate-spin" />
          <span className="text-[10px] text-yellow-300 font-medium">Loading MediaPipe…</span>
          <span className="text-[10px] text-yellow-400/70">{loadingProgress}%</span>
        </div>
        {/* Progress bar */}
        <div className="w-40 h-0.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-yellow-400 to-primary rounded-full transition-all duration-500"
            style={{ width: `${loadingProgress}%` }}
          />
        </div>
      </div>
    );
  }

  // Ready state — show tracking dots
  const hasFace = !!faceLandmarks;
  const hasHand = handLandmarks && (handLandmarks as any[]).length > 0;

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 border border-white/10 backdrop-blur-md">
      <div className="flex items-center gap-1">
        <div className={`w-1.5 h-1.5 rounded-full transition-colors ${hasFace ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'bg-white/20'}`} />
        <span className="text-[9px] text-white/50">face</span>
      </div>
      <div className="w-px h-3 bg-white/10" />
      <div className="flex items-center gap-1">
        <div className={`w-1.5 h-1.5 rounded-full transition-colors ${hasHand ? 'bg-violet-400 shadow-[0_0_6px_rgba(167,139,250,0.8)]' : 'bg-white/20'}`} />
        <span className="text-[9px] text-white/50">hand</span>
      </div>
      <div className="w-px h-3 bg-white/10" />
      <Cpu className="w-3 h-3 text-primary/70" />
    </div>
  );
}
