import React, { useEffect, useRef, useCallback } from 'react';
import { useRoomStore } from '@/store/room-store';

export function CanvasOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const { activeEffects, isDrawingMode, drawColor, drawSize } = useRoomStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle resizing
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    // Simple animation loop for demonstration of effects
    let animationFrameId: number;
    let time = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (activeEffects.includes('filter_wax')) {
        for (let i = 0; i < 6; i++) {
          const x = (Math.sin(time * 0.01 + i * 1.2) * 0.5 + 0.5) * canvas.width;
          const y = (time * 1.5 + i * 140) % canvas.height;
          const g = ctx.createRadialGradient(x, y, 0, x, y, 8);
          g.addColorStop(0, 'rgba(220,40,40,0.7)');
          g.addColorStop(1, 'rgba(180,20,20,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(x, y, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,80,80,0.4)';
          ctx.beginPath();
          ctx.ellipse(x, y + 6, 3, 10, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (activeEffects.includes('filter_ice')) {
        ctx.fillStyle = 'rgba(100,180,255,0.08)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = 'rgba(160,220,255,0.12)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 8; i++) {
          const x = (Math.sin(i * 2.3) * 0.5 + 0.5) * canvas.width;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x + Math.sin(time * 0.005) * 50, canvas.height);
          ctx.stroke();
        }
      }
      
      if (activeEffects.includes('filter_blindfold')) {
        const gradient = ctx.createRadialGradient(canvas.width/2, canvas.height*0.4, 80, canvas.width/2, canvas.height/2, canvas.width/1.3);
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(0.5, 'rgba(0,0,0,0.5)');
        gradient.addColorStop(1, 'rgba(0,0,0,0.95)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const bandH = canvas.height * 0.12;
        const bandY = canvas.height * 0.3;
        const sg = ctx.createLinearGradient(0, bandY, 0, bandY + bandH);
        sg.addColorStop(0, 'rgba(20,10,30,0.85)');
        sg.addColorStop(0.5, 'rgba(40,20,60,0.9)');
        sg.addColorStop(1, 'rgba(20,10,30,0.85)');
        ctx.fillStyle = sg;
        ctx.fillRect(0, bandY, canvas.width, bandH);
      }

      if (activeEffects.includes('filter_vignette')) {
        const vg = ctx.createRadialGradient(canvas.width/2, canvas.height/2, canvas.width*0.2, canvas.width/2, canvas.height/2, canvas.width*0.8);
        vg.addColorStop(0, 'rgba(0,0,0,0)');
        vg.addColorStop(1, 'rgba(0,0,0,0.7)');
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      if (activeEffects.includes('filter_hearts')) {
        for (let i = 0; i < 4; i++) {
          const phase = (time * 0.008 + i * 0.7) % 1;
          const x = (Math.sin(i * 2.4 + time * 0.004) * 0.4 + 0.5) * canvas.width;
          const y = canvas.height - phase * canvas.height * 1.2;
          const opacity = phase < 0.1 ? phase * 10 : phase > 0.8 ? (1 - phase) * 5 : 0.6;
          ctx.font = `${20 + Math.sin(time * 0.05 + i) * 4}px serif`;
          ctx.globalAlpha = opacity;
          ctx.fillText(['❤️','💕','💗','💖'][i % 4], x, y);
          ctx.globalAlpha = 1;
        }
      }

      time++;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [activeEffects]);

  useEffect(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = drawCanvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  };

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingMode) return;
    isDrawingRef.current = true;
    lastPosRef.current = getPos(e);
  }, [isDrawingMode]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingMode || !isDrawingRef.current) return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    const last = lastPosRef.current;
    if (last) {
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = drawColor;
      ctx.lineWidth = drawSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = 0.9;
      ctx.stroke();
    }
    lastPosRef.current = pos;
  }, [isDrawingMode, drawColor, drawSize]);

  const stopDraw = useCallback(() => { isDrawingRef.current = false; lastPosRef.current = null; }, []);

  useEffect(() => {
    if (!isDrawingMode) {
      const canvas = drawCanvasRef.current;
      if (canvas) canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [isDrawingMode]);

  return (
    <>
      <canvas ref={canvasRef} className="absolute inset-0 z-10 pointer-events-none" style={{ width:'100%', height:'100%' }} />
      <canvas
        ref={drawCanvasRef}
        className={`absolute inset-0 z-20 ${isDrawingMode ? 'pointer-events-auto' : 'pointer-events-none'}`}
        style={{ width:'100%', height:'100%', cursor: isDrawingMode ? 'crosshair' : 'default' }}
        onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
        onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
      />
    </>
  );
}
