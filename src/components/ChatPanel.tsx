import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRoomStore } from '@/store/room-store';
import { Button } from '@/components/ui/button';
import { MessageCircle, Send, X, Smile } from 'lucide-react';

const QUICK_EMOJIS = ['❤️','😍','😂','🔥','💕','✨','🥰','😘','🫦','💋','🌹','🤭','😏','💌','🫶','⭐'];

const EMOJI_CATEGORIES: Record<string, string[]> = {
  '❤️ Love':    ['❤️','💕','💗','💖','💘','💝','🥰','😘','😍','😻','💞','💓','💟','🫀','❣️','💋'],
  '😂 Fun':     ['😂','🤣','😏','😜','🤭','🙈','🫠','😵','🤪','🥳','😈','👀','🫣','😤','🥹','😮‍💨'],
  '✨ Vibes':   ['✨','🔥','💫','⭐','🌟','🌈','🎉','🎊','🌸','🌺','🌻','🦋','🌙','☁️','🌠','🪄'],
  '🫶 Sweet':   ['🫶','🤗','🤝','👐','🙌','🫂','💆','🥺','😊','🥲','🫰','🤞','✌️','🤙','👋','🫡'],
};

interface ChatPanelProps {
  sendMessage?: (data: unknown) => void;
  sendTyping?: () => void;
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function ChatPanel({ sendMessage, sendTyping }: ChatPanelProps) {
  const { chatMessages, unreadCount, clearUnread, partnerIsTyping } = useRoomStore();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const [emojiTab, setEmojiTab] = useState('❤️ Love');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      clearUnread();
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, clearUnread]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, open, partnerIsTyping]);

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

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
    if (e.target.value.length > 0) {
      sendTyping?.();
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    }
  };

  return (
    <>
      {/* Chat toggle button */}
      <div className="absolute bottom-[88px] right-6 z-30" style={{ marginRight: '11rem' }}>
        <button
          onClick={() => { setOpen(o => !o); if (!open) clearUnread(); }}
          title="Chat"
          className="relative w-11 h-11 flex items-center justify-center rounded-[14px] transition-all duration-200 hover:scale-110 hover:-translate-y-px active:scale-95"
          style={{
            background: open ? 'hsl(var(--primary) / 0.22)' : 'rgba(10,8,18,0.6)',
            backdropFilter: 'blur(16px)',
            border: open ? '1px solid hsl(var(--primary) / 0.45)' : '1px solid rgba(255,255,255,0.1)',
            boxShadow: open ? '0 0 18px hsl(var(--primary) / 0.3)' : '0 4px 16px rgba(0,0,0,0.4)',
            color: open ? 'hsl(var(--primary))' : 'rgba(255,255,255,0.65)',
          }}
        >
          <MessageCircle className="w-5 h-5" />
          {unreadCount > 0 && !open && (
            <span className="unread-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
          )}
        </button>
      </div>

      {open && (
        <div
          className="absolute z-40 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-250"
          style={{
            bottom: '148px',
            right: 'calc(11.5rem + 24px)',
            width: 320,
            maxHeight: '62vh',
            background: 'rgba(8,6,16,0.75)',
            backdropFilter: 'blur(24px) saturate(1.6)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 20,
            boxShadow: '0 20px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.07)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.2)' }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'hsl(var(--primary) / 0.2)', border: '1px solid hsl(var(--primary) / 0.3)' }}
              >
                <MessageCircle className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-sm font-serif font-semibold text-white">Chat</span>
              <span className="text-[9px] text-white/25 font-medium tracking-wide">E2E encrypted</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-6 h-6 rounded-full flex items-center justify-center text-white/35 hover:text-white/80 hover:bg-white/10 transition-all"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-2.5 space-y-1 min-h-0">
            {chatMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <MessageCircle className="w-6 h-6 text-white/20" />
                </div>
                <p className="text-white/25 text-xs leading-relaxed">No messages yet<br />Say hi! 👋</p>
              </div>
            ) : (
              chatMessages.map((msg, i) => {
                const showTime = i === 0 || msg.timestamp - chatMessages[i - 1].timestamp > 120000;
                const isMe = msg.from === 'me';
                return (
                  <React.Fragment key={msg.id}>
                    {showTime && (
                      <div className="text-center text-[9px] text-white/22 py-1.5 my-0.5 font-medium">
                        {formatTime(msg.timestamp)}
                      </div>
                    )}
                    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className="max-w-[82%] px-3.5 py-2.5 text-[13px] leading-[1.45] break-words"
                        style={{
                          background: isMe
                            ? 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(330 80% 50%) 100%)'
                            : 'rgba(255,255,255,0.09)',
                          color: isMe ? '#fff' : 'rgba(255,255,255,0.88)',
                          borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                          boxShadow: isMe ? '0 2px 12px hsl(var(--primary) / 0.3)' : 'none',
                          border: isMe ? 'none' : '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        {msg.text}
                      </div>
                    </div>
                  </React.Fragment>
                );
              })
            )}

            {/* Typing indicator */}
            {partnerIsTyping && (
              <div className="flex justify-start pt-0.5">
                <div
                  className="px-3.5 py-2.5 flex items-center gap-1.5"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '18px 18px 18px 4px',
                  }}
                >
                  {[0, 140, 280].map(delay => (
                    <div
                      key={delay}
                      className="w-[5px] h-[5px] rounded-full bg-white/45 animate-bounce"
                      style={{ animationDelay: `${delay}ms`, animationDuration: '0.9s' }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Emoji picker */}
          {showEmojis && (
            <div
              className="flex-shrink-0"
              style={{ borderTop: '1px solid rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.25)' }}
            >
              <div className="flex gap-0.5 px-2 pt-2">
                {Object.keys(EMOJI_CATEGORIES).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setEmojiTab(tab)}
                    className="flex-1 text-[11px] whitespace-nowrap py-1.5 rounded-lg transition-all font-medium"
                    style={{
                      background: emojiTab === tab ? 'hsl(var(--primary) / 0.22)' : 'transparent',
                      color: emojiTab === tab ? 'hsl(var(--primary))' : 'rgba(255,255,255,0.35)',
                      border: emojiTab === tab ? '1px solid hsl(var(--primary) / 0.35)' : '1px solid transparent',
                    }}
                  >
                    {tab.split(' ')[0]}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-8 gap-0.5 p-2">
                {(EMOJI_CATEGORIES[emojiTab] ?? []).map(e => (
                  <button
                    key={e}
                    onClick={() => { setText(t => t + e); inputRef.current?.focus(); }}
                    className="text-[18px] w-8 h-8 flex items-center justify-center rounded-lg transition-all hover:bg-white/12 hover:scale-125 active:scale-95"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input row */}
          <div
            className="flex items-center gap-2 px-3 py-2.5 flex-shrink-0"
            style={{ borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.18)' }}
          >
            <button
              onClick={() => setShowEmojis(s => !s)}
              className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg transition-all"
              style={{ color: showEmojis ? 'hsl(var(--primary))' : 'rgba(255,255,255,0.35)' }}
            >
              <Smile className="w-4 h-4" />
            </button>
            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKey}
              placeholder="Message…"
              maxLength={500}
              className="flex-1 bg-transparent text-[13px] text-white placeholder:text-white/22 outline-none"
            />
            <button
              onClick={send}
              disabled={!text.trim()}
              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white transition-all hover:scale-110 active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed"
              style={{
                background: text.trim()
                  ? 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(330 80% 50%) 100%)'
                  : 'rgba(255,255,255,0.1)',
                boxShadow: text.trim() ? '0 0 14px hsl(var(--primary) / 0.45)' : 'none',
              }}
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
