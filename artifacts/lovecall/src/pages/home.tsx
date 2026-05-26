import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Heart, Sparkles, Video } from 'lucide-react';

export default function Home() {
  const [_, setLocation] = useLocation();
  const [joinId, setJoinId] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Background particles
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let particles: HTMLDivElement[] = [];
    const colors = ['#e11d48', '#be123c', '#9f1239'];

    const createParticle = () => {
      const p = document.createElement('div');
      p.className = 'particle';
      const size = Math.random() * 6 + 2;
      p.style.width = `${size}px`;
      p.style.height = `${size}px`;
      p.style.background = colors[Math.floor(Math.random() * colors.length)];
      p.style.left = `${Math.random() * 100}vw`;
      p.style.bottom = `-10px`;
      p.style.opacity = '0';
      p.style.boxShadow = `0 0 ${size * 2}px ${p.style.background}`;
      p.style.animationDuration = `${Math.random() * 10 + 5}s`;
      
      container.appendChild(p);
      particles.push(p);

      setTimeout(() => {
        if (container.contains(p)) {
          container.removeChild(p);
        }
        particles = particles.filter(part => part !== p);
      }, 15000);
    };

    const interval = setInterval(createParticle, 400);
    return () => {
      clearInterval(interval);
      particles.forEach(p => {
        if (container.contains(p)) container.removeChild(p);
      });
    };
  }, []);

  const handleCreateRoom = () => {
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
    <div className="relative min-h-[100dvh] w-full flex items-center justify-center overflow-hidden bg-gradient-romantic" ref={containerRef}>
      <div className="z-10 w-full max-w-md p-6 animate-in fade-in zoom-in duration-1000">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 text-primary mb-4 glow-effect">
            <Heart className="w-8 h-8 fill-primary" />
          </div>
          <h1 className="text-6xl font-serif font-bold text-white mb-2 tracking-tight">LoveCall</h1>
          <p className="text-muted-foreground font-sans text-lg font-light tracking-wide">An intimate space for two.</p>
        </div>

        <Card className="glass-panel p-8 rounded-2xl flex flex-col gap-6">
          <Button 
            size="lg" 
            className="w-full h-14 text-lg font-medium rounded-xl shadow-[0_0_20px_rgba(225,29,72,0.4)] hover:shadow-[0_0_30px_rgba(225,29,72,0.6)] transition-all duration-300"
            onClick={handleCreateRoom}
          >
            <Sparkles className="mr-2 w-5 h-5" />
            Create Private Room
          </Button>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="flex-shrink-0 mx-4 text-white/40 text-sm font-medium uppercase tracking-widest">OR</span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>

          <form onSubmit={handleJoinRoom} className="flex flex-col gap-3">
            <div className="relative">
              <Input 
                type="text" 
                placeholder="Enter Room Code" 
                className="h-14 bg-black/40 border-white/10 text-center text-lg tracking-widest uppercase focus-visible:ring-primary/50 rounded-xl"
                value={joinId}
                onChange={(e) => setJoinId(e.target.value.toUpperCase())}
              />
            </div>
            <Button 
              variant="secondary" 
              size="lg" 
              className="w-full h-14 text-lg font-medium rounded-xl bg-white/5 hover:bg-white/10 border border-white/5"
              disabled={!joinId.trim()}
              type="submit"
            >
              <Video className="mr-2 w-5 h-5" />
              Join Partner
            </Button>
          </form>
        </Card>

        <p className="text-center text-xs text-white/30 mt-8 font-light tracking-wide">
          End-to-end encrypted. No servers. No traces.
        </p>
      </div>
    </div>
  );
}
