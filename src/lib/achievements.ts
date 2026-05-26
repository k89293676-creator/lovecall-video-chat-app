export interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
  condition: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_call', title: 'First Connection', description: 'Made your first LoveCall', emoji: '💕', condition: 'connect' },
  { id: 'first_draw', title: 'Love Artist', description: 'Drew on screen together', emoji: '🎨', condition: 'draw' },
  { id: 'first_game', title: 'Game Night', description: 'Played your first game together', emoji: '🎮', condition: 'game' },
  { id: 'first_effect', title: 'Filter Fiend', description: 'Used your first AR effect', emoji: '✨', condition: 'effect' },
  { id: 'first_compliment', title: 'Sweet Talker', description: 'Sent a compliment', emoji: '💌', condition: 'compliment' },
  { id: 'first_soundscape', title: 'Vibe Curator', description: 'Set the mood with a soundscape', emoji: '🎵', condition: 'soundscape' },
  { id: 'mode_switch', title: 'Mood Switcher', description: 'Tried a different experience mode', emoji: '🌈', condition: 'mode' },
  { id: 'privacy_mode', title: 'Ghost Mode', description: 'Used privacy mode', emoji: '👻', condition: 'privacy' },
  { id: 'ripple_touch', title: 'Touch of Magic', description: 'Sent a touch ripple', emoji: '🌊', condition: 'ripple' },
  { id: 'truth_dare', title: 'Truth Seeker', description: 'Played Truth or Dare', emoji: '🃏', condition: 'truthordare' },
];

const STORAGE_KEY = 'lovecall_achievements_v2';

export function getUnlockedAchievements(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function unlockAchievement(id: string): Achievement | null {
  const unlocked = getUnlockedAchievements();
  if (unlocked.includes(id)) return null;
  
  const achievement = ACHIEVEMENTS.find(a => a.id === id);
  if (!achievement) return null;

  unlocked.push(id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(unlocked));
  } catch {}
  
  return achievement;
}

export function checkAndUnlock(condition: string): Achievement | null {
  const achievement = ACHIEVEMENTS.find(a => a.condition === condition);
  if (!achievement) return null;
  return unlockAchievement(achievement.id);
}
