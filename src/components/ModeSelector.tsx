import React from 'react';
import { useRoomStore } from '@/store/room-store';
import { MODES, getModeConfig } from '@/lib/modes';
import { checkAndUnlock } from '@/lib/achievements';
import { cn } from '@/lib/utils';

interface ModeSelectorProps {
  onClose?: () => void;
  onAchievement?: (ach: { title: string; emoji: string }) => void;
}

export function ModeSelector({ onClose, onAchievement }: ModeSelectorProps) {
  const { mode, setMode, activeEffects, setEffects } = useRoomStore();

  const handleSelect = (id: typeof mode) => {
    if (id === mode) { onClose?.(); return; }

    const prevConfig = getModeConfig(mode);
    const nextConfig = getModeConfig(id);

    // Remove previous mode's auto-effects, keep manually-added ones
    const prevAuto = new Set(prevConfig.autoEffects);
    const nextAuto = new Set(nextConfig.autoEffects);
    const manualEffects = activeEffects.filter(e => !prevAuto.has(e));
    const combined = [...new Set([...manualEffects, ...nextAuto])];
    setEffects(combined);

    setMode(id);
    const ach = checkAndUnlock('mode');
    if (ach && onAchievement) onAchievement(ach);
    onClose?.();
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[10px] text-white/30 uppercase tracking-widest">
        Switch mode to change AR effects &amp; vibe
      </p>
      <div className="grid grid-cols-2 gap-2">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => handleSelect(m.id)}
            className={cn(
              'flex flex-col items-start gap-1 p-3 rounded-xl border transition-all duration-200',
              mode === m.id
                ? 'bg-white/15 border-white/30 shadow-inner'
                : 'bg-black/30 border-white/5 hover:bg-white/10 hover:border-white/20'
            )}
          >
            <span className="text-2xl">{m.emoji}</span>
            <span className="text-xs font-semibold text-white">{m.name}</span>
            <span className="text-[10px] text-white/40 leading-tight">{m.description}</span>
            {m.autoEffects.length > 0 && (
              <div className="flex flex-wrap gap-0.5 mt-0.5">
                {m.autoEffects.slice(0, 2).map(e => (
                  <span key={e} className="text-[8px] px-1 py-0.5 rounded bg-white/10 text-white/40">
                    {e.replace('filter_', '')}
                  </span>
                ))}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
