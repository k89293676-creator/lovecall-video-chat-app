import React, { useCallback } from 'react';
import { useRoomStore } from '@/store/room-store';
import { getModeConfig } from '@/lib/modes';
import { checkAndUnlock } from '@/lib/achievements';

interface RippleCanvasProps {
  onAchievement?: (ach: { title: string; emoji: string }) => void;
  sendMessage?: (data: unknown) => void;
}

export function RippleCanvas({ onAchievement, sendMessage }: RippleCanvasProps) {
  const { ripples, addRipple, removeRipple, mode } = useRoomStore();
  const modeConfig = getModeConfig(mode);

  const handleClick = useCallback((e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const id = `${Date.now()}-${Math.random()}`;
    const color = modeConfig.primaryColor;
    
    addRipple({ id, x, y, color, timestamp: Date.now() });
    setTimeout(() => removeRipple(id), 1200);

    if (sendMessage) {
      sendMessage({ type: 'ripple', x, y, color });
    }

    const ach = checkAndUnlock('ripple');
    if (ach && onAchievement) onAchievement(ach);
  }, [mode, addRipple, removeRipple, sendMessage]);

  return (
    <div
      className="absolute inset-0 z-15 pointer-events-auto"
      onClick={handleClick}
      style={{ cursor: 'crosshair' }}
    >
      {ripples.map((ripple) => (
        <div
          key={ripple.id}
          className="absolute pointer-events-none"
          style={{
            left: `${ripple.x}%`,
            top: `${ripple.y}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div
            className="w-16 h-16 rounded-full border-2"
            style={{
              borderColor: ripple.color,
              animation: 'ripple-expand 1.2s ease-out forwards',
              boxShadow: `0 0 20px ${ripple.color}`,
            }}
          />
          <div
            className="absolute inset-0 flex items-center justify-center text-2xl pointer-events-none"
            style={{ animation: 'heart-float 1.2s ease-out forwards' }}
          >
            💕
          </div>
        </div>
      ))}
    </div>
  );
}
