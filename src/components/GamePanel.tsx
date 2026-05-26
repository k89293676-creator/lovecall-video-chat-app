import React, { useState, useCallback } from 'react';
import { useRoomStore } from '@/store/room-store';
import {
  TRUTH_CARDS, DARE_CARDS, WOULD_YOU_RATHER, CONVERSATION_STARTERS,
  COMPLIMENTS, getRandomCard, type GameCard
} from '@/lib/games';
import { checkAndUnlock } from '@/lib/achievements';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dices, RefreshCw, MessageCircleHeart, Lightbulb } from 'lucide-react';

interface GamePanelProps {
  onAchievement?: (ach: { title: string; emoji: string }) => void;
  sendMessage?: (data: unknown) => void;
}

type GameTab = 'truth' | 'dare' | 'wyr' | 'convo' | 'compliment' | 'dice';

export function GamePanel({ onAchievement, sendMessage }: GamePanelProps) {
  const [activeGame, setActiveGame] = useState<GameTab>('truth');
  const [currentCard, setCurrentCard] = useState<GameCard | null>(null);
  const [compliment, setCompliment] = useState<string | null>(null);
  const [diceResult, setDiceResult] = useState<number | null>(null);
  const [diceRolling, setDiceRolling] = useState(false);

  const drawCard = useCallback((game: GameTab) => {
    setActiveGame(game);
    let card: GameCard | null = null;
    if (game === 'truth') card = getRandomCard(TRUTH_CARDS);
    else if (game === 'dare') card = getRandomCard(DARE_CARDS);
    else if (game === 'wyr') card = getRandomCard(WOULD_YOU_RATHER);
    else if (game === 'convo') card = getRandomCard(CONVERSATION_STARTERS);
    
    setCurrentCard(card);
    setCompliment(null);
    setDiceResult(null);

    if (card && sendMessage) sendMessage({ type: 'game_card', card });

    const ach = checkAndUnlock(game === 'truth' || game === 'dare' ? 'truthordare' : 'game');
    if (ach && onAchievement) onAchievement(ach);
  }, [sendMessage, onAchievement]);

  const getCompliment = useCallback(() => {
    setActiveGame('compliment');
    const c = COMPLIMENTS[Math.floor(Math.random() * COMPLIMENTS.length)];
    setCompliment(c);
    setCurrentCard(null);
    setDiceResult(null);
    if (sendMessage) sendMessage({ type: 'compliment', text: c });
    const ach = checkAndUnlock('compliment');
    if (ach && onAchievement) onAchievement(ach);
  }, [sendMessage, onAchievement]);

  const rollDice = useCallback(() => {
    if (diceRolling) return;
    setDiceRolling(true);
    setActiveGame('dice');
    setCurrentCard(null);
    setCompliment(null);
    let count = 0;
    const interval = setInterval(() => {
      setDiceResult(Math.ceil(Math.random() * 6));
      count++;
      if (count >= 10) {
        clearInterval(interval);
        const final = Math.ceil(Math.random() * 6);
        setDiceResult(final);
        setDiceRolling(false);
        if (sendMessage) sendMessage({ type: 'dice', result: final });
        const ach = checkAndUnlock('game');
        if (ach && onAchievement) onAchievement(ach);
      }
    }, 80);
  }, [diceRolling, sendMessage, onAchievement]);

  const DICE_FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-1.5">
        <Button size="sm" onClick={() => drawCard('truth')}
          className={`text-xs h-9 ${activeGame === 'truth' ? 'bg-primary/30 border border-primary/50' : 'bg-white/5 hover:bg-white/10'} text-white`}>
          🎯 Truth
        </Button>
        <Button size="sm" onClick={() => drawCard('dare')}
          className={`text-xs h-9 ${activeGame === 'dare' ? 'bg-primary/30 border border-primary/50' : 'bg-white/5 hover:bg-white/10'} text-white`}>
          🔥 Dare
        </Button>
        <Button size="sm" onClick={() => drawCard('wyr')}
          className={`text-xs h-9 ${activeGame === 'wyr' ? 'bg-primary/30 border border-primary/50' : 'bg-white/5 hover:bg-white/10'} text-white`}>
          🤔 WYR
        </Button>
        <Button size="sm" onClick={() => drawCard('convo')}
          className={`text-xs h-9 ${activeGame === 'convo' ? 'bg-primary/30 border border-primary/50' : 'bg-white/5 hover:bg-white/10'} text-white`}>
          <Lightbulb className="w-3 h-3 mr-1" /> Convo
        </Button>
        <Button size="sm" onClick={getCompliment}
          className={`text-xs h-9 ${activeGame === 'compliment' ? 'bg-primary/30 border border-primary/50' : 'bg-white/5 hover:bg-white/10'} text-white`}>
          <MessageCircleHeart className="w-3 h-3 mr-1" /> Love
        </Button>
        <Button size="sm" onClick={rollDice} disabled={diceRolling}
          className={`text-xs h-9 ${activeGame === 'dice' ? 'bg-primary/30 border border-primary/50' : 'bg-white/5 hover:bg-white/10'} text-white`}>
          <Dices className="w-3 h-3 mr-1" /> Dice
        </Button>
      </div>

      {currentCard && (
        <div className="bg-black/40 rounded-xl p-4 border border-white/10 relative">
          <span className={`text-[10px] uppercase tracking-widest font-semibold mb-2 block ${
            currentCard.type === 'truth' ? 'text-blue-400' :
            currentCard.type === 'dare' ? 'text-orange-400' :
            currentCard.type === 'question' ? 'text-purple-400' : 'text-green-400'
          }`}>
            {currentCard.type === 'question' ? 'would you rather' : currentCard.type}
          </span>
          <p className="text-white text-sm leading-relaxed font-medium">{currentCard.content}</p>
          <Button
            variant="ghost" size="icon"
            className="absolute top-2 right-2 w-7 h-7 rounded-full hover:bg-white/10 text-white/40"
            onClick={() => drawCard(activeGame as Exclude<GameTab, 'compliment' | 'dice'>)}
          >
            <RefreshCw className="w-3 h-3" />
          </Button>
        </div>
      )}

      {compliment && (
        <div className="bg-primary/10 rounded-xl p-4 border border-primary/30">
          <span className="text-[10px] uppercase tracking-widest text-primary font-semibold mb-2 block">💌 For your partner</span>
          <p className="text-white text-sm leading-relaxed italic">"{compliment}"</p>
          <Button
            variant="ghost" size="sm"
            className="mt-2 text-xs text-white/50 hover:text-white px-0 h-7"
            onClick={getCompliment}
          >
            <RefreshCw className="w-3 h-3 mr-1" /> Another
          </Button>
        </div>
      )}

      {diceResult !== null && (
        <div className="bg-black/40 rounded-xl p-6 border border-white/10 flex flex-col items-center gap-2">
          <span className={`text-6xl transition-all ${diceRolling ? 'animate-spin' : ''}`}>
            {DICE_FACES[diceResult]}
          </span>
          <span className="text-white/50 text-sm">{diceRolling ? 'Rolling...' : `Rolled a ${diceResult}`}</span>
          <Button
            variant="ghost" size="sm"
            className="text-xs text-white/50 hover:text-white px-0 h-7"
            onClick={rollDice} disabled={diceRolling}
          >
            <Dices className="w-3 h-3 mr-1" /> Roll again
          </Button>
        </div>
      )}
    </div>
  );
}
