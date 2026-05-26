export type SoundscapeId = 'rain' | 'fire' | 'ocean' | 'forest' | 'city' | 'thunder' | 'jazz' | 'cafe' | 'wind';

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx || ctx.state === 'closed') ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function fade(gain: GainNode, from: number, to: number, dur: number) {
  const ac = gain.context;
  gain.gain.setValueAtTime(from, ac.currentTime);
  gain.gain.linearRampToValueAtTime(to, ac.currentTime + dur);
}

function createRain(ac: AudioContext, gain: GainNode): () => void {
  const bufferSize = ac.sampleRate * 2;
  const buf = ac.createBuffer(1, bufferSize, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.3;

  const lowPass = ac.createBiquadFilter(); lowPass.type = 'lowpass'; lowPass.frequency.value = 1200;
  const highPass = ac.createBiquadFilter(); highPass.type = 'highpass'; highPass.frequency.value = 400;

  const src = ac.createBufferSource();
  src.buffer = buf; src.loop = true;
  src.connect(highPass); highPass.connect(lowPass); lowPass.connect(gain);
  src.start();

  return () => { try { src.stop(); } catch {} };
}

function createFire(ac: AudioContext, gain: GainNode): () => void {
  const crackleBuffer = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const d = crackleBuffer.getChannelData(0);
  for (let i = 0; i < d.length; i++) {
    d[i] = (Math.random() * 2 - 1) * (Math.random() > 0.98 ? 1 : 0.05);
  }
  const src = ac.createBufferSource(); src.buffer = crackleBuffer; src.loop = true;
  const filter = ac.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = 800; filter.Q.value = 0.5;
  src.connect(filter); filter.connect(gain); src.start();

  const osc = ac.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 80;
  const oscGain = ac.createGain(); oscGain.gain.value = 0.05;
  osc.connect(oscGain); oscGain.connect(gain); osc.start();

  return () => { try { src.stop(); } catch {} try { osc.stop(); } catch {} };
}

function createOcean(ac: AudioContext, gain: GainNode): () => void {
  const buf = ac.createBuffer(1, ac.sampleRate * 6, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) {
    const wave = Math.sin((i / ac.sampleRate) * 0.3) * 0.5 + 0.5;
    d[i] = (Math.random() * 2 - 1) * wave;
  }
  const src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700;
  src.connect(lp); lp.connect(gain); src.start();

  return () => { try { src.stop(); } catch {} };
}

function createForest(ac: AudioContext, gain: GainNode): () => void {
  const oscs: OscillatorNode[] = [];
  [800, 1200, 1600, 2000, 3000].forEach((freq, i) => {
    const osc = ac.createOscillator(); osc.type = 'sine';
    osc.frequency.value = freq + Math.random() * 200;
    const g = ac.createGain(); g.gain.value = 0.01 + Math.random() * 0.02;
    osc.connect(g); g.connect(gain); osc.start(ac.currentTime + i * 0.5);
    oscs.push(osc);
  });

  const buf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.1;
  const src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
  const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2000; f.Q.value = 2;
  src.connect(f); f.connect(gain); src.start();

  return () => {
    oscs.forEach(o => { try { o.stop(); } catch {} });
    try { src.stop(); } catch {}
  };
}

function createThunder(ac: AudioContext, gain: GainNode): () => void {
  const rainStop = createRain(ac, gain);
  const timeouts: ReturnType<typeof setTimeout>[] = [];
  let stopped = false;

  function rumble() {
    if (stopped) return;
    const buf = ac.createBuffer(1, ac.sampleRate * 3, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      const env = Math.exp(-i / (ac.sampleRate * 0.8));
      d[i] = (Math.random() * 2 - 1) * env;
    }
    const src = ac.createBufferSource(); src.buffer = buf;
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 200;
    src.connect(f); f.connect(gain); src.start();
    timeouts.push(setTimeout(rumble, 5000 + Math.random() * 10000));
  }

  rumble();
  return () => { stopped = true; rainStop(); timeouts.forEach(t => clearTimeout(t)); };
}

function createJazz(ac: AudioContext, gain: GainNode): () => void {
  const oscs: OscillatorNode[] = [];
  const notes = [261, 293, 329, 370, 415, 440, 493, 523];
  let stopped = false;

  const playNote = () => {
    if (stopped) return;
    const osc = ac.createOscillator(); osc.type = 'triangle';
    osc.frequency.value = notes[Math.floor(Math.random() * notes.length)];
    const g = ac.createGain();
    const dur = 0.3 + Math.random() * 0.5;
    g.gain.setValueAtTime(0.05, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    osc.connect(g); g.connect(gain); osc.start(); osc.stop(ac.currentTime + dur);
    oscs.push(osc);
  };

  const interval = setInterval(playNote, 300 + Math.random() * 400);
  return () => { stopped = true; clearInterval(interval); oscs.forEach(o => { try { o.stop(); } catch {} }); };
}

function createCity(ac: AudioContext, gain: GainNode): () => void {
  // Distant traffic hum
  const trafficBuf = ac.createBuffer(1, ac.sampleRate * 3, ac.sampleRate);
  const td = trafficBuf.getChannelData(0);
  for (let i = 0; i < td.length; i++) td[i] = (Math.random() * 2 - 1) * 0.15;
  const trafficSrc = ac.createBufferSource(); trafficSrc.buffer = trafficBuf; trafficSrc.loop = true;
  const trafficLp = ac.createBiquadFilter(); trafficLp.type = 'lowpass'; trafficLp.frequency.value = 300;
  trafficSrc.connect(trafficLp); trafficLp.connect(gain); trafficSrc.start();

  // Distant city ambient murmur
  const murmurBuf = ac.createBuffer(1, ac.sampleRate * 4, ac.sampleRate);
  const md = murmurBuf.getChannelData(0);
  for (let i = 0; i < md.length; i++) {
    const envelope = 0.5 + 0.5 * Math.sin((i / ac.sampleRate) * 0.4);
    md[i] = (Math.random() * 2 - 1) * 0.08 * envelope;
  }
  const murmurSrc = ac.createBufferSource(); murmurSrc.buffer = murmurBuf; murmurSrc.loop = true;
  const murmurBp = ac.createBiquadFilter(); murmurBp.type = 'bandpass'; murmurBp.frequency.value = 800; murmurBp.Q.value = 0.5;
  murmurSrc.connect(murmurBp); murmurBp.connect(gain); murmurSrc.start();

  // Occasional car horn pulses
  const horns: ReturnType<typeof setTimeout>[] = [];
  let stopped = false;
  function scheduleHorn() {
    if (stopped) return;
    const delay = 8000 + Math.random() * 15000;
    horns.push(setTimeout(() => {
      if (stopped) return;
      const osc = ac.createOscillator(); osc.type = 'square';
      osc.frequency.value = 440 + Math.random() * 200;
      const hg = ac.createGain(); hg.gain.value = 0;
      const dur = 0.2 + Math.random() * 0.3;
      hg.gain.setValueAtTime(0, ac.currentTime);
      hg.gain.linearRampToValueAtTime(0.06, ac.currentTime + 0.05);
      hg.gain.linearRampToValueAtTime(0, ac.currentTime + dur);
      osc.connect(hg); hg.connect(gain); osc.start(); osc.stop(ac.currentTime + dur + 0.1);
      scheduleHorn();
    }, delay));
  }
  scheduleHorn();

  return () => {
    stopped = true;
    try { trafficSrc.stop(); } catch {}
    try { murmurSrc.stop(); } catch {}
    horns.forEach(t => clearTimeout(t));
  };
}

function createCafe(ac: AudioContext, gain: GainNode): () => void {
  // Gentle background chatter (bandpass noise)
  const chatterBuf = ac.createBuffer(1, ac.sampleRate * 5, ac.sampleRate);
  const cd = chatterBuf.getChannelData(0);
  for (let i = 0; i < cd.length; i++) cd[i] = (Math.random() * 2 - 1) * 0.12;
  const chatterSrc = ac.createBufferSource(); chatterSrc.buffer = chatterBuf; chatterSrc.loop = true;
  const chatterBp = ac.createBiquadFilter(); chatterBp.type = 'bandpass'; chatterBp.frequency.value = 1200; chatterBp.Q.value = 0.8;
  const chatterBp2 = ac.createBiquadFilter(); chatterBp2.type = 'highpass'; chatterBp2.frequency.value = 400;
  chatterSrc.connect(chatterBp); chatterBp.connect(chatterBp2); chatterBp2.connect(gain); chatterSrc.start();

  // Espresso machine (occasional burst)
  const machineTimeouts: ReturnType<typeof setTimeout>[] = [];
  let stopped = false;
  function scheduleMachine() {
    if (stopped) return;
    machineTimeouts.push(setTimeout(() => {
      if (stopped) return;
      const noiseBuf = ac.createBuffer(1, Math.floor(ac.sampleRate * 1.5), ac.sampleRate);
      const nd = noiseBuf.getChannelData(0);
      for (let i = 0; i < nd.length; i++) {
        const env = i < ac.sampleRate * 0.1
          ? i / (ac.sampleRate * 0.1)
          : Math.exp(-(i - ac.sampleRate * 0.1) / (ac.sampleRate * 0.6));
        nd[i] = (Math.random() * 2 - 1) * 0.3 * env;
      }
      const ns = ac.createBufferSource(); ns.buffer = noiseBuf;
      const nhp = ac.createBiquadFilter(); nhp.type = 'highpass'; nhp.frequency.value = 3000;
      const ng = ac.createGain(); ng.gain.value = 0.5;
      ns.connect(nhp); nhp.connect(ng); ng.connect(gain); ns.start();
      scheduleMachine();
    }, 10000 + Math.random() * 20000));
  }
  scheduleMachine();

  // Gentle jazz undertone (very subtle)
  const jazzOscs: OscillatorNode[] = [];
  const jazzNotes = [261, 329, 392, 440];
  let jazzStopped = false;
  const jazzInterval = setInterval(() => {
    if (jazzStopped || stopped) return;
    if (Math.random() > 0.4) return;
    const osc = ac.createOscillator(); osc.type = 'triangle';
    osc.frequency.value = jazzNotes[Math.floor(Math.random() * jazzNotes.length)];
    const jg = ac.createGain(); const dur = 0.4 + Math.random() * 0.4;
    jg.gain.setValueAtTime(0.015, ac.currentTime);
    jg.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    osc.connect(jg); jg.connect(gain); osc.start(); osc.stop(ac.currentTime + dur);
    jazzOscs.push(osc);
  }, 600);

  return () => {
    stopped = true; jazzStopped = true;
    try { chatterSrc.stop(); } catch {}
    machineTimeouts.forEach(t => clearTimeout(t));
    clearInterval(jazzInterval);
    jazzOscs.forEach(o => { try { o.stop(); } catch {} });
  };
}

function createWind(ac: AudioContext, gain: GainNode): () => void {
  const buf = ac.createBuffer(1, ac.sampleRate * 4, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) {
    const gust = 0.4 + 0.6 * Math.abs(Math.sin((i / ac.sampleRate) * 0.5 + Math.random() * 0.1));
    d[i] = (Math.random() * 2 - 1) * gust * 0.25;
  }
  const src = ac.createBufferSource(); src.buffer = buf; src.loop = true;

  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
  const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 200;
  src.connect(hp); hp.connect(lp); lp.connect(gain); src.start();

  // Gentle oscillating gusts via LFO on gain
  const lfo = ac.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.12;
  const lfoGain = ac.createGain(); lfoGain.gain.value = 0.3;
  lfo.connect(lfoGain); lfoGain.connect(gain.gain); lfo.start();

  return () => { try { src.stop(); } catch {} try { lfo.stop(); } catch {} };
}

interface ActiveEntry { gainNode: GainNode; stop: () => void; }
const activeSoundscapes = new Map<SoundscapeId, ActiveEntry>();

export function playSoundscape(id: SoundscapeId, volume = 0.6): void {
  if (activeSoundscapes.has(id)) { stopSoundscape(id); return; }

  const ac = getCtx();
  const gainNode = ac.createGain();
  gainNode.gain.value = 0; // start silent, fade in
  gainNode.connect(ac.destination);
  fade(gainNode, 0, volume, 1.2);

  let stopFn: () => void;
  switch (id) {
    case 'rain':    stopFn = createRain(ac, gainNode); break;
    case 'fire':    stopFn = createFire(ac, gainNode); break;
    case 'ocean':   stopFn = createOcean(ac, gainNode); break;
    case 'forest':  stopFn = createForest(ac, gainNode); break;
    case 'thunder': stopFn = createThunder(ac, gainNode); break;
    case 'jazz':    stopFn = createJazz(ac, gainNode); break;
    case 'city':    stopFn = createCity(ac, gainNode); break;
    case 'cafe':    stopFn = createCafe(ac, gainNode); break;
    case 'wind':    stopFn = createWind(ac, gainNode); break;
    default: stopFn = () => {};
  }

  activeSoundscapes.set(id, { gainNode, stop: stopFn });
}

export function stopSoundscape(id: SoundscapeId): void {
  const s = activeSoundscapes.get(id);
  if (!s) return;
  fade(s.gainNode, s.gainNode.gain.value, 0, 0.8);
  setTimeout(() => {
    s.stop();
    try { s.gainNode.disconnect(); } catch {}
  }, 900);
  activeSoundscapes.delete(id);
}

export function stopAllSoundscapes(): void {
  [...activeSoundscapes.keys()].forEach(id => stopSoundscape(id));
}

export function isSoundscapeActive(id: SoundscapeId): boolean {
  return activeSoundscapes.has(id);
}

export function setSoundscapeVolume(id: SoundscapeId, volume: number): void {
  const s = activeSoundscapes.get(id);
  if (s) fade(s.gainNode, s.gainNode.gain.value, Math.max(0, Math.min(1, volume)), 0.15);
}

export function getSoundscapeVolume(id: SoundscapeId): number {
  const s = activeSoundscapes.get(id);
  return s ? s.gainNode.gain.value : 0;
}
