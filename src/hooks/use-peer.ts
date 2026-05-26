import { useEffect, useCallback, useRef } from 'react';
import Peer, { DataConnection, MediaConnection } from 'peerjs';
import { useRoomStore } from '@/store/room-store';
import { useToast } from '@/hooks/use-toast';
import { getUserMediaSafe, classifyError } from '@/lib/media-permissions';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' },
  { urls: 'stun:stun.stunprotocol.org:3478' },
  { urls: 'stun:stun.voip.blackberry.com:3478' },
  // Open TURN relays — crucial for users behind symmetric NAT
  { urls: 'turn:openrelay.metered.ca:80',  username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
  // Backup: numb TURN (widely used public relay)
  { urls: 'turn:numb.viagenie.ca', username: 'webrtc@live.com', credential: 'muazkh' },
];

let qualityInterval: ReturnType<typeof setInterval> | null = null;

function stopQualityProbe() {
  if (qualityInterval) { clearInterval(qualityInterval); qualityInterval = null; }
}

async function probeQuality(mc: MediaConnection) {
  try {
    const pc = (mc as any).peerConnection as RTCPeerConnection | undefined;
    if (!pc) return;
    const stats = await pc.getStats();
    let rtt: number | null = null;
    let packetsLost = 0;
    let packetsSent = 0;
    stats.forEach((report: any) => {
      if (report.type === 'remote-inbound-rtp' && report.roundTripTime != null) {
        rtt = report.roundTripTime * 1000; // ms
      }
      if (report.type === 'outbound-rtp') {
        packetsLost += report.retransmittedPacketsSent ?? 0;
        packetsSent += report.packetsSent ?? 1;
      }
    });
    if (rtt === null) return;
    const lossRate = packetsSent > 0 ? packetsLost / packetsSent : 0;
    let quality: 'excellent' | 'good' | 'fair' | 'poor';
    if (rtt < 80 && lossRate < 0.01) quality = 'excellent';
    else if (rtt < 200 && lossRate < 0.05) quality = 'good';
    else if (rtt < 400 && lossRate < 0.1) quality = 'fair';
    else quality = 'poor';
    useRoomStore.getState().setConnectionQuality(quality);
  } catch { /* ignore */ }
}

export function usePeer(roomId?: string | null) {
  const store = useRoomStore();
  const { toast } = useToast();
  const initRef = useRef(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      if (!roomId || initRef.current || store.peer) return;
      initRef.current = true;

      try {
        let stream: MediaStream;
        if (store.localStream) {
          stream = store.localStream;
        } else {
          const acquired = await getUserMediaSafe();
          if (!mounted) { acquired.stream.getTracks().forEach(t => t.stop()); return; }
          stream = acquired.stream;
          store.setLocalStream(stream);
        }

        const newPeer = new Peer({
          config: { iceServers: ICE_SERVERS },
        });

        newPeer.on('open', (peerId) => {
          if (!mounted) return;
          store.setPeer(newPeer);
          if (roomId && peerId !== roomId) {
            connectToPeer(roomId, newPeer, stream);
          } else {
            store.setConnectionStatus('connecting');
          }
        });

        newPeer.on('connection', (conn) => {
          store.setDataConnection(conn);
          setupDataConnection(conn);
        });

        newPeer.on('call', (call) => {
          call.answer(stream);
          store.setMediaConnection(call);
          setupMediaConnection(call);
        });

        newPeer.on('error', (err) => {
          if (!mounted) return;
          const msg = getPeerErrorMessage(err);
          toast({ title: msg.title, description: msg.description, variant: 'destructive' });
          store.setConnectionStatus('disconnected');
        });

        newPeer.on('disconnected', () => {
          if (!mounted) return;
          try { newPeer.reconnect(); } catch { /* ignore */ }
        });

      } catch (err) {
        if (!mounted) return;
        const info = classifyError(err);
        toast({
          title: info.title,
          description: info.description + (info.browserHint ? ` — ${info.browserHint}` : ''),
          variant: 'destructive',
        });
        store.setConnectionStatus('disconnected');
      }
    };

    init();
    return () => {
      mounted = false;
      stopQualityProbe();
    };
  }, [roomId]);

  const connectToPeer = useCallback((targetId: string, currentPeer: Peer, stream: MediaStream) => {
    store.setConnectionStatus('connecting');
    const dataConn = currentPeer.connect(targetId, { reliable: true });
    store.setDataConnection(dataConn);
    setupDataConnection(dataConn);
    const call = currentPeer.call(targetId, stream);
    store.setMediaConnection(call);
    setupMediaConnection(call);
  }, []);

  const setupDataConnection = useCallback((conn: DataConnection) => {
    conn.on('open', () => {
      store.setConnectionStatus('connected');
      toast({ title: '✨ Partner Connected', description: 'Secure connection is live.' });
    });

    conn.on('data', (data: unknown) => {
      if (!data || typeof data !== 'object') return;
      const msg = data as Record<string, unknown>;

      if (msg.type === 'reaction' && typeof msg.emoji === 'string') {
        window.dispatchEvent(new CustomEvent('peer-reaction', { detail: { emoji: msg.emoji } }));
      }

      if (msg.type === 'chat' && typeof msg.text === 'string') {
        useRoomStore.getState().addChatMessage({
          id: String(msg.id ?? Date.now()),
          text: String(msg.text),
          from: 'partner',
          timestamp: Number(msg.timestamp ?? Date.now()),
        });
        useRoomStore.getState().setPartnerTyping(false);
      }

      if (msg.type === 'typing') {
        useRoomStore.getState().setPartnerTyping(true);
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => {
          useRoomStore.getState().setPartnerTyping(false);
        }, 3000);
      }

      if (msg.type === 'mode' && typeof msg.mode === 'string') {
        useRoomStore.getState().setMode(msg.mode as any);
      }

      if (msg.type === 'draw_stroke' || msg.type === 'draw_action') {
        window.dispatchEvent(new CustomEvent('peer-draw', { detail: msg }));
      }

      if (msg.type === 'partner_cursor' && typeof msg.x === 'number' && typeof msg.y === 'number') {
        useRoomStore.getState().setPartnerCursor({ x: msg.x as number, y: msg.y as number });
      }

      if (msg.type === 'ar_vibe') {
        const { accessories, filter } = msg as { accessories: string[]; filter: string };
        const state = useRoomStore.getState();
        const ALL_AR = [
          'ar_crown','ar_halo','ar_cat_ears','ar_bunny_ears','ar_horns',
          'ar_rose','ar_glasses','ar_glasses_cool','ar_glasses_heart',
          'ar_gaze','ar_clown_nose','ar_mustache','ar_curly_mustache',
          'ar_beard','ar_glitter','ar_mesh','ar_head_indicator',
          'ar_lip_pink','ar_lip_red','ar_eye_blue','ar_eye_purple',
        ];
        const kept = state.activeEffects.filter((e: string) => !ALL_AR.includes(e));
        state.setEffects([...kept, ...accessories]);
        if (filter) state.setVideoFilter(filter as any);
      }
    });

    conn.on('close', () => {
      store.setConnectionStatus('disconnected');
      store.setRemoteStream(null);
      store.setPartnerTyping(false);
      store.setPartnerCursor(null);
      store.setConnectionQuality('unknown');
      stopQualityProbe();
      toast({ title: 'Partner Disconnected', description: 'The connection was closed.', variant: 'destructive' });
    });

    conn.on('error', (err) => console.error('Data channel error:', err));
  }, [toast]);

  const setupMediaConnection = useCallback((call: MediaConnection) => {
    call.on('stream', (remoteStream) => {
      store.setRemoteStream(remoteStream);
      store.setConnectionStatus('connected');
      // Begin quality probing every 5 seconds
      stopQualityProbe();
      qualityInterval = setInterval(() => probeQuality(call), 5000);
    });
    call.on('close', () => {
      store.setRemoteStream(null);
      stopQualityProbe();
      store.setConnectionQuality('unknown');
    });
    call.on('error', (err) => console.error('Media call error:', err));
  }, []);

  const sendMessage = useCallback((data: unknown) => {
    const conn = useRoomStore.getState().dataConnection;
    if (conn?.open) conn.send(data);
  }, []);

  const sendTyping = useCallback(() => {
    const conn = useRoomStore.getState().dataConnection;
    if (conn?.open) conn.send({ type: 'typing' });
  }, []);

  return { sendMessage, sendTyping };
}

function getPeerErrorMessage(err: { type: string; message?: string }) {
  const map: Record<string, { title: string; description: string }> = {
    'browser-incompatible': { title: 'Browser Not Supported', description: 'Use Chrome, Firefox, Edge, or Safari 15+.' },
    'network':              { title: 'Network Error',         description: 'Check your internet connection.' },
    'peer-unavailable':     { title: 'Room Not Found',        description: 'No one is waiting there. Check the code.' },
    'ssl-unavailable':      { title: 'SSL Required',          description: 'HTTPS is required for video calls.' },
    'server-error':         { title: 'Server Error',          description: 'Signalling server error. Try again.' },
    'socket-error':         { title: 'Connection Dropped',    description: 'Lost connection to server. Reload and retry.' },
    'socket-closed':        { title: 'Connection Dropped',    description: 'Lost connection to server. Reload and retry.' },
  };
  return map[err.type] ?? { title: 'Connection Error', description: err.message ?? 'Unknown error.' };
}
