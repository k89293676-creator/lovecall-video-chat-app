import React, { useEffect, useState, useRef } from 'react';
import { GESTURE_EMOJI, GESTURE_LABELS, type GestureName } from '@/hooks/use-gestures';

const COLOR: Record<GestureName, string> = {
  open_palm:       'text-violet-300 border-violet-500/40 bg-violet-900/40',
  pinch:           'text-pink-300 border-pink-500/40 bg-pink-900/40',
  peace:           'text-red-300 border-red-500/40 bg-red-900/40',
  thumbs_up:       'text-yellow-300 border-yellow-500/40 bg-yellow-900/40',
  thumbs_down:     'text-orange-300 border-orange-500/40 bg-orange-900/40',
  fist:            'text-gray-300 border-gray-500/40 bg-gray-900/40',
  wave:            'text-blue-300 border-blue-500/40 bg-blue-900/40',
  point:           'text-green-300 border-green-500/40 bg-green-900/40',
  ok_sign:         'text-emerald-300 border-emerald-500/40 bg-emerald-900/40',
  rock_on:         'text-purple-300 border-purple-500/40 bg-purple-900/40',
  call_me:         'text-cyan-300 border-cyan-500/40 bg-cyan-900/40',
  spider_man:      'text-red-300 border-red-500/40 bg-red-900/40',
  l_shape:         'text-indigo-300 border-indigo-500/40 bg-indigo-900/40',
  heart_hand:      'text-rose-300 border-rose-500/40 bg-rose-900/40',
  crossed_fingers: 'text-teal-300 border-teal-500/40 bg-teal-900/40',
  none:            '',
};

const EFFECT_DESC: Record<GestureName, string> = {
  open_palm:       'Particle burst from fingertips',
  pinch:           'Toggle blindfold',
  peace:           'Float hearts to partner',
  thumbs_up:       'Send 👍 reaction',
  thumbs_down:     'Toggle dark filter',
  fist:            'Toggle privacy mode',
  wave:            'Wave reaction',
  point:           'Toggle drawing mode',
  ok_sign:         'Toggle soft blur',
  rock_on:         '🤘 Star shower!',
  call_me:         'Send 🤙 emoji',
  spider_man:      'Web particle stream',
  l_shape:         'Laser pointer trail',
  heart_hand:      'Giant floating heart!',
  crossed_fingers: 'Wish for luck ✨',
  none:            '',
};

interface Props { gesture: GestureName }

const HISTORY_MAX = 5;

export function GestureIndicator({ gesture }: Props) {
  const [visible, setVisible] = useState(false);
  const [displayed, setDisplayed] = useState<GestureName>('none');
  const [animKey, setAnimKey] = useState(0);
  const [history, setHistory] = useState<{ name: GestureName; ts: number }[]>([]);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (gesture === 'none') return;
    setDisplayed(gesture);
    setVisible(true);
    setAnimKey(k => k + 1);
    setHistory(h => {
      const next = [{ name: gesture, ts: Date.now() }, ...h.filter(x => x.name !== gesture)].slice(0, HISTORY_MAX);
      return next;
    });
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setVisible(false), 2400);
    return () => {};
  }, [gesture]);

  if (!visible && history.length === 0) return null;

  const color = COLOR[displayed];
  const emoji = GESTURE_EMOJI[displayed];
  const label = GESTURE_LABELS[displayed];
  const desc  = EFFECT_DESC[displayed];

  return (
    <div className="fixed top-[72px] left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none">
      {/* Main indicator */}
      {visible && displayed !== 'none' && (
        <div
          key={animKey}
          className={`flex items-center gap-3 animate-in fade-in zoom-in-90 duration-200 ${color}`}
          style={{
            padding: '10px 20px',
            borderRadius: 20,
            backdropFilter: 'blur(20px) saturate(1.6)',
            border: '1px solid currentColor',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            opacity: 0.92,
          }}
        >
          <span className="text-[22px] leading-none">{emoji}</span>
          <div className="flex flex-col gap-0.5">
            <span className="text-[13px] font-bold tracking-wide leading-none">{label}</span>
            {desc && (
              <span className="text-[10px] leading-tight" style={{ opacity: 0.55 }}>{desc}</span>
            )}
          </div>
        </div>
      )}

      {/* Gesture history strip */}
      {history.length > 1 && (
        <div
          className="flex items-center gap-1.5 px-3 py-1.5"
          style={{
            background: 'rgba(0,0,0,0.38)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: 99,
          }}
        >
          {history.slice(1).map((h, i) => (
            <span
              key={h.ts}
              className="text-[15px] leading-none"
              style={{ opacity: Math.max(0.12, 0.65 - i * 0.16) }}
            >
              {GESTURE_EMOJI[h.name]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
