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

      {open && (
        <div className="absolute bottom-36 right-6 z-40 w-80 glass-panel rounded-2xl flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-300"
          style={{ marginRight: '10.5rem', maxHeight: '65vh' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/30 flex-shrink-0">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-white font-serif">Chat</span>
              <span className="text-[10px] text-white/30">e2e encrypted</span>
            </div>
            <Button variant="ghost" size="icon" className="w-6 h-6 rounded-full text-white/40 hover:text-white hover:bg-white/10"
              onClick={() => setOpen(false)}>
              <X className="w-3 h-3" />
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1 min-h-0">
            {chatMessages.length === 0 ? (
              <div className="text-center py-8 text-white/25 text-xs">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No messages yet — say hi! 👋
              </div>
            ) : (
              chatMessages.map((msg, i) => {
                const showTime = i === 0 || msg.timestamp - chatMessages[i - 1].timestamp > 120000;
                return (
                  <React.Fragment key={msg.id}>
                    {showTime && (
                      <div className="text-center text-[10px] text-white/25 py-1 my-1">
                        {formatTime(msg.timestamp)}
                      </div>
                    )}
                    <div className={`flex ${msg.from === 'me' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed break-words ${
                        msg.from === 'me'
                          ? 'bg-primary/80 text-white rounded-br-sm'
                          : 'bg-white/10 text-white/90 rounded-bl-sm'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  </React.Fragment>
                );
              })
            )}

            {/* Typing indicator */}
            {partnerIsTyping && (
              <div className="flex justify-start">
                <div className="bg-white/10 px-3 py-2 rounded-2xl rounded-bl-sm flex items-center gap-1">
                  {[0, 150, 300].map(delay => (
                    <div key={delay} className="w-1.5 h-1.5 rounded-full bg-white/50 animate-bounce"
                      style={{ animationDelay: `${delay}ms`, animationDuration: '0.8s' }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Emoji picker */}
          {showEmojis && (
            <div className="border-t border-white/5 bg-black/20 flex-shrink-0">
              {/* Tabs */}
              <div className="flex gap-1 px-2 pt-2 overflow-x-auto">
                {Object.keys(EMOJI_CATEGORIES).map(tab => (
                  <button key={tab}
                    onClick={() => setEmojiTab(tab)}
                    className={`text-[10px] whitespace-nowrap px-2 py-1 rounded-lg flex-shrink-0 transition-all ${
                      emojiTab === tab ? 'bg-primary/30 text-primary' : 'text-white/40 hover:text-white/70'
                    }`}
                  >
                    {tab.split(' ')[0]}
                  </button>
                ))}
              </div>
              {/* Emojis */}
              <div className="grid grid-cols-8 gap-0.5 p-2">
                {(EMOJI_CATEGORIES[emojiTab] ?? []).map(e => (
                  <button key={e} onClick={() => { setText(t => t + e); inputRef.current?.focus(); }}
                    className="text-xl hover:scale-125 transition-transform w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10">
                    {e}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="flex items-center gap-2 p-2 border-t border-white/10 bg-black/20 flex-shrink-0">
            <button onClick={() => setShowEmojis(s => !s)}
              className={`transition-colors flex-shrink-0 ${showEmojis ? 'text-primary' : 'text-white/40 hover:text-white/80'}`}>
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
