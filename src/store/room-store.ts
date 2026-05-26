import { create } from 'zustand';
import type Peer from 'peerjs';
import type { DataConnection, MediaConnection } from 'peerjs';
import type { ExperienceMode } from '@/lib/modes';

export interface Ripple {
  id: string;
  x: number;
  y: number;
  color: string;
  timestamp: number;
}

interface RoomState {
  peer: Peer | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  roomId: string | null;
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
  audioEnabled: boolean;
  videoEnabled: boolean;
  activeEffects: string[];
  dataConnection: DataConnection | null;
  mediaConnection: MediaConnection | null;
  mode: ExperienceMode;
  privacyMode: boolean;
  videoFilter: string;
  brightness: number;
  warmth: number;
  ripples: Ripple[];
  activeSoundscapes: string[];
  unlockedAchievements: string[];
  isDrawingMode: boolean;
  drawColor: string;
  drawSize: number;

  setPeer: (peer: Peer | null) => void;
  setLocalStream: (stream: MediaStream | null) => void;
  setRemoteStream: (stream: MediaStream | null) => void;
  setRoomId: (id: string | null) => void;
  setConnectionStatus: (status: 'disconnected' | 'connecting' | 'connected') => void;
  setDataConnection: (conn: DataConnection | null) => void;
  setMediaConnection: (conn: MediaConnection | null) => void;
  toggleAudio: () => void;
  toggleVideo: () => void;
  toggleEffect: (effectId: string) => void;
  disconnect: () => void;
  setMode: (mode: ExperienceMode) => void;
  togglePrivacyMode: () => void;
  setVideoFilter: (filter: string) => void;
  setBrightness: (v: number) => void;
  setWarmth: (v: number) => void;
  addRipple: (ripple: Ripple) => void;
  removeRipple: (id: string) => void;
  toggleSoundscape: (id: string) => void;
  unlockAchievement: (id: string) => void;
  setDrawingMode: (v: boolean) => void;
  setDrawColor: (c: string) => void;
  setDrawSize: (s: number) => void;
}

export const useRoomStore = create<RoomState>((set, get) => ({
  peer: null,
  localStream: null,
  remoteStream: null,
  roomId: null,
  connectionStatus: 'disconnected',
  audioEnabled: true,
  videoEnabled: true,
  activeEffects: [],
  dataConnection: null,
  mediaConnection: null,
  mode: 'romance',
  privacyMode: false,
  videoFilter: 'none',
  brightness: 100,
  warmth: 0,
  ripples: [],
  activeSoundscapes: [],
  unlockedAchievements: [],
  isDrawingMode: false,
  drawColor: '#e11d48',
  drawSize: 4,

  setPeer: (peer) => set({ peer }),
  setLocalStream: (stream) => set({ localStream: stream }),
  setRemoteStream: (stream) => set({ remoteStream: stream }),
  setRoomId: (roomId) => set({ roomId }),
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setDataConnection: (conn) => set({ dataConnection: conn }),
  setMediaConnection: (conn) => set({ mediaConnection: conn }),

  toggleAudio: () => {
    const { localStream, audioEnabled } = get();
    if (localStream) localStream.getAudioTracks().forEach(t => (t.enabled = !audioEnabled));
    set({ audioEnabled: !audioEnabled });
  },

  toggleVideo: () => {
    const { localStream, videoEnabled } = get();
    if (localStream) localStream.getVideoTracks().forEach(t => (t.enabled = !videoEnabled));
    set({ videoEnabled: !videoEnabled });
  },

  toggleEffect: (effectId) =>
    set((state) => ({
      activeEffects: state.activeEffects.includes(effectId)
        ? state.activeEffects.filter((id) => id !== effectId)
        : [...state.activeEffects, effectId],
    })),

  disconnect: () => {
    const { peer, localStream, dataConnection, mediaConnection } = get();
    if (dataConnection) dataConnection.close();
    if (mediaConnection) mediaConnection.close();
    if (peer) peer.destroy();
    if (localStream) localStream.getTracks().forEach((t) => t.stop());
    set({
      peer: null, localStream: null, remoteStream: null, roomId: null,
      connectionStatus: 'disconnected', dataConnection: null, mediaConnection: null,
      activeEffects: [], privacyMode: false, ripples: [], activeSoundscapes: [],
    });
  },

  setMode: (mode) => set({ mode }),
  togglePrivacyMode: () => set((s) => ({ privacyMode: !s.privacyMode })),
  setVideoFilter: (filter) => set({ videoFilter: filter }),
  setBrightness: (brightness) => set({ brightness }),
  setWarmth: (warmth) => set({ warmth }),

  addRipple: (ripple) => set((s) => ({ ripples: [...s.ripples, ripple].slice(-20) })),
  removeRipple: (id) => set((s) => ({ ripples: s.ripples.filter((r) => r.id !== id) })),

  toggleSoundscape: (id) =>
    set((s) => ({
      activeSoundscapes: s.activeSoundscapes.includes(id)
        ? s.activeSoundscapes.filter((x) => x !== id)
        : [...s.activeSoundscapes, id],
    })),

  unlockAchievement: (id) =>
    set((s) => ({
      unlockedAchievements: s.unlockedAchievements.includes(id)
        ? s.unlockedAchievements
        : [...s.unlockedAchievements, id],
    })),

  setDrawingMode: (v) => set({ isDrawingMode: v }),
  setDrawColor: (c) => set({ drawColor: c }),
  setDrawSize: (s) => set({ drawSize: s }),
}));
