import React, { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';

interface AchievementToastProps {
  achievement: { title: string; description?: string; emoji: string } | null;
  onDone: () => void;
}

export function AchievementToast({ achievement, onDone }: AchievementToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!achievement) return;
    setVisible(true);
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 500);
    }, 3500);
    return () => clearTimeout(t);
  }, [achievement]);

  if (!achievement) return null;

  return (
    <div
      className={`fixed top-5 right-5 z-[100] flex items-center gap-3.5 transition-all duration-500 ${
        visible ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-[130%] opacity-0 scale-95'
      }`}
      style={{
        maxWidth: 300,
        background: 'rgba(8,6,16,0.85)',
        backdropFilter: 'blur(24px) saturate(1.8)',
        border: '1px solid rgba(255,200,50,0.25)',
        borderRadius: 18,
        padding: '14px 18px',
        boxShadow: '0 8px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.05) inset, 0 0 24px rgba(245,158,11,0.15)',
      }}
    >
      {/* Shimmer overlay */}
      <div className="absolute inset-0 rounded-[18px] shimmer opacity-60 pointer-events-none" />

      <div
        className="relative w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
        style={{
          background: 'linear-gradient(135deg, rgba(245,158,11,0.25) 0%, rgba(234,179,8,0.15) 100%)',
          border: '1px solid rgba(245,158,11,0.3)',
          boxShadow: '0 0 20px rgba(245,158,11,0.3)',
        }}
      >
        {achievement.emoji}
      </div>

      <div className="relative flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <Trophy className="w-3 h-3 text-yellow-400 flex-shrink-0" />
          <span className="text-[9px] uppercase tracking-[0.14em] text-yellow-400 font-bold">Achievement Unlocked</span>
        </div>
        <p className="text-sm font-semibold text-white leading-tight truncate">{achievement.title}</p>
        {achievement.description && (
          <p className="text-[11px] text-white/45 mt-0.5 leading-snug">{achievement.description}</p>
        )}
      </div>
    </div>
  );
}
