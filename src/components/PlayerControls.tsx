import React, { useState } from 'react';
import { SquareId, ShotType, RuleSet } from '../types/foursquare';
import { SQUARE_CONFIGS } from '../utils/courtGeometry';
import { Zap, Target, ArrowUpRight, CloudSun, ShieldCheck } from 'lucide-react';

interface PlayerControlsProps {
  isYourTurn: boolean;
  yourRank: SquareId | null;
  isServing: boolean;
  ruleSet: RuleSet;
  canVolley: boolean;
  onHit: (targetSquare: SquareId, shotType: ShotType) => void;
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  isYourTurn,
  yourRank,
  isServing,
  ruleSet,
  canVolley,
  onHit,
}) => {
  const [selectedShot, setSelectedShot] = useState<ShotType>('normal');

  if (!isYourTurn || !yourRank) {
    return null;
  }

  // Legal targets: if serving, must hit to Square 4!
  // If not serving, can hit to any square other than your own.
  const targetSquares: SquareId[] = isServing
    ? [4]
    : ([1, 2, 3, 4] as SquareId[]).filter((sq) => sq !== yourRank);

  const shotOptions: { id: ShotType; label: string; desc: string; icon: React.ReactNode }[] = [
    {
      id: 'normal',
      label: 'Standard',
      desc: 'Safe & centered',
      icon: <Target className="w-4 h-4 text-emerald-400" />,
    },
    {
      id: 'corner',
      label: 'Corner',
      desc: 'Edge target',
      icon: <ArrowUpRight className="w-4 h-4 text-amber-400" />,
    },
    {
      id: 'fast',
      label: 'Fast Slice',
      desc: 'Low & quick',
      icon: <Zap className="w-4 h-4 text-rose-400" />,
    },
    {
      id: 'high_pop',
      label: 'High Pop',
      desc: 'High arc',
      icon: <CloudSun className="w-4 h-4 text-cyan-400" />,
    },
  ];

  if (ruleSet === 'league' && canVolley) {
    shotOptions.push({
      id: 'volley',
      label: 'Air Volley',
      desc: 'No bounce',
      icon: <Zap className="w-4 h-4 text-purple-400" />,
    });
  }

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-full max-w-2xl px-4 pointer-events-auto animate-in slide-in-from-bottom-3 duration-200">
      <div className="bg-slate-900/95 border-2 border-amber-400 rounded-2xl shadow-2xl p-4 backdrop-blur-md text-slate-100 flex flex-col gap-3">
        {/* Banner */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping inline-block" />
            <h3 className="font-extrabold text-base text-amber-300">
              {isServing ? 'YOUR SERVE • Target Square 4' : 'YOUR TURN • Pick Target'}
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono hidden sm:inline">
            Keys [1-4] or Click
          </span>
        </div>

        {/* Shot Style Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {shotOptions.map((opt) => {
            const isSelected = selectedShot === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setSelectedShot(opt.id)}
                className={`p-2 rounded-xl border text-left flex items-start gap-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-amber-400 bg-amber-400/20 text-white ring-1 ring-amber-400/50'
                    : 'border-slate-800 bg-slate-800/70 text-slate-300 hover:border-slate-600'
                }`}
              >
                <div className="p-1 rounded-lg bg-slate-950/60 shrink-0">{opt.icon}</div>
                <div>
                  <div className="font-bold text-xs">{opt.label}</div>
                  <div className="text-[10px] text-slate-400">{opt.desc}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Target Square Quick Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <span className="text-xs font-semibold text-slate-400 shrink-0">STRIKE TO:</span>
          <div className="flex-1 grid grid-cols-3 sm:grid-cols-4 gap-2">
            {targetSquares.map((sqId) => {
              const cfg = SQUARE_CONFIGS[sqId];
              return (
                <button
                  key={sqId}
                  onClick={() => onHit(sqId, selectedShot)}
                  className="py-2.5 px-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 text-slate-950 shadow-md active:scale-95 transition-all cursor-pointer hover:brightness-110"
                  style={{ backgroundColor: cfg.colorHex }}
                >
                  <span className="text-slate-950 font-black">Square {sqId}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
