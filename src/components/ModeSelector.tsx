import React from 'react';
import { useRoomStore } from '@/store/room-store';
import { MODES } from '@/lib/modes';
import { checkAndUnlock } from '@/lib/achievements';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ModeSelectorProps {
  onClose?: () => void;
  onAchievement?: (ach: { title: string; emoji: string }) => void;
}

export function ModeSelector({ onClose, onAchievement }: ModeSelectorProps) {
  const { mode, setMode } = useRoomStore();

  const handleSelect = (id: typeof mode) => {
    setMode(id);
    const ach = checkAndUnlock('mode');
    if (ach && onAchievement) onAchievement(ach);
    onClose?.();
  };

  return (
    <div className="grid grid-cols-2 gap-2 p-1">
      {MODES.map((m) => (
        <button
          key={m.id}
          onClick={() => handleSelect(m.id)}
          className={cn(
            'flex flex-col items-center gap-1 p-3 rounded-xl border transition-all duration-200 text-left',
            mode === m.id
              ? 'bg-white/15 border-white/30 shadow-inner'
              : 'bg-black/30 border-white/5 hover:bg-white/10 hover:border-white/20'
          )}
        >
          <span className="text-2xl">{m.emoji}</span>
          <span className="text-xs font-semibold text-white">{m.name}</span>
          <span className="text-[10px] text-white/50 text-center leading-tight">{m.description}</span>
        </button>
      ))}
    </div>
  );
}
