import React, { useEffect, useRef } from 'react';
import { getModeConfig } from '@/lib/modes';
import type { ExperienceMode } from '@/lib/modes';

interface ModeParticlesProps {
  mode: ExperienceMode;
  active?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  opacity: number;
  life: number;
  maxLife: number;
  shape: string;
  rotation: number;
  rotationSpeed: number;
}

export function ModeParticles({ mode, active = true }: ModeParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animRef = useRef<number>(0);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const config = getModeConfig(mode);

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const spawn = () => {
      const color = config.particleColors[Math.floor(Math.random() * config.particleColors.length)];
      particlesRef.current.push({
        x: Math.random() * canvas.width,
        y: canvas.height + 20,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -(Math.random() * 2 + 0.5),
        size: Math.random() * 8 + 4,
        color,
        opacity: 0,
        life: 0,
        maxLife: 200 + Math.random() * 200,
        shape: config.particleShape,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.05,
      });
    };

    const drawParticle = (p: Particle) => {
      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;

      if (p.shape === 'heart') {
        ctx.font = `${p.size * 2}px serif`;
        ctx.fillText('♥', -p.size, p.size * 0.5);
      } else if (p.shape === 'star') {
        ctx.font = `${p.size * 2}px serif`;
        ctx.fillText('✦', -p.size, p.size * 0.5);
      } else if (p.shape === 'snowflake') {
        ctx.font = `${p.size * 2}px serif`;
        ctx.fillText('❄', -p.size, p.size * 0.5);
      } else if (p.shape === 'confetti') {
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    let spawnTimer = 0;
    const spawnInterval = mode === 'celebration' ? 3 : 15;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      spawnTimer++;
      if (spawnTimer >= spawnInterval && particlesRef.current.length < 40) {
        spawn();
        spawnTimer = 0;
      }

      particlesRef.current = particlesRef.current.filter(p => {
        p.life++;
        const progress = p.life / p.maxLife;
        p.opacity = progress < 0.1 ? progress * 10 : progress > 0.8 ? (1 - progress) * 5 : 0.7;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        if (p.shape === 'confetti') p.vy += 0.02;
        drawParticle(p);
        return p.life < p.maxLife;
      });

      animRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animRef.current);
      particlesRef.current = [];
    };
  }, [mode, active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-5 pointer-events-none"
      style={{ width: '100%', height: '100%' }}
    />
  );
}
