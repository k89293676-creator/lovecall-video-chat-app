import React, { useEffect } from 'react';
import { useRoomStore } from '@/store/room-store';
import { EyeOff } from 'lucide-react';

export function PrivacyMode() {
  const { privacyMode, togglePrivacyMode } = useRoomStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && privacyMode) togglePrivacyMode();
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault();
        togglePrivacyMode();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [privacyMode]);

  if (!privacyMode) return null;

  return (
    <div
      className="absolute inset-0 z-[90] bg-black flex flex-col items-center justify-center cursor-pointer select-none"
      onClick={togglePrivacyMode}
    >
      <div className="flex flex-col items-center gap-4 text-white/30">
        <EyeOff className="w-16 h-16" />
        <p className="text-sm font-light tracking-widest uppercase">Privacy Mode</p>
        <p className="text-xs text-white/20">Click or press Esc to resume</p>
      </div>
    </div>
  );
}
