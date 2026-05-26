import React, { useState, useCallback } from 'react';

interface FloatingEmoji {
  id: string;
  emoji: string;
  x: number;
  scale: number;
}

const REACTION_CATEGORIES = [
  {
    label: 'Love',
    emojis: ['❤️', '💕', '💋', '🌹', '💖', '🫶', '💑', '😍', '🥰', '💌'],
  },
  {
    label: 'Vibe',
    emojis: ['🔥', '✨', '🌙', '⭐', '🎉', '🥂', '🎶', '🫦', '💫', '🌸'],
  },
  {
    label: 'Mood',
    emojis: ['😂', '😮', '😏', '🤭', '😘', '🤩', '😎', '🥺', '😜', '🫠'],
  },
];

interface EmojiReactionsProps {
  sendMessage?: (data: unknown) => void;
}

export function EmojiReactions({ sendMessage }: EmojiReactionsProps) {
  const [floating, setFloating] = useState<FloatingEmoji[]>([]);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(0);

  const launch = useCallback((emoji: string) => {
    const count = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      const id = `${Date.now()}-${Math.random()}-${i}`;
      const x = 38 + Math.random() * 24;
      const scale = 0.8 + Math.random() * 0.6;
      setFloating(f => [...f, { id, emoji, x, scale }]);
      sendMessage?.({ type: 'reaction', emoji });
      setTimeout(() => setFloating(f => f.filter(e => e.id !== id)), 3200);
    }
  }, [sendMessage]);

  return (
    <>
      {floating.map(f => (
        <div
          key={f.id}
          className="fixed z-50 pointer-events-none select-none animate-float-up"
          style={{
            left: `${f.x}%`,
            bottom: '6rem',
            fontSize: `${f.scale * 2}rem`,
            filter: 'drop-shadow(0 0 8px rgba(255,100,150,0.6))',
          }}
        >
          {f.emoji}
        </div>
      ))}

      <div className="absolute bottom-24 right-48 z-30 flex flex-col items-end gap-2">
        {open && (
          <div className="glass-panel rounded-2xl overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-200 shadow-2xl"
            style={{ width: 248 }}>
            {/* Tabs */}
            <div className="flex border-b border-white/10">
              {REACTION_CATEGORIES.map((cat, i) => (
                <button
                  key={cat.label}
                  onClick={() => setTab(i)}
                  className={`flex-1 py-2 text-[11px] font-semibold tracking-wide transition-all ${
                    tab === i ? 'text-primary border-b-2 border-primary bg-primary/10' : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Emoji grid */}
            <div className="p-2 grid grid-cols-5 gap-1">
              {REACTION_CATEGORIES[tab].emojis.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => { launch(emoji); setOpen(false); }}
                  className="w-10 h-10 flex items-center justify-center rounded-xl text-xl hover:bg-white/20 hover:scale-125 active:scale-95 transition-all duration-150"
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Quick-fire row */}
            <div className="px-2 pb-2 flex items-center gap-1">
              <span className="text-[9px] text-white/25 uppercase tracking-widest mr-1">Quick</span>
              {['❤️', '🔥', '😍', '💋', '✨'].map(emoji => (
                <button
                  key={emoji}
                  onClick={() => launch(emoji)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-base hover:bg-primary/20 hover:scale-110 active:scale-95 transition-all"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => setOpen(o => !o)}
          className={`glass-panel w-11 h-11 flex items-center justify-center rounded-full text-xl transition-all shadow-lg ${
            open
              ? 'text-primary bg-primary/20 shadow-[0_0_14px_rgba(225,29,72,0.5)] scale-110'
              : 'hover:scale-110 hover:shadow-[0_0_10px_rgba(225,29,72,0.3)]'
          }`}
          title="Send Reaction"
        >
          {open ? '✕' : '❤️'}
        </button>
      </div>
    </>
  );
}
