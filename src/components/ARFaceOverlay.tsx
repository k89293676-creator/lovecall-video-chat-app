/**
 * ARFaceOverlay — renders face/hand AR anchored to the local video PIP.
 *
 * KEY FIXES vs previous version:
 * 1. Coordinates transform from normalized [0-1] → PIP screen rect with X-mirror
 *    (the video element has scale-x-[-1] CSS so we flip x: screenX = rect.left + (1-lx)*rect.width)
 * 2. Canvas resized only on window resize (not every frame)
 * 3. Render loop runs once — reads data from refs each frame (no dep-driven restarts)
 * 4. Hand landmarks use same mirrored transform
 */
import React, { useEffect, useRef } from 'react';
import { useRoomStore } from '@/store/room-store';
import type { FaceLandmark, HandLandmark, HeadPose, FaceExpression } from '@/hooks/use-ar';

interface Props {
  faceLandmarks:  FaceLandmark[]   | null;
  handLandmarks:  HandLandmark[][] | null;
  headPose:       HeadPose         | null;
  faceExpression: FaceExpression   | null;
  videoRef:       React.RefObject<HTMLVideoElement>;
}

// ── Particle / heart pools ──────────────────────────────────────────────────
interface Particle { x:number; y:number; vx:number; vy:number; life:number; hue:number; size:number; shape:'circle'|'star' }
const particlePool: Particle[] = [];

export function spawnParticles(cx: number, cy: number, count = 12, hueStart = 330) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 5 + 1;
    particlePool.push({ x:cx, y:cy, vx:Math.cos(angle)*speed, vy:Math.sin(angle)*speed-2.5,
      life:1, hue:hueStart+Math.random()*60, size:Math.random()*8+2, shape:'circle' });
  }
}

export function spawnStars(cx: number, cy: number, count = 8) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 4 + 1;
    particlePool.push({ x:cx, y:cy, vx:Math.cos(angle)*speed, vy:Math.sin(angle)*speed-3,
      life:1, hue:50+Math.random()*30, size:Math.random()*6+3, shape:'star' });
  }
}

interface Heart { x:number; y:number; vx:number; vy:number; life:number; size:number; hue:number }
const heartPool: Heart[] = [];

export function spawnHearts(cx: number, cy: number, count = 6) {
  for (let i = 0; i < count; i++) {
    heartPool.push({ x:cx+(Math.random()-0.5)*120, y:cy,
      vx:(Math.random()-0.5)*1.5, vy:-(Math.random()*2+0.5),
      life:1, size:18+Math.random()*16, hue:330+Math.random()*40 });
  }
}

interface TrailPt { x:number; y:number; t:number }
const handTrails: Map<number, TrailPt[]> = new Map();

// ── Canvas helpers ──────────────────────────────────────────────────────────
function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, pts = 5) {
  const inner = r*0.45;
  ctx.beginPath();
  for (let i = 0; i < pts*2; i++) {
    const a = (i*Math.PI)/pts - Math.PI/2;
    const rad = i%2===0 ? r : inner;
    i===0 ? ctx.moveTo(cx+Math.cos(a)*rad, cy+Math.sin(a)*rad)
           : ctx.lineTo(cx+Math.cos(a)*rad, cy+Math.sin(a)*rad);
  }
  ctx.closePath();
}

function updateParticles(ctx: CanvasRenderingContext2D) {
  for (let i = particlePool.length-1; i >= 0; i--) {
    const p = particlePool[i];
    p.x+=p.vx; p.y+=p.vy; p.vy+=0.12; p.life=Math.max(0,p.life-0.018);
    if (p.life<=0) { particlePool.splice(i,1); continue; }
    ctx.save(); ctx.globalAlpha=p.life;
    const c=`hsl(${p.hue},90%,65%)`;
    ctx.fillStyle=c; ctx.shadowColor=c; ctx.shadowBlur=10;
    if (p.shape==='star') { drawStar(ctx,p.x,p.y,p.size*p.life); ctx.fill(); }
    else { ctx.beginPath(); ctx.arc(p.x,p.y,p.size*p.life,0,Math.PI*2); ctx.fill(); }
    ctx.restore();
  }
}

function updateHearts(ctx: CanvasRenderingContext2D) {
  for (let i = heartPool.length-1; i >= 0; i--) {
    const h = heartPool[i];
    h.x+=h.vx; h.y+=h.vy; h.life=Math.max(0,h.life-0.009);
    if (h.life<=0) { heartPool.splice(i,1); continue; }
    ctx.save(); ctx.globalAlpha=h.life;
    ctx.font=`${h.size}px serif`; ctx.textAlign='center';
    ctx.fillText('❤️',h.x,h.y);
    ctx.restore();
  }
}

// ── Landmark indices ────────────────────────────────────────────────────────
const L_EYE_CEN=159, R_EYE_CEN=386;
const L_EYE_OUT=33, R_EYE_OUT=263;
const NOSE_TIP=4, FOREHEAD=10, CHIN=152;
const U_LIP=13, L_LIP=14, L_MOUTH=61, R_MOUTH=291;
const L_CHEEK=234, R_CHEEK=454;

/**
 * Map a normalized MediaPipe landmark to canvas screen coords.
 * Mirrors X to match the CSS scale-x-[-1] on the video element.
 */
function lp(f: FaceLandmark[], i: number, rect: DOMRect): {x:number;y:number}|null {
  const p = f[i]; if (!p) return null;
  return { x: rect.left + (1-p.x)*rect.width, y: rect.top + p.y*rect.height };
}

/** Eye distance in pixels (mirroring doesn't change |delta|) */
function eyeDistPx(f: FaceLandmark[], rect: DOMRect): number {
  const le=f[L_EYE_OUT], re=f[R_EYE_OUT];
  if (!le||!re) return rect.width*0.4;
  return Math.abs(re.x-le.x)*rect.width;
}

// ── Face accessory drawing (all use lp() for correct coords) ────────────────

function drawGlasses(ctx: CanvasRenderingContext2D, f: FaceLandmark[], rect: DOMRect, style: 'classic'|'cool'|'heart'='classic') {
  const le=lp(f,L_EYE_CEN,rect), re=lp(f,R_EYE_CEN,rect);
  if (!le||!re) return;
  const eyeDist=Math.hypot(re.x-le.x,re.y-le.y);
  const r=eyeDist*0.44;
  const angle=Math.atan2(re.y-le.y,re.x-le.x);
  const cx=(le.x+re.x)/2, cy=(le.y+re.y)/2;
  ctx.save();
  ctx.translate(cx,cy); ctx.rotate(angle);
  if (style==='cool') {
    ctx.strokeStyle='#00ffff'; ctx.lineWidth=3; ctx.shadowColor='#00ffff'; ctx.shadowBlur=14;
    ctx.fillStyle='rgba(0,220,255,0.12)';
  } else if (style==='heart') {
    ctx.strokeStyle='#ff3366'; ctx.lineWidth=3; ctx.shadowColor='#ff3366'; ctx.shadowBlur=10;
    ctx.fillStyle='rgba(255,50,100,0.15)';
  } else {
    ctx.strokeStyle='#f4a261'; ctx.lineWidth=3; ctx.shadowColor='#f4a261'; ctx.shadowBlur=8;
    ctx.fillStyle='rgba(100,180,255,0.18)';
  }
  const half=eyeDist/2;
  const drawLens=(cx2:number)=>{ctx.beginPath();ctx.arc(cx2,0,r,0,Math.PI*2);ctx.fill();ctx.stroke();};
  drawLens(-half); drawLens(half);
  ctx.beginPath(); ctx.moveTo(-half+r,0); ctx.lineTo(half-r,0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-half-r,0); ctx.lineTo(-half-r-38,-14); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(half+r,0); ctx.lineTo(half+r+38,-14); ctx.stroke();
  ctx.restore();
}

function drawHalo(ctx: CanvasRenderingContext2D, f: FaceLandmark[], rect: DOMRect) {
  const top=lp(f,FOREHEAD,rect), le=lp(f,L_EYE_OUT,rect), re=lp(f,R_EYE_OUT,rect);
  if (!top||!le||!re) return;
  const cx=top.x, cy=top.y-45;
  const rx=Math.abs(re.x-le.x)*0.68, ry=rx*0.28;
  const t=Date.now()/1000;
  ctx.save(); ctx.translate(cx,cy); ctx.rotate(Math.sin(t*0.8)*0.12);
  const grad=ctx.createLinearGradient(-rx,0,rx,0);
  grad.addColorStop(0,'rgba(255,215,0,0.25)'); grad.addColorStop(0.5,'rgba(255,255,150,0.95)'); grad.addColorStop(1,'rgba(255,215,0,0.25)');
  ctx.strokeStyle=grad; ctx.lineWidth=9; ctx.shadowColor='rgba(255,220,50,0.9)'; ctx.shadowBlur=24;
  ctx.beginPath(); ctx.ellipse(0,0,rx,ry,0,0,Math.PI*2); ctx.stroke();
  for (let i=0;i<10;i++) {
    const a=(i/10)*Math.PI*2+t*0.6;
    ctx.beginPath(); ctx.arc(Math.cos(a)*rx,Math.sin(a)*ry,3.5,0,Math.PI*2);
    ctx.fillStyle='rgba(255,255,150,0.85)'; ctx.fill();
  }
  ctx.restore();
}

function drawHorns(ctx: CanvasRenderingContext2D, f: FaceLandmark[], rect: DOMRect) {
  const top=lp(f,FOREHEAD,rect), le=lp(f,L_EYE_OUT,rect), re=lp(f,R_EYE_OUT,rect);
  if (!top||!le||!re) return;
  const edPx=eyeDistPx(f,rect);
  const cx=top.x, cy=top.y;
  const hornH=edPx*0.8, hornW=edPx*0.2, offset=edPx*0.4;
  ctx.save(); ctx.shadowColor='rgba(160,0,0,0.8)'; ctx.shadowBlur=16;
  for (const dx of [-offset,offset]) {
    const grad=ctx.createLinearGradient(cx+dx,cy,cx+dx,cy-hornH);
    grad.addColorStop(0,'#7a0000'); grad.addColorStop(1,'#cc2222');
    ctx.fillStyle=grad;
    ctx.beginPath();
    ctx.moveTo(cx+dx-hornW,cy);
    ctx.quadraticCurveTo(cx+dx-hornW*0.3,cy-hornH*0.65,cx+dx,cy-hornH);
    ctx.quadraticCurveTo(cx+dx+hornW*0.3,cy-hornH*0.65,cx+dx+hornW,cy);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

function drawCatEars(ctx: CanvasRenderingContext2D, f: FaceLandmark[], rect: DOMRect) {
  const top=lp(f,FOREHEAD,rect), le=lp(f,L_EYE_OUT,rect), re=lp(f,R_EYE_OUT,rect);
  if (!top||!le||!re) return;
  const edPx=eyeDistPx(f,rect);
  const t=Date.now()/1000;
  const wobble=Math.sin(t*2)*0.06;
  ctx.save();
  for (const [dx,dir] of [[-edPx*0.42,-1],[edPx*0.42,1]] as [number,number][]) {
    ctx.save(); ctx.translate(top.x+dx,top.y-8); ctx.rotate(dir*0.25+wobble*dir);
    const outGrad=ctx.createLinearGradient(0,0,0,-edPx*0.55);
    outGrad.addColorStop(0,'#c9a0b0'); outGrad.addColorStop(1,'#f0c0d0');
    ctx.fillStyle=outGrad; ctx.shadowColor='rgba(180,100,150,0.4)'; ctx.shadowBlur=12;
    ctx.beginPath();
    ctx.moveTo(-edPx*0.16,0); ctx.lineTo(dir*edPx*0.04,-edPx*0.55); ctx.lineTo(edPx*0.16,0);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle='rgba(255,140,180,0.8)'; ctx.shadowBlur=0;
    ctx.beginPath();
    ctx.moveTo(-edPx*0.08,0); ctx.lineTo(dir*edPx*0.02,-edPx*0.38); ctx.lineTo(edPx*0.08,0);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawBunnyEars(ctx: CanvasRenderingContext2D, f: FaceLandmark[], rect: DOMRect) {
  const top=lp(f,FOREHEAD,rect), le=lp(f,L_EYE_OUT,rect), re=lp(f,R_EYE_OUT,rect);
  if (!top||!le||!re) return;
  const edPx=eyeDistPx(f,rect);
  const t=Date.now()/1000;
  ctx.save();
  for (const [dx,tilt] of [[-edPx*0.3,-0.15],[edPx*0.3,0.15]] as [number,number][]) {
    ctx.save(); ctx.translate(top.x+dx,top.y+4); ctx.rotate(tilt+Math.sin(t*1.2+dx)*0.04);
    ctx.fillStyle='#f0e0e8'; ctx.strokeStyle='#d0a0c0'; ctx.lineWidth=2;
    ctx.shadowColor='rgba(200,150,180,0.4)'; ctx.shadowBlur=10;
    ctx.beginPath(); ctx.ellipse(0,-edPx*0.45,edPx*0.1,edPx*0.5,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle='rgba(255,160,190,0.85)'; ctx.shadowBlur=0;
    ctx.beginPath(); ctx.ellipse(0,-edPx*0.44,edPx*0.055,edPx*0.35,0,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawCrown(ctx: CanvasRenderingContext2D, f: FaceLandmark[], rect: DOMRect) {
  const top=lp(f,FOREHEAD,rect), le=lp(f,L_EYE_OUT,rect), re=lp(f,R_EYE_OUT,rect);
  if (!top||!le||!re) return;
  const edPx=eyeDistPx(f,rect);
  const cx=top.x, cy=top.y-20;
  const cw=edPx*0.82, ch=edPx*0.34;
  const t=Date.now()/1000;
  ctx.save(); ctx.translate(cx,cy); ctx.rotate(Math.sin(t*0.5)*0.04);
  const bandGrad=ctx.createLinearGradient(-cw/2,0,cw/2,ch);
  bandGrad.addColorStop(0,'#FFD700'); bandGrad.addColorStop(0.5,'#FFF9C4'); bandGrad.addColorStop(1,'#DAA520');
  ctx.fillStyle=bandGrad; ctx.strokeStyle='#B8860B'; ctx.lineWidth=2;
  ctx.shadowColor='rgba(255,215,0,0.7)'; ctx.shadowBlur=18;
  ctx.beginPath(); ctx.roundRect(-cw/2,0,cw,ch,5); ctx.fill(); ctx.stroke();
  const peaks=[-cw/2,-cw/4,0,cw/4,cw/2];
  const heights=[ch*1.0,ch*1.3,ch*1.6,ch*1.3,ch*1.0];
  for (let i=0;i<peaks.length;i++) {
    ctx.fillStyle=bandGrad;
    ctx.beginPath();
    ctx.moveTo(peaks[i]-cw/8,0); ctx.lineTo(peaks[i],-heights[i]); ctx.lineTo(peaks[i]+cw/8,0);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle=i===2?'#ff3366':i%2===0?'#00ffcc':'#6666ff';
    ctx.shadowColor=ctx.fillStyle; ctx.shadowBlur=12;
    ctx.beginPath(); ctx.arc(peaks[i],-heights[i]+4,5,0,Math.PI*2); ctx.fill();
  }
  for (let i=0;i<5;i++) {
    ctx.fillStyle=['#ff3366','#ffcc00','#00ffcc','#6666ff','#ff9900'][i];
    ctx.shadowColor=ctx.fillStyle; ctx.shadowBlur=10;
    ctx.beginPath(); ctx.arc(-cw/2+cw/4*i+cw/8,ch/2,4,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();
}

function drawClownNose(ctx: CanvasRenderingContext2D, f: FaceLandmark[], rect: DOMRect) {
  const nose=lp(f,NOSE_TIP,rect); if (!nose) return;
  const t=Date.now()/1000;
  const r=14+Math.sin(t*3)*2;
  ctx.save();
  const grad=ctx.createRadialGradient(nose.x-4,nose.y-4,1,nose.x,nose.y,r);
  grad.addColorStop(0,'#ff8888'); grad.addColorStop(0.7,'#ff2222'); grad.addColorStop(1,'#990000');
  ctx.fillStyle=grad; ctx.shadowColor='rgba(255,0,0,0.6)'; ctx.shadowBlur=12;
  ctx.beginPath(); ctx.arc(nose.x,nose.y,r,0,Math.PI*2); ctx.fill();
  ctx.restore();
}

function drawMustache(ctx: CanvasRenderingContext2D, f: FaceLandmark[], rect: DOMRect, style: 'classic'|'curly'='classic') {
  const nose=lp(f,NOSE_TIP,rect), ml=lp(f,L_MOUTH,rect), mr=lp(f,R_MOUTH,rect);
  if (!nose||!ml||!mr) return;
  const mw=Math.abs(mr.x-ml.x)*0.9;
  const cx=(ml.x+mr.x)/2, cy=nose.y+12;
  ctx.save(); ctx.fillStyle='#2c1810'; ctx.shadowColor='rgba(0,0,0,0.5)'; ctx.shadowBlur=6;
  if (style==='curly') {
    ctx.beginPath();
    ctx.moveTo(cx,cy);
    ctx.bezierCurveTo(cx-mw*0.1,cy-18,cx-mw*0.55,cy-28,cx-mw*0.62,cy-8);
    ctx.bezierCurveTo(cx-mw*0.55,cy+8,cx-mw*0.3,cy+4,cx,cy);
    ctx.bezierCurveTo(cx+mw*0.3,cy+4,cx+mw*0.55,cy+8,cx+mw*0.62,cy-8);
    ctx.bezierCurveTo(cx+mw*0.55,cy-28,cx+mw*0.1,cy-18,cx,cy);
    ctx.fill();
  } else {
    for (const [sign,flip] of [[-1,-1],[1,1]] as [number,number][]) {
      ctx.beginPath(); ctx.ellipse(cx+sign*mw*0.3,cy,mw*0.3,8,flip*0.4,0,Math.PI); ctx.fill();
    }
  }
  ctx.restore();
}

function drawBeard(ctx: CanvasRenderingContext2D, f: FaceLandmark[], rect: DOMRect) {
  const chin=lp(f,CHIN,rect), lc=lp(f,L_CHEEK,rect), rc=lp(f,R_CHEEK,rect);
  if (!chin||!lc||!rc) return;
  const bw=Math.abs(rc.x-lc.x)*0.8;
  const cx=(lc.x+rc.x)/2, cy=(lc.y+rc.y)/2;
  ctx.save(); ctx.fillStyle='#2c1810'; ctx.globalAlpha=0.75;
  ctx.shadowColor='rgba(0,0,0,0.3)'; ctx.shadowBlur=8;
  ctx.beginPath(); ctx.ellipse(cx,cy+20,bw*0.55,Math.abs(chin.y-cy)*0.7,0,0,Math.PI); ctx.fill();
  ctx.restore();
}

function drawRose(ctx: CanvasRenderingContext2D, f: FaceLandmark[], rect: DOMRect) {
  const nose=lp(f,NOSE_TIP,rect), le=lp(f,L_EYE_OUT,rect), re=lp(f,R_EYE_OUT,rect);
  if (!nose||!le||!re) return;
  const cx=(le.x+re.x)/2, cy=nose.y-22;
  const size=Math.abs(re.x-le.x)*0.22;
  const t=Date.now()/1000;
  ctx.save(); ctx.translate(cx,cy); ctx.rotate(Math.sin(t*0.5)*0.08);
  for (let i=0;i<6;i++) {
    const a=(i/6)*Math.PI*2;
    const px=Math.cos(a)*size*0.48, py=Math.sin(a)*size*0.48;
    const g=ctx.createRadialGradient(px,py,0,px,py,size*0.55);
    g.addColorStop(0,'rgba(255,80,120,0.95)'); g.addColorStop(1,'rgba(190,0,50,0.25)');
    ctx.fillStyle=g; ctx.beginPath(); ctx.ellipse(px,py,size*0.46,size*0.46,a,0,Math.PI*2); ctx.fill();
  }
  const center=ctx.createRadialGradient(0,0,0,0,0,size*0.32);
  center.addColorStop(0,'#ff6080'); center.addColorStop(1,'#cc0040');
  ctx.fillStyle=center; ctx.beginPath(); ctx.arc(0,0,size*0.32,0,Math.PI*2); ctx.fill();
  ctx.restore();
}

function drawGlitter(ctx: CanvasRenderingContext2D, f: FaceLandmark[], rect: DOMRect) {
  const indices=[L_EYE_OUT,R_EYE_OUT,L_CHEEK,R_CHEEK,FOREHEAD,CHIN,NOSE_TIP];
  const t=Date.now()/1000;
  ctx.save();
  for (const idx of indices) {
    const p=lp(f,idx,rect); if (!p) continue;
    const hue=((idx*30+t*60)%360);
    const pulse=(Math.sin(t*3+idx)*0.5+0.5)*0.8+0.2;
    ctx.fillStyle=`hsla(${hue},100%,75%,${pulse})`;
    ctx.shadowColor=`hsl(${hue},100%,70%)`; ctx.shadowBlur=10;
    ctx.beginPath(); ctx.arc(p.x,p.y,3,0,Math.PI*2); ctx.fill();
    drawStar(ctx,p.x,p.y,5,4); ctx.fill();
  }
  ctx.restore();
}

function drawFaceMesh(ctx: CanvasRenderingContext2D, f: FaceLandmark[], rect: DOMRect, hue: number) {
  if (!f||f.length<468) return;
  const silhouette=[10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,
    148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109,10];
  ctx.save();
  ctx.strokeStyle=`hsla(${hue},80%,70%,0.5)`;
  ctx.lineWidth=1.5; ctx.setLineDash([3,5]);
  ctx.shadowColor=`hsla(${hue},80%,70%,0.5)`; ctx.shadowBlur=6;
  ctx.beginPath(); let first=true;
  for (const i of silhouette) {
    const p=lp(f,i,rect); if (!p) continue;
    if (first){ctx.moveTo(p.x,p.y);first=false;}else ctx.lineTo(p.x,p.y);
  }
  ctx.closePath(); ctx.stroke();
  ctx.restore();
}

function drawMouthEffect(ctx: CanvasRenderingContext2D, f: FaceLandmark[], rect: DOMRect, expr: FaceExpression) {
  if (!expr.mouthOpen) return;
  const ul=lp(f,U_LIP,rect), ll=lp(f,L_LIP,rect);
  if (!ul||!ll) return;
  const cy=(ul.y+ll.y)/2, cx=(ul.x+ll.x)/2;
  const r=Math.abs(ll.y-ul.y)*1.5+8;
  ctx.save();
  ctx.strokeStyle='rgba(255,220,50,0.8)'; ctx.lineWidth=3;
  ctx.shadowColor='rgba(255,200,0,0.8)'; ctx.shadowBlur=15;
  ctx.beginPath(); ctx.arc(cx,cy,r+2+Math.sin(Date.now()/200)*3,0,Math.PI*2); ctx.stroke();
  ctx.restore();
  if (Math.random()<0.08) spawnStars(cx,cy,3);
}

function drawHeadTiltIndicator(ctx: CanvasRenderingContext2D, pose: HeadPose, canvasW: number, canvasH: number) {
  if (Math.abs(pose.tiltAngle)<8) return;
  const dir=pose.tiltAngle>0?'→':'←';
  ctx.save();
  ctx.font='bold 28px serif'; ctx.textAlign='center';
  ctx.globalAlpha=Math.min(1,(Math.abs(pose.tiltAngle)-8)/25);
  ctx.fillStyle='rgba(255,220,50,0.9)';
  ctx.shadowColor='rgba(255,200,0,0.8)'; ctx.shadowBlur=15;
  ctx.fillText(dir,canvasW*0.12,canvasH*0.12);
  ctx.restore();
}

function drawEyeGaze(ctx: CanvasRenderingContext2D, expr: FaceExpression, f: FaceLandmark[], rect: DOMRect) {
  if (!expr.eyeGazeLeft&&!expr.eyeGazeRight) return;
  const le=lp(f,L_EYE_CEN,rect), re=lp(f,R_EYE_CEN,rect);
  if (!le||!re) return;
  // Mirror gaze direction too
  const dir=expr.eyeGazeRight?-1:1;
  ctx.save();
  for (const eye of [le,re]) {
    ctx.strokeStyle='rgba(100,200,255,0.7)'; ctx.lineWidth=2;
    ctx.shadowColor='rgba(100,200,255,0.8)'; ctx.shadowBlur=10;
    ctx.beginPath(); ctx.moveTo(eye.x,eye.y); ctx.lineTo(eye.x+dir*20,eye.y); ctx.stroke();
    ctx.fillStyle='rgba(100,200,255,0.8)';
    ctx.beginPath(); ctx.arc(eye.x+dir*20,eye.y,3,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();
}

// ── Hand skeleton ───────────────────────────────────────────────────────────
const HAND_CONNECTIONS=[
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],
  [5,9],[9,13],[13,17],
];
const FINGER_TIPS=[4,8,12,16,20];

function drawHand(
  ctx: CanvasRenderingContext2D, lms: HandLandmark[],
  rect: DOMRect, effects: string[], handIdx: number,
) {
  // Map hand landmarks with same mirror transform as face
  const hx=(nx:number)=>rect.left+(1-nx)*rect.width;
  const hy=(ny:number)=>rect.top+ny*rect.height;

  const isPalm=effects.includes('ar_particles');
  const isRock=effects.includes('ar_rock');
  const t=Date.now()/1000;
  const hue=(handIdx*120+t*30)%360;
  const lineColor=isPalm?`hsla(${hue},90%,70%,0.8)`:isRock?'rgba(255,80,0,0.7)':'rgba(255,130,180,0.65)';

  // Rainbow trail
  if (!handTrails.has(handIdx)) handTrails.set(handIdx,[]);
  const trail=handTrails.get(handIdx)!;
  const wrist=lms[0];
  if (wrist) trail.push({x:hx(wrist.x),y:hy(wrist.y),t:Date.now()});
  while (trail.length>0&&Date.now()-trail[0].t>800) trail.shift();

  if (trail.length>2) {
    ctx.save();
    for (let i=1;i<trail.length;i++) {
      const prog=i/trail.length;
      ctx.strokeStyle=`hsla(${(hue+i*10)%360},90%,65%,${prog*0.6})`;
      ctx.lineWidth=prog*4; ctx.shadowColor=`hsla(${hue},90%,65%,0.5)`; ctx.shadowBlur=8;
      ctx.beginPath(); ctx.moveTo(trail[i-1].x,trail[i-1].y); ctx.lineTo(trail[i].x,trail[i].y); ctx.stroke();
    }
    ctx.restore();
  }

  ctx.save(); ctx.strokeStyle=lineColor; ctx.lineWidth=2.5; ctx.shadowColor=lineColor; ctx.shadowBlur=10;
  for (const [a,b] of HAND_CONNECTIONS) {
    const pa=lms[a],pb=lms[b]; if (!pa||!pb) continue;
    ctx.beginPath(); ctx.moveTo(hx(pa.x),hy(pa.y)); ctx.lineTo(hx(pb.x),hy(pb.y)); ctx.stroke();
  }
  ctx.fillStyle='rgba(255,160,210,0.9)';
  for (const p of lms) { ctx.beginPath(); ctx.arc(hx(p.x),hy(p.y),3.5,0,Math.PI*2); ctx.fill(); }
  ctx.restore();

  if (isPalm) {
    for (const tipIdx of FINGER_TIPS) {
      const tp=lms[tipIdx];
      if (tp&&Math.random()<0.35) spawnParticles(hx(tp.x),hy(tp.y),2,240+handIdx*60);
    }
  }
  if (isRock) {
    for (const tipIdx of [8,20]) {
      const tp=lms[tipIdx];
      if (tp&&Math.random()<0.4) spawnStars(hx(tp.x),hy(tp.y),2);
    }
  }
}

// ── Component ───────────────────────────────────────────────────────────────
export function ARFaceOverlay({ faceLandmarks, handLandmarks, headPose, faceExpression, videoRef }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number|null>(null);

  // Keep latest data in refs so the RAF loop never needs to be recreated
  const faceRef    = useRef(faceLandmarks);
  const handRef    = useRef(handLandmarks);
  const poseRef    = useRef(headPose);
  const exprRef    = useRef(faceExpression);
  const effectsRef = useRef<string[]>([]);

  faceRef.current    = faceLandmarks;
  handRef.current    = handLandmarks;
  poseRef.current    = headPose;
  exprRef.current    = faceExpression;

  // Sync activeEffects to a ref without making it a dep of the RAF loop
  const { activeEffects } = useRoomStore();
  effectsRef.current = activeEffects;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize only on mount + window resize
    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const renderFrame = () => {
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const f       = faceRef.current;
      const hands   = handRef.current;
      const pose    = poseRef.current;
      const expr    = exprRef.current;
      const effects = effectsRef.current;
      const fx      = (id: string) => effects.includes(id);

      // Get video PIP bounding rect each frame (handles resize/scroll)
      const rect = videoRef.current?.getBoundingClientRect();

      if (f && rect && rect.width > 0) {
        if (fx('ar_mesh'))             drawFaceMesh(ctx,f,rect,(Date.now()/50)%360);
        if (fx('ar_glitter'))          drawGlitter(ctx,f,rect);
        if (fx('ar_glasses'))          drawGlasses(ctx,f,rect,'classic');
        if (fx('ar_glasses_cool'))     drawGlasses(ctx,f,rect,'cool');
        if (fx('ar_glasses_heart'))    drawGlasses(ctx,f,rect,'heart');
        if (fx('ar_halo'))             drawHalo(ctx,f,rect);
        if (fx('ar_horns'))            drawHorns(ctx,f,rect);
        if (fx('ar_cat_ears'))         drawCatEars(ctx,f,rect);
        if (fx('ar_bunny_ears'))       drawBunnyEars(ctx,f,rect);
        if (fx('ar_crown'))            drawCrown(ctx,f,rect);
        if (fx('ar_clown_nose'))       drawClownNose(ctx,f,rect);
        if (fx('ar_mustache'))         drawMustache(ctx,f,rect,'classic');
        if (fx('ar_curly_mustache'))   drawMustache(ctx,f,rect,'curly');
        if (fx('ar_beard'))            drawBeard(ctx,f,rect);
        if (fx('ar_rose'))             drawRose(ctx,f,rect);
        if (expr)                      drawMouthEffect(ctx,f,rect,expr);
        if (expr&&fx('ar_gaze'))       drawEyeGaze(ctx,expr,f,rect);
      }

      if (pose&&fx('ar_head_indicator')) drawHeadTiltIndicator(ctx,pose,w,h);

      if (hands && rect && rect.width > 0) {
        for (let i=0;i<hands.length;i++) {
          drawHand(ctx,hands[i],rect,effects,i);
        }
      }

      updateParticles(ctx);
      updateHearts(ctx);

      rafRef.current = requestAnimationFrame(renderFrame);
    };

    rafRef.current = requestAnimationFrame(renderFrame);

    return () => {
      window.removeEventListener('resize', resize);
      if (rafRef.current!==null) cancelAnimationFrame(rafRef.current);
    };
  }, [videoRef]); // videoRef is stable (created with useRef in parent)

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 15 }}
    />
  );
}
