export interface GameCard {
  id: string;
  type: 'truth' | 'dare' | 'question' | 'scenario';
  content: string;
  category?: string;
}

export const TRUTH_CARDS: GameCard[] = [
  { id: 't1',  type: 'truth', content: "What's the first thing you noticed about me?", category: 'sweet' },
  { id: 't2',  type: 'truth', content: "What's your favorite memory of us?", category: 'sweet' },
  { id: 't3',  type: 'truth', content: "What song reminds you of me?", category: 'sweet' },
  { id: 't4',  type: 'truth', content: "What's something you've never told anyone?", category: 'deep' },
  { id: 't5',  type: 'truth', content: "What's your biggest fear in a relationship?", category: 'deep' },
  { id: 't6',  type: 'truth', content: "What's one thing you'd change about yourself?", category: 'deep' },
  { id: 't7',  type: 'truth', content: "What's the most embarrassing thing you've done?", category: 'fun' },
  { id: 't8',  type: 'truth', content: "What's your guilty pleasure?", category: 'fun' },
  { id: 't9',  type: 'truth', content: "If you could read my mind for one minute, what would you hope to find?", category: 'sweet' },
  { id: 't10', type: 'truth', content: "What's something you find attractive that you've never admitted?", category: 'flirty' },
  { id: 't11', type: 'truth', content: "What's the wildest dream you've had about us?", category: 'flirty' },
  { id: 't12', type: 'truth', content: "What's your love language?", category: 'sweet' },
  { id: 't13', type: 'truth', content: "Where would you take me on a dream date?", category: 'sweet' },
  { id: 't14', type: 'truth', content: "What's something you want us to try together?", category: 'flirty' },
  { id: 't15', type: 'truth', content: "What do you think about most before falling asleep?", category: 'deep' },
  { id: 't16', type: 'truth', content: "If you could change one thing about how we met, what would it be?", category: 'sweet' },
  { id: 't17', type: 'truth', content: "What's a habit of yours you hope I never notice?", category: 'fun' },
  { id: 't18', type: 'truth', content: "What's the most romantic thing someone has ever done for you?", category: 'sweet' },
  { id: 't19', type: 'truth', content: "When did you first realize you had feelings for me?", category: 'sweet' },
  { id: 't20', type: 'truth', content: "What's a deal-breaker in a relationship you've never mentioned?", category: 'deep' },
  { id: 't21', type: 'truth', content: "What's one thing I could do right now to make you smile?", category: 'sweet' },
  { id: 't22', type: 'truth', content: "What's a childhood memory that still makes you happy?", category: 'deep' },
  { id: 't23', type: 'truth', content: "If we had a song, what would it be and why?", category: 'romantic' },
  { id: 't24', type: 'truth', content: "What's the bravest thing you've ever done for love?", category: 'deep' },
  { id: 't25', type: 'truth', content: "What's something about me that surprises you every time?", category: 'sweet' },
  { id: 't26', type: 'truth', content: "What's your favorite time of day and what does it remind you of?", category: 'chill' },
  { id: 't27', type: 'truth', content: "What's a compliment you've wanted to give me but haven't?", category: 'flirty' },
  { id: 't28', type: 'truth', content: "What's a tradition you'd want us to have?", category: 'sweet' },
  { id: 't29', type: 'truth', content: "Which of my qualities do you admire most?", category: 'sweet' },
  { id: 't30', type: 'truth', content: "If you wrote a letter to your future self about us, what would it say?", category: 'deep' },
];

export const DARE_CARDS: GameCard[] = [
  { id: 'd1',  type: 'dare', content: "Sing the first line of your favorite love song.", category: 'fun' },
  { id: 'd2',  type: 'dare', content: "Tell me three things you love about me right now.", category: 'sweet' },
  { id: 'd3',  type: 'dare', content: "Do your best impression of me.", category: 'fun' },
  { id: 'd4',  type: 'dare', content: "Show me your most embarrassing photo on your phone.", category: 'fun' },
  { id: 'd5',  type: 'dare', content: "Tell me a secret you've been keeping.", category: 'deep' },
  { id: 'd6',  type: 'dare', content: "Write a two-line poem about us right now.", category: 'sweet' },
  { id: 'd7',  type: 'dare', content: "Do your best catwalk for 30 seconds.", category: 'fun' },
  { id: 'd8',  type: 'dare', content: "Send me a voice note saying something sweet.", category: 'sweet' },
  { id: 'd9',  type: 'dare', content: "Describe our perfect day together in 60 seconds.", category: 'sweet' },
  { id: 'd10', type: 'dare', content: "Show me your dance moves to your favorite song.", category: 'fun' },
  { id: 'd11', type: 'dare', content: "Tell me three things on your bucket list.", category: 'deep' },
  { id: 'd12', type: 'dare', content: "Do a 30-second stand-up comedy routine about your day.", category: 'fun' },
  { id: 'd13', type: 'dare', content: "Show me your favorite outfit.", category: 'flirty' },
  { id: 'd14', type: 'dare', content: "Give me your best compliment.", category: 'sweet' },
  { id: 'd15', type: 'dare', content: "Show me something in your room that has sentimental value.", category: 'deep' },
  { id: 'd16', type: 'dare', content: "Do your best impression of a movie character we both love.", category: 'fun' },
  { id: 'd17', type: 'dare', content: "Speak only in whispers for the next two minutes.", category: 'flirty' },
  { id: 'd18', type: 'dare', content: "Tell me the story of the best day of your life in under a minute.", category: 'deep' },
  { id: 'd19', type: 'dare', content: "Draw a quick portrait of me and show the camera.", category: 'fun' },
  { id: 'd20', type: 'dare', content: "Describe your perfect morning in exactly 5 sentences.", category: 'chill' },
  { id: 'd21', type: 'dare', content: "Do a 10-second talent show — anything goes.", category: 'fun' },
  { id: 'd22', type: 'dare', content: "Read out the last emoji you sent and explain why you sent it.", category: 'fun' },
  { id: 'd23', type: 'dare', content: "Name 5 things that make you think of me, one per second.", category: 'sweet' },
  { id: 'd24', type: 'dare', content: "Say something sweet in a different language, accent allowed.", category: 'flirty' },
  { id: 'd25', type: 'dare', content: "Make a toast — to us — right now.", category: 'romantic' },
  { id: 'd26', type: 'dare', content: "Show me your phone wallpaper and explain what it means to you.", category: 'deep' },
  { id: 'd27', type: 'dare', content: "Stare into the camera without blinking for 15 seconds.", category: 'flirty' },
  { id: 'd28', type: 'dare', content: "Tell me your earliest memory of feeling happy.", category: 'deep' },
  { id: 'd29', type: 'dare', content: "Sing the chorus of the last song stuck in your head.", category: 'fun' },
  { id: 'd30', type: 'dare', content: "Write my name with your non-dominant hand and show me.", category: 'fun' },
];

export const WOULD_YOU_RATHER: GameCard[] = [
  { id: 'w1',  type: 'question', content: "Would you rather... have a surprise date night OR plan the perfect date yourself?", category: 'fun' },
  { id: 'w2',  type: 'question', content: "Would you rather... spend a week at the beach OR a cozy cabin in the mountains?", category: 'fun' },
  { id: 'w3',  type: 'question', content: "Would you rather... cook a meal together OR order from a fancy restaurant?", category: 'fun' },
  { id: 'w4',  type: 'question', content: "Would you rather... know all my secrets OR have all your secrets kept safe?", category: 'deep' },
  { id: 'w5',  type: 'question', content: "Would you rather... travel the world together for a year OR build your dream home?", category: 'deep' },
  { id: 'w6',  type: 'question', content: "Would you rather... be able to see my dreams OR always know my mood?", category: 'deep' },
  { id: 'w7',  type: 'question', content: "Would you rather... dance together under the stars OR cuddle watching a movie?", category: 'romantic' },
  { id: 'w8',  type: 'question', content: "Would you rather... receive a heartfelt letter OR an unexpected gift?", category: 'romantic' },
  { id: 'w9',  type: 'question', content: "Would you rather... always be together OR have perfect timing apart?", category: 'deep' },
  { id: 'w10', type: 'question', content: "Would you rather... know our future OR be surprised by it?", category: 'deep' },
  { id: 'w11', type: 'question', content: "Would you rather... be stranded on a deserted island together OR backpack through Europe?", category: 'adventure' },
  { id: 'w12', type: 'question', content: "Would you rather... have a telepathic link with me OR always feel each other's emotions?", category: 'deep' },
  { id: 'w13', type: 'question', content: "Would you rather... never fight but be bored OR fight often but feel alive?", category: 'deep' },
  { id: 'w14', type: 'question', content: "Would you rather... be remembered as the couple who laughed most OR loved hardest?", category: 'romantic' },
  { id: 'w15', type: 'question', content: "Would you rather... wake up with perfect hair every day OR always know the right thing to say?", category: 'fun' },
];

export const CONVERSATION_STARTERS: GameCard[] = [
  { id: 'c1',  type: 'scenario', content: "If we could teleport anywhere right now, where would you take me?", category: 'romantic' },
  { id: 'c2',  type: 'scenario', content: "If today was our last day together, how would you want to spend it?", category: 'deep' },
  { id: 'c3',  type: 'scenario', content: "What's a skill you wish you could teach me?", category: 'fun' },
  { id: 'c4',  type: 'scenario', content: "If we had a theme song, what would it be?", category: 'romantic' },
  { id: 'c5',  type: 'scenario', content: "What's something you want to learn more about me?", category: 'deep' },
  { id: 'c6',  type: 'scenario', content: "If we could only communicate one way forever, which would you choose?", category: 'deep' },
  { id: 'c7',  type: 'scenario', content: "What's a small thing I do that you love?", category: 'sweet' },
  { id: 'c8',  type: 'scenario', content: "What do you think our future looks like in 5 years?", category: 'deep' },
  { id: 'c9',  type: 'scenario', content: "If we swapped lives for a day, what's the first thing you'd do as me?", category: 'fun' },
  { id: 'c10', type: 'scenario', content: "What's the most beautiful place you've ever been? Could you describe it to me?", category: 'chill' },
  { id: 'c11', type: 'scenario', content: "If you could give me one superpower, what would you choose for me and why?", category: 'sweet' },
  { id: 'c12', type: 'scenario', content: "What's one thing about the world you wish we could fix together?", category: 'deep' },
];

export const LOVE_QUIZ: GameCard[] = [
  { id: 'q1',  type: 'question', content: "On a scale 1–10, how well do you think I know your love language? Guess mine too!", category: 'quiz' },
  { id: 'q2',  type: 'question', content: "What's the first meal you'd cook for me if we ever met in person?", category: 'quiz' },
  { id: 'q3',  type: 'question', content: "What's your go-to comfort movie — and do you think I'd love it?", category: 'quiz' },
  { id: 'q4',  type: 'question', content: "What does 'home' mean to you? A place, a feeling, or a person?", category: 'quiz' },
  { id: 'q5',  type: 'question', content: "Which of my traits do you find most irresistible, and which do you find most endearing?", category: 'quiz' },
  { id: 'q6',  type: 'question', content: "If I had a signature scent, what do you imagine it would be?", category: 'quiz' },
  { id: 'q7',  type: 'question', content: "Describe me in 3 emojis — and explain each one.", category: 'quiz' },
  { id: 'q8',  type: 'question', content: "What's something you thought about me at first that turned out to be wrong?", category: 'quiz' },
  { id: 'q9',  type: 'question', content: "If our relationship were a season of the year, which would it be?", category: 'quiz' },
  { id: 'q10', type: 'question', content: "What moment between us would you relive on repeat if you could?", category: 'quiz' },
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
  "The way you see the world makes me want to see it through your eyes",
  "There is genuinely no one like you — and I mean that",
  "You are softer and stronger than you know",
  "Every conversation with you leaves me wanting more",
  "You make ordinary moments feel like something I'll remember forever",
];

export const SPIN_OUTCOMES = [
  "Truth — answer honestly!", "Dare — be brave!", "Compliment — say something sweet!",
  "WYR — pick your side!", "Quiz — test each other!", "Love Dare — show, don't tell!",
  "Story — make one up together!", "Sing — any song, 15 seconds!",
];
