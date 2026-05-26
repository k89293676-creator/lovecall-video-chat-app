import React, { useEffect, useRef } from 'react';
import { useRoomStore } from '@/store/room-store';

export function CanvasOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { activeEffects } = useRoomStore();

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
        // Draw some wax drips
        ctx.fillStyle = 'rgba(255, 50, 50, 0.4)';
        for (let i = 0; i < 5; i++) {
          const x = (Math.sin(time * 0.01 + i) * 0.5 + 0.5) * canvas.width;
          const y = (time * 2 + i * 100) % canvas.height;
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (activeEffects.includes('filter_ice')) {
        ctx.fillStyle = 'rgba(100, 200, 255, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      if (activeEffects.includes('filter_blindfold')) {
        const gradient = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 100, canvas.width/2, canvas.height/2, canvas.width/1.5);
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, 'rgba(0,0,0,0.9)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
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

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 z-10 pointer-events-none"
      style={{ width: '100%', height: '100%' }}
    />
  );
}
