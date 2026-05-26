export type SoundscapeId = 'rain' | 'fire' | 'ocean' | 'forest' | 'city' | 'thunder' | 'jazz';

interface SoundscapeNode {
  gainNode: GainNode;
  sources: AudioBufferSourceNode[] | OscillatorNode[];
  stop: () => void;
}

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx || ctx.state === 'closed') {
    ctx = new AudioContext();
  }
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
  return ctx;
}

function createRain(ac: AudioContext, gain: GainNode): () => void {
  const bufferSize = ac.sampleRate * 2;
  const buf = ac.createBuffer(1, bufferSize, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.3;
  }

  const sources: AudioBufferSourceNode[] = [];
  
  const lowPass = ac.createBiquadFilter();
  lowPass.type = 'lowpass';
  lowPass.frequency.value = 1200;
  
  const highPass = ac.createBiquadFilter();
  highPass.type = 'highpass';
  highPass.frequency.value = 400;

  function spawnDrop() {
    const src = ac.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.connect(highPass);
    highPass.connect(lowPass);
    lowPass.connect(gain);
    src.start();
    sources.push(src);
    return src;
  }

  const main = spawnDrop();

  return () => {
    sources.forEach(s => { try { s.stop(); } catch {} });
  };
}

function createFire(ac: AudioContext, gain: GainNode): () => void {
  const oscillators: OscillatorNode[] = [];
  
  const crackleBuffer = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const d = crackleBuffer.getChannelData(0);
  for (let i = 0; i < d.length; i++) {
    d[i] = (Math.random() * 2 - 1) * (Math.random() > 0.98 ? 1 : 0.05);
  }
  
  const src = ac.createBufferSource();
  src.buffer = crackleBuffer;
  src.loop = true;
  
  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 800;
  filter.Q.value = 0.5;
  
  src.connect(filter);
  filter.connect(gain);
  src.start();

  const osc = ac.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.value = 80;
  const oscGain = ac.createGain();
  oscGain.gain.value = 0.05;
  osc.connect(oscGain);
  oscGain.connect(gain);
  osc.start();
  oscillators.push(osc);

  return () => {
    try { src.stop(); } catch {}
    oscillators.forEach(o => { try { o.stop(); } catch {} });
  };
}

function createOcean(ac: AudioContext, gain: GainNode): () => void {
  const buf = ac.createBuffer(1, ac.sampleRate * 4, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) {
    d[i] = (Math.random() * 2 - 1);
  }
  
  const src = ac.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 600;
  
  src.connect(filter);
  filter.connect(gain);
  src.start();

  return () => { try { src.stop(); } catch {} };
}

function createForest(ac: AudioContext, gain: GainNode): () => void {
  const oscs: OscillatorNode[] = [];
  
  [800, 1200, 1600, 2000, 3000].forEach((freq, i) => {
    const osc = ac.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq + Math.random() * 200;
    const g = ac.createGain();
    g.gain.value = 0.01 + Math.random() * 0.02;
    osc.connect(g);
    g.connect(gain);
    osc.start(ac.currentTime + i * 0.5);
    oscs.push(osc);
  });

  const buf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.1;
  const src = ac.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const f = ac.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 2000;
  f.Q.value = 2;
  src.connect(f);
  f.connect(gain);
  src.start();

  return () => {
    oscs.forEach(o => { try { o.stop(); } catch {} });
    try { src.stop(); } catch {};
  };
}

function createThunder(ac: AudioContext, gain: GainNode): () => void {
  const rainStop = createRain(ac, gain);
  let timeouts: ReturnType<typeof setTimeout>[] = [];
  let stopped = false;

  function rumble() {
    if (stopped) return;
    const buf = ac.createBuffer(1, ac.sampleRate * 3, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      const env = Math.exp(-i / (ac.sampleRate * 0.8));
      d[i] = (Math.random() * 2 - 1) * env;
    }
    const src = ac.createBufferSource();
    src.buffer = buf;
    const f = ac.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 200;
    src.connect(f);
    f.connect(gain);
    src.start();
    
    const t = setTimeout(rumble, 5000 + Math.random() * 10000);
    timeouts.push(t);
  }

  rumble();
  return () => {
    stopped = true;
    rainStop();
    timeouts.forEach(t => clearTimeout(t));
  };
}

function createJazz(ac: AudioContext, gain: GainNode): () => void {
  const oscs: OscillatorNode[] = [];
  const notes = [261, 293, 329, 370, 415, 440, 493, 523];
  let stopped = false;
  
  const playNote = () => {
    if (stopped) return;
    const osc = ac.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = notes[Math.floor(Math.random() * notes.length)];
    const g = ac.createGain();
    const dur = 0.3 + Math.random() * 0.5;
    g.gain.setValueAtTime(0.05, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    osc.connect(g);
    g.connect(gain);
    osc.start();
    osc.stop(ac.currentTime + dur);
    oscs.push(osc);
  };

  const interval = setInterval(playNote, 300 + Math.random() * 400);
  
  return () => {
    stopped = true;
    clearInterval(interval);
    oscs.forEach(o => { try { o.stop(); } catch {} });
  };
}

const activeSoundscapes = new Map<SoundscapeId, { gainNode: GainNode; stop: () => void }>();

export function playSoundscape(id: SoundscapeId, volume = 0.6): void {
  if (activeSoundscapes.has(id)) {
    stopSoundscape(id);
    return;
  }
  
  const ac = getCtx();
  const gainNode = ac.createGain();
  gainNode.gain.value = volume;
  gainNode.connect(ac.destination);

  let stopFn: () => void;
  switch (id) {
    case 'rain': stopFn = createRain(ac, gainNode); break;
    case 'fire': stopFn = createFire(ac, gainNode); break;
    case 'ocean': stopFn = createOcean(ac, gainNode); break;
    case 'forest': stopFn = createForest(ac, gainNode); break;
    case 'thunder': stopFn = createThunder(ac, gainNode); break;
    case 'jazz': stopFn = createJazz(ac, gainNode); break;
    case 'city': stopFn = createRain(ac, gainNode); break;
    default: stopFn = () => {};
  }

  activeSoundscapes.set(id, { gainNode, stop: stopFn });
}

export function stopSoundscape(id: SoundscapeId): void {
  const s = activeSoundscapes.get(id);
  if (s) {
    s.stop();
    try { s.gainNode.disconnect(); } catch {}
    activeSoundscapes.delete(id);
  }
}

export function stopAllSoundscapes(): void {
  activeSoundscapes.forEach((_, id) => stopSoundscape(id));
}

export function isSoundscapeActive(id: SoundscapeId): boolean {
  return activeSoundscapes.has(id);
}

export function setSoundscapeVolume(id: SoundscapeId, volume: number): void {
  const s = activeSoundscapes.get(id);
  if (s) s.gainNode.gain.value = volume;
}
