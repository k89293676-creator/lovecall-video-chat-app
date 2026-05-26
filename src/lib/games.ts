export interface GameCard {
  id: string;
  type: 'truth' | 'dare' | 'question' | 'scenario';
  content: string;
  category?: string;
}

export const TRUTH_CARDS: GameCard[] = [
  { id: 't1', type: 'truth', content: "What's the first thing you noticed about me?", category: 'sweet' },
  { id: 't2', type: 'truth', content: "What's your favorite memory of us?", category: 'sweet' },
  { id: 't3', type: 'truth', content: "What song reminds you of me?", category: 'sweet' },
  { id: 't4', type: 'truth', content: "What's something you've never told anyone?", category: 'deep' },
  { id: 't5', type: 'truth', content: "What's your biggest fear in a relationship?", category: 'deep' },
  { id: 't6', type: 'truth', content: "What's one thing you'd change about yourself?", category: 'deep' },
  { id: 't7', type: 'truth', content: "What's the most embarrassing thing you've done?", category: 'fun' },
  { id: 't8', type: 'truth', content: "What's your guilty pleasure?", category: 'fun' },
  { id: 't9', type: 'truth', content: "If you could read my mind for one minute, what would you hope to find?", category: 'sweet' },
  { id: 't10', type: 'truth', content: "What's something you find attractive that you've never admitted?", category: 'flirty' },
  { id: 't11', type: 'truth', content: "What's the wildest dream you've had about us?", category: 'flirty' },
  { id: 't12', type: 'truth', content: "What's your love language?", category: 'sweet' },
  { id: 't13', type: 'truth', content: "Where would you take me on a dream date?", category: 'sweet' },
  { id: 't14', type: 'truth', content: "What's something you want us to try together?", category: 'flirty' },
  { id: 't15', type: 'truth', content: "What do you think about most before falling asleep?", category: 'deep' },
];

export const DARE_CARDS: GameCard[] = [
  { id: 'd1', type: 'dare', content: "Sing the first line of your favorite love song.", category: 'fun' },
  { id: 'd2', type: 'dare', content: "Tell me three things you love about me right now.", category: 'sweet' },
  { id: 'd3', type: 'dare', content: "Do your best impression of me.", category: 'fun' },
  { id: 'd4', type: 'dare', content: "Show me your most embarrassing photo on your phone.", category: 'fun' },
  { id: 'd5', type: 'dare', content: "Tell me a secret you've been keeping.", category: 'deep' },
  { id: 'd6', type: 'dare', content: "Write a two-line poem about us right now.", category: 'sweet' },
  { id: 'd7', type: 'dare', content: "Do your best catwalk for 30 seconds.", category: 'fun' },
  { id: 'd8', type: 'dare', content: "Send me a voice note saying something sweet.", category: 'sweet' },
  { id: 'd9', type: 'dare', content: "Describe our perfect day together in 60 seconds.", category: 'sweet' },
  { id: 'd10', type: 'dare', content: "Show me your dance moves to your favorite song.", category: 'fun' },
  { id: 'd11', type: 'dare', content: "Tell me three things on your bucket list.", category: 'deep' },
  { id: 'd12', type: 'dare', content: "Do a 30-second stand-up comedy routine about your day.", category: 'fun' },
  { id: 'd13', type: 'dare', content: "Show me your favorite outfit.", category: 'flirty' },
  { id: 'd14', type: 'dare', content: "Give me your best compliment.", category: 'sweet' },
  { id: 'd15', type: 'dare', content: "Show me something in your room that has sentimental value.", category: 'deep' },
];

export const WOULD_YOU_RATHER: GameCard[] = [
  { id: 'w1', type: 'question', content: "Would you rather... have a surprise date night OR plan the perfect date yourself?", category: 'fun' },
  { id: 'w2', type: 'question', content: "Would you rather... spend a week at the beach OR a cozy cabin in the mountains?", category: 'fun' },
  { id: 'w3', type: 'question', content: "Would you rather... cook a meal together OR order from a fancy restaurant?", category: 'fun' },
  { id: 'w4', type: 'question', content: "Would you rather... know all my secrets OR have all your secrets kept safe?", category: 'deep' },
  { id: 'w5', type: 'question', content: "Would you rather... travel the world together for a year OR build your dream home?", category: 'deep' },
  { id: 'w6', type: 'question', content: "Would you rather... be able to see my dreams OR always know my mood?", category: 'deep' },
  { id: 'w7', type: 'question', content: "Would you rather... dance together under the stars OR cuddle watching a movie?", category: 'romantic' },
  { id: 'w8', type: 'question', content: "Would you rather... receive a heartfelt letter OR an unexpected gift?", category: 'romantic' },
  { id: 'w9', type: 'question', content: "Would you rather... always be together OR have perfect timing apart?", category: 'deep' },
  { id: 'w10', type: 'question', content: "Would you rather... know our future OR be surprised by it?", category: 'deep' },
];

export const CONVERSATION_STARTERS: GameCard[] = [
  { id: 'c1', type: 'scenario', content: "If we could teleport anywhere right now, where would you take me?", category: 'romantic' },
  { id: 'c2', type: 'scenario', content: "If today was our last day together, how would you want to spend it?", category: 'deep' },
  { id: 'c3', type: 'scenario', content: "What's a skill you wish you could teach me?", category: 'fun' },
  { id: 'c4', type: 'scenario', content: "If we had a theme song, what would it be?", category: 'romantic' },
  { id: 'c5', type: 'scenario', content: "What's something you want to learn more about me?", category: 'deep' },
  { id: 'c6', type: 'scenario', content: "If we could only communicate one way forever, which would you choose?", category: 'deep' },
  { id: 'c7', type: 'scenario', content: "What's a small thing I do that you love?", category: 'sweet' },
  { id: 'c8', type: 'scenario', content: "What do you think our future looks like in 5 years?", category: 'deep' },
];

export function getRandomCard(deck: GameCard[]): GameCard {
  return deck[Math.floor(Math.random() * deck.length)];
}

export const COMPLIMENTS = [
  "You have the most beautiful smile I've ever seen",
  "Your laugh is my favorite sound in the world",
  "Being with you feels like home",
  "You make everything better just by being there",
  "I love the way your eyes light up when you're excited",
  "You're the person I want to share every moment with",
  "You are absolutely stunning",
  "Your kindness is one of the things I love most about you",
  "You're the best part of my every day",
  "I fall for you more every single time we talk",
];
