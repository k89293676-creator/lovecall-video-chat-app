import React, { useState } from 'react';
import { useRoomStore } from '@/store/room-store';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Wand2, Settings2, Sparkles, Music, X, 
  Eye, Droplet, Snowflake, Thermometer, Ghost, Target,
  Dices, Palette, MessageCircleHeart, Smile, Gift, Youtube
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';

export function Toolbox() {
  const { activeEffects, toggleEffect } = useRoomStore();
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const tabs = [
    { id: 'ar', icon: <Wand2 className="w-5 h-5" />, label: 'AR Effects' },
    { id: 'filters', icon: <Settings2 className="w-5 h-5" />, label: 'Filters' },
    { id: 'toys', icon: <Sparkles className="w-5 h-5" />, label: 'Toys' },
    { id: 'audio', icon: <Music className="w-5 h-5" />, label: 'Sound' },
  ];

  const handleTabClick = (id: string) => {
    if (activeTab === id) {
      setActiveTab(null);
    } else {
      setActiveTab(id);
    }
  };

  return (
    <div className="absolute top-1/2 -translate-y-1/2 left-6 z-40 flex items-start gap-4">
      {/* Tab Menu */}
      <div className="glass-panel rounded-2xl p-2 flex flex-col gap-2 shadow-2xl">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant="ghost"
            size="icon"
            onClick={() => handleTabClick(tab.id)}
            className={`w-12 h-12 rounded-xl transition-all duration-300 ${activeTab === tab.id ? 'bg-primary/20 text-primary shadow-[0_0_15px_rgba(225,29,72,0.4)]' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
          >
            {tab.icon}
          </Button>
        ))}
      </div>

      {/* Tab Content Panel */}
      {activeTab && (
        <div className="glass-panel w-72 h-[60vh] rounded-2xl flex flex-col overflow-hidden animate-in slide-in-from-left-4 fade-in duration-300">
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/20">
            <h3 className="text-lg font-serif font-semibold text-white tracking-wide">
              {tabs.find(t => t.id === activeTab)?.label}
            </h3>
            <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full text-white/50 hover:text-white hover:bg-white/10" onClick={() => setActiveTab(null)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <ScrollArea className="flex-1 p-4">
            {activeTab === 'ar' && <ARSection />}
            {activeTab === 'filters' && <FiltersSection />}
            {activeTab === 'toys' && <ToysSection />}
            {activeTab === 'audio' && <AudioSection />}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}

function ARSection() {
  const { activeEffects, toggleEffect } = useRoomStore();

  const toggle = (effect: string) => toggleEffect(`ar_${effect}`);
  const isActive = (effect: string) => activeEffects.includes(`ar_${effect}`);

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-3">
        <h4 className="text-xs uppercase tracking-widest text-primary font-semibold">Face Accessories</h4>
        <div className="grid grid-cols-2 gap-2">
          <EffectButton active={isActive('rose')} onClick={() => toggle('rose')}>Rose</EffectButton>
          <EffectButton active={isActive('horns')} onClick={() => toggle('horns')}>Horns</EffectButton>
          <EffectButton active={isActive('halo')} onClick={() => toggle('halo')}>Halo</EffectButton>
          <EffectButton active={isActive('glasses')} onClick={() => toggle('glasses')}>Glasses</EffectButton>
        </div>
      </div>
      
      <div className="space-y-3">
        <h4 className="text-xs uppercase tracking-widest text-primary font-semibold">Hand Gestures</h4>
        <p className="text-xs text-white/50">Show gestures to camera</p>
        <div className="flex flex-col gap-2">
          <EffectButton active={isActive('particles')} onClick={() => toggle('particles')} className="w-full justify-start text-sm h-10">Open Palm → Particles</EffectButton>
          <EffectButton active={isActive('masks')} onClick={() => toggle('masks')} className="w-full justify-start text-sm h-10">Pinch → Toggle Mask</EffectButton>
        </div>
      </div>
    </div>
  );
}

function FiltersSection() {
  const { activeEffects, toggleEffect } = useRoomStore();
  const toggle = (effect: string) => toggleEffect(`filter_${effect}`);
  const isActive = (effect: string) => activeEffects.includes(`filter_${effect}`);

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-3">
        <h4 className="text-xs uppercase tracking-widest text-primary font-semibold">Overlays</h4>
        <div className="grid grid-cols-2 gap-2">
          <EffectButton active={isActive('blindfold')} onClick={() => toggle('blindfold')} icon={<Eye className="w-4 h-4" />}>Silk</EffectButton>
          <EffectButton active={isActive('wax')} onClick={() => toggle('wax')} icon={<Droplet className="w-4 h-4" />}>Wax</EffectButton>
          <EffectButton active={isActive('ice')} onClick={() => toggle('ice')} icon={<Snowflake className="w-4 h-4" />}>Ice</EffectButton>
          <EffectButton active={isActive('leather')} onClick={() => toggle('leather')}>Leather</EffectButton>
        </div>
      </div>
      
      <div className="space-y-4">
        <h4 className="text-xs uppercase tracking-widest text-primary font-semibold">Adjustments</h4>
        <div className="space-y-2">
          <label className="text-xs text-white/70 flex justify-between">
            <span>Temperature</span>
            <Thermometer className="w-3 h-3 text-white/50" />
          </label>
          <Slider defaultValue={[50]} max={100} step={1} className="w-full" />
        </div>
        <div className="space-y-2">
          <label className="text-xs text-white/70 flex justify-between">
            <span>Vignette</span>
            <Target className="w-3 h-3 text-white/50" />
          </label>
          <Slider defaultValue={[50]} max={100} step={1} className="w-full" />
        </div>
      </div>
    </div>
  );
}

function ToysSection() {
  const { activeEffects, toggleEffect } = useRoomStore();
  const toggle = (effect: string) => toggleEffect(`toy_${effect}`);
  const isActive = (effect: string) => activeEffects.includes(`toy_${effect}`);

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-3">
        <h4 className="text-xs uppercase tracking-widest text-primary font-semibold">Interactive</h4>
        <div className="grid grid-cols-2 gap-2">
          <EffectButton active={isActive('dice')} onClick={() => toggle('dice')} icon={<Dices className="w-4 h-4" />}>Dice</EffectButton>
          <EffectButton active={isActive('canvas')} onClick={() => toggle('canvas')} icon={<Palette className="w-4 h-4" />}>Draw</EffectButton>
          <EffectButton active={isActive('compliment')} onClick={() => toggle('compliment')} icon={<MessageCircleHeart className="w-4 h-4" />}>Words</EffectButton>
          <EffectButton active={isActive('mood')} onClick={() => toggle('mood')} icon={<Smile className="w-4 h-4" />}>Mood</EffectButton>
        </div>
      </div>
      
      <div className="space-y-3">
        <h4 className="text-xs uppercase tracking-widest text-primary font-semibold">Gifts & Surprises</h4>
        <div className="flex flex-col gap-2">
          <Button variant="outline" className="w-full justify-start h-10 border-primary/30 text-primary hover:bg-primary/20 hover:text-primary">
            <Gift className="w-4 h-4 mr-2" /> Send Gift
          </Button>
          <Button variant="outline" className="w-full justify-start h-10 border-white/10 text-white/80 hover:bg-white/10 hover:text-white">
            <Ghost className="w-4 h-4 mr-2" /> Truth or Dare
          </Button>
        </div>
      </div>
    </div>
  );
}

function AudioSection() {
  const { activeEffects, toggleEffect } = useRoomStore();
  const toggle = (effect: string) => toggleEffect(`audio_${effect}`);
  const isActive = (effect: string) => activeEffects.includes(`audio_${effect}`);

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-3">
        <h4 className="text-xs uppercase tracking-widest text-primary font-semibold">Soundscapes</h4>
        <div className="grid grid-cols-1 gap-2">
          <EffectButton active={isActive('rain')} onClick={() => toggle('rain')} className="justify-start">Rain & Thunder</EffectButton>
          <EffectButton active={isActive('fire')} onClick={() => toggle('fire')} className="justify-start">Crackling Fireplace</EffectButton>
          <EffectButton active={isActive('jazz')} onClick={() => toggle('jazz')} className="justify-start">Soft Jazz</EffectButton>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-xs uppercase tracking-widest text-primary font-semibold">Voice FX</h4>
        <div className="grid grid-cols-2 gap-2">
          <EffectButton active={isActive('whisper')} onClick={() => toggle('whisper')}>Whisper</EffectButton>
          <EffectButton active={isActive('deep')} onClick={() => toggle('deep')}>Deep</EffectButton>
        </div>
      </div>
      
      <div className="space-y-3">
        <h4 className="text-xs uppercase tracking-widest text-primary font-semibold">Shared</h4>
        <Button variant="outline" className="w-full justify-start h-10 border-white/10 text-white/80 hover:bg-white/10 hover:text-white">
          <Youtube className="w-4 h-4 mr-2" /> Shared Playlist
        </Button>
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
