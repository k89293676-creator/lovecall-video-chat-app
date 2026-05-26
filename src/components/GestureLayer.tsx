import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRoomStore } from '@/store/room-store';
import { GestureDetector } from '@/lib/gesture-detector';
import { getModeConfig } from '@/lib/modes';
import type { GestureEvent } from '@/lib/gesture-detector';

interface GestureFeedback {
  id: string;
  emoji: string;
  label: string;
  x: number;
  y: number;
}

interface GestureLayerProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  onGestureReaction?: (emoji: string) => void;
  sendMessage?: (data: unknown) => void;
}

const GESTURE_LABELS: Record<string, string> = {
  wave:           'Wave 👋',
  bigmove:        'Big Move 💥',
  stillness_break:'You're back! ✨',
  circle:         'Circle 🔄',
  double_burst:   'Double! ⚡',
};

export function GestureLayer({ videoRef, onGestureReaction, sendMessage }: GestureLayerProps) {
  const { gestureMode, gestureSensitivity, mode, activeEffects, toggleEffect } = useRoomStore();
  const modeConfig = getModeConfig(mode);
  const detectorRef = useRef<GestureDetector | null>(null);
  const [feedbacks, setFeedbacks] = useState<GestureFeedback[]>([]);
  const lastGestureRef = useRef(0);
  const DEBOUNCE_MS = 1200;

  const handleGesture = useCallback((e: GestureEvent) => {
    const now = Date.now();
    if (now - lastGestureRef.current < DEBOUNCE_MS) return;
    lastGestureRef.current = now;

    const emoji = modeConfig.gestureEmoji;
    const label = GESTURE_LABELS[e.type] ?? e.type;
    const id = `${now}-${Math.random()}`;

    // Show visual feedback at gesture centroid
    setFeedbacks(f => [...f, {
      id, emoji, label,
      x: Math.round(e.cx * 100),
      y: Math.round(e.cy * 100),
    }]);
    setTimeout(() => setFeedbacks(f => f.filter(fb => fb.id !== id)), 2200);

    // Trigger mode-appropriate AR response
    if (e.type === 'wave') {
      onGestureReaction?.(emoji);
      sendMessage?.({ type: 'reaction', emoji });
    } else if (e.type === 'bigmove') {
      // Toggle confetti for big move
      if (!activeEffects.includes('filter_confetti')) toggleEffect('filter_confetti');
      setTimeout(() => {
        if (useRoomStore.getState().activeEffects.includes('filter_confetti')) {
          useRoomStore.getState().toggleEffect('filter_confetti');
        }
      }, 4000);
    } else if (e.type === 'circle') {
      // Toggle sparkle for circle
      if (!activeEffects.includes('filter_sparkle')) toggleEffect('filter_sparkle');
      setTimeout(() => {
        if (useRoomStore.getState().activeEffects.includes('filter_sparkle')) {
          useRoomStore.getState().toggleEffect('filter_sparkle');
        }
      }, 3000);
    } else if (e.type === 'double_burst') {
      onGestureReaction?.('🔥');
      sendMessage?.({ type: 'reaction', emoji: '🔥' });
    }
  }, [mode, modeConfig, activeEffects, toggleEffect, onGestureReaction, sendMessage]);

  const handleMotion = useCallback((m: { hasMotion: boolean; cx: number; cy: number; area: number }) => {
    const threshold = (100 - gestureSensitivity) / 100 * 0.12;
    if (m.hasMotion && m.area > threshold) {
      useRoomStore.getState().setMotionData({ cx: m.cx, cy: m.cy, area: m.area });
    } else {
      useRoomStore.getState().setMotionData(null);
    }
  }, [gestureSensitivity]);

  useEffect(() => {
    if (!gestureMode || !videoRef.current) return;

    const detector = new GestureDetector(handleGesture, handleMotion);
    detectorRef.current = detector;

    const video = videoRef.current;
    if (video.readyState >= 2) {
      detector.start(video);
    } else {
      video.addEventListener('loadeddata', () => detector.start(video), { once: true });
    }

    return () => {
      detector.stop();
      detectorRef.current = null;
      useRoomStore.getState().setMotionData(null);
    };
  }, [gestureMode, videoRef, handleGesture, handleMotion]);

  if (!gestureMode) return null;

  return (
    <>
      {feedbacks.map(fb => (
        <div
          key={fb.id}
          className="absolute z-40 pointer-events-none select-none flex flex-col items-center gap-1 animate-gesture-pop"
          style={{ left: `${fb.x}%`, top: `${fb.y}%`, transform: 'translate(-50%,-50%)' }}
        >
          <span className="text-5xl drop-shadow-lg">{fb.emoji}</span>
          <span className="text-xs text-white/80 glass-panel px-2 py-0.5 rounded-full font-medium">
            {fb.label}
          </span>
        </div>
      ))}

      {/* Gesture mode indicator dot */}
      <div className="absolute top-4 left-4 z-30">
        <div
          className="w-2 h-2 rounded-full bg-green-400 animate-pulse"
          title="Gesture detection active"
          style={{ boxShadow: '0 0 6px rgba(74,222,128,0.8)' }}
        />
      </div>
    </>
  );
}
