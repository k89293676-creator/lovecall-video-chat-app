import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { Heart, Sparkles, Video, Lock } from 'lucide-react';
import { MODES } from '@/lib/modes';
import { useRoomStore } from '@/store/room-store';

export default function Home() {
  const [_, setLocation] = useLocation();
  const [joinId, setJoinId] = useState('');
  const [selectedMode, setSelectedMode] = useState<typeof MODES[0]>(MODES[0]);
  const [modeIndex, setModeIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const { setMode } = useRoomStore();

  useEffect(() => {
    const t = setInterval(() => {
      setModeIndex(i => (i + 1) % MODES.length);
    }, 3200);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    setSelectedMode(MODES[modeIndex]);
  }, [modeIndex]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let particles: HTMLDivElement[] = [];

    const createParticle = () => {
      const p = document.createElement('div');
      p.className = 'particle';
      const size = Math.random() * 5 + 2;
      const color = selectedMode.particleColors[Math.floor(Math.random() * selectedMode.particleColors.length)];
      p.style.cssText = `width:${size}px;height:${size}px;background:${color};left:${Math.random()*100}vw;bottom:-10px;opacity:0;box-shadow:0 0 ${size*3}px ${color};animation-duration:${Math.random()*10+8}s;`;
      container.appendChild(p);
      particles.push(p);
      setTimeout(() => {
        if (container.contains(p)) container.removeChild(p);
        particles = particles.filter(x => x !== p);
      }, 18000);
    };

    const interval = setInterval(createParticle, 280);
    return () => {
      clearInterval(interval);
      particles.forEach(p => { if (container.contains(p)) container.removeChild(p); });
    };
  }, [selectedMode]);

  const handleCreateRoom = () => {
    setMode(selectedMode.id);
    const randomId = Math.random().toString(36).substring(2, 10).toUpperCase();
    setLocation(`/room/${randomId}`);
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinId.trim()) setLocation(`/room/${joinId.trim()}`);
  };

  return (
    <div
      className={`relative min-h-[100dvh] w-full flex items-center justify-center overflow-hidden transition-all duration-1000 ${selectedMode.bgClass}`}
      ref={containerRef}
    >
      {/* Ambient orbs */}
      <div
        className="absolute top-1/4 left-1/4 w-[520px] h-[520px] rounded-full blur-[120px] pointer-events-none transition-all duration-1000"
        style={{ background: selectedMode.glowColor, opacity: 0.15 }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-[380px] h-[380px] rounded-full blur-[100px] pointer-events-none transition-all duration-1000"
        style={{ background: selectedMode.glowColor, opacity: 0.08 }}
      />

      <div className="z-10 w-full max-w-[400px] px-5 py-8 animate-in fade-in zoom-in-95 duration-700">

        {/* Hero */}
        <div className="text-center mb-9">
          <div
            className="inline-flex items-center justify-center w-[72px] h-[72px] rounded-[22px] mb-5 relative transition-all duration-700"
            style={{
              background: `radial-gradient(circle at 40% 30%, rgba(255,255,255,0.12), rgba(10,6,14,0.8))`,
              boxShadow: `0 0 0 1px rgba(255,255,255,0.1), 0 0 36px ${selectedMode.glowColor}`,
            }}
          >
            <Heart
              className="w-8 h-8 fill-white text-white"
              style={{ filter: `drop-shadow(0 0 14px ${selectedMode.glowColor})` }}
            />
            <div
              className="absolute inset-0 rounded-[22px] animate-soft-pulse"
              style={{ boxShadow: `0 0 28px ${selectedMode.glowColor}`, animationDuration: '2.8s' }}
            />
          </div>

          <h1 className="text-[62px] leading-none font-serif font-bold mb-3 tracking-tight text-gradient">
            Moonlight
          </h1>
          <p className="text-white/38 font-sans text-sm font-light tracking-[0.14em]">
            An intimate space for two
          </p>
        </div>

        {/* Mode selector */}
        <div className="mb-6">
          <p className="section-label text-center mb-3">Choose your vibe</p>
          <div className="grid grid-cols-9 gap-1.5 mb-3">
            {MODES.map((m, i) => (
              <button
                key={m.id}
                onClick={() => { setSelectedMode(m); setModeIndex(i); }}
                title={m.name}
                className="relative flex items-center justify-center rounded-xl transition-all duration-300"
                style={{
                  height: 40,
                  background: selectedMode.id === m.id ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${selectedMode.id === m.id ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.06)'}`,
                  transform: selectedMode.id === m.id ? 'scale(1.1)' : 'scale(1)',
                  boxShadow: selectedMode.id === m.id ? `0 0 16px ${selectedMode.glowColor?.replace(',0.4',',0.4')}` : 'none',
                }}
              >
                <span className="text-[18px] leading-none">{m.emoji}</span>
              </button>
            ))}
          </div>

          <div className="text-center text-sm transition-all duration-500 leading-snug">
            <span
              className="font-semibold text-white"
              style={{ textShadow: `0 0 24px ${selectedMode.glowColor}` }}
            >
              {selectedMode.name}
            </span>
            <span className="text-white/25 mx-2">·</span>
            <span className="text-white/40 text-xs">{selectedMode.description}</span>
          </div>
        </div>

        {/* Card */}
        <div className="glass-panel-strong rounded-2xl overflow-hidden">
          {/* Create room button */}
          <div className="p-5 pb-4">
            <button
              onClick={handleCreateRoom}
              className="group relative w-full h-[54px] rounded-xl text-white font-semibold text-[15px] overflow-hidden transition-all duration-250 hover:scale-[1.02] hover:-translate-y-px active:scale-[0.98] active:translate-y-0"
              style={{
                background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(330 80% 55%) 100%)',
                boxShadow: `0 4px 28px ${selectedMode.glowColor?.replace(',0.4',',0.5')}, 0 0 0 1px rgba(255,255,255,0.08) inset`,
              }}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                <Sparkles className="w-[18px] h-[18px]" />
                Create Private Room
              </span>
              <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-400" />
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 px-5 pb-4">
            <div className="flex-1 h-px bg-white/8" />
            <span className="text-white/22 text-[10px] font-semibold uppercase tracking-[0.14em]">or join</span>
            <div className="flex-1 h-px bg-white/8" />
          </div>

          {/* Join form */}
          <form onSubmit={handleJoinRoom} className="px-5 pb-5 flex flex-col gap-2.5">
            <input
              type="text"
              placeholder="Enter Room Code"
              className="w-full h-[50px] px-4 text-center text-[18px] tracking-[0.24em] uppercase font-medium text-white placeholder:text-white/18 glass-input rounded-xl"
              value={joinId}
              onChange={(e) => setJoinId(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              maxLength={8}
            />
            <button
              type="submit"
              disabled={!joinId.trim()}
              className="w-full h-[44px] rounded-xl text-sm font-medium text-white/60 hover:text-white/90 disabled:opacity-25 transition-all duration-200 flex items-center justify-center gap-2 disabled:cursor-not-allowed"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
              onMouseEnter={e => { if (!joinId.trim()) return; (e.currentTarget.style.background = 'rgba(255,255,255,0.09)'); }}
              onMouseLeave={e => { (e.currentTarget.style.background = 'rgba(255,255,255,0.05)'); }}
            >
              <Video className="w-4 h-4" />
              Join Partner
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-center gap-1.5 text-white/20 text-[11px]">
          <Lock className="w-3 h-3 opacity-60" />
          <span>End-to-end encrypted · No servers · No traces</span>
        </div>
      </div>
    </div>
  );
}
