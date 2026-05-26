import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRoomStore } from '@/store/room-store';
import { Button } from '@/components/ui/button';
import { MessageCircle, Send, X, Smile } from 'lucide-react';

const QUICK_EMOJIS = ['❤️','😍','😂','🔥','💕','✨','🥰','😘'];

interface ChatPanelProps {
  sendMessage?: (data: unknown) => void;
}

export function ChatPanel({ sendMessage }: ChatPanelProps) {
  const { chatMessages, unreadCount, clearUnread } = useRoomStore();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      clearUnread();
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, clearUnread]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, open]);

  const send = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const msg = { id: `${Date.now()}-${Math.random()}`, text: trimmed, from: 'me' as const, timestamp: Date.now() };
    useRoomStore.getState().addChatMessage(msg);
    sendMessage?.({ type: 'chat', id: msg.id, text: trimmed, timestamp: msg.timestamp });
    setText('');
    setShowEmojis(false);
  }, [text, sendMessage]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <>
      {/* Toggle button */}
      <div className="absolute bottom-24 right-6 z-30" style={{ marginRight: '11rem' }}>
        <button
          onClick={() => { setOpen(o => !o); if (!open) clearUnread(); }}
          className="relative glass-panel w-11 h-11 flex items-center justify-center rounded-full hover:scale-110 transition-all text-white/70 hover:text-white shadow-lg"
          title="Chat"
        >
          <MessageCircle className="w-5 h-5" />
          {unreadCount > 0 && !open && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center animate-bounce">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Chat panel */}
      {open && (
        <div className="absolute bottom-36 right-6 z-40 w-80 glass-panel rounded-2xl flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-300"
          style={{ marginRight: '10.5rem', maxHeight: '60vh' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/30 flex-shrink-0">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-white font-serif">Chat</span>
              <span className="text-[10px] text-white/30">end-to-end encrypted</span>
            </div>
            <Button variant="ghost" size="icon" className="w-6 h-6 rounded-full text-white/40 hover:text-white hover:bg-white/10"
              onClick={() => setOpen(false)}>
              <X className="w-3 h-3" />
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0" style={{ maxHeight: '40vh' }}>
            {chatMessages.length === 0 ? (
              <div className="text-center py-8 text-white/25 text-xs">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No messages yet — say hi! 👋
              </div>
            ) : (
              chatMessages.map(msg => (
                <div key={msg.id} className={`flex ${msg.from === 'me' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed break-words ${
                    msg.from === 'me'
                      ? 'bg-primary/80 text-white rounded-br-sm'
                      : 'bg-white/10 text-white/90 rounded-bl-sm'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick emojis */}
          {showEmojis && (
            <div className="flex gap-1 px-3 py-2 border-t border-white/5 bg-black/20 flex-shrink-0">
              {QUICK_EMOJIS.map(e => (
                <button key={e} onClick={() => { setText(t => t + e); setShowEmojis(false); inputRef.current?.focus(); }}
                  className="text-xl hover:scale-125 transition-transform w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10">
                  {e}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="flex items-center gap-2 p-2 border-t border-white/10 bg-black/20 flex-shrink-0">
            <button onClick={() => setShowEmojis(s => !s)}
              className="text-white/40 hover:text-white/80 transition-colors flex-shrink-0">
              <Smile className="w-4 h-4" />
            </button>
            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Message…"
              maxLength={500}
              className="flex-1 bg-transparent text-white text-sm placeholder:text-white/25 outline-none"
            />
            <button onClick={send} disabled={!text.trim()}
              className="w-8 h-8 rounded-full bg-primary/80 flex items-center justify-center text-white disabled:opacity-30 hover:bg-primary transition-colors flex-shrink-0">
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
