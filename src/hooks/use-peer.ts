import { useEffect, useCallback, useRef } from 'react';
import Peer, { DataConnection, MediaConnection } from 'peerjs';
import { useRoomStore } from '@/store/room-store';
import { useToast } from '@/hooks/use-toast';
import { getUserMediaSafe, classifyError } from '@/lib/media-permissions';

export function usePeer(roomId?: string | null) {
  const store = useRoomStore();
  const { toast } = useToast();
  const initRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      if (!roomId || initRef.current || store.peer) return;
      initRef.current = true;

      try {
        let stream: MediaStream;

        // Re-use stream already acquired by MediaPermissionGate — no double-prompt
        if (store.localStream) {
          stream = store.localStream;
        } else {
          // Fallback: gate wasn't shown (e.g. direct URL navigation)
          const acquired = await getUserMediaSafe();
          if (!mounted) { acquired.stream.getTracks().forEach(t => t.stop()); return; }
          stream = acquired.stream;
          store.setLocalStream(stream);
        }

        const newPeer = new Peer({
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' },
              { urls: 'stun:stun3.l.google.com:19302' },
              { urls: 'stun:stun4.l.google.com:19302' },
              { urls: 'stun:global.stun.twilio.com:3478' },
              // Open TURN servers for NAT traversal
              {
                urls: 'turn:openrelay.metered.ca:80',
                username: 'openrelayproject',
                credential: 'openrelayproject',
              },
              {
                urls: 'turn:openrelay.metered.ca:443',
                username: 'openrelayproject',
                credential: 'openrelayproject',
              },
            ],
          },
        });

        newPeer.on('open', (peerId) => {
          if (!mounted) return;
          store.setPeer(newPeer);

          // If the room ID differs from our peer ID, we are the joiner — connect to host
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
          console.error('PeerJS error:', err);
          const msg = getPeerErrorMessage(err);
          toast({ title: msg.title, description: msg.description, variant: 'destructive' });
          store.setConnectionStatus('disconnected');
        });

        newPeer.on('disconnected', () => {
          if (!mounted) return;
          // Auto-reconnect once
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
      } finally {
        // don't reset initRef — prevents double-init on React StrictMode double effect
      }
    };

    init();

    return () => {
      mounted = false;
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
      toast({ title: '✨ Partner Connected', description: 'The secure connection is live.' });
    });

    conn.on('data', (data: unknown) => {
      if (!data || typeof data !== 'object') return;
      const msg = data as Record<string, unknown>;

      if (msg.type === 'reaction' && typeof msg.emoji === 'string') {
        // Dispatch custom event so room.tsx can render the floating reaction
        window.dispatchEvent(new CustomEvent('peer-reaction', { detail: { emoji: msg.emoji } }));
      }

      if (msg.type === 'mode' && typeof msg.mode === 'string') {
        store.setMode(msg.mode as any);
      }
    });

    conn.on('close', () => {
      store.setConnectionStatus('disconnected');
      store.setRemoteStream(null);
      toast({ title: 'Partner Disconnected', description: 'The connection was closed.', variant: 'destructive' });
    });

    conn.on('error', (err) => {
      console.error('Data channel error:', err);
    });
  }, [toast]);

  const setupMediaConnection = useCallback((call: MediaConnection) => {
    call.on('stream', (remoteStream) => {
      store.setRemoteStream(remoteStream);
      store.setConnectionStatus('connected');
    });

    call.on('close', () => {
      store.setRemoteStream(null);
    });

    call.on('error', (err) => {
      console.error('Media call error:', err);
    });
  }, []);

  const sendMessage = useCallback((data: unknown) => {
    const conn = useRoomStore.getState().dataConnection;
    if (conn?.open) conn.send(data);
  }, []);

  return { sendMessage };
}

function getPeerErrorMessage(err: { type: string; message?: string }): { title: string; description: string } {
  switch (err.type) {
    case 'browser-incompatible':
      return {
        title: 'Browser Not Supported',
        description: 'Your browser does not support WebRTC. Please use Chrome, Firefox, Edge, or Safari 15+.',
      };
    case 'network':
      return {
        title: 'Network Error',
        description: 'Could not reach the signalling server. Check your internet connection.',
      };
    case 'peer-unavailable':
      return {
        title: 'Room Not Found',
        description: 'No one is waiting in that room. Check the room code and try again.',
      };
    case 'ssl-unavailable':
      return {
        title: 'SSL Required',
        description: 'A secure connection (HTTPS) is required for video calls.',
      };
    case 'server-error':
      return {
        title: 'Server Error',
        description: 'The signalling server encountered an error. Please try again.',
      };
    case 'socket-error':
    case 'socket-closed':
      return {
        title: 'Connection Dropped',
        description: 'The connection to the server was lost. Please reload and try again.',
      };
    default:
      return {
        title: 'Connection Error',
        description: err.message ?? 'An unknown error occurred.',
      };
  }
}
