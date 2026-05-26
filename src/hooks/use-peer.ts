import { useEffect, useCallback, useRef } from 'react';
import Peer, { DataConnection, MediaConnection } from 'peerjs';
import { useRoomStore } from '@/store/room-store';
import { useToast } from '@/hooks/use-toast';

export function usePeer(roomId?: string | null) {
  const store = useRoomStore();
  const { toast } = useToast();
  const connectingRef = useRef(false);

  // Initialize peer and local media
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      if (!roomId || connectingRef.current || store.peer) return;
      connectingRef.current = true;
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });
        
        if (!mounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        store.setLocalStream(stream);

        const newPeer = new Peer({
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
            ]
          }
        });

        newPeer.on('open', (id) => {
          if (!mounted) return;
          store.setPeer(newPeer);
          
          // If we are joining an existing room, connect to it
          if (roomId && id !== roomId) {
            connectToPeer(roomId, newPeer, stream);
          } else {
            // We are the host (created with specific ID, or just waiting)
            store.setConnectionStatus('connecting');
          }
        });

        // Handle incoming data connections
        newPeer.on('connection', (conn) => {
          store.setDataConnection(conn);
          setupDataConnection(conn);
        });

        // Handle incoming media calls
        newPeer.on('call', (call) => {
          call.answer(stream);
          store.setMediaConnection(call);
          setupMediaConnection(call);
        });

        newPeer.on('error', (err) => {
          console.error('PeerJS error:', err);
          toast({
            title: 'Connection Error',
            description: err.message,
            variant: 'destructive',
          });
          store.setConnectionStatus('disconnected');
        });

      } catch (err) {
        console.error('Media error:', err);
        toast({
          title: 'Camera/Microphone Access Denied',
          description: 'Please allow access to use the video chat.',
          variant: 'destructive',
        });
        store.setConnectionStatus('disconnected');
      } finally {
        connectingRef.current = false;
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, [roomId]);

  const connectToPeer = useCallback((targetId: string, currentPeer: Peer, stream: MediaStream) => {
    store.setConnectionStatus('connecting');
    
    const dataConn = currentPeer.connect(targetId);
    store.setDataConnection(dataConn);
    setupDataConnection(dataConn);

    const call = currentPeer.call(targetId, stream);
    store.setMediaConnection(call);
    setupMediaConnection(call);
  }, []);

  const setupDataConnection = useCallback((conn: DataConnection) => {
    conn.on('open', () => {
      store.setConnectionStatus('connected');
      toast({
        title: 'Partner Connected',
        description: 'The secure connection has been established.',
      });
    });

    conn.on('data', (data) => {
      // Handle incoming messages
      console.log('Received data:', data);
    });

    conn.on('close', () => {
      store.setConnectionStatus('disconnected');
      store.setRemoteStream(null);
      toast({
        title: 'Partner Disconnected',
        description: 'The connection was lost.',
      });
    });
  }, [toast]);

  const setupMediaConnection = useCallback((call: MediaConnection) => {
    call.on('stream', (remoteStream) => {
      store.setRemoteStream(remoteStream);
    });

    call.on('close', () => {
      store.setRemoteStream(null);
    });
  }, []);

  const sendMessage = useCallback((data: any) => {
    const conn = useRoomStore.getState().dataConnection;
    if (conn && conn.open) {
      conn.send(data);
    }
  }, []);

  return { sendMessage };
}
