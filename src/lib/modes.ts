export type ExperienceMode =
  | 'romance'
  | 'playful'
  | 'chill'
  | 'date-night'
  | 'intimate'
  | 'adventure'
  | 'celebration';

export interface ModeConfig {
  id: ExperienceMode;
  name: string;
  emoji: string;
  description: string;
  bgClass: string;
  primaryColor: string;
  glowColor: string;
  particleColors: string[];
  particleShape: 'heart' | 'star' | 'circle' | 'confetti' | 'snowflake';
  autoEffects: string[];        // AR effects auto-enabled on mode switch
  gestureEmoji: string;         // emoji launched on wave gesture
  moodLabel: string;            // short label shown in status bar
  borderGlow: string;           // CSS glow color for video border
}

export const MODES: ModeConfig[] = [
  {
    id: 'romance',
    name: 'Romance',
    emoji: '🌹',
    description: 'Candlelit intimacy',
    bgClass: 'bg-gradient-romantic',
    primaryColor: '#e11d48',
    glowColor: 'rgba(225,29,72,0.5)',
    particleColors: ['#e11d48', '#be123c', '#fda4af'],
    particleShape: 'heart',
    autoEffects: ['filter_hearts', 'filter_vignette'],
    gestureEmoji: '❤️',
    moodLabel: 'Romantic',
    borderGlow: 'rgba(225,29,72,0.6)',
  },
  {
    id: 'playful',
    name: 'Playful',
    emoji: '🎮',
    description: 'Games & fun',
    bgClass: 'bg-gradient-playful',
    primaryColor: '#8b5cf6',
    glowColor: 'rgba(139,92,246,0.5)',
    particleColors: ['#8b5cf6', '#a78bfa', '#ec4899'],
    particleShape: 'star',
    autoEffects: ['filter_sparkle'],
    gestureEmoji: '⭐',
    moodLabel: 'Playful',
    borderGlow: 'rgba(139,92,246,0.6)',
  },
  {
    id: 'chill',
    name: 'Chill',
    emoji: '🌙',
    description: 'Relaxed vibes',
    bgClass: 'bg-gradient-chill',
    primaryColor: '#3b82f6',
    glowColor: 'rgba(59,130,246,0.5)',
    particleColors: ['#3b82f6', '#93c5fd', '#e0f2fe'],
    particleShape: 'snowflake',
    autoEffects: ['filter_starfall', 'filter_aurora'],
    gestureEmoji: '🌙',
    moodLabel: 'Chilling',
    borderGlow: 'rgba(59,130,246,0.5)',
  },
  {
    id: 'date-night',
    name: 'Date Night',
    emoji: '🍷',
    description: 'Dinner for two',
    bgClass: 'bg-gradient-date-night',
    primaryColor: '#f59e0b',
    glowColor: 'rgba(245,158,11,0.5)',
    particleColors: ['#f59e0b', '#fcd34d', '#fef3c7'],
    particleShape: 'circle',
    autoEffects: ['filter_vignette', 'filter_petals'],
    gestureEmoji: '🥂',
    moodLabel: 'Date Night',
    borderGlow: 'rgba(245,158,11,0.5)',
  },
  {
    id: 'intimate',
    name: 'Intimate',
    emoji: '💋',
    description: 'Close & personal',
    bgClass: 'bg-gradient-romantic',
    primaryColor: '#ec4899',
    glowColor: 'rgba(236,72,153,0.5)',
    particleColors: ['#ec4899', '#f9a8d4', '#fce7f3'],
    particleShape: 'heart',
    autoEffects: ['filter_blindfold', 'filter_hearts'],
    gestureEmoji: '💋',
    moodLabel: 'Intimate',
    borderGlow: 'rgba(236,72,153,0.7)',
  },
  {
    id: 'adventure',
    name: 'Adventure',
    emoji: '🗺️',
    description: 'Explore together',
    bgClass: 'bg-gradient-adventure',
    primaryColor: '#22c55e',
    glowColor: 'rgba(34,197,94,0.5)',
    particleColors: ['#22c55e', '#86efac', '#dcfce7'],
    particleShape: 'star',
    autoEffects: ['filter_butterflies', 'filter_aurora'],
    gestureEmoji: '🌟',
    moodLabel: 'Adventurous',
    borderGlow: 'rgba(34,197,94,0.5)',
  },
  {
    id: 'celebration',
    name: 'Celebrate',
    emoji: '🎉',
    description: 'Special moments',
    bgClass: 'bg-gradient-celebration',
    primaryColor: '#a855f7',
    glowColor: 'rgba(168,85,247,0.5)',
    particleColors: ['#a855f7', '#ec4899', '#f59e0b', '#22c55e', '#3b82f6'],
    particleShape: 'confetti',
    autoEffects: ['filter_confetti', 'filter_sparkle'],
    gestureEmoji: '🎊',
    moodLabel: 'Celebrating',
    borderGlow: 'rgba(168,85,247,0.6)',
  },
];

export function getModeConfig(id: ExperienceMode): ModeConfig {
  return MODES.find(m => m.id === id) ?? MODES[0];
}
