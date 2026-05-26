import React, { useState, useCallback } from 'react';
import { useRoomStore } from '@/store/room-store';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { ModeSelector } from '@/components/ModeSelector';
import { GamePanel } from '@/components/GamePanel';
import { VIDEO_FILTERS } from '@/components/VideoFilter';
import { playSoundscape, stopSoundscape, type SoundscapeId } from '@/lib/soundscape-engine';
import { getModeConfig } from '@/lib/modes';
import { checkAndUnlock } from '@/lib/achievements';
import {
  Wand2, Settings2, Music, X,
  Eye, Droplet, Snowflake, Sun, Target, Heart,
  Gamepad2, EyeOff, Pencil, Eraser
} from 'lucide-react';

interface ToolboxProps {
  onAchievement?: (ach: { title: string; emoji: string }) => void;
  sendMessage?: (data: unknown) => void;
}

export function Toolbox({ onAchievement, sendMessage }: ToolboxProps) {
  const { mode, togglePrivacyMode, isDrawingMode, setDrawingMode } = useRoomStore();
  const modeConfig = getModeConfig(mode);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const tabs = [
    { id: 'mode', icon: <span className="text-lg">{modeConfig.emoji}</span>, label: 'Mode' },
    { id: 'ar', icon: <Wand2 className="w-5 h-5" />, label: 'AR Effects' },
    { id: 'filters', icon: <Settings2 className="w-5 h-5" />, label: 'Filters' },
    { id: 'draw', icon: <Pencil className="w-5 h-5" />, label: 'Draw' },
    { id: 'games', icon: <Gamepad2 className="w-5 h-5" />, label: 'Games' },
    { id: 'audio', icon: <Music className="w-5 h-5" />, label: 'Sound' },
  ];

  const handleTabClick = (id: string) => {
    setActiveTab(activeTab === id ? null : id);
  };

  return (
    <div className="absolute top-1/2 -translate-y-1/2 left-4 z-40 flex items-start gap-3">
      <div className="glass-panel rounded-2xl p-2 flex flex-col gap-1.5 shadow-2xl">
        {tabs.map((tab) => (
          <Button key={tab.id} variant="ghost" size="icon"
            onClick={() => handleTabClick(tab.id)}
            className={`w-11 h-11 rounded-xl transition-all duration-300 ${activeTab === tab.id ? 'bg-primary/20 text-primary shadow-[0_0_12px_rgba(225,29,72,0.4)]' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
          >
            {tab.icon}
          </Button>
        ))}
        <div className="w-full h-px bg-white/10 my-0.5" />
        <Button variant="ghost" size="icon"
          onClick={togglePrivacyMode}
          className="w-11 h-11 rounded-xl text-white/50 hover:text-white hover:bg-white/10"
          title="Privacy Mode (Ctrl+P)"
        >
          <EyeOff className="w-5 h-5" />
        </Button>
      </div>

      {activeTab && (
        <div className="glass-panel w-72 max-h-[70vh] rounded-2xl flex flex-col overflow-hidden animate-in slide-in-from-left-4 fade-in duration-300">
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/20 flex-shrink-0">
            <h3 className="text-sm font-serif font-semibold text-white tracking-wide">
              {tabs.find(t => t.id === activeTab)?.label}
            </h3>
            <Button variant="ghost" size="icon" className="w-7 h-7 rounded-full text-white/50 hover:text-white hover:bg-white/10" onClick={() => setActiveTab(null)}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
          <ScrollArea className="flex-1 p-4">
            {activeTab === 'mode' && <ModeSelector onClose={() => setActiveTab(null)} onAchievement={onAchievement} />}
            {activeTab === 'ar' && <ARSection onAchievement={onAchievement} />}
            {activeTab === 'filters' && <FiltersSection />}
            {activeTab === 'draw' && <DrawSection />}
            {activeTab === 'games' && <GamePanel onAchievement={onAchievement} sendMessage={sendMessage} />}
            {activeTab === 'audio' && <AudioSection onAchievement={onAchievement} />}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}

function ARSection({ onAchievement }: { onAchievement?: (a: { title: string; emoji: string }) => void }) {
  const { activeEffects, toggleEffect } = useRoomStore();
  const toggle = (effect: string) => {
    toggleEffect(`filter_${effect}`);
    const ach = checkAndUnlock('effect');
    if (ach && onAchievement) onAchievement(ach);
  };
  const isActive = (effect: string) => activeEffects.includes(`filter_${effect}`);

  return (
    <div className="flex flex-col gap-5">
      <div className="space-y-2.5">
        <h4 className="text-xs uppercase tracking-widest text-primary font-semibold">Canvas Overlays</h4>
        <div className="grid grid-cols-2 gap-2">
          <EffectButton active={isActive('blindfold')} onClick={() => toggle('blindfold')} icon={<Eye className="w-4 h-4" />}>Silk Blindfold</EffectButton>
          <EffectButton active={isActive('wax')} onClick={() => toggle('wax')} icon={<Droplet className="w-4 h-4" />}>Wax Drip</EffectButton>
          <EffectButton active={isActive('ice')} onClick={() => toggle('ice')} icon={<Snowflake className="w-4 h-4" />}>Ice Crystal</EffectButton>
          <EffectButton active={isActive('vignette')} onClick={() => toggle('vignette')} icon={<Target className="w-4 h-4" />}>Vignette</EffectButton>
          <EffectButton active={isActive('hearts')} onClick={() => toggle('hearts')} icon={<Heart className="w-4 h-4" />}>Floating Hearts</EffectButton>
        </div>
      </div>
    </div>
  );
}

function FiltersSection() {
  const { videoFilter, setVideoFilter, brightness, setBrightness, warmth, setWarmth } = useRoomStore();

  return (
    <div className="flex flex-col gap-5">
      <div className="space-y-2.5">
        <h4 className="text-xs uppercase tracking-widest text-primary font-semibold">Video Filter</h4>
        <div className="grid grid-cols-2 gap-1.5">
          {VIDEO_FILTERS.map(f => (
            <button key={f.id}
              onClick={() => setVideoFilter(f.id)}
              className={`h-10 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all border ${
                videoFilter === f.id
                  ? 'bg-primary/20 border-primary/50 text-primary'
                  : 'bg-black/30 border-white/5 text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span>{f.emoji}</span><span>{f.name}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <h4 className="text-xs uppercase tracking-widest text-primary font-semibold">Adjustments</h4>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-white/60">
            <span className="flex items-center gap-1.5"><Sun className="w-3 h-3" /> Brightness</span>
            <span>{brightness}%</span>
          </div>
          <Slider value={[brightness]} onValueChange={([v]) => setBrightness(v)} min={50} max={150} step={1} className="w-full" />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-white/60">
            <span>🌡️ Warmth</span>
            <span>{warmth > 0 ? `+${warmth}` : warmth}</span>
          </div>
          <Slider value={[warmth + 50]} onValueChange={([v]) => setWarmth(v - 50)} min={0} max={100} step={1} className="w-full" />
        </div>
      </div>
    </div>
  );
}

function DrawSection() {
  const { isDrawingMode, setDrawingMode, drawColor, setDrawColor, drawSize, setDrawSize } = useRoomStore();
  const colors = ['#e11d48','#ec4899','#f59e0b','#22c55e','#3b82f6','#8b5cf6','#ffffff','#000000'];

  return (
    <div className="flex flex-col gap-5">
      <Button
        onClick={() => setDrawingMode(!isDrawingMode)}
        className={`w-full h-10 text-sm font-medium ${isDrawingMode ? 'bg-primary text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
      >
        <Pencil className="w-4 h-4 mr-2" />
        {isDrawingMode ? 'Drawing ON — Click to stop' : 'Start Drawing'}
      </Button>

      {isDrawingMode && (
        <>
          <div className="space-y-2">
            <h4 className="text-xs uppercase tracking-widest text-primary font-semibold">Color</h4>
            <div className="grid grid-cols-4 gap-2">
              {colors.map(c => (
                <button key={c}
                  onClick={() => setDrawColor(c)}
                  className={`w-10 h-10 rounded-full border-2 transition-all ${drawColor === c ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`}
                  style={{ background: c }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-white/50">Custom:</span>
              <input type="color" value={drawColor} onChange={e => setDrawColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer bg-transparent border-0" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-white/60">
              <span>Brush Size</span><span>{drawSize}px</span>
            </div>
            <Slider value={[drawSize]} onValueChange={([v]) => setDrawSize(v)} min={1} max={20} step={1} className="w-full" />
          </div>
          <Button variant="ghost" size="sm" onClick={() => setDrawingMode(false)}
            className="w-full text-white/50 hover:text-white border border-white/10 hover:border-white/20">
            <Eraser className="w-3 h-3 mr-2" /> Clear & Exit
          </Button>
        </>
      )}
    </div>
  );
}

function AudioSection({ onAchievement }: { onAchievement?: (a: { title: string; emoji: string }) => void }) {
  const [active, setActive] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    const next = new Set(active);
    if (next.has(id)) {
      stopSoundscape(id as SoundscapeId);
      next.delete(id);
    } else {
      playSoundscape(id as SoundscapeId);
      next.add(id);
      const ach = checkAndUnlock('soundscape');
      if (ach && onAchievement) onAchievement(ach);
    }
    setActive(new Set(next));
  }, [active, onAchievement]);

  const sounds: { id: SoundscapeId; label: string; emoji: string }[] = [
    { id: 'rain', label: 'Rain', emoji: '🌧️' },
    { id: 'fire', label: 'Fireplace', emoji: '🔥' },
    { id: 'ocean', label: 'Ocean', emoji: '🌊' },
    { id: 'forest', label: 'Forest', emoji: '🌲' },
    { id: 'thunder', label: 'Thunder', emoji: '⛈️' },
    { id: 'jazz', label: 'Jazz', emoji: '🎷' },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-2">
        <h4 className="text-xs uppercase tracking-widest text-primary font-semibold">Soundscapes</h4>
        <p className="text-[10px] text-white/40">Tap to toggle — layerable</p>
        <div className="grid grid-cols-2 gap-2">
          {sounds.map(s => (
            <EffectButton key={s.id} active={active.has(s.id)} onClick={() => toggle(s.id)}>
              <span className="mr-1.5">{s.emoji}</span>{s.label}
            </EffectButton>
          ))}
        </div>
      </div>
    </div>
  );
}

function EffectButton({ 
  active, 
  onClick, 
  children, 
  icon,
  className = ""
}: { 
  active: boolean; 
  onClick: () => void; 
  children: React.ReactNode; 
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <Button
      variant="outline"
      className={`h-12 border-white/10 transition-all ${
        active 
          ? 'bg-primary/20 border-primary/50 text-primary shadow-[0_0_10px_rgba(225,29,72,0.3)]' 
          : 'bg-black/40 text-white/70 hover:bg-white/10 hover:text-white'
      } ${className}`}
      onClick={onClick}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {children}
    </Button>
  );
}
