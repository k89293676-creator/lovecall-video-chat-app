import React, { useState, useCallback } from 'react';
import { useRoomStore } from '@/store/room-store';
import {
  TRUTH_CARDS, DARE_CARDS, WOULD_YOU_RATHER, CONVERSATION_STARTERS,
  LOVE_QUIZ, SPIN_OUTCOMES, COMPLIMENTS, getRandomCard, type GameCard
} from '@/lib/games';
import { checkAndUnlock } from '@/lib/achievements';
import { Button } from '@/components/ui/button';
import { RefreshCw, MessageCircleHeart, Lightbulb, Dices, Coins, RotateCcw, Heart } from 'lucide-react';

interface GamePanelProps {
  onAchievement?: (ach: { title: string; emoji: string }) => void;
  sendMessage?: (data: unknown) => void;
}

type GameTab = 'truth' | 'dare' | 'wyr' | 'convo' | 'quiz' | 'compliment' | 'dice' | 'coin' | 'spin';

const DICE_FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
const COIN_FACES = { heads: '🌕', tails: '🌑' };

export function GamePanel({ onAchievement, sendMessage }: GamePanelProps) {
  const [activeGame, setActiveGame] = useState<GameTab>('truth');
  const [currentCard, setCurrentCard] = useState<GameCard | null>(null);
  const [compliment, setCompliment] = useState<string | null>(null);
  const [diceResult, setDiceResult] = useState<number | null>(null);
  const [diceRolling, setDiceRolling] = useState(false);
  const [coinResult, setCoinResult] = useState<'heads' | 'tails' | null>(null);
  const [coinFlipping, setCoinFlipping] = useState(false);
  const [spinResult, setSpinResult] = useState<string | null>(null);
  const [spinSpin, setSpinSpin] = useState(false);
  const [myScore, setMyScore] = useState(0);
  const [partnerScore, setPartnerScore] = useState(0);

  const drawCard = useCallback((game: GameTab) => {
    setActiveGame(game);
    let card: GameCard | null = null;
    if (game === 'truth') card = getRandomCard(TRUTH_CARDS);
    else if (game === 'dare') card = getRandomCard(DARE_CARDS);
    else if (game === 'wyr') card = getRandomCard(WOULD_YOU_RATHER);
    else if (game === 'convo') card = getRandomCard(CONVERSATION_STARTERS);
    else if (game === 'quiz') card = getRandomCard(LOVE_QUIZ);
    setCurrentCard(card);
    setCompliment(null); setDiceResult(null); setCoinResult(null); setSpinResult(null);
    if (card && sendMessage) sendMessage({ type: 'game_card', card });
    const ach = checkAndUnlock(game === 'truth' || game === 'dare' ? 'truthordare' : 'game');
    if (ach && onAchievement) onAchievement(ach);
  }, [sendMessage, onAchievement]);

  const getCompliment = useCallback(() => {
    setActiveGame('compliment');
    const c = COMPLIMENTS[Math.floor(Math.random() * COMPLIMENTS.length)];
    setCompliment(c); setCurrentCard(null); setDiceResult(null); setCoinResult(null); setSpinResult(null);
    if (sendMessage) sendMessage({ type: 'compliment', text: c });
    const ach = checkAndUnlock('compliment');
    if (ach && onAchievement) onAchievement(ach);
  }, [sendMessage, onAchievement]);

  const rollDice = useCallback(() => {
    if (diceRolling) return;
    setDiceRolling(true); setActiveGame('dice');
    setCurrentCard(null); setCompliment(null); setCoinResult(null); setSpinResult(null);
    let count = 0;
    const interval = setInterval(() => {
      setDiceResult(Math.ceil(Math.random() * 6));
      count++;
      if (count >= 10) {
        clearInterval(interval);
        const final = Math.ceil(Math.random() * 6);
        setDiceResult(final); setDiceRolling(false);
        if (sendMessage) sendMessage({ type: 'dice', result: final });
        const ach = checkAndUnlock('game');
        if (ach && onAchievement) onAchievement(ach);
      }
    }, 80);
  }, [diceRolling, sendMessage, onAchievement]);

  const flipCoin = useCallback(() => {
    if (coinFlipping) return;
    setCoinFlipping(true); setActiveGame('coin');
    setCurrentCard(null); setCompliment(null); setDiceResult(null); setSpinResult(null);
    let count = 0;
    const interval = setInterval(() => {
      setCoinResult(Math.random() > 0.5 ? 'heads' : 'tails');
      count++;
      if (count >= 12) {
        clearInterval(interval);
        const final: 'heads' | 'tails' = Math.random() > 0.5 ? 'heads' : 'tails';
        setCoinResult(final); setCoinFlipping(false);
        if (sendMessage) sendMessage({ type: 'coin', result: final });
      }
    }, 100);
  }, [coinFlipping, sendMessage]);

  const spinBottle = useCallback(() => {
    if (spinSpin) return;
    setSpinSpin(true); setActiveGame('spin');
    setCurrentCard(null); setCompliment(null); setDiceResult(null); setCoinResult(null);
    let count = 0;
    const interval = setInterval(() => {
      setSpinResult(SPIN_OUTCOMES[Math.floor(Math.random() * SPIN_OUTCOMES.length)]);
      count++;
      if (count >= 14) {
        clearInterval(interval);
        const final = SPIN_OUTCOMES[Math.floor(Math.random() * SPIN_OUTCOMES.length)];
        setSpinResult(final); setSpinSpin(false);
        if (sendMessage) sendMessage({ type: 'spin', result: final });
      }
    }, 120);
  }, [spinSpin, sendMessage]);

  return (
    <div className="flex flex-col gap-3">
      {/* Score tracker */}
      <div className="flex items-center gap-2 bg-black/30 rounded-xl p-2 border border-white/10">
        <div className="flex-1 text-center">
          <div className="text-xs text-white/40 mb-0.5">Me</div>
          <div className="flex items-center justify-center gap-1">
            <button onClick={() => setMyScore(s => Math.max(0, s - 1))} className="w-5 h-5 rounded-full bg-white/10 text-white/50 hover:bg-white/20 text-xs">−</button>
            <span className="text-xl font-bold text-primary w-8 text-center">{myScore}</span>
            <button onClick={() => setMyScore(s => s + 1)} className="w-5 h-5 rounded-full bg-white/10 text-white/50 hover:bg-white/20 text-xs">+</button>
          </div>
        </div>
        <div className="text-white/20 text-xs">vs</div>
        <div className="flex-1 text-center">
          <div className="text-xs text-white/40 mb-0.5">Partner</div>
          <div className="flex items-center justify-center gap-1">
            <button onClick={() => setPartnerScore(s => Math.max(0, s - 1))} className="w-5 h-5 rounded-full bg-white/10 text-white/50 hover:bg-white/20 text-xs">−</button>
            <span className="text-xl font-bold text-white/70 w-8 text-center">{partnerScore}</span>
            <button onClick={() => setPartnerScore(s => s + 1)} className="w-5 h-5 rounded-full bg-white/10 text-white/50 hover:bg-white/20 text-xs">+</button>
          </div>
        </div>
        <button onClick={() => { setMyScore(0); setPartnerScore(0); }} className="text-white/20 hover:text-white/50 p-1" title="Reset scores">
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      {/* Game buttons */}
      <div className="grid grid-cols-3 gap-1.5">
        {[
          { id: 'truth' as GameTab, label: '🎯 Truth',  fn: () => drawCard('truth') },
          { id: 'dare'  as GameTab, label: '🔥 Dare',   fn: () => drawCard('dare') },
          { id: 'wyr'   as GameTab, label: '🤔 WYR',    fn: () => drawCard('wyr') },
          { id: 'convo' as GameTab, label: '💡 Convo',  fn: () => drawCard('convo') },
          { id: 'quiz'  as GameTab, label: '💕 Quiz',   fn: () => drawCard('quiz') },
          { id: 'compliment' as GameTab, label: '💌 Love', fn: getCompliment },
          { id: 'dice'  as GameTab, label: '🎲 Dice',   fn: rollDice },
          { id: 'coin'  as GameTab, label: '🪙 Flip',   fn: flipCoin },
          { id: 'spin'  as GameTab, label: '🌀 Spin',   fn: spinBottle },
        ].map(({ id, label, fn }) => (
          <Button key={id} size="sm" onClick={fn}
            className={`text-xs h-9 ${activeGame === id ? 'bg-primary/30 border border-primary/50' : 'bg-white/5 hover:bg-white/10'} text-white`}>
            {label}
          </Button>
        ))}
      </div>

      {/* Card display */}
      {currentCard && (
        <div className="bg-black/40 rounded-xl p-4 border border-white/10 relative">
          <span className={`text-[10px] uppercase tracking-widest font-semibold mb-2 block ${
            currentCard.type === 'truth'    ? 'text-blue-400' :
            currentCard.type === 'dare'     ? 'text-orange-400' :
            currentCard.type === 'question' ? 'text-purple-400' : 'text-green-400'
          }`}>
            {currentCard.type === 'question' ? 'would you rather' : currentCard.type === 'scenario' ? 'let\'s talk' : currentCard.type}
          </span>
          <p className="text-white text-sm leading-relaxed font-medium pr-6">{currentCard.content}</p>
          <Button variant="ghost" size="icon"
            className="absolute top-2 right-2 w-7 h-7 rounded-full hover:bg-white/10 text-white/40"
            onClick={() => drawCard(activeGame as Exclude<GameTab, 'compliment' | 'dice' | 'coin' | 'spin'>)}>
            <RefreshCw className="w-3 h-3" />
          </Button>
        </div>
      )}

      {/* Compliment display */}
      {compliment && (
        <div className="bg-primary/10 rounded-xl p-4 border border-primary/30">
          <span className="text-[10px] uppercase tracking-widest text-primary font-semibold mb-2 block">💌 For your partner</span>
          <p className="text-white text-sm leading-relaxed italic">"{compliment}"</p>
          <Button variant="ghost" size="sm" className="mt-2 text-xs text-white/50 hover:text-white px-0 h-7" onClick={getCompliment}>
            <RefreshCw className="w-3 h-3 mr-1" /> Another
          </Button>
        </div>
      )}

      {/* Dice display */}
      {diceResult !== null && (
        <div className="bg-black/40 rounded-xl p-5 border border-white/10 flex flex-col items-center gap-2">
          <span className={`text-6xl transition-all ${diceRolling ? 'animate-spin' : 'animate-in zoom-in duration-300'}`}>
            {DICE_FACES[diceResult]}
          </span>
          <span className="text-white/50 text-sm">{diceRolling ? 'Rolling…' : `Rolled a ${diceResult}!`}</span>
          <Button variant="ghost" size="sm" className="text-xs text-white/50 hover:text-white px-0 h-7" onClick={rollDice} disabled={diceRolling}>
            <Dices className="w-3 h-3 mr-1" /> Roll again
          </Button>
        </div>
      )}

      {/* Coin flip display */}
      {coinResult !== null && (
        <div className="bg-black/40 rounded-xl p-5 border border-white/10 flex flex-col items-center gap-2">
          <span className={`text-6xl transition-all ${coinFlipping ? 'animate-spin' : 'animate-in zoom-in duration-200'}`}>
            {COIN_FACES[coinResult]}
          </span>
          <span className={`text-sm font-bold capitalize ${coinResult === 'heads' ? 'text-yellow-300' : 'text-slate-300'}`}>
            {coinFlipping ? '…' : coinResult + '!'}
          </span>
          <Button variant="ghost" size="sm" className="text-xs text-white/50 hover:text-white px-0 h-7" onClick={flipCoin} disabled={coinFlipping}>
            <RotateCcw className="w-3 h-3 mr-1" /> Flip again
          </Button>
        </div>
      )}

      {/* Spin bottle display */}
      {spinResult !== null && (
        <div className="bg-black/40 rounded-xl p-4 border border-white/10 flex flex-col items-center gap-2 text-center">
          <span className={`text-4xl ${spinSpin ? 'animate-spin' : ''}`}>🌀</span>
          <p className={`text-white text-sm font-semibold leading-relaxed ${spinSpin ? 'opacity-50' : 'animate-in fade-in duration-300'}`}>
            {spinResult}
          </p>
          <Button variant="ghost" size="sm" className="text-xs text-white/50 hover:text-white px-0 h-7" onClick={spinBottle} disabled={spinSpin}>
            <RotateCcw className="w-3 h-3 mr-1" /> Spin again
          </Button>
        </div>
      )}
    </div>
  );
}
