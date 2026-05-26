import React, { useRef, useState, useCallback } from 'react';
import { useRoomStore } from '@/store/room-store';

// All AR face effect IDs that vibes can activate/clear
const ALL_AR_EFFECTS = [
  'ar_crown','ar_halo','ar_cat_ears','ar_bunny_ears','ar_horns',
  'ar_rose','ar_glasses','ar_glasses_cool','ar_glasses_heart',
  'ar_gaze','ar_clown_nose','ar_mustache','ar_curly_mustache',
  'ar_beard','ar_glitter','ar_mesh','ar_head_indicator',
];

// Valid IDs from VideoFilter.tsx:
// none | warm | cool | glamour | moody | rose | dream | noir | vintage
// neon | cherry | pastel | electric | midnight | sunset | velvet
interface ARVibe {
  id: string; name: string; emoji: string;
  accessories: string[];
  filter: string;
  gradient: string;
}

const VIBES: ARVibe[] = [
  {
    id: 'clear', name: 'Clear', emoji: '✨',
    accessories: [], filter: 'none',
    gradient: 'from-white/10 to-white/5',
  },
  {
    id: 'angel', name: 'Angel', emoji: '😇',
    accessories: ['ar_halo','ar_glasses_heart','ar_glitter'],
    filter: 'glamour',
    gradient: 'from-sky-400/25 to-violet-400/15',
  },
  {
    id: 'devil', name: 'Devil', emoji: '😈',
    accessories: ['ar_horns','ar_clown_nose','ar_glasses_cool'],
    filter: 'moody',
    gradient: 'from-red-600/25 to-orange-500/15',
  },
  {
    id: 'cat', name: 'Cat', emoji: '🐱',
    accessories: ['ar_cat_ears','ar_glitter','ar_gaze'],
    filter: 'rose',
    gradient: 'from-pink-500/25 to-rose-400/15',
  },
  {
    id: 'bunny', name: 'Bunny', emoji: '🐰',
    accessories: ['ar_bunny_ears','ar_glasses_heart','ar_glitter'],
    filter: 'pastel',
    gradient: 'from-pink-300/25 to-white/10',
  },
  {
    id: 'royal', name: 'Royal', emoji: '👑',
    accessories: ['ar_crown','ar_glasses_cool','ar_glitter'],
    filter: 'noir',
    gradient: 'from-amber-400/25 to-yellow-300/15',
  },
  {
    id: 'lover', name: 'Lover', emoji: '🌹',
    accessories: ['ar_rose','ar_glasses_heart','ar_glitter'],
    filter: 'cherry',
    gradient: 'from-rose-500/25 to-pink-400/15',
  },
  {
    id: 'wizard', name: 'Wizard', emoji: '🧙',
    accessories: ['ar_crown','ar_beard','ar_glasses','ar_mesh'],
    filter: 'vintage',
    gradient: 'from-violet-600/25 to-indigo-500/15',
  },
  {
    id: 'rockstar', name: 'Rockstar', emoji: '🤘',
    accessories: ['ar_glasses_cool','ar_glitter','ar_mustache'],
    filter: 'electric',
    gradient: 'from-orange-500/25 to-red-500/15',
  },
  {
    id: 'ghost', name: 'Ghost', emoji: '👻',
    accessories: ['ar_mesh','ar_gaze'],
    filter: 'midnight',
    gradient: 'from-slate-400/15 to-cyan-400/10',
  },
  {
    id: 'pirate', name: 'Pirate', emoji: '🏴‍☠️',
    accessories: ['ar_horns','ar_beard','ar_glasses_cool'],
    filter: 'moody',
    gradient: 'from-zinc-600/25 to-amber-700/15',
  },
  {
    id: 'clown', name: 'Clown', emoji: '🤡',
    accessories: ['ar_clown_nose','ar_curly_mustache','ar_halo'],
    filter: 'neon',
    gradient: 'from-emerald-400/15 to-pink-400/15',
  },
  {
    id: 'dream', name: 'Dream', emoji: '💭',
    accessories: ['ar_glitter','ar_gaze'],
    filter: 'dream',
    gradient: 'from-violet-300/20 to-sky-300/15',
  },
  {
    id: 'sunset', name: 'Sunset', emoji: '🌇',
    accessories: ['ar_rose','ar_halo'],
    filter: 'sunset',
    gradient: 'from-orange-400/25 to-rose-500/15',
  },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  sendMessage?: (data: unknown) => void;
}

export function ARFilterCarousel({ visible, onClose, sendMessage }: Props) {
  const [activeVibe, setActiveVibe] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const scrollStartX = useRef(0);

  const applyVibe = useCallback((vibe: ARVibe) => {
    const state = useRoomStore.getState();

    // Remove all AR effects, keep non-AR effects intact
    const kept = state.activeEffects.filter(e => !ALL_AR_EFFECTS.includes(e));

    if (vibe.id === 'clear') {
      state.setEffects(kept);
      state.setVideoFilter('none');
      setActiveVibe(null);
      return;
    }

    // Apply vibe: kept non-AR effects + vibe accessories
    state.setEffects([...kept, ...vibe.accessories]);
    state.setVideoFilter(vibe.filter);
    setActiveVibe(vibe.id);
    // Sync vibe with partner
    sendMessage?.({ type: 'ar_vibe', accessories: vibe.accessories, filter: vibe.filter });
  }, []);

  const onMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    dragStartX.current = e.clientX;
    scrollStartX.current = scrollRef.current?.scrollLeft ?? 0;
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    if (scrollRef.current) scrollRef.current.scrollLeft = scrollStartX.current - (e.clientX - dragStartX.current);
  };
  const onMouseUp = () => { isDragging.current = false; };

  const onTouchStart = (e: React.TouchEvent) => {
    dragStartX.current = e.touches[0].clientX;
    scrollStartX.current = scrollRef.current?.scrollLeft ?? 0;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (scrollRef.current) scrollRef.current.scrollLeft = scrollStartX.current - (e.touches[0].clientX - dragStartX.current);
  };

  if (!visible) return null;

  const activeVibeName = VIBES.find(v => v.id === activeVibe)?.name;

  return (
    <div className="fixed bottom-24 left-0 right-0 z-40">
      {/* Header */}
      <div className="flex items-center justify-between px-4 mb-2.5">
        <div className="glass-panel px-3 py-1.5 rounded-full flex items-center gap-2">
          <span className="text-sm">🎭</span>
          <span className="text-xs font-semibold text-white/80">AR Vibes</span>
          {activeVibe && activeVibe !== 'clear' && (
            <span className="text-[10px] text-primary/80">· {activeVibeName}</span>
          )}
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-black/80 transition-all text-xs font-medium"
        >
          ✕
        </button>
      </div>

      {/* Carousel strip */}
      <div
        ref={scrollRef}
        className="flex gap-2.5 px-4 pb-1 overflow-x-auto select-none"
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', cursor: 'grab' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
      >
        {VIBES.map((vibe) => {
          const isActive = activeVibe === vibe.id || (vibe.id === 'clear' && activeVibe === null);
          return (
            <button
              key={vibe.id}
              onClick={() => applyVibe(vibe)}
              className={`
                flex-shrink-0 flex flex-col items-center gap-1.5 px-3.5 py-3 rounded-2xl
                border backdrop-blur-xl transition-all duration-200 min-w-[72px]
                bg-gradient-to-b ${vibe.gradient}
                ${isActive
                  ? 'border-primary/70 shadow-[0_0_16px_rgba(225,29,72,0.5)] scale-105'
                  : 'border-white/10 hover:border-white/25 active:scale-95'
                }
              `}
              style={isActive ? { background: 'rgba(225,29,72,0.18)' } : { background: 'rgba(0,0,0,0.5)' }}
            >
              <span className="text-2xl leading-none">{vibe.emoji}</span>
              <span className={`text-[11px] font-semibold leading-tight ${isActive ? 'text-primary' : 'text-white/75'}`}>
                {vibe.name}
              </span>
              {isActive && <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
            </button>
          );
        })}
      </div>

      {/* Active vibe info bar */}
      {activeVibe && activeVibe !== 'clear' && (
        <div className="flex items-center gap-3 px-4 mt-2">
          <div className="glass-panel px-3 py-1 rounded-full flex items-center gap-2">
            <span className="text-[10px] text-white/40">
              {VIBES.find(v=>v.id===activeVibe)?.accessories.length} AR accessories applied
            </span>
            <button
              onClick={() => applyVibe(VIBES[0])}
              className="text-[10px] text-primary/80 hover:text-primary font-medium"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
