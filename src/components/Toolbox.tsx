import React, { useState, useCallback } from 'react';
import { useRoomStore } from '@/store/room-store';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { ModeSelector } from '@/components/ModeSelector';
import { GamePanel } from '@/components/GamePanel';
import { VIDEO_FILTERS } from '@/components/VideoFilter';
import { playSoundscape, stopSoundscape, setSoundscapeVolume, type SoundscapeId } from '@/lib/soundscape-engine';
import { getModeConfig } from '@/lib/modes';
import { checkAndUnlock } from '@/lib/achievements';
import type { DrawTool } from '@/store/room-store';
import {
  Wand2, Settings2, Music, X,
  Eye, Droplet, Snowflake, Sun, Target, Heart,
  Gamepad2, EyeOff, Pencil, Eraser, Undo2, Redo2,
  Download, Sparkles, Star, Wind, Zap,
  Contrast, Activity, PaintBucket, Volume2,
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
  const arToggle = (id: string) => { toggleEffect(id); const a = checkAndUnlock('effect'); if (a && onAchievement) onAchievement(a); };

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
          <EffectButton active={activeEffects.includes('ar_crown')}      onClick={() => arToggle('ar_crown')}      icon={<span>👑</span>}>Crown</EffectButton>
          <EffectButton active={activeEffects.includes('ar_halo')}       onClick={() => arToggle('ar_halo')}       icon={<span>😇</span>}>Angel Halo</EffectButton>
          <EffectButton active={activeEffects.includes('ar_cat_ears')}   onClick={() => arToggle('ar_cat_ears')}   icon={<span>🐱</span>}>Cat Ears</EffectButton>
          <EffectButton active={activeEffects.includes('ar_bunny_ears')} onClick={() => arToggle('ar_bunny_ears')} icon={<span>🐰</span>}>Bunny Ears</EffectButton>
          <EffectButton active={activeEffects.includes('ar_horns')}      onClick={() => arToggle('ar_horns')}      icon={<span>😈</span>}>Devil Horns</EffectButton>
          <EffectButton active={activeEffects.includes('ar_rose')}       onClick={() => arToggle('ar_rose')}       icon={<span>🌹</span>}>Rose Crown</EffectButton>
          <EffectButton active={activeEffects.includes('ar_dog_ears')}   onClick={() => arToggle('ar_dog_ears')}   icon={<span>🐶</span>}>Dog Ears</EffectButton>
          <EffectButton active={activeEffects.includes('ar_bear_ears')}  onClick={() => arToggle('ar_bear_ears')}  icon={<span>🐻</span>}>Bear Ears</EffectButton>
        </div>
      </div>
      <div className="space-y-2.5">
        <h4 className="text-xs uppercase tracking-widest text-primary font-semibold">Face AR — Eyes &amp; Glasses</h4>
        <div className="grid grid-cols-2 gap-2">
          <EffectButton active={activeEffects.includes('ar_glasses')}       onClick={() => arToggle('ar_glasses')}       icon={<span>👓</span>}>Classic Glasses</EffectButton>
          <EffectButton active={activeEffects.includes('ar_glasses_cool')}  onClick={() => arToggle('ar_glasses_cool')}  icon={<span>🕶️</span>}>Cool Shades</EffectButton>
          <EffectButton active={activeEffects.includes('ar_glasses_heart')} onClick={() => arToggle('ar_glasses_heart')} icon={<span>🥽</span>}>Heart Glasses</EffectButton>
          <EffectButton active={activeEffects.includes('ar_gaze')}          onClick={() => arToggle('ar_gaze')}          icon={<span>👁️</span>}>Eye Gaze Track</EffectButton>
        </div>
      </div>
      <div className="space-y-2.5">
        <h4 className="text-xs uppercase tracking-widest text-primary font-semibold">Face AR — Mouth &amp; Beard</h4>
        <div className="grid grid-cols-2 gap-2">
          <EffectButton active={activeEffects.includes('ar_clown_nose')}     onClick={() => arToggle('ar_clown_nose')}     icon={<span>🤡</span>}>Clown Nose</EffectButton>
          <EffectButton active={activeEffects.includes('ar_mustache')}       onClick={() => arToggle('ar_mustache')}       icon={<span>👨</span>}>Mustache</EffectButton>
          <EffectButton active={activeEffects.includes('ar_curly_mustache')} onClick={() => arToggle('ar_curly_mustache')} icon={<span>🎩</span>}>Curly Mustache</EffectButton>
          <EffectButton active={activeEffects.includes('ar_beard')}          onClick={() => arToggle('ar_beard')}          icon={<span>🧔</span>}>Beard</EffectButton>
        </div>
      </div>
      <div className="space-y-2.5">
        <h4 className="text-xs uppercase tracking-widest text-primary font-semibold">Face AR — Makeup</h4>
        <div className="grid grid-cols-2 gap-2">
          <EffectButton active={activeEffects.includes('ar_lip_pink')}   onClick={() => arToggle('ar_lip_pink')}   icon={<span>💋</span>}>Lip Pink</EffectButton>
          <EffectButton active={activeEffects.includes('ar_lip_red')}    onClick={() => arToggle('ar_lip_red')}    icon={<span>❤️</span>}>Lip Red</EffectButton>
          <EffectButton active={activeEffects.includes('ar_eye_blue')}   onClick={() => arToggle('ar_eye_blue')}   icon={<span>💙</span>}>Eye Shadow Blue</EffectButton>
          <EffectButton active={activeEffects.includes('ar_eye_purple')} onClick={() => arToggle('ar_eye_purple')} icon={<span>💜</span>}>Eye Shadow Purple</EffectButton>
          <EffectButton active={activeEffects.includes('ar_blush')}      onClick={() => arToggle('ar_blush')}      icon={<span>🌸</span>}>Blush</EffectButton>
          <EffectButton active={activeEffects.includes('ar_freckles')}   onClick={() => arToggle('ar_freckles')}   icon={<span>🟤</span>}>Freckles</EffectButton>
          <EffectButton active={activeEffects.includes('ar_eyelash')}    onClick={() => arToggle('ar_eyelash')}    icon={<span>👁️</span>}>Eyelashes</EffectButton>
          <EffectButton active={activeEffects.includes('ar_iris_glow')}  onClick={() => arToggle('ar_iris_glow')}  icon={<span>🌈</span>}>Iris Glow</EffectButton>
        </div>
      </div>
      <div className="space-y-2.5">
        <h4 className="text-xs uppercase tracking-widest text-primary font-semibold">Face AR — Extras</h4>
        <div className="grid grid-cols-2 gap-2">
          <EffectButton active={activeEffects.includes('ar_flower_crown')} onClick={() => arToggle('ar_flower_crown')} icon={<span>🌺</span>}>Flower Crown</EffectButton>
          <EffectButton active={activeEffects.includes('ar_glitter')}        onClick={() => arToggle('ar_glitter')}         icon={<span>✨</span>}>Face Glitter</EffectButton>
          <EffectButton active={activeEffects.includes('ar_mesh')}           onClick={() => arToggle('ar_mesh')}            icon={<span>🕸️</span>}>Face Mesh</EffectButton>
          <EffectButton active={activeEffects.includes('ar_head_indicator')} onClick={() => arToggle('ar_head_indicator')}  icon={<span>🔄</span>}>Head Tilt Track</EffectButton>
        </div>
      </div>
      <div className="space-y-2.5">
        <h4 className="text-xs uppercase tracking-widest text-primary font-semibold">Motion-Reactive</h4>
        <div className="grid grid-cols-2 gap-2">
          <EffectButton active={isActive('motion_bloom')} onClick={() => toggle('motion_bloom')} icon={<span>🌟</span>}>Motion Bloom</EffectButton>
          <EffectButton active={isActive('light_trails')} onClick={() => toggle('light_trails')} icon={<span>💫</span>}>Light Trails</EffectButton>
        </div>
      </div>
      <div className="space-y-2.5">
        <h4 className="text-xs uppercase tracking-widest text-primary font-semibold">Atmosphere</h4>
        <div className="grid grid-cols-2 gap-2">
          <EffectButton active={isActive('blindfold')} onClick={() => toggle('blindfold')} icon={<Eye className="w-4 h-4" />}>Silk Blindfold</EffectButton>
          <EffectButton active={isActive('wax')}       onClick={() => toggle('wax')}       icon={<Droplet className="w-4 h-4" />}>Wax Drip</EffectButton>
          <EffectButton active={isActive('ice')}       onClick={() => toggle('ice')}       icon={<Snowflake className="w-4 h-4" />}>Ice Crystal</EffectButton>
          <EffectButton active={isActive('vignette')}  onClick={() => toggle('vignette')}  icon={<Sun className="w-4 h-4" />}>Vignette</EffectButton>
        </div>
      </div>
    </div>
  );
}

function GestureSection() {
  const { gestureMode, setGestureMode, gestureSensitivity, setGestureSensitivity } = useRoomStore();
  return (
    <div className="flex flex-col gap-4">
      <Button onClick={() => setGestureMode(!gestureMode)}
        className={`w-full h-10 text-sm ${gestureMode ? 'bg-primary text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}>
        <Activity className="w-4 h-4 mr-2" />
        {gestureMode ? 'Gestures ON' : 'Gestures OFF'}
      </Button>
      {gestureMode && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-white/60">
            <span>Sensitivity</span><span>{gestureSensitivity}%</span>
          </div>
          <Slider value={[gestureSensitivity]} onValueChange={([v]) => setGestureSensitivity(v)} min={10} max={100} step={5} />
          <p className="text-[10px] text-white/30 leading-relaxed">Higher = triggers faster but may have more false positives.</p>
        </div>
      )}
      <div className="bg-black/30 rounded-xl p-3 border border-white/10 space-y-1.5">
        <p className="text-[10px] text-primary font-semibold uppercase tracking-widest mb-2">Gesture Actions</p>
        {[
          ['✋', 'Open Palm', 'Particle burst'],
          ['🤏', 'Pinch', 'Toggle blindfold'],
          ['✌️', 'Peace', 'Float hearts'],
          ['👍', 'Thumbs Up', 'Send reaction'],
          ['✊', 'Fist', 'Toggle privacy'],
          ['🫶', 'Heart Hand', 'Big heart burst'],
          ['☝️', 'Point', 'Toggle drawing'],
          ['🤞', 'Crossed', 'Lucky stars'],
        ].map(([emoji, name, action]) => (
          <div key={name} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-white/70"><span>{emoji}</span>{name}</span>
            <span className="text-white/30">{action}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FiltersSection() {
  const { videoFilter, setVideoFilter, brightness, setBrightness, warmth, setWarmth, contrast, setContrast } = useRoomStore();
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2">
        {VIDEO_FILTERS.map(f => (
          <EffectButton key={f.id} active={videoFilter === f.id} onClick={() => setVideoFilter(f.id)}>
            {f.name}
          </EffectButton>
        ))}
      </div>
      {[
        { label: 'Brightness', value: brightness, set: setBrightness, min: 40, max: 160 },
        { label: 'Warmth',     value: warmth,     set: setWarmth,     min: -40, max: 40 },
        { label: 'Contrast',   value: contrast,   set: setContrast,   min: 50, max: 200 },
      ].map(({ label, value, set, min, max }) => (
        <div key={label} className="space-y-2">
          <div className="flex justify-between text-xs text-white/60"><span>{label}</span><span>{value}</span></div>
          <Slider value={[value]} onValueChange={([v]) => set(v)} min={min} max={max} step={1} />
        </div>
      ))}
    </div>
  );
}

const DRAW_TOOLS: { id: DrawTool; label: string; icon: React.ReactNode }[] = [
  { id: 'pen',         label: 'Pen',        icon: <Pencil className="w-3.5 h-3.5" /> },
  { id: 'marker',      label: 'Marker',     icon: <PaintBucket className="w-3.5 h-3.5" /> },
  { id: 'neon',        label: 'Neon',       icon: <Sparkles className="w-3.5 h-3.5" /> },
  { id: 'glow',        label: 'Glow',       icon: <Zap className="w-3.5 h-3.5" /> },
  { id: 'rainbow',     label: 'Rainbow',    icon: <span className="text-sm">🌈</span> },
  { id: 'watercolor',  label: 'Water',      icon: <Droplet className="w-3.5 h-3.5" /> },
  { id: 'chalk',       label: 'Chalk',      icon: <span className="text-sm">🖍</span> },
  { id: 'calligraphy', label: 'Calligr.',   icon: <span className="text-sm">✒️</span> },
  { id: 'spray',       label: 'Spray',      icon: <Wind className="w-3.5 h-3.5" /> },
  { id: 'eraser',      label: 'Eraser',     icon: <Eraser className="w-3.5 h-3.5" /> },
  { id: 'stamp',       label: 'Stamp',      icon: <span className="text-sm">🖊</span> },
];

const STAMP_EMOJIS = ['❤️','💕','🌙','✨','🔥','🎉','🦋','🌸','💋','⭐','🌈','🎨','🫶','😍','🥰','🌹'];
const COLORS = [
  '#e11d48','#ec4899','#f59e0b','#22c55e',
  '#3b82f6','#8b5cf6','#ffffff','#000000',
  '#f97316','#06b6d4','#84cc16','#a855f7',
  '#fbbf24','#34d399','#f472b6','#94a3b8',
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
      <Button onClick={() => setDrawingMode(!isDrawingMode)}
        className={`w-full h-10 text-sm font-medium ${isDrawingMode ? 'bg-primary text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}>
        <Pencil className="w-4 h-4 mr-2" />
        {isDrawingMode ? 'Drawing ON — click to stop' : 'Start Drawing'}
      </Button>

      {isDrawingMode && (
        <>
          <div className="space-y-2">
            <h4 className="text-xs uppercase tracking-widest text-primary font-semibold">Tool</h4>
            <div className="grid grid-cols-3 gap-1">
              {DRAW_TOOLS.map(t => (
                <button key={t.id} onClick={() => setDrawTool(t.id)}
                  className={`h-10 rounded-lg flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-all border ${
                    drawTool === t.id
                      ? 'bg-primary/20 border-primary/50 text-primary'
                      : 'bg-black/30 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
                  }`}>
                  {t.icon}<span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {drawTool === 'stamp' ? (
            <div className="space-y-2">
              <h4 className="text-xs uppercase tracking-widest text-primary font-semibold">Stamp</h4>
              <div className="grid grid-cols-8 gap-1">
                {STAMP_EMOJIS.map(e => (
                  <button key={e} onClick={() => setStampEmoji(e)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg transition-all ${
                      stampEmoji === e ? 'bg-primary/30 ring-1 ring-primary scale-110' : 'hover:bg-white/10 hover:scale-110'
                    }`}>
                    {e}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <h4 className="text-xs uppercase tracking-widest text-primary font-semibold">Color</h4>
              <div className="grid grid-cols-8 gap-1">
                {COLORS.map(c => (
                  <button key={c} onClick={() => setDrawColor(c)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${drawColor === c ? 'border-white scale-115' : 'border-transparent hover:scale-110'}`}
                    style={{ background: c }} />
                ))}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-white/50">Custom:</span>
                <input type="color" value={drawColor} onChange={e => setDrawColor(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer bg-transparent border-0" />
                <div className="flex-1 h-6 rounded-full ml-1" style={{ background: drawColor, boxShadow: drawTool === 'neon' ? `0 0 10px ${drawColor}` : undefined }} />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex justify-between text-xs text-white/60"><span>Size</span><span>{drawSize}px</span></div>
            <Slider value={[drawSize]} onValueChange={([v]) => setDrawSize(v)} min={1} max={30} step={1} />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs text-white/60"><span>Opacity</span><span>{drawOpacity}%</span></div>
            <Slider value={[drawOpacity]} onValueChange={([v]) => setDrawOpacity(v)} min={10} max={100} step={5} />
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
  const [volumes, setVolumes] = useState<Record<string, number>>({});

  const toggle = useCallback((id: string) => {
    const next = new Set(active);
    if (next.has(id)) {
      stopSoundscape(id as SoundscapeId);
      next.delete(id);
    } else {
      playSoundscape(id as SoundscapeId, (volumes[id] ?? 60) / 100);
      next.add(id);
      const ach = checkAndUnlock('soundscape');
      if (ach && onAchievement) onAchievement(ach);
    }
    setActive(new Set(next));
  }, [active, volumes, onAchievement]);

  const setVol = useCallback((id: string, v: number) => {
    setVolumes(prev => ({ ...prev, [id]: v }));
    setSoundscapeVolume(id as SoundscapeId, v / 100);
  }, []);

  const sounds: { id: SoundscapeId; label: string; emoji: string }[] = [
    { id: 'rain',    label: 'Rain',      emoji: '🌧️' },
    { id: 'fire',    label: 'Fireplace', emoji: '🔥' },
    { id: 'ocean',   label: 'Ocean',     emoji: '🌊' },
    { id: 'forest',  label: 'Forest',    emoji: '🌲' },
    { id: 'thunder', label: 'Thunder',   emoji: '⛈️' },
    { id: 'jazz',    label: 'Jazz',      emoji: '🎷' },
    { id: 'city',    label: 'City',      emoji: '🏙️' },
    { id: 'cafe',    label: 'Café',      emoji: '☕' },
    { id: 'wind',    label: 'Wind',      emoji: '💨' },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="space-y-1">
        <h4 className="text-xs uppercase tracking-widest text-primary font-semibold">Soundscapes</h4>
        <p className="text-[10px] text-white/40">Layerable — drag to adjust volume</p>
      </div>
      {sounds.map(s => (
        <div key={s.id} className="space-y-1">
          <EffectButton active={active.has(s.id)} onClick={() => toggle(s.id)} className="w-full">
            <span className="mr-1.5">{s.emoji}</span>{s.label}
          </EffectButton>
          {active.has(s.id) && (
            <div className="flex items-center gap-2 px-1">
              <Volume2 className="w-3 h-3 text-white/30 flex-shrink-0" />
              <Slider
                value={[volumes[s.id] ?? 60]}
                onValueChange={([v]) => setVol(s.id, v)}
                min={0} max={100} step={2}
                className="flex-1"
              />
              <span className="text-[10px] text-white/30 w-7 text-right">{volumes[s.id] ?? 60}%</span>
            </div>
          )}
        </div>
      ))}
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
