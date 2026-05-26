import React, { useEffect, useRef, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useRoomStore } from '@/store/room-store';
import { usePeer } from '@/hooks/use-peer';
import { Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Toolbox } from '@/components/Toolbox';
import { CanvasOverlay } from '@/components/CanvasOverlay';

export default function Room() {
  const { id } = useParams<{ id: string }>();
  const [_, setLocation] = useLocation();
  const store = useRoomStore();
  const { sendMessage } = usePeer(id);
  const [copied, setCopied] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Sync streams to video elements
  useEffect(() => {
    if (localVideoRef.current && store.localStream) {
      localVideoRef.current.srcObject = store.localStream;
    }
  }, [store.localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && store.remoteStream) {
      remoteVideoRef.current.srcObject = store.remoteStream;
    }
  }, [store.remoteStream]);

  const handleDisconnect = () => {
    store.disconnect();
    setLocation('/');
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(id || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative w-full h-[100dvh] bg-black overflow-hidden flex items-center justify-center">
      
      {/* Remote Video (Background) */}
      <div className="absolute inset-0 z-0">
        {store.remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-romantic relative">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 mix-blend-overlay"></div>
            
            <div className="z-10 flex flex-col items-center p-8 glass-panel rounded-3xl animate-in fade-in zoom-in duration-700">
              <div className="relative w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mb-6 overflow-hidden">
                <div className="absolute inset-0 rounded-full border-2 border-primary/50 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
                <div className="w-16 h-16 rounded-full bg-primary/40 flex items-center justify-center animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-primary shadow-[0_0_20px_#e11d48]"></div>
                </div>
              </div>
              <h2 className="text-3xl font-serif text-white mb-2 tracking-wide">Waiting for partner</h2>
              <p className="text-white/60 font-light font-sans mb-8">They can join using this code</p>
              
              <div className="flex items-center gap-3 bg-black/40 p-2 pl-6 rounded-2xl border border-white/10">
                <span className="font-mono text-2xl tracking-widest text-primary font-semibold">{id}</span>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="rounded-xl w-12 h-12 bg-white/5 hover:bg-white/10 hover:text-primary transition-colors"
                  onClick={copyRoomId}
                >
                  {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <CanvasOverlay />
      <Toolbox />

      {/* Local Video (PIP) */}
      <div className="absolute bottom-24 right-6 w-32 h-48 md:w-48 md:h-72 bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl z-20 group transition-transform hover:scale-105 cursor-move">
        {store.localStream ? (
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover transform scale-x-[-1]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-zinc-900">
            <VideoOff className="w-8 h-8 text-white/30" />
          </div>
        )}
        <div className="absolute bottom-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!store.audioEnabled && <div className="bg-black/50 p-1.5 rounded-md backdrop-blur-sm"><MicOff className="w-4 h-4 text-destructive" /></div>}
          {!store.videoEnabled && <div className="bg-black/50 p-1.5 rounded-md backdrop-blur-sm"><VideoOff className="w-4 h-4 text-destructive" /></div>}
        </div>
      </div>

      {/* Control Bar (Bottom) */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 glass-panel rounded-full px-6 py-3 flex items-center gap-4 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className={`rounded-full w-12 h-12 ${!store.audioEnabled ? 'bg-destructive/20 text-destructive hover:bg-destructive/30 hover:text-destructive' : 'hover:bg-white/10 text-white'}`}
              onClick={store.toggleAudio}
            >
              {store.audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>{store.audioEnabled ? 'Mute' : 'Unmute'}</p></TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className={`rounded-full w-12 h-12 ${!store.videoEnabled ? 'bg-destructive/20 text-destructive hover:bg-destructive/30 hover:text-destructive' : 'hover:bg-white/10 text-white'}`}
              onClick={store.toggleVideo}
            >
              {store.videoEnabled ? <VideoIcon className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>{store.videoEnabled ? 'Stop Video' : 'Start Video'}</p></TooltipContent>
        </Tooltip>

        <div className="w-px h-8 bg-white/10 mx-2" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="destructive" 
              size="icon" 
              className="rounded-full w-14 h-14 shadow-lg shadow-destructive/20 hover:shadow-destructive/40 hover:scale-105 transition-all"
              onClick={handleDisconnect}
            >
              <PhoneOff className="w-6 h-6" />
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>End Call</p></TooltipContent>
        </Tooltip>
      </div>

      {/* Performance Meter */}
      <div className="absolute top-6 right-6 z-30 flex items-center gap-3">
        <div className="glass-panel px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs font-mono text-white/50">
          <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>30 FPS</span>
          <span className="text-white/20">|</span>
          <span>42ms</span>
        </div>
      </div>
      
    </div>
  );
}
