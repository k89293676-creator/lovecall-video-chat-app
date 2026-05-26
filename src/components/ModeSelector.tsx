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
        {MODES.map((m) => {
          const isActive = mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => handleSelect(m.id)}
              className="flex flex-col items-start gap-1 p-3 rounded-xl transition-all duration-200"
              style={{
                background: isActive ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.3)',
                border: `1px solid ${isActive ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.06)'}`,
                boxShadow: isActive ? `0 0 18px ${m.glowColor?.replace(',0.4',',0.25')}` : 'none',
                transform: isActive ? 'scale(1.02)' : 'scale(1)',
              }}
            >
              <span className="text-2xl leading-none">{m.emoji}</span>
              <span className={`text-xs font-semibold mt-0.5 ${isActive ? 'text-white' : 'text-white/80'}`}>{m.name}</span>
              <span className="text-[10px] text-white/38 leading-tight">{m.description}</span>
              {m.autoEffects.length > 0 && (
                <div className="flex flex-wrap gap-0.5 mt-1">
                  {m.autoEffects.slice(0, 2).map(e => (
                    <span
                      key={e}
                      className="text-[8px] px-1.5 py-0.5 rounded-full text-white/40"
                      style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      {e.replace('filter_', '')}
                    </span>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
