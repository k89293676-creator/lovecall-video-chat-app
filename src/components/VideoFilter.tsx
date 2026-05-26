import React from 'react';

export const VIDEO_FILTERS: { id: string; name: string; emoji: string; css: string }[] = [
  { id: 'none',     name: 'Natural',  emoji: '🎥', css: '' },
  { id: 'warm',     name: 'Warm',     emoji: '🌅', css: 'brightness(1.05) saturate(1.3) sepia(0.2)' },
  { id: 'cool',     name: 'Cool',     emoji: '🌊', css: 'brightness(1.1) saturate(0.9) hue-rotate(20deg)' },
  { id: 'glamour',  name: 'Glamour',  emoji: '✨', css: 'brightness(1.15) contrast(1.1) saturate(1.2)' },
  { id: 'moody',    name: 'Moody',    emoji: '🌑', css: 'brightness(0.85) contrast(1.2) saturate(0.8)' },
  { id: 'rose',     name: 'Rose',     emoji: '🌹', css: 'brightness(1.05) saturate(1.4) hue-rotate(-10deg)' },
  { id: 'dream',    name: 'Dream',    emoji: '💭', css: 'brightness(1.2) saturate(0.7) contrast(0.9) blur(0.5px)' },
  { id: 'noir',     name: 'Noir',     emoji: '🎬', css: 'grayscale(0.8) contrast(1.3) brightness(0.9)' },
  { id: 'vintage',  name: 'Vintage',  emoji: '📷', css: 'sepia(0.5) contrast(1.1) brightness(0.95)' },
  { id: 'neon',     name: 'Neon',     emoji: '🌈', css: 'brightness(1.1) saturate(2) contrast(1.15)' },
  { id: 'cherry',   name: 'Cherry',   emoji: '🍒', css: 'brightness(1.05) saturate(1.6) hue-rotate(-20deg) contrast(1.1)' },
  { id: 'pastel',   name: 'Pastel',   emoji: '🎀', css: 'brightness(1.15) saturate(0.6) contrast(0.85)' },
  { id: 'electric', name: 'Electric', emoji: '⚡', css: 'brightness(1.2) saturate(2.5) contrast(1.3) hue-rotate(180deg)' },
  { id: 'midnight', name: 'Midnight', emoji: '🌙', css: 'brightness(0.7) saturate(0.5) contrast(1.4) hue-rotate(210deg)' },
  { id: 'sunset',   name: 'Sunset',   emoji: '🌇', css: 'brightness(1.1) saturate(1.8) sepia(0.3) hue-rotate(-15deg)' },
  { id: 'velvet',   name: 'Velvet',   emoji: '🟣', css: 'brightness(0.9) saturate(1.5) contrast(1.15) hue-rotate(270deg)' },
];

export function buildFilterStyle(
  filterId: string,
  brightness: number,
  warmth: number,
  contrast: number = 100
): string {
  const base = VIDEO_FILTERS.find(f => f.id === filterId)?.css ?? '';
  const brightnessVal = brightness / 100;
  const contrastVal = contrast / 100;
  const hueShift = warmth > 0 ? warmth * -0.15 : 0;
  const sepiaVal = warmth > 0 ? warmth * 0.005 : 0;

  const extras = [
    brightnessVal !== 1 ? `brightness(${brightnessVal})` : '',
    contrastVal !== 1 ? `contrast(${contrastVal})` : '',
    hueShift !== 0 ? `hue-rotate(${hueShift}deg)` : '',
    sepiaVal > 0 ? `sepia(${sepiaVal})` : '',
  ].filter(Boolean).join(' ');

  return [base, extras].filter(Boolean).join(' ') || 'none';
}
