/**
 * ARFaceOverlay — renders face accessories and hand skeleton
 * positioned using real MediaPipe face/hand landmarks.
 */
import React, { useEffect, useRef, useCallback } from 'react';
import { useRoomStore } from '@/store/room-store';
import type { FaceLandmark, HandLandmark, HeadPose, FaceExpression } from '@/hooks/use-ar';

interface Props {
  faceLandmarks: FaceLandmark[] | null;
  handLandmarks: HandLandmark[][] | null;
  headPose: HeadPose | null;
  faceExpression: FaceExpression | null;
}

// ── Particle / heart pools ──────────────────────────────────────────────────
interface Particle { x:number; y:number; vx:number; vy:number; life:number; hue:number; size:number; shape:'circle'|'star'|'heart' }
const particlePool: Particle[] = [];

export function spawnParticles(cx: number, cy: number, count = 12, hueStart = 330) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 5 + 1;
    particlePool.push({ x:cx, y:cy, vx:Math.cos(angle)*speed, vy:Math.sin(angle)*speed - 2.5,
      life:1, hue:hueStart+Math.random()*60, size:Math.random()*8+2, shape:'circle' });
  }
}

export function spawnStars(cx: number, cy: number, count = 8) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 4 + 1;
    particlePool.push({ x:cx, y:cy, vx:Math.cos(angle)*speed, vy:Math.sin(angle)*speed - 3,
      life:1, hue:50+Math.random()*30, size:Math.random()*6+3, shape:'star' });
  }
}

interface Heart { x:number; y:number; vx:number; vy:number; life:number; size:number; hue:number }
const heartPool: Heart[] = [];

export function spawnHearts(cx: number, cy: number, count = 6) {
  for (let i = 0; i < count; i++) {
    heartPool.push({
      x: cx + (Math.random()-0.5)*120,
      y: cy,
      vx: (Math.random()-0.5)*1.5,
      vy: -(Math.random()*2+0.5),
      life: 1, size: 18+Math.random()*16, hue: 330+Math.random()*40,
    });
  }
}

// Rainbow trail attached to hand
interface TrailPoint { x:number; y:number; t:number }
const handTrails: Map<number, TrailPoint[]> = new Map();

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, pts = 5) {
  const inner = r * 0.45;
  ctx.beginPath();
  for (let i = 0; i < pts * 2; i++) {
    const angle = (i * Math.PI) / pts - Math.PI / 2;
    const rad = i % 2 === 0 ? r : inner;
    i === 0 ? ctx.moveTo(cx + Math.cos(angle)*rad, cy + Math.sin(angle)*rad)
            : ctx.lineTo(cx + Math.cos(angle)*rad, cy + Math.sin(angle)*rad);
  }
  ctx.closePath();
}

function updateParticles(ctx: CanvasRenderingContext2D) {
  for (let i = particlePool.length-1; i >= 0; i--) {
    const p = particlePool[i];
    p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.life = Math.max(0, p.life-0.018);
    if (p.life <= 0) { particlePool.splice(i,1); continue; }
    ctx.save();
    ctx.globalAlpha = p.life;
    const c = `hsl(${p.hue},90%,65%)`;
    ctx.fillStyle = c; ctx.shadowColor = c; ctx.shadowBlur = 10;
    if (p.shape === 'star') { drawStar(ctx, p.x, p.y, p.size*p.life); ctx.fill(); }
    else { ctx.beginPath(); ctx.arc(p.x, p.y, p.size*p.life, 0, Math.PI*2); ctx.fill(); }
    ctx.restore();
  }
}

function updateHearts(ctx: CanvasRenderingContext2D) {
  for (let i = heartPool.length-1; i >= 0; i--) {
    const h = heartPool[i];
    h.x += h.vx; h.y += h.vy; h.life = Math.max(0, h.life-0.009);
    if (h.life <= 0) { heartPool.splice(i,1); continue; }
    ctx.save();
    ctx.globalAlpha = h.life;
    ctx.font = `${h.size}px serif`; ctx.textAlign = 'center';
    ctx.fillText('❤️', h.x, h.y);
    ctx.restore();
  }
}

// ── Face accessory helpers ──────────────────────────────────────────────────
const L_EYE_CEN = 159, R_EYE_CEN = 386;
const L_EYE_OUT = 33, R_EYE_OUT = 263;
const NOSE_TIP = 4, FOREHEAD = 10, CHIN = 152;
const U_LIP = 13, L_LIP = 14, L_MOUTH = 61, R_MOUTH = 291;
const L_CHEEK = 234, R_CHEEK = 454;
const NOSE_BRIDGE = 6;

function lm(f: FaceLandmark[], i: number, w: number, h: number) {
  const p = f[i]; return p ? { x: p.x*w, y: p.y*h } : null;
}

// Glasses
function drawGlasses(ctx: CanvasRenderingContext2D, f: FaceLandmark[], w: number, h: number, style: 'classic'|'cool'|'heart' = 'classic') {
  const le = lm(f,L_EYE_CEN,w,h), re = lm(f,R_EYE_CEN,w,h);
  if (!le || !re) return;
  const eyeDist = Math.hypot(re.x-le.x, re.y-le.y);
  const r = eyeDist*0.44;
  const angle = Math.atan2(re.y-le.y, re.x-le.x);
  ctx.save();
  ctx.translate((le.x+re.x)/2, (le.y+re.y)/2);
  ctx.rotate(angle);
  if (style === 'cool') {
    ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 3; ctx.shadowColor = '#00ffff'; ctx.shadowBlur = 14;
    ctx.fillStyle = 'rgba(0,220,255,0.12)';
  } else if (style === 'heart') {
    ctx.strokeStyle = '#ff3366'; ctx.lineWidth = 3; ctx.shadowColor = '#ff3366'; ctx.shadowBlur = 10;
    ctx.fillStyle = 'rgba(255,50,100,0.15)';
  } else {
    ctx.strokeStyle = '#f4a261'; ctx.lineWidth = 3; ctx.shadowColor = '#f4a261'; ctx.shadowBlur = 8;
    ctx.fillStyle = 'rgba(100,180,255,0.18)';
  }
  const draw = (cx: number) => { ctx.beginPath(); ctx.arc(cx,0,r,0,Math.PI*2); ctx.fill(); ctx.stroke(); };
  draw(-eyeDist/2); draw(eyeDist/2);
  ctx.beginPath(); ctx.moveTo(-eyeDist/2+r,0); ctx.lineTo(eyeDist/2-r,0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-eyeDist/2-r,0); ctx.lineTo(-eyeDist/2-r-38,-14); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(eyeDist/2+r,0); ctx.lineTo(eyeDist/2+r+38,-14); ctx.stroke();
  ctx.restore();
}

// Halo
function drawHalo(ctx: CanvasRenderingContext2D, f: FaceLandmark[], w: number, h: number) {
  const top = lm(f,FOREHEAD,w,h), le = lm(f,L_EYE_OUT,w,h), re = lm(f,R_EYE_OUT,w,h);
  if (!top||!le||!re) return;
  const cx = top.x, cy = top.y - 45;
  const rx = Math.abs(re.x-le.x)*0.68, ry = rx*0.28;
  const t = Date.now()/1000;
  ctx.save(); ctx.translate(cx,cy); ctx.rotate(Math.sin(t*0.8)*0.12);
  const grad = ctx.createLinearGradient(-rx,0,rx,0);
  grad.addColorStop(0,'rgba(255,215,0,0.25)'); grad.addColorStop(0.5,'rgba(255,255,150,0.95)'); grad.addColorStop(1,'rgba(255,215,0,0.25)');
  ctx.strokeStyle = grad; ctx.lineWidth = 9; ctx.shadowColor = 'rgba(255,220,50,0.9)'; ctx.shadowBlur = 24;
  ctx.beginPath(); ctx.ellipse(0,0,rx,ry,0,0,Math.PI*2); ctx.stroke();
  for (let i=0;i<10;i++) {
    const a=(i/10)*Math.PI*2+t*0.6;
    ctx.beginPath(); ctx.arc(Math.cos(a)*rx, Math.sin(a)*ry, 3.5,0,Math.PI*2);
    ctx.fillStyle='rgba(255,255,150,0.85)'; ctx.fill();
  }
  ctx.restore();
}

// Devil horns
function drawHorns(ctx: CanvasRenderingContext2D, f: FaceLandmark[], w: number, h: number) {
  const top = lm(f,FOREHEAD,w,h), le = lm(f,L_EYE_OUT,w,h), re = lm(f,R_EYE_OUT,w,h);
  if (!top||!le||!re) return;
  const eyeDist = Math.abs(re.x-le.x);
  const cx = top.x, cy = top.y;
  const hornH = eyeDist*0.8, hornW = eyeDist*0.2, offset = eyeDist*0.4;
  ctx.save(); ctx.shadowColor = 'rgba(160,0,0,0.8)'; ctx.shadowBlur = 16;
  for (const dx of [-offset,offset]) {
    const grad = ctx.createLinearGradient(cx+dx,cy,cx+dx,cy-hornH);
    grad.addColorStop(0,'#7a0000'); grad.addColorStop(1,'#cc2222');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(cx+dx-hornW,cy);
    ctx.quadraticCurveTo(cx+dx-hornW*0.3,cy-hornH*0.65,cx+dx,cy-hornH);
    ctx.quadraticCurveTo(cx+dx+hornW*0.3,cy-hornH*0.65,cx+dx+hornW,cy);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

// Cat ears
function drawCatEars(ctx: CanvasRenderingContext2D, f: FaceLandmark[], w: number, h: number) {
  const top = lm(f,FOREHEAD,w,h), le = lm(f,L_EYE_OUT,w,h), re = lm(f,R_EYE_OUT,w,h);
  if (!top||!le||!re) return;
  const eyeDist = Math.abs(re.x-le.x);
  const t = Date.now()/1000;
  const wobble = Math.sin(t*2)*0.06;
  ctx.save();
  for (const [dx, dir] of [[-eyeDist*0.42, -1], [eyeDist*0.42, 1]] as [number,number][]) {
    ctx.save();
    ctx.translate(top.x+dx, top.y-8);
    ctx.rotate(dir*0.25+wobble*dir);
    // Outer ear
    const outGrad = ctx.createLinearGradient(0,0,0,-eyeDist*0.55);
    outGrad.addColorStop(0,'#c9a0b0'); outGrad.addColorStop(1,'#f0c0d0');
    ctx.fillStyle = outGrad; ctx.shadowColor='rgba(180,100,150,0.4)'; ctx.shadowBlur=12;
    ctx.beginPath();
    ctx.moveTo(-eyeDist*0.16,0);
    ctx.lineTo(dir*eyeDist*0.04,-eyeDist*0.55);
    ctx.lineTo(eyeDist*0.16,0);
    ctx.closePath(); ctx.fill();
    // Inner ear
    ctx.fillStyle = 'rgba(255,140,180,0.8)'; ctx.shadowBlur=0;
    ctx.beginPath();
    ctx.moveTo(-eyeDist*0.08,0);
    ctx.lineTo(dir*eyeDist*0.02,-eyeDist*0.38);
    ctx.lineTo(eyeDist*0.08,0);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

// Bunny ears
function drawBunnyEars(ctx: CanvasRenderingContext2D, f: FaceLandmark[], w: number, h: number) {
  const top = lm(f,FOREHEAD,w,h), le = lm(f,L_EYE_OUT,w,h), re = lm(f,R_EYE_OUT,w,h);
  if (!top||!le||!re) return;
  const eyeDist = Math.abs(re.x-le.x);
  const t = Date.now()/1000;
  ctx.save();
  for (const [dx,tilt] of [[-eyeDist*0.3,-0.15],[eyeDist*0.3,0.15]] as [number,number][]) {
    ctx.save();
    ctx.translate(top.x+dx, top.y+4);
    ctx.rotate(tilt+Math.sin(t*1.2+dx)*0.04);
    // Ear body
    ctx.fillStyle = '#f0e0e8'; ctx.strokeStyle = '#d0a0c0'; ctx.lineWidth = 2;
    ctx.shadowColor='rgba(200,150,180,0.4)'; ctx.shadowBlur=10;
    ctx.beginPath(); ctx.ellipse(0,-eyeDist*0.45,eyeDist*0.1,eyeDist*0.5,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
    // Pink inner
    ctx.fillStyle = 'rgba(255,160,190,0.85)'; ctx.shadowBlur=0;
    ctx.beginPath(); ctx.ellipse(0,-eyeDist*0.44,eyeDist*0.055,eyeDist*0.35,0,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

// Crown / tiara
function drawCrown(ctx: CanvasRenderingContext2D, f: FaceLandmark[], w: number, h: number) {
  const top = lm(f,FOREHEAD,w,h), le = lm(f,L_EYE_OUT,w,h), re = lm(f,R_EYE_OUT,w,h);
  if (!top||!le||!re) return;
  const eyeDist = Math.abs(re.x-le.x);
  const cx = top.x, cy = top.y-20;
  const cw = eyeDist*0.82, ch = eyeDist*0.34;
  ctx.save();
  const t = Date.now()/1000;
  ctx.rotate(Math.sin(t*0.5)*0.04);
  // Base band
  const bandGrad = ctx.createLinearGradient(cx-cw/2,cy,cx+cw/2,cy+ch);
  bandGrad.addColorStop(0,'#FFD700'); bandGrad.addColorStop(0.5,'#FFF9C4'); bandGrad.addColorStop(1,'#DAA520');
  ctx.fillStyle = bandGrad; ctx.strokeStyle='#B8860B'; ctx.lineWidth=2;
  ctx.shadowColor='rgba(255,215,0,0.7)'; ctx.shadowBlur=18;
  ctx.beginPath(); ctx.roundRect(cx-cw/2,cy,cw,ch,5); ctx.fill(); ctx.stroke();
  // Points (5)
  const peaks = [-cw/2, -cw/4, 0, cw/4, cw/2];
  const heights = [ch*1.0, ch*1.3, ch*1.6, ch*1.3, ch*1.0];
  for (let i=0;i<peaks.length;i++) {
    ctx.fillStyle = bandGrad;
    ctx.beginPath();
    ctx.moveTo(cx+peaks[i]-cw/8,cy);
    ctx.lineTo(cx+peaks[i],cy-heights[i]);
    ctx.lineTo(cx+peaks[i]+cw/8,cy);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // Gem on each peak
    ctx.fillStyle = i===2?'#ff3366':i%2===0?'#00ffcc':'#6666ff';
    ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur=12;
    ctx.beginPath(); ctx.arc(cx+peaks[i],cy-heights[i]+4,5,0,Math.PI*2); ctx.fill();
  }
  // Gems on band
  for (let i=0;i<5;i++) {
    ctx.fillStyle = ['#ff3366','#ffcc00','#00ffcc','#6666ff','#ff9900'][i];
    ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur=10;
    ctx.beginPath(); ctx.arc(cx-cw/2+cw/4*i+cw/8,cy+ch/2,4,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();
}

// Clown nose
function drawClownNose(ctx: CanvasRenderingContext2D, f: FaceLandmark[], w: number, h: number) {
  const nose = lm(f,NOSE_TIP,w,h);
  if (!nose) return;
  const t = Date.now()/1000;
  const r = 14 + Math.sin(t*3)*2;
  ctx.save();
  const grad = ctx.createRadialGradient(nose.x-4,nose.y-4,1,nose.x,nose.y,r);
  grad.addColorStop(0,'#ff8888'); grad.addColorStop(0.7,'#ff2222'); grad.addColorStop(1,'#990000');
  ctx.fillStyle = grad; ctx.shadowColor='rgba(255,0,0,0.6)'; ctx.shadowBlur=12;
  ctx.beginPath(); ctx.arc(nose.x,nose.y,r,0,Math.PI*2); ctx.fill();
  ctx.restore();
}

// Mustache
function drawMustache(ctx: CanvasRenderingContext2D, f: FaceLandmark[], w: number, h: number, style: 'classic'|'curly' = 'classic') {
  const nose = lm(f,NOSE_TIP,w,h), lm_l = lm(f,L_MOUTH,w,h), lm_r = lm(f,R_MOUTH,w,h);
  if (!nose||!lm_l||!lm_r) return;
  const mw = Math.abs(lm_r.x-lm_l.x)*0.9;
  const cx = (lm_l.x+lm_r.x)/2, cy = nose.y+12;
  ctx.save();
  ctx.fillStyle = '#2c1810'; ctx.shadowColor='rgba(0,0,0,0.5)'; ctx.shadowBlur=6;
  if (style === 'curly') {
    ctx.beginPath();
    ctx.moveTo(cx,cy);
    ctx.bezierCurveTo(cx-mw*0.1,cy-18,cx-mw*0.55,cy-28,cx-mw*0.62,cy-8);
    ctx.bezierCurveTo(cx-mw*0.55,cy+8,cx-mw*0.3,cy+4,cx,cy);
    ctx.bezierCurveTo(cx+mw*0.3,cy+4,cx+mw*0.55,cy+8,cx+mw*0.62,cy-8);
    ctx.bezierCurveTo(cx+mw*0.55,cy-28,cx+mw*0.1,cy-18,cx,cy);
    ctx.fill();
  } else {
    for (const [sign,flip] of [[-1,-1],[1,1]] as [number,number][]) {
      ctx.beginPath();
      ctx.ellipse(cx+sign*mw*0.3, cy, mw*0.3, 8, flip*0.4, 0, Math.PI); ctx.fill();
    }
  }
  ctx.restore();
}

// Beard
function drawBeard(ctx: CanvasRenderingContext2D, f: FaceLandmark[], w: number, h: number) {
  const chin = lm(f,CHIN,w,h), lc = lm(f,L_CHEEK,w,h), rc = lm(f,R_CHEEK,w,h);
  if (!chin||!lc||!rc) return;
  const bw = Math.abs(rc.x-lc.x)*0.8;
  const cx = (lc.x+rc.x)/2, cy = (lc.y+rc.y)/2;
  ctx.save();
  ctx.fillStyle = '#2c1810'; ctx.globalAlpha=0.75;
  ctx.shadowColor='rgba(0,0,0,0.3)'; ctx.shadowBlur=8;
  ctx.beginPath();
  ctx.ellipse(cx, cy+20, bw*0.55, Math.abs(chin.y-cy)*0.7, 0, 0, Math.PI); ctx.fill();
  ctx.restore();
}

// Rose crown
function drawRose(ctx: CanvasRenderingContext2D, f: FaceLandmark[], w: number, h: number) {
  const nose = lm(f,NOSE_TIP,w,h), le = lm(f,L_EYE_OUT,w,h), re = lm(f,R_EYE_OUT,w,h);
  if (!nose||!le||!re) return;
  const cx = (le.x+re.x)/2, cy = nose.y-22;
  const size = Math.abs(re.x-le.x)*0.22;
  const t = Date.now()/1000;
  ctx.save(); ctx.translate(cx,cy); ctx.rotate(Math.sin(t*0.5)*0.08);
  for (let i=0;i<6;i++) {
    const a=(i/6)*Math.PI*2;
    const px=Math.cos(a)*size*0.48, py=Math.sin(a)*size*0.48;
    const g = ctx.createRadialGradient(px,py,0,px,py,size*0.55);
    g.addColorStop(0,'rgba(255,80,120,0.95)'); g.addColorStop(1,'rgba(190,0,50,0.25)');
    ctx.fillStyle=g; ctx.beginPath(); ctx.ellipse(px,py,size*0.46,size*0.46,a,0,Math.PI*2); ctx.fill();
  }
  const center=ctx.createRadialGradient(0,0,0,0,0,size*0.32);
  center.addColorStop(0,'#ff6080'); center.addColorStop(1,'#cc0040');
  ctx.fillStyle=center; ctx.beginPath(); ctx.arc(0,0,size*0.32,0,Math.PI*2); ctx.fill();
  ctx.restore();
}

// Glitter sparkles around face edges
function drawGlitter(ctx: CanvasRenderingContext2D, f: FaceLandmark[], w: number, h: number) {
  const pts = [L_EYE_OUT,R_EYE_OUT,L_CHEEK,R_CHEEK,FOREHEAD,CHIN,NOSE_TIP];
  const t = Date.now()/1000;
  ctx.save();
  for (const idx of pts) {
    const p = f[idx]; if (!p) continue;
    const px=p.x*w, py=p.y*h;
    const hue = ((idx*30+t*60)%360);
    const pulse = (Math.sin(t*3+idx)*0.5+0.5)*0.8+0.2;
    ctx.fillStyle=`hsla(${hue},100%,75%,${pulse})`;
    ctx.shadowColor=`hsl(${hue},100%,70%)`; ctx.shadowBlur=10;
    ctx.beginPath(); ctx.arc(px,py,3,0,Math.PI*2); ctx.fill();
    // Mini star
    drawStar(ctx,px,py,5,4); ctx.fill();
  }
  ctx.restore();
}

// Face mesh outline (subtle)
function drawFaceMesh(ctx: CanvasRenderingContext2D, f: FaceLandmark[], w: number, h: number, hue: number) {
  if (!f || f.length < 468) return;
  // Draw key face contours
  const silhouette = [10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,
    148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109,10];
  ctx.save();
  ctx.strokeStyle = `hsla(${hue},80%,70%,0.4)`;
  ctx.lineWidth = 1; ctx.setLineDash([3,5]);
  ctx.beginPath();
  let first = true;
  for (const i of silhouette) {
    const p = f[i]; if (!p) continue;
    if (first) { ctx.moveTo(p.x*w,p.y*h); first=false; }
    else ctx.lineTo(p.x*w,p.y*h);
  }
  ctx.closePath(); ctx.stroke();
  ctx.restore();
}

// Mouth effect (kiss / open wow)
function drawMouthEffect(ctx: CanvasRenderingContext2D, f: FaceLandmark[], w: number, h: number, expr: FaceExpression) {
  if (!expr.mouthOpen) return;
  const ul = lm(f,U_LIP,w,h), ll = lm(f,L_LIP,w,h);
  if (!ul||!ll) return;
  const cy = (ul.y+ll.y)/2, cx = (ul.x+ll.x)/2;
  const r = Math.abs(ll.y-ul.y)*1.5+8;
  // Wow ring
  ctx.save();
  ctx.strokeStyle='rgba(255,220,50,0.8)'; ctx.lineWidth=3;
  ctx.shadowColor='rgba(255,200,0,0.8)'; ctx.shadowBlur=15;
  ctx.beginPath(); ctx.arc(cx,cy,r+2+Math.sin(Date.now()/200)*3,0,Math.PI*2); ctx.stroke();
  ctx.restore();
  // Spawn stars occasionally
  if (Math.random()<0.1) spawnStars(cx,cy,3);
}

// Head tilt indicator
function drawHeadTiltIndicator(ctx: CanvasRenderingContext2D, pose: HeadPose, w: number, h: number) {
  if (Math.abs(pose.tiltAngle) < 8) return;
  const dir = pose.tiltAngle > 0 ? '→' : '←';
  ctx.save();
  ctx.font = 'bold 28px serif'; ctx.textAlign='center';
  ctx.globalAlpha = Math.min(1, (Math.abs(pose.tiltAngle)-8)/25);
  ctx.fillStyle='rgba(255,220,50,0.9)';
  ctx.shadowColor='rgba(255,200,0,0.8)'; ctx.shadowBlur=15;
  ctx.fillText(dir, w*0.12, h*0.12);
  ctx.restore();
}

// Eye gaze indicator
function drawEyeGaze(ctx: CanvasRenderingContext2D, expr: FaceExpression, f: FaceLandmark[], w: number, h: number) {
  if (!expr.eyeGazeLeft && !expr.eyeGazeRight) return;
  const le = lm(f,L_EYE_CEN,w,h), re = lm(f,R_EYE_CEN,w,h);
  if (!le||!re) return;
  const dir = expr.eyeGazeRight ? 1 : -1;
  ctx.save();
  for (const eye of [le, re]) {
    ctx.strokeStyle='rgba(100,200,255,0.7)'; ctx.lineWidth=2;
    ctx.shadowColor='rgba(100,200,255,0.8)'; ctx.shadowBlur=10;
    ctx.beginPath();
    ctx.moveTo(eye.x, eye.y);
    ctx.lineTo(eye.x+dir*20, eye.y);
    ctx.stroke();
    ctx.fillStyle='rgba(100,200,255,0.8)';
    ctx.beginPath(); ctx.arc(eye.x+dir*20, eye.y, 3, 0, Math.PI*2); ctx.fill();
  }
  ctx.restore();
}

// ── Hand skeleton ───────────────────────────────────────────────────────────
const HAND_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],
  [5,9],[9,13],[13,17],
];
const FINGER_TIPS = [4,8,12,16,20];
const FINGER_NAMES = ['Thumb','Index','Middle','Ring','Pinky'];

function drawHand(ctx: CanvasRenderingContext2D, lms: HandLandmark[], w: number, h: number, activeEffects: string[], handIdx: number) {
  const isPalm    = activeEffects.includes('ar_particles');
  const isRock    = activeEffects.includes('ar_rock');
  const t = Date.now()/1000;
  const hue = (handIdx*120+t*30)%360;
  const lineColor = isPalm ? `hsla(${hue},90%,70%,0.8)` : isRock ? 'rgba(255,80,0,0.7)' : 'rgba(255,130,180,0.65)';

  // Rainbow trail
  if (!handTrails.has(handIdx)) handTrails.set(handIdx,[]);
  const trail = handTrails.get(handIdx)!;
  const wrist = lms[0];
  if (wrist) trail.push({x:wrist.x*w,y:wrist.y*h,t:Date.now()});
  while (trail.length>0 && Date.now()-trail[0].t>800) trail.shift();

  if (trail.length>2) {
    ctx.save();
    for (let i=1;i<trail.length;i++) {
      const prog = i/trail.length;
      ctx.strokeStyle=`hsla(${(hue+i*10)%360},90%,65%,${prog*0.6})`;
      ctx.lineWidth=prog*4;
      ctx.shadowColor=`hsla(${hue},90%,65%,0.5)`;
      ctx.shadowBlur=8;
      ctx.beginPath();
      ctx.moveTo(trail[i-1].x,trail[i-1].y);
      ctx.lineTo(trail[i].x,trail[i].y);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.save();
  ctx.strokeStyle=lineColor; ctx.lineWidth=2.5;
  ctx.shadowColor=lineColor; ctx.shadowBlur=10;
  for (const [a,b] of HAND_CONNECTIONS) {
    const pa=lms[a], pb=lms[b]; if (!pa||!pb) continue;
    ctx.beginPath(); ctx.moveTo(pa.x*w,pa.y*h); ctx.lineTo(pb.x*w,pb.y*h); ctx.stroke();
  }
  ctx.fillStyle='rgba(255,160,210,0.9)';
  for (const p of lms) { ctx.beginPath(); ctx.arc(p.x*w,p.y*h,3.5,0,Math.PI*2); ctx.fill(); }
  ctx.restore();

  // Fingertip effects
  if (isPalm) {
    for (const tipIdx of FINGER_TIPS) {
      const tp = lms[tipIdx];
      if (tp&&Math.random()<0.35) spawnParticles(tp.x*w,tp.y*h,2,240+handIdx*60);
    }
  }
  if (isRock) {
    for (const tipIdx of [8,20]) {
      const tp=lms[tipIdx];
      if (tp&&Math.random()<0.4) spawnStars(tp.x*w,tp.y*h,2);
    }
  }
}

// ── Component ───────────────────────────────────────────────────────────────
export function ARFaceOverlay({ faceLandmarks, handLandmarks, headPose, faceExpression }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number|null>(null);
  const { activeEffects } = useRoomStore();

  const render = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    const w=canvas.width, h=canvas.height;
    ctx.clearRect(0,0,w,h);

    const fx = (id: string) => activeEffects.includes(id);
    const f  = faceLandmarks;

    if (f) {
      if (fx('ar_mesh'))        drawFaceMesh(ctx, f, w, h, (Date.now()/50)%360);
      if (fx('ar_glitter'))     drawGlitter(ctx, f, w, h);
      if (fx('ar_glasses'))     drawGlasses(ctx, f, w, h, 'classic');
      if (fx('ar_glasses_cool')) drawGlasses(ctx, f, w, h, 'cool');
      if (fx('ar_glasses_heart')) drawGlasses(ctx, f, w, h, 'heart');
      if (fx('ar_halo'))        drawHalo(ctx, f, w, h);
      if (fx('ar_horns'))       drawHorns(ctx, f, w, h);
      if (fx('ar_cat_ears'))    drawCatEars(ctx, f, w, h);
      if (fx('ar_bunny_ears'))  drawBunnyEars(ctx, f, w, h);
      if (fx('ar_crown'))       drawCrown(ctx, f, w, h);
      if (fx('ar_clown_nose'))  drawClownNose(ctx, f, w, h);
      if (fx('ar_mustache'))    drawMustache(ctx, f, w, h, 'classic');
      if (fx('ar_curly_mustache')) drawMustache(ctx, f, w, h, 'curly');
      if (fx('ar_beard'))       drawBeard(ctx, f, w, h);
      if (fx('ar_rose'))        drawRose(ctx, f, w, h);
      if (faceExpression)       drawMouthEffect(ctx, f, w, h, faceExpression);
      if (faceExpression && fx('ar_gaze')) drawEyeGaze(ctx, faceExpression, f, w, h);
    }

    if (headPose && fx('ar_head_indicator')) drawHeadTiltIndicator(ctx, headPose, w, h);

    if (handLandmarks) {
      for (let i=0;i<handLandmarks.length;i++) {
        drawHand(ctx, handLandmarks[i], w, h, activeEffects, i);
      }
    }

    updateParticles(ctx);
    updateHearts(ctx);

    rafRef.current = requestAnimationFrame(render);
  }, [faceLandmarks, handLandmarks, headPose, faceExpression, activeEffects]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(render);
    return () => { if (rafRef.current!==null) cancelAnimationFrame(rafRef.current); };
  }, [render]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ width:'100%', height:'100%', zIndex:15 }}
    />
  );
}
