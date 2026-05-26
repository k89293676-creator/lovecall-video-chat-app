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
  },
];

export function getModeConfig(id: ExperienceMode): ModeConfig {
  return MODES.find(m => m.id === id) ?? MODES[0];
}
