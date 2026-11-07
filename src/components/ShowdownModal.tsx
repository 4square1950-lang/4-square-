import React, { useState } from 'react';
import { Player } from '../types/foursquare';
import { Swords, Hand, Scissors, ShieldAlert } from 'lucide-react';
import { soundFX } from '../services/soundEffects';

interface ShowdownModalProps {
  playerA: Player;
  playerB: Player;
  reason: string;
  onResolve: (winner: Player, loser: Player) => void;
  onReplay: () => void;
}

type RPSChoice = 'rock' | 'paper' | 'scissors';

export const ShowdownModal: React.FC<ShowdownModalProps> = ({
  playerA,
  playerB,
  reason,
  onResolve,
  onReplay,
}) => {
  const [playerChoice, setPlayerChoice] = useState<RPSChoice | null>(null);
  const [opponentChoice, setOpponentChoice] = useState<RPSChoice | null>(null);
  const [resultText, setResultText] = useState<string | null>(null);

  const humanIsA = playerA.isHuman;
  const humanPlayer = humanIsA ? playerA : playerB;
  const cpuPlayer = humanIsA ? playerB : playerA;

  const choices: { id: RPSChoice; label: string; icon: string }[] = [
    { id: 'rock', label: 'ROCK', icon: '✊' },
    { id: 'paper', label: 'PAPER', icon: '✋' },
    { id: 'scissors', label: 'SCISSORS', icon: '✌️' },
  ];

  const handleChoose = (choice: RPSChoice) => {
    soundFX.playClick();
    setPlayerChoice(choice);

    // CPU picks
    const cpuPicks: RPSChoice[] = ['rock', 'paper', 'scissors'];
    const cpuPick = cpuPicks[Math.floor(Math.random() * 3)];
    setOpponentChoice(cpuPick);

    // Evaluate
    if (choice === cpuPick) {
      setResultText('TIE! Throw again!');
      setTimeout(() => {
        setPlayerChoice(null);
        setOpponentChoice(null);
        setResultText(null);
      }, 1200);
      return;
    }

    const humanWins =
      (choice === 'rock' && cpuPick === 'scissors') ||
      (choice === 'paper' && cpuPick === 'rock') ||
      (choice === 'scissors' && cpuPick === 'paper');

    if (humanWins) {
      soundFX.playCheer();
      setResultText(`${humanPlayer.name} WINS THE SHOWDOWN!`);
      setTimeout(() => {
        onResolve(humanPlayer, cpuPlayer);
      }, 1500);
    } else {
      soundFX.playAww();
      setResultText(`${cpuPlayer.name} WINS THE SHOWDOWN!`);
      setTimeout(() => {
        onResolve(cpuPlayer, humanPlayer);
      }, 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border-2 border-amber-400 w-full max-w-lg rounded-3xl shadow-2xl p-6 text-slate-100 flex flex-col gap-4 text-center">
        {/* Header */}
        <div className="flex flex-col items-center gap-2">
          <div className="p-3 rounded-2xl bg-amber-400 text-slate-950 shadow-lg">
            <Swords className="w-8 h-8 font-black" />
          </div>
          <h2 className="text-2xl font-black text-white">OFFICIAL SHOWDOWN!</h2>
          <p className="text-xs text-amber-300 font-medium">
            Rule 07 Dispute: {reason}
          </p>
        </div>

        {/* Competitors */}
        <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-950 border border-slate-800 items-center">
          <div className="p-2">
            <div className="text-sm font-bold text-sky-400">{humanPlayer.name}</div>
            <div className="text-[11px] text-slate-400">Square {humanPlayer.rank} (YOU)</div>
            <div className="text-4xl mt-2">{playerChoice ? choices.find((c) => c.id === playerChoice)?.icon : '❓'}</div>
          </div>
          <div className="p-2 border-l border-slate-800">
            <div className="text-sm font-bold text-rose-400">{cpuPlayer.name}</div>
            <div className="text-[11px] text-slate-400">Square {cpuPlayer.rank} (CPU)</div>
            <div className="text-4xl mt-2">{opponentChoice ? choices.find((c) => c.id === opponentChoice)?.icon : '❓'}</div>
          </div>
        </div>

        {/* Result message */}
        {resultText && (
          <div className="p-2.5 rounded-xl bg-amber-400/20 border border-amber-400 text-amber-300 font-black text-sm animate-pulse">
            {resultText}
          </div>
        )}

        {/* Buttons */}
        {!playerChoice ? (
          <div>
            <div className="text-xs text-slate-400 mb-2 font-semibold">
              Shoot Rock, Paper, or Scissors to settle the call!
            </div>
            <div className="grid grid-cols-3 gap-2">
              {choices.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleChoose(c.id)}
                  className="py-3 px-2 rounded-xl bg-slate-800 hover:bg-amber-400 hover:text-slate-950 font-black text-base flex flex-col items-center gap-1 border border-slate-700 transition-all active:scale-95 cursor-pointer"
                >
                  <span className="text-3xl">{c.icon}</span>
                  <span className="text-xs">{c.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* Or simple replay */}
        <div className="pt-2 border-t border-slate-800 flex justify-center">
          <button
            onClick={onReplay}
            className="text-xs text-slate-400 hover:text-slate-200 underline cursor-pointer"
          >
            Or agree on a neutral Replay
          </button>
        </div>
      </div>
    </div>
  );
};
