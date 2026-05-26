import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Heart, Sparkles, Video } from 'lucide-react';
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
    }, 3000);
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
      const size = Math.random() * 6 + 2;
      const color = selectedMode.particleColors[Math.floor(Math.random() * selectedMode.particleColors.length)];
      p.style.cssText = `width:${size}px;height:${size}px;background:${color};left:${Math.random()*100}vw;bottom:-10px;opacity:0;box-shadow:0 0 ${size*2}px ${color};animation-duration:${Math.random()*10+5}s;`;
      container.appendChild(p);
      particles.push(p);
      setTimeout(() => {
        if (container.contains(p)) container.removeChild(p);
        particles = particles.filter(x => x !== p);
      }, 15000);
    };

    const interval = setInterval(createParticle, 300);
    return () => {
      clearInterval(interval);
      particles.forEach(p => { if (container.contains(p)) container.removeChild(p); });
    };
  }, [selectedMode]);

  const handleCreateRoom = () => {
    setMode(selectedMode.id);
    const randomId = Math.random().toString(36).substring(2, 10);
    setLocation(`/room/${randomId}`);
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinId.trim()) {
      setLocation(`/room/${joinId.trim()}`);
    }
  };

  return (
    <div className={`relative min-h-[100dvh] w-full flex items-center justify-center overflow-hidden transition-all duration-1000 ${selectedMode.bgClass}`} ref={containerRef}>
      <div className="z-10 w-full max-w-md p-6 animate-in fade-in zoom-in duration-1000">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 text-primary mb-4"
            style={{ boxShadow: `0 0 20px ${selectedMode.glowColor}` }}>
            <Heart className="w-8 h-8 fill-primary" />
          </div>
          <h1 className="text-6xl font-serif font-bold text-white mb-2 tracking-tight">Moonlight</h1>
          <p className="text-white/50 font-sans text-base font-light tracking-wide">An intimate space for two.</p>
        </div>

        <div className="mb-5">
          <p className="text-xs text-white/40 uppercase tracking-widest text-center mb-3">Choose your vibe</p>
          <div className="grid grid-cols-7 gap-1.5">
            {MODES.map((m, i) => (
              <button key={m.id}
                onClick={() => { setSelectedMode(m); setModeIndex(i); }}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all duration-300 ${
                  selectedMode.id === m.id
                    ? 'bg-white/15 border-white/30 scale-105'
                    : 'bg-black/20 border-white/5 hover:bg-white/10 hover:border-white/20'
                }`}
              >
                <span className="text-xl">{m.emoji}</span>
                <span className="text-[9px] text-white/60 hidden sm:block truncate w-full text-center">{m.name}</span>
              </button>
            ))}
          </div>
          <p className="text-center text-sm text-white/60 mt-2 font-light transition-all duration-500">
            <span className="text-white font-medium">{selectedMode.name}</span> — {selectedMode.description}
          </p>
        </div>

        <Card className="glass-panel p-6 rounded-2xl flex flex-col gap-5">
          <Button size="lg"
            className="w-full h-14 text-base font-medium rounded-xl transition-all duration-300"
            style={{ boxShadow: `0 0 20px ${selectedMode.glowColor}` }}
            onClick={handleCreateRoom}
          >
            <Sparkles className="mr-2 w-5 h-5" />
            Create Private Room
          </Button>

          <div className="relative flex items-center">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="flex-shrink-0 mx-4 text-white/30 text-xs font-medium uppercase tracking-widest">or join</span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>

          <form onSubmit={handleJoinRoom} className="flex flex-col gap-3">
            <Input
              type="text"
              placeholder="Enter Room Code"
              className="h-13 bg-black/40 border-white/10 text-center text-lg tracking-widest uppercase focus-visible:ring-primary/50 rounded-xl"
              value={joinId}
              onChange={(e) => setJoinId(e.target.value.toUpperCase())}
            />
            <Button variant="secondary" size="lg"
              className="w-full h-12 text-base font-medium rounded-xl bg-white/5 hover:bg-white/10 border border-white/5"
              disabled={!joinId.trim()}
              type="submit"
            >
              <Video className="mr-2 w-5 h-5" />
              Join Partner
            </Button>
          </form>
        </Card>

        <p className="text-center text-xs text-white/25 mt-6 font-light tracking-wide">
          End-to-end encrypted · No servers · No traces
        </p>
      </div>
    </div>
  );
}
