import React, { useRef, useState, useCallback } from 'react';
import { useRoomStore } from '@/store/room-store';
import type { VideoFilterId } from '@/components/VideoFilter';

interface ARVibe {
  id: string;
  name: string;
  emoji: string;
  accessories: string[];
  filter?: VideoFilterId;
  description: string;
  gradient: string;
}

const VIBES: ARVibe[] = [
  {
    id: 'clear',
    name: 'Clear',
    emoji: '✨',
    accessories: [],
    filter: 'none',
    description: 'No effects',
    gradient: 'from-white/10 to-white/5',
  },
  {
    id: 'angel',
    name: 'Angel',
    emoji: '😇',
    accessories: ['ar_halo', 'ar_glasses_heart', 'ar_glitter'],
    filter: 'soft-glow',
    description: 'Halo + heart glasses + glitter',
    gradient: 'from-sky-400/30 to-violet-400/20',
  },
  {
    id: 'devil',
    name: 'Devil',
    emoji: '😈',
    accessories: ['ar_horns', 'ar_clown_nose', 'ar_glasses_cool'],
    filter: 'dramatic',
    description: 'Horns + cool shades + clown nose',
    gradient: 'from-red-600/30 to-orange-500/20',
  },
  {
    id: 'cat',
    name: 'Cat',
    emoji: '🐱',
    accessories: ['ar_cat_ears', 'ar_glitter', 'ar_gaze'],
    filter: 'rose',
    description: 'Cat ears + glitter + eye gaze',
    gradient: 'from-pink-500/30 to-rose-400/20',
  },
  {
    id: 'bunny',
    name: 'Bunny',
    emoji: '🐰',
    accessories: ['ar_bunny_ears', 'ar_glasses_heart', 'ar_glitter'],
    filter: 'soft-glow',
    description: 'Bunny ears + heart glasses',
    gradient: 'from-pink-300/30 to-white/10',
  },
  {
    id: 'royal',
    name: 'Royal',
    emoji: '👑',
    accessories: ['ar_crown', 'ar_glasses_cool', 'ar_glitter'],
    filter: 'cinematic',
    description: 'Crown + cool shades + glitter',
    gradient: 'from-amber-400/30 to-yellow-300/20',
  },
  {
    id: 'lover',
    name: 'Lover',
    emoji: '🌹',
    accessories: ['ar_rose', 'ar_glasses_heart', 'ar_glitter'],
    filter: 'rose',
    description: 'Rose crown + heart glasses',
    gradient: 'from-rose-500/30 to-pink-400/20',
  },
  {
    id: 'wizard',
    name: 'Wizard',
    emoji: '🧙',
    accessories: ['ar_crown', 'ar_beard', 'ar_glasses', 'ar_mesh'],
    filter: 'vintage',
    description: 'Crown + beard + mesh + vintage',
    gradient: 'from-violet-600/30 to-indigo-500/20',
  },
  {
    id: 'rockstar',
    name: 'Rockstar',
    emoji: '🤘',
    accessories: ['ar_glasses_cool', 'ar_glitter', 'ar_mustache'],
    filter: 'dramatic',
    description: 'Shades + glitter + mustache',
    gradient: 'from-orange-500/30 to-red-500/20',
  },
  {
    id: 'ghost',
    name: 'Ghost',
    emoji: '👻',
    accessories: ['ar_mesh', 'ar_gaze'],
    filter: 'ice',
    description: 'Face mesh + gaze + ice filter',
    gradient: 'from-slate-400/20 to-cyan-400/10',
  },
  {
    id: 'pirate',
    name: 'Pirate',
    emoji: '🏴‍☠️',
    accessories: ['ar_horns', 'ar_beard', 'ar_glasses_cool'],
    filter: 'cinematic',
    description: 'Horns + beard + cool shades',
    gradient: 'from-zinc-600/30 to-amber-700/20',
  },
  {
    id: 'clown',
    name: 'Clown',
    emoji: '🤡',
    accessories: ['ar_clown_nose', 'ar_curly_mustache', 'ar_halo'],
    filter: 'none',
    description: 'Clown nose + curly mustache + halo',
    gradient: 'from-emerald-400/20 to-pink-400/20',
  },
];

const ALL_AR_EFFECTS = [
  'ar_crown','ar_halo','ar_cat_ears','ar_bunny_ears','ar_horns',
  'ar_rose','ar_glasses','ar_glasses_cool','ar_glasses_heart',
  'ar_gaze','ar_clown_nose','ar_mustache','ar_curly_mustache',
  'ar_beard','ar_glitter','ar_mesh','ar_head_indicator','ar_particles','ar_rock',
];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function ARFilterCarousel({ visible, onClose }: Props) {
  const { activeEffects, toggleEffect, setVideoFilter } = useRoomStore();
  const [activeVibe, setActiveVibe] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const scrollStartX = useRef(0);

  const applyVibe = useCallback((vibe: ARVibe) => {
    const state = useRoomStore.getState();

    // Remove all existing AR accessories
    for (const effect of ALL_AR_EFFECTS) {
      if (state.activeEffects.includes(effect)) {
        toggleEffect(effect);
      }
    }

    if (vibe.id === 'clear') {
      setVideoFilter('none');
      setActiveVibe(null);
      return;
    }

    // Apply vibe accessories
    for (const acc of vibe.accessories) {
      toggleEffect(acc);
    }

    // Apply vibe filter
    if (vibe.filter) {
      setVideoFilter(vibe.filter as VideoFilterId);
    }

    setActiveVibe(vibe.id);
  }, [toggleEffect, setVideoFilter]);

  // Drag-to-scroll
  const onMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartX.current = e.clientX;
    scrollStartX.current = scrollRef.current?.scrollLeft ?? 0;
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartX.current;
    if (scrollRef.current) scrollRef.current.scrollLeft = scrollStartX.current - dx;
  };
  const onMouseUp = () => setIsDragging(false);

  if (!visible) return null;

  return (
    <div className="fixed bottom-24 left-0 right-0 z-40 pointer-events-none">
      <div className="pointer-events-auto">
        {/* Header row */}
        <div className="flex items-center justify-between px-4 mb-2">
          <div className="glass-panel px-3 py-1.5 rounded-full flex items-center gap-2">
            <span className="text-sm">🎭</span>
            <span className="text-xs font-semibold text-white/80">AR Vibes</span>
            {activeVibe && (
              <span className="text-[10px] text-primary/80">
                · {VIBES.find(v => v.id === activeVibe)?.name}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-black/70 transition-all text-xs"
          >
            ✕
          </button>
        </div>

        {/* Carousel */}
        <div
          ref={scrollRef}
          className="flex gap-3 px-4 pb-2 overflow-x-auto scrollbar-none select-none cursor-grab active:cursor-grabbing"
          style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          {VIBES.map((vibe) => {
            const isActive = vibe.id === 'clear' ? activeVibe === null : activeVibe === vibe.id;
            return (
              <button
                key={vibe.id}
                onClick={() => applyVibe(vibe)}
                className={`
                  flex-shrink-0 flex flex-col items-center gap-1.5 px-4 py-3 rounded-2xl
                  border backdrop-blur-xl transition-all duration-300 min-w-[80px]
                  ${isActive
                    ? 'border-primary/60 shadow-[0_0_20px_rgba(225,29,72,0.4)] scale-105'
                    : 'border-white/10 hover:border-white/25 hover:scale-102'
                  }
                  bg-gradient-to-b ${vibe.gradient}
                `}
                style={isActive ? { background: 'rgba(225,29,72,0.15)' } : { background: 'rgba(0,0,0,0.45)' }}
              >
                <span className="text-2xl leading-none">{vibe.emoji}</span>
                <span className={`text-[11px] font-semibold leading-tight ${isActive ? 'text-primary' : 'text-white/80'}`}>
                  {vibe.name}
                </span>
                {isActive && (
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                )}
              </button>
            );
          })}
        </div>

        {/* Active vibe description */}
        {activeVibe && (
          <div className="px-4 mt-1">
            <div className="glass-panel px-3 py-1.5 rounded-full inline-flex items-center gap-1.5">
              <span className="text-[10px] text-white/40">
                {VIBES.find(v => v.id === activeVibe)?.description}
              </span>
              <button
                onClick={() => applyVibe(VIBES[0])}
                className="text-[10px] text-primary/70 hover:text-primary ml-1 font-medium"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
