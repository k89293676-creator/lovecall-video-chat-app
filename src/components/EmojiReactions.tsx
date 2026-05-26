import React, { useState, useCallback } from 'react';

interface FloatingEmoji {
  id: string;
  emoji: string;
  x: number;
}

const REACTION_EMOJIS = ['❤️', '😍', '🔥', '💋', '🌙', '✨', '💕', '🎉'];

interface EmojiReactionsProps {
  sendMessage?: (data: unknown) => void;
}

export function EmojiReactions({ sendMessage }: EmojiReactionsProps) {
  const [floating, setFloating] = useState<FloatingEmoji[]>([]);
  const [open, setOpen] = useState(false);

  const launch = useCallback((emoji: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    const x = 40 + Math.random() * 20;
    setFloating(f => [...f, { id, emoji, x }]);
    sendMessage?.({ type: 'reaction', emoji });
    setTimeout(() => setFloating(f => f.filter(e => e.id !== id)), 3000);
  }, [sendMessage]);

  return (
    <>
      {floating.map(f => (
        <div
          key={f.id}
          className="fixed z-50 pointer-events-none select-none text-3xl animate-float-up"
          style={{ left: `${f.x}%`, bottom: '6rem' }}
        >
          {f.emoji}
        </div>
      ))}

      <div className="absolute bottom-24 right-48 z-30 flex flex-col items-end gap-2">
        {open && (
          <div className="glass-panel p-2 rounded-2xl grid grid-cols-4 gap-1.5 animate-in slide-in-from-bottom-2 fade-in duration-200">
            {REACTION_EMOJIS.map(emoji => (
              <button
                key={emoji}
                onClick={() => { launch(emoji); setOpen(false); }}
                className="w-10 h-10 flex items-center justify-center rounded-xl text-xl hover:bg-white/20 hover:scale-125 transition-all duration-150"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
        <button
          onClick={() => setOpen(o => !o)}
          className="glass-panel w-11 h-11 flex items-center justify-center rounded-full text-xl hover:scale-110 transition-all shadow-lg"
          title="Send Reaction"
        >
          {open ? '✕' : '❤️'}
        </button>
      </div>
    </>
  );
}
