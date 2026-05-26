import { create } from 'zustand';
import type Peer from 'peerjs';
import type { DataConnection, MediaConnection } from 'peerjs';

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
  
  // Actions
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

  setPeer: (peer) => set({ peer }),
  setLocalStream: (stream) => set({ localStream: stream }),
  setRemoteStream: (stream) => set({ remoteStream: stream }),
  setRoomId: (roomId) => set({ roomId }),
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setDataConnection: (conn) => set({ dataConnection: conn }),
  setMediaConnection: (conn) => set({ mediaConnection: conn }),
  
  toggleAudio: () => {
    const { localStream, audioEnabled } = get();
    if (localStream) {
      localStream.getAudioTracks().forEach(t => t.enabled = !audioEnabled);
    }
    set({ audioEnabled: !audioEnabled });
  },
  
  toggleVideo: () => {
    const { localStream, videoEnabled } = get();
    if (localStream) {
      localStream.getVideoTracks().forEach(t => t.enabled = !videoEnabled);
    }
    set({ videoEnabled: !videoEnabled });
  },
  
  toggleEffect: (effectId) => set((state) => ({
    activeEffects: state.activeEffects.includes(effectId)
      ? state.activeEffects.filter(id => id !== effectId)
      : [...state.activeEffects, effectId]
  })),

  disconnect: () => {
    const { peer, localStream, dataConnection, mediaConnection } = get();
    if (dataConnection) dataConnection.close();
    if (mediaConnection) mediaConnection.close();
    if (peer) peer.destroy();
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    
    set({
      peer: null,
      localStream: null,
      remoteStream: null,
      roomId: null,
      connectionStatus: 'disconnected',
      dataConnection: null,
      mediaConnection: null,
      activeEffects: [],
    });
  }
}));
