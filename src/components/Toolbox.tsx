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
import type { DrawTool } from '@/store/room-store';
import {
  Wand2, Settings2, Music, X,
  Eye, Droplet, Snowflake, Sun, Target, Heart,
  Gamepad2, EyeOff, Pencil, Eraser, Undo2, Redo2,
  Download, Sparkles, Star, Wind,
  Contrast, Activity,
} from 'lucide-react';

interface ToolboxProps {
  onAchievement?: (ach: { title: string; emoji: string }) => void;
  sendMessage?: (data: unknown) => void;
}

export function Toolbox({ onAchievement, sendMessage }: ToolboxProps) {
  const { mode, togglePrivacyMode } = useRoomStore();
  const modeConfig = getModeConfig(mode);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const tabs = [
    { id: 'mode',    icon: <span className="text-lg">{modeConfig.emoji}</span>, label: 'Mode' },
    { id: 'ar',      icon: <Wand2 className="w-5 h-5" />,     label: 'AR Effects' },
    { id: 'gesture', icon: <Activity className="w-5 h-5" />,  label: 'Gestures' },
    { id: 'filters', icon: <Settings2 className="w-5 h-5" />, label: 'Filters' },
    { id: 'draw',    icon: <Pencil className="w-5 h-5" />,    label: 'Draw' },
    { id: 'games',   icon: <Gamepad2 className="w-5 h-5" />,  label: 'Games' },
    { id: 'audio',   icon: <Music className="w-5 h-5" />,     label: 'Sound' },
  ];

  return (
    <div className="absolute top-1/2 -translate-y-1/2 left-4 z-40 flex items-start gap-3">
      <div className="glass-panel rounded-2xl p-2 flex flex-col gap-1.5 shadow-2xl">
        {tabs.map((tab) => (
          <Button key={tab.id} variant="ghost" size="icon"
            onClick={() => setActiveTab(activeTab === tab.id ? null : tab.id)}
            className={`w-11 h-11 rounded-xl transition-all duration-300 ${activeTab === tab.id ? 'bg-primary/20 text-primary shadow-[0_0_12px_rgba(225,29,72,0.4)]' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
            title={tab.label}
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
        <div className="glass-panel w-72 max-h-[80vh] rounded-2xl flex flex-col overflow-hidden animate-in slide-in-from-left-4 fade-in duration-300">
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/20 flex-shrink-0">
            <h3 className="text-sm font-serif font-semibold text-white tracking-wide">
              {tabs.find(t => t.id === activeTab)?.label}
            </h3>
            <Button variant="ghost" size="icon" className="w-7 h-7 rounded-full text-white/50 hover:text-white hover:bg-white/10" onClick={() => setActiveTab(null)}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
          <ScrollArea className="flex-1 p-4">
            {activeTab === 'mode'    && <ModeSelector onClose={() => setActiveTab(null)} onAchievement={onAchievement} />}
            {activeTab === 'ar'      && <ARSection onAchievement={onAchievement} />}
            {activeTab === 'gesture' && <GestureSection />}
            {activeTab === 'filters' && <FiltersSection />}
            {activeTab === 'draw'    && <DrawSection />}
            {activeTab === 'games'   && <GamePanel onAchievement={onAchievement} sendMessage={sendMessage} />}
            {activeTab === 'audio'   && <AudioSection onAchievement={onAchievement} />}
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
        <h4 className="text-xs uppercase tracking-widest text-primary font-semibold">Overlays</h4>
        <div className="grid grid-cols-2 gap-2">
          <EffectButton active={isActive('hearts')}       onClick={() => toggle('hearts')}       icon={<Heart className="w-4 h-4" />}>Floating Hearts</EffectButton>
          <EffectButton active={isActive('starfall')}     onClick={() => toggle('starfall')}     icon={<Star className="w-4 h-4" />}>Starfall</EffectButton>
          <EffectButton active={isActive('aurora')}       onClick={() => toggle('aurora')}       icon={<Wind className="w-4 h-4" />}>Aurora</EffectButton>
          <EffectButton active={isActive('butterflies')}  onClick={() => toggle('butterflies')}  icon={<span>🦋</span>}>Butterflies</EffectButton>
          <EffectButton active={isActive('petals')}       onClick={() => toggle('petals')}       icon={<span>🌸</span>}>Rose Petals</EffectButton>
          <EffectButton active={isActive('confetti')}     onClick={() => toggle('confetti')}     icon={<Sparkles className="w-4 h-4" />}>Confetti</EffectButton>
          <EffectButton active={isActive('sparkle')}      onClick={() => toggle('sparkle')}      icon={<span>✦</span>}>Sparkle</EffectButton>
          <EffectButton active={isActive('kaleidoscope')} onClick={() => toggle('kaleidoscope')} icon={<span>🔮</span>}>Kaleidoscope</EffectButton>
        </div>
      </div>
      <div className="space-y-2.5">
        <h4 className="text-xs uppercase tracking-widest text-primary font-semibold">Face AR — Hats &amp; Ears</h4>
        <p className="text-[10px] text-white/35">Anchored to real face landmarks</p>
        <div className="grid grid-cols-2 gap-2">
          <EffectButton active={activeEffects.includes('ar_crown')}     onClick={() => { toggleEffect('ar_crown');      const a=checkAndUnlock('effect'); if(a&&onAchievement)onAchievement(a); }} icon={<span>👑</span>}>Crown</EffectButton>
          <EffectButton active={activeEffects.includes('ar_halo')}      onClick={() => { toggleEffect('ar_halo');       const a=checkAndUnlock('effect'); if(a&&onAchievement)onAchievement(a); }} icon={<span>😇</span>}>Angel Halo</EffectButton>
          <EffectButton active={activeEffects.includes('ar_cat_ears')}  onClick={() => { toggleEffect('ar_cat_ears');   const a=checkAndUnlock('effect'); if(a&&onAchievement)onAchievement(a); }} icon={<span>🐱</span>}>Cat Ears</EffectButton>
          <EffectButton active={activeEffects.includes('ar_bunny_ears')} onClick={() => { toggleEffect('ar_bunny_ears'); const a=checkAndUnlock('effect'); if(a&&onAchievement)onAchievement(a); }} icon={<span>🐰</span>}>Bunny Ears</EffectButton>
          <EffectButton active={activeEffects.includes('ar_horns')}     onClick={() => { toggleEffect('ar_horns');      const a=checkAndUnlock('effect'); if(a&&onAchievement)onAchievement(a); }} icon={<span>😈</span>}>Devil Horns</EffectButton>
          <EffectButton active={activeEffects.includes('ar_rose')}      onClick={() => { toggleEffect('ar_rose');       const a=checkAndUnlock('effect'); if(a&&onAchievement)onAchievement(a); }} icon={<span>🌹</span>}>Rose Crown</EffectButton>
        </div>
      </div>
      <div className="space-y-2.5">
        <h4 className="text-xs uppercase tracking-widest text-primary font-semibold">Face AR — Eyes &amp; Glasses</h4>
        <div className="grid grid-cols-2 gap-2">
          <EffectButton active={activeEffects.includes('ar_glasses')}      onClick={() => { toggleEffect('ar_glasses');       const a=checkAndUnlock('effect'); if(a&&onAchievement)onAchievement(a); }} icon={<span>👓</span>}>Classic Glasses</EffectButton>
          <EffectButton active={activeEffects.includes('ar_glasses_cool')} onClick={() => { toggleEffect('ar_glasses_cool');  const a=checkAndUnlock('effect'); if(a&&onAchievement)onAchievement(a); }} icon={<span>🕶️</span>}>Cool Shades</EffectButton>
          <EffectButton active={activeEffects.includes('ar_glasses_heart')} onClick={() => { toggleEffect('ar_glasses_heart'); const a=checkAndUnlock('effect'); if(a&&onAchievement)onAchievement(a); }} icon={<span>🥽</span>}>Heart Glasses</EffectButton>
          <EffectButton active={activeEffects.includes('ar_gaze')}         onClick={() => { toggleEffect('ar_gaze');           const a=checkAndUnlock('effect'); if(a&&onAchievement)onAchievement(a); }} icon={<span>👁️</span>}>Eye Gaze Track</EffectButton>
        </div>
      </div>
      <div className="space-y-2.5">
        <h4 className="text-xs uppercase tracking-widest text-primary font-semibold">Face AR — Mouth &amp; Beard</h4>
        <div className="grid grid-cols-2 gap-2">
          <EffectButton active={activeEffects.includes('ar_clown_nose')}     onClick={() => { toggleEffect('ar_clown_nose');      const a=checkAndUnlock('effect'); if(a&&onAchievement)onAchievement(a); }} icon={<span>🤡</span>}>Clown Nose</EffectButton>
          <EffectButton active={activeEffects.includes('ar_mustache')}       onClick={() => { toggleEffect('ar_mustache');        const a=checkAndUnlock('effect'); if(a&&onAchievement)onAchievement(a); }} icon={<span>👨</span>}>Mustache</EffectButton>
          <EffectButton active={activeEffects.includes('ar_curly_mustache')} onClick={() => { toggleEffect('ar_curly_mustache');  const a=checkAndUnlock('effect'); if(a&&onAchievement)onAchievement(a); }} icon={<span>🎩</span>}>Curly Mustache</EffectButton>
          <EffectButton active={activeEffects.includes('ar_beard')}          onClick={() => { toggleEffect('ar_beard');           const a=checkAndUnlock('effect'); if(a&&onAchievement)onAchievement(a); }} icon={<span>🧔</span>}>Beard</EffectButton>
        </div>
      </div>
      <div className="space-y-2.5">
        <h4 className="text-xs uppercase tracking-widest text-primary font-semibold">Face AR — Makeup</h4>
        <p className="text-[10px] text-white/35">Anchored to lips and eyes</p>
        <div className="grid grid-cols-2 gap-2">
          <EffectButton active={activeEffects.includes('ar_lip_pink')}   onClick={() => { toggleEffect('ar_lip_pink');   const a=checkAndUnlock('effect'); if(a&&onAchievement)onAchievement(a); }} icon={<span>💋</span>}>Lip Pink</EffectButton>
          <EffectButton active={activeEffects.includes('ar_lip_red')}    onClick={() => { toggleEffect('ar_lip_red');    const a=checkAndUnlock('effect'); if(a&&onAchievement)onAchievement(a); }} icon={<span>❤️</span>}>Lip Red</EffectButton>
          <EffectButton active={activeEffects.includes('ar_eye_blue')}   onClick={() => { toggleEffect('ar_eye_blue');   const a=checkAndUnlock('effect'); if(a&&onAchievement)onAchievement(a); }} icon={<span>💙</span>}>Eye Shadow Blue</EffectButton>
          <EffectButton active={activeEffects.includes('ar_eye_purple')} onClick={() => { toggleEffect('ar_eye_purple'); const a=checkAndUnlock('effect'); if(a&&onAchievement)onAchievement(a); }} icon={<span>💜</span>}>Eye Shadow Purple</EffectButton>
        </div>
      </div>
      <div className="space-y-2.5">
        <h4 className="text-xs uppercase tracking-widest text-primary font-semibold">Face AR — Sparkle &amp; Mesh</h4>
        <div className="grid grid-cols-2 gap-2">
          <EffectButton active={activeEffects.includes('ar_glitter')}        onClick={() => { toggleEffect('ar_glitter');         const a=checkAndUnlock('effect'); if(a&&onAchievement)onAchievement(a); }} icon={<span>✨</span>}>Face Glitter</EffectButton>
          <EffectButton active={activeEffects.includes('ar_mesh')}           onClick={() => { toggleEffect('ar_mesh');            const a=checkAndUnlock('effect'); if(a&&onAchievement)onAchievement(a); }} icon={<span>🕸️</span>}>Face Mesh</EffectButton>
          <EffectButton active={activeEffects.includes('ar_head_indicator')} onClick={() => { toggleEffect('ar_head_indicator');  const a=checkAndUnlock('effect'); if(a&&onAchievement)onAchievement(a); }} icon={<span>🔄</span>}>Head Tilt Track</EffectButton>
        </div>
      </div>
      <div className="space-y-2.5">
        <h4 className="text-xs uppercase tracking-widest text-primary font-semibold">Motion-Reactive</h4>
        <p className="text-[10px] text-white/35">These effects respond to your movement</p>
        <div className="grid grid-cols-2 gap-2">
          <EffectButton active={isActive('motion_bloom')}  onClick={() => toggle('motion_bloom')}  icon={<span>🌟</span>}>Motion Bloom</EffectButton>
          <EffectButton active={isActive('light_trails')}  onClick={() => toggle('light_trails')}  icon={<span>💫</span>}>Light Trails</EffectButton>
        </div>
      </div>
      <div className="space-y-2.5">
        <h4 className="text-xs uppercase tracking-widest text-primary font-semibold">Atmosphere</h4>
        <div className="grid grid-cols-2 gap-2">
          <EffectButton active={isActive('blindfold')}  onClick={() => toggle('blindfold')}  icon={<Eye className="w-4 h-4" />}>Silk Blindfold</EffectButton>
          <EffectButton active={isActive('wax')}        onClick={() => toggle('wax')}        icon={<Droplet className="w-4 h-4" />}>Wax Drip</EffectButton>
          <EffectButton active={isActive('ice')}        onClick={() => toggle('ice')}        icon={<Snowflake className="w-4 h-4" />}>Ice Crystal</EffectButton>
          <EffectButton active={isActive('vignette')}   onClick={() => toggle('vignette')}   icon={<Target className="w-4 h-4" />}>Vignette</EffectButton>
          <EffectButton active={isActive('film_grain')} onClick={() => toggle('film_grain')} icon={<span>🎞</span>}>Film Grain</EffectButton>
        </div>
      </div>
    </div>
  );
}

function GestureSection() {
  const { gestureMode, setGestureMode, gestureSensitivity, setGestureSensitivity, mode } = useRoomStore();
  const modeConfig = getModeConfig(mode);

  const gestures = [
    { type: 'wave',          emoji: '👋', label: 'Wave',         desc: `Send ${modeConfig.gestureEmoji} reaction to partner` },
    { type: 'bigmove',       emoji: '💥', label: 'Big Move',     desc: 'Trigger confetti burst for 4 seconds' },
    { type: 'circle',        emoji: '🔄', label: 'Draw Circle',  desc: 'Toggle sparkle effect for 3 seconds' },
    { type: 'double_burst',  emoji: '⚡', label: 'Double Burst', desc: 'Send 🔥 reaction to partner' },
    { type: 'stillness_break', emoji: '✨', label: 'Appear',     desc: 'Greeting sparkle when you move after stillness' },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white">Live Detection</p>
          <p className="text-[10px] text-white/40 mt-0.5">Analyse camera for gestures</p>
        </div>
        <button
          onClick={() => setGestureMode(!gestureMode)}
          className={`relative w-12 h-6 rounded-full transition-all ${gestureMode ? 'bg-primary' : 'bg-white/15'}`}
        >
          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${gestureMode ? 'left-7' : 'left-1'}`} />
        </button>
      </div>

      {gestureMode && (
        <>
          {/* Sensitivity */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-white/60">
              <span>Sensitivity</span>
              <span>{gestureSensitivity}%</span>
            </div>
            <Slider value={[gestureSensitivity]} onValueChange={([v]) => setGestureSensitivity(v)}
              min={10} max={90} step={5} className="w-full" />
            <div className="flex justify-between text-[9px] text-white/25">
              <span>Less sensitive</span><span>More sensitive</span>
            </div>
          </div>

          {/* Gesture list */}
          <div className="space-y-2.5">
            <h4 className="text-xs uppercase tracking-widest text-primary font-semibold">
              Gestures in {modeConfig.name} Mode
            </h4>
            <div className="space-y-2">
              {gestures.map(g => (
                <div key={g.type} className="flex items-start gap-3 p-2.5 rounded-xl bg-black/30 border border-white/5">
                  <span className="text-2xl flex-shrink-0">{g.emoji}</span>
                  <div>
                    <p className="text-xs font-semibold text-white">{g.label}</p>
                    <p className="text-[10px] text-white/40 mt-0.5 leading-tight">{g.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* MediaPipe hand gestures */}
          <div className="space-y-2.5">
            <h4 className="text-xs uppercase tracking-widest text-primary font-semibold">Hand Gestures (MediaPipe)</h4>
            <p className="text-[10px] text-white/35">Hold pose 0.6 s to trigger — 15 total</p>
            <div className="space-y-2">
              {[
                { emoji: '✋', label: 'Open Palm',        desc: 'Particle burst from all fingertips (5 s)' },
                { emoji: '🤏', label: 'Pinch',            desc: 'Toggle Silk Blindfold overlay' },
                { emoji: '✌️', label: 'Peace',            desc: 'Float hearts to your partner' },
                { emoji: '👍', label: 'Thumbs Up',        desc: 'Send 👍 reaction to partner' },
                { emoji: '👎', label: 'Thumbs Down',      desc: 'Toggle contrast filter' },
                { emoji: '✊', label: 'Fist',             desc: 'Toggle privacy mode' },
                { emoji: '👌', label: 'OK Sign',          desc: 'Toggle soft blur effect' },
                { emoji: '🤘', label: 'Rock On',          desc: 'Star shower burst (6 s)' },
                { emoji: '🤙', label: 'Call Me',          desc: 'Send 🤙 reaction to partner' },
                { emoji: '🕷️', label: 'Spider-Man',      desc: 'Web particle stream (4 s)' },
                { emoji: '🫵', label: 'L-Shape',          desc: 'Toggle head tilt tracking' },
                { emoji: '🫶', label: 'Heart Hand',       desc: 'Giant floating heart burst' },
                { emoji: '🤞', label: 'Crossed Fingers',  desc: 'Wish with star burst' },
              ].map(g => (
                <div key={g.label} className="flex items-start gap-3 p-2.5 rounded-xl bg-black/30 border border-white/5">
                  <span className="text-2xl flex-shrink-0">{g.emoji}</span>
                  <div>
                    <p className="text-xs font-semibold text-white">{g.label}</p>
                    <p className="text-[10px] text-white/40 mt-0.5 leading-tight">{g.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Face tracking events */}
          <div className="space-y-2.5">
            <h4 className="text-xs uppercase tracking-widest text-primary font-semibold">Face Tracking Events</h4>
            <p className="text-[10px] text-white/35">Detected automatically via face landmarks</p>
            <div className="space-y-2">
              {[
                { emoji: '😮', label: 'Mouth Open',      desc: 'Star burst effect + 😮 float' },
                { emoji: '😊', label: 'Smile',           desc: 'Float hearts + 😊 reaction' },
                { emoji: '😉', label: 'Double Blink',    desc: 'Toggle vignette briefly' },
                { emoji: '🌞', label: 'Head Tilt Right', desc: 'Toggle warmth filter' },
                { emoji: '❄️', label: 'Head Tilt Left',  desc: 'Toggle cool filter' },
                { emoji: '🤨', label: 'Eyebrow Raise',   desc: 'Float 🤨 emoji' },
              ].map(g => (
                <div key={g.label} className="flex items-start gap-3 p-2.5 rounded-xl bg-black/30 border border-white/5">
                  <span className="text-2xl flex-shrink-0">{g.emoji}</span>
                  <div>
                    <p className="text-xs font-semibold text-white">{g.label}</p>
                    <p className="text-[10px] text-white/40 mt-0.5 leading-tight">{g.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 space-y-1.5">
            <p className="text-[10px] font-semibold text-primary uppercase tracking-wide">Tips</p>
            <p className="text-[10px] text-white/50 leading-relaxed">
              • Wave your hand left–right in front of the camera<br/>
              • Make a big motion to fill the frame for Big Move<br/>
              • Slowly trace a circle shape for the circle gesture<br/>
              • The green dot 🟢 at top-left shows detection is on<br/>
              • Hand skeleton is drawn live when MediaPipe is ready
            </p>
          </div>
        </>
      )}

      {!gestureMode && (
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
          <Activity className="w-8 h-8 mx-auto mb-2 text-white/20" />
          <p className="text-xs text-white/30">Enable live detection to use camera-based gestures</p>
        </div>
      )}
    </div>
  );
}

function FiltersSection() {
  const { videoFilter, setVideoFilter, brightness, setBrightness, warmth, setWarmth, contrast, setContrast } = useRoomStore();

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
            <span className="flex items-center gap-1.5"><Contrast className="w-3 h-3" /> Contrast</span>
            <span>{contrast}%</span>
          </div>
          <Slider value={[contrast]} onValueChange={([v]) => setContrast(v)} min={50} max={200} step={1} className="w-full" />
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

const DRAW_TOOLS: { id: DrawTool; label: string; icon: React.ReactNode }[] = [
  { id: 'pen',    label: 'Pen',    icon: <Pencil className="w-3.5 h-3.5" /> },
  { id: 'neon',   label: 'Neon',   icon: <Sparkles className="w-3.5 h-3.5" /> },
  { id: 'spray',  label: 'Spray',  icon: <Wind className="w-3.5 h-3.5" /> },
  { id: 'eraser', label: 'Eraser', icon: <Eraser className="w-3.5 h-3.5" /> },
  { id: 'stamp',  label: 'Stamp',  icon: <span className="text-sm">🖊</span> },
];

const STAMP_EMOJIS = ['❤️','💕','🌙','✨','🔥','🎉','🦋','🌸','💋','⭐','🌈','🎨'];
const COLORS = [
  '#e11d48','#ec4899','#f59e0b','#22c55e',
  '#3b82f6','#8b5cf6','#ffffff','#000000',
  '#f97316','#06b6d4','#84cc16','#a855f7',
];

function DrawSection() {
  const {
    isDrawingMode, setDrawingMode, drawColor, setDrawColor,
    drawSize, setDrawSize, drawTool, setDrawTool,
    drawOpacity, setDrawOpacity, stampEmoji, setStampEmoji,
    triggerDrawAction,
  } = useRoomStore();

  return (
    <div className="flex flex-col gap-4">
      <Button
        onClick={() => setDrawingMode(!isDrawingMode)}
        className={`w-full h-10 text-sm font-medium ${isDrawingMode ? 'bg-primary text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
      >
        <Pencil className="w-4 h-4 mr-2" />
        {isDrawingMode ? 'Drawing ON — click to stop' : 'Start Drawing'}
      </Button>

      {isDrawingMode && (
        <>
          <div className="space-y-2">
            <h4 className="text-xs uppercase tracking-widest text-primary font-semibold">Tool</h4>
            <div className="grid grid-cols-5 gap-1">
              {DRAW_TOOLS.map(t => (
                <button key={t.id}
                  onClick={() => setDrawTool(t.id)}
                  className={`h-10 rounded-lg flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-all border ${
                    drawTool === t.id
                      ? 'bg-primary/20 border-primary/50 text-primary'
                      : 'bg-black/30 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {t.icon}
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {drawTool === 'stamp' ? (
            <div className="space-y-2">
              <h4 className="text-xs uppercase tracking-widest text-primary font-semibold">Stamp</h4>
              <div className="grid grid-cols-6 gap-1.5">
                {STAMP_EMOJIS.map(e => (
                  <button key={e}
                    onClick={() => setStampEmoji(e)}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all ${
                      stampEmoji === e ? 'bg-primary/30 ring-1 ring-primary scale-110' : 'hover:bg-white/10 hover:scale-110'
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <h4 className="text-xs uppercase tracking-widest text-primary font-semibold">Color</h4>
                <div className="grid grid-cols-6 gap-1.5">
                  {COLORS.map(c => (
                    <button key={c}
                      onClick={() => setDrawColor(c)}
                      className={`w-9 h-9 rounded-full border-2 transition-all ${drawColor === c ? 'border-white scale-115' : 'border-transparent hover:scale-110'}`}
                      style={{ background: c }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-white/50">Custom:</span>
                  <input type="color" value={drawColor} onChange={e => setDrawColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer bg-transparent border-0" />
                  <div className="flex-1 h-6 rounded-full ml-1" style={{ background: drawColor, boxShadow: drawTool === 'neon' ? `0 0 10px ${drawColor}` : undefined }} />
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <div className="flex justify-between text-xs text-white/60">
              <span>Size</span><span>{drawSize}px</span>
            </div>
            <Slider value={[drawSize]} onValueChange={([v]) => setDrawSize(v)} min={1} max={30} step={1} className="w-full" />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs text-white/60">
              <span>Opacity</span><span>{drawOpacity}%</span>
            </div>
            <Slider value={[drawOpacity]} onValueChange={([v]) => setDrawOpacity(v)} min={10} max={100} step={5} className="w-full" />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Button variant="ghost" size="sm" onClick={() => triggerDrawAction('undo')}
              className="text-white/60 hover:text-white border border-white/10 hover:border-white/20 text-xs">
              <Undo2 className="w-3 h-3 mr-1" />Undo
            </Button>
            <Button variant="ghost" size="sm" onClick={() => triggerDrawAction('redo')}
              className="text-white/60 hover:text-white border border-white/10 hover:border-white/20 text-xs">
              <Redo2 className="w-3 h-3 mr-1" />Redo
            </Button>
            <Button variant="ghost" size="sm" onClick={() => triggerDrawAction('save')}
              className="text-white/60 hover:text-white border border-white/10 hover:border-white/20 text-xs">
              <Download className="w-3 h-3 mr-1" />Save
            </Button>
          </div>

          <Button variant="ghost" size="sm" onClick={() => triggerDrawAction('clear')}
            className="w-full text-white/40 hover:text-red-400 border border-white/10 hover:border-red-400/30">
            <Eraser className="w-3 h-3 mr-2" />Clear Canvas
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
    { id: 'rain',    label: 'Rain',      emoji: '🌧️' },
    { id: 'fire',    label: 'Fireplace', emoji: '🔥' },
    { id: 'ocean',   label: 'Ocean',     emoji: '🌊' },
    { id: 'forest',  label: 'Forest',    emoji: '🌲' },
    { id: 'thunder', label: 'Thunder',   emoji: '⛈️' },
    { id: 'jazz',    label: 'Jazz',      emoji: '🎷' },
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
  active, onClick, children, icon, className = '',
}: {
  active: boolean; onClick: () => void; children: React.ReactNode;
  icon?: React.ReactNode; className?: string;
}) {
  return (
    <Button
      variant="outline"
      className={`h-11 border-white/10 transition-all text-xs ${
        active
          ? 'bg-primary/20 border-primary/50 text-primary shadow-[0_0_10px_rgba(225,29,72,0.3)]'
          : 'bg-black/40 text-white/70 hover:bg-white/10 hover:text-white'
      } ${className}`}
      onClick={onClick}
    >
      {icon && <span className="mr-1.5">{icon}</span>}
      {children}
    </Button>
  );
}
