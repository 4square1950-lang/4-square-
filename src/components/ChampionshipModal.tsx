import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Crown, Sparkles, RotateCcw } from 'lucide-react';
import { Player } from '../types/foursquare';
import { soundFX } from '../services/soundEffects';

interface ChampionshipModalProps {
  winner: Player;
  onPlayAgain: () => void;
  onContinueRecess: () => void;
}

export const ChampionshipModal: React.FC<ChampionshipModalProps> = ({
  winner,
  onPlayAgain,
  onContinueRecess,
}) => {
  useEffect(() => {
    soundFX.playCheer();
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
      const interval = setInterval(() => {
        confetti({
          particleCount: 50,
          spread: 80,
          origin: { x: Math.random(), y: Math.random() - 0.2 },
        });
      }, 800);
      return () => clearInterval(interval);
    } catch {
      // Ignore
    }
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in zoom-in-95 duration-200">
      <div className="bg-slate-900 border-2 border-amber-400 w-full max-w-md rounded-3xl shadow-2xl p-6 text-slate-100 flex flex-col items-center text-center gap-4">
        {/* Animated Trophy Banner */}
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center shadow-xl shadow-amber-500/30">
            <Trophy className="w-10 h-10 text-slate-950" />
          </div>
          <div className="absolute -top-2 -right-2 p-1.5 rounded-full bg-amber-400 text-slate-950">
            <Crown className="w-5 h-5 fill-slate-950" />
          </div>
        </div>

        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold">
            Tournament Champion
          </span>
          <h2 className="text-3xl font-black text-white mt-1">SCHOOLYARD SHOWDOWN WINNER!</h2>
          <p className="text-sm text-slate-300 mt-2">
            <strong className="text-amber-400">{winner.name}</strong> successfully survived and held
            Square 1 (The King's Square) for 5 consecutive rounds!
          </p>
        </div>

        <div className="w-full p-4 rounded-2xl bg-slate-950 border border-slate-800 grid grid-cols-3 gap-2 text-xs">
          <div>
            <div className="text-slate-400">Total Strikes</div>
            <div className="text-base font-bold text-emerald-400">{winner.totalHits}</div>
          </div>
          <div>
            <div className="text-slate-400">Crown Holds</div>
            <div className="text-base font-bold text-amber-400">{winner.crownHolds} / 5</div>
          </div>
          <div>
            <div className="text-slate-400">Reward</div>
            <div className="text-base font-bold text-yellow-300">+500 COINS</div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full pt-2">
          <button
            onClick={onContinueRecess}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm transition-all border border-slate-700 cursor-pointer"
          >
            Endless Recess Mode
          </button>
          <button
            onClick={onPlayAgain}
            className="flex-1 py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm transition-all shadow-lg active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Play Again
          </button>
        </div>
      </div>
    </div>
  );
};
