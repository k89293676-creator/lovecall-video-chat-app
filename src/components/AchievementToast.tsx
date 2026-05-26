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
      className={`fixed top-6 right-6 z-[100] glass-panel rounded-2xl px-5 py-4 flex items-center gap-4 shadow-2xl transition-all duration-500 ${
        visible ? 'translate-x-0 opacity-100' : 'translate-x-[120%] opacity-0'
      }`}
      style={{ maxWidth: 280 }}
    >
      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-2xl flex-shrink-0">
        {achievement.emoji}
      </div>
      <div>
        <div className="flex items-center gap-2 mb-0.5">
          <Trophy className="w-3 h-3 text-yellow-400" />
          <span className="text-[10px] uppercase tracking-widest text-yellow-400 font-semibold">Achievement</span>
        </div>
        <p className="text-sm font-semibold text-white leading-tight">{achievement.title}</p>
        {achievement.description && (
          <p className="text-xs text-white/50 mt-0.5">{achievement.description}</p>
        )}
      </div>
    </div>
  );
}
