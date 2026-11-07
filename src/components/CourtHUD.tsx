import React from 'react';
import { Player, SquareId, RefereeCall } from '../types/foursquare';
import { SQUARE_CONFIGS } from '../utils/courtGeometry';
import { RotateCcw, LogOut, Crown } from 'lucide-react';

interface CourtHUDProps {
  players: Player[];
  activeTurnPlayerId: string | null;
  servingPlayerId: string | null;
  humanPlayerId: string;
  crownHoldsTarget: number;
  refereeCall: RefereeCall;
  onResetPoint: () => void;
  onExitMatch: () => void;
}

export const CourtHUD: React.FC<CourtHUDProps> = ({
  players,
  activeTurnPlayerId,
  servingPlayerId,
  humanPlayerId,
  crownHoldsTarget,
  refereeCall,
  onResetPoint,
  onExitMatch,
}) => {
  const server = players.find((p) => p.id === servingPlayerId);
  const activeTurn = players.find((p) => p.id === activeTurnPlayerId);
  const king = players.find((p) => p.rank === 1);

  return (
    <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 flex flex-col gap-2 w-[92vw] max-w-sm pointer-events-auto">
      {/* Main Status Container */}
      <div className="bg-slate-900/95 border-2 border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden text-slate-100 transition-all">
        {/* Yellow Header Banner */}
        <div className="bg-amber-400 text-slate-950 px-4 py-2 font-black text-center text-xs sm:text-sm tracking-wide shadow-sm flex items-center justify-center gap-1.5 uppercase">
          <span>{refereeCall.message}</span>
        </div>

        {/* 2x2 Grid of 4 Active Squares / Players */}
        <div className="p-3 grid grid-cols-2 gap-2 text-xs">
          {([1, 2, 3, 4] as SquareId[]).map((sqId) => {
            const player = players.find((p) => p.rank === sqId);
            const cfg = SQUARE_CONFIGS[sqId];
            const isTurn = player && player.id === activeTurnPlayerId;
            const isYou = player && player.id === humanPlayerId;

            return (
              <div
                key={sqId}
                className={`p-2 rounded-xl border flex flex-col justify-between transition-all ${
                  isTurn
                    ? 'border-amber-400 bg-amber-400/20 shadow-md ring-1 ring-amber-400/50'
                    : isYou
                    ? 'border-sky-500 bg-sky-950/40'
                    : 'border-slate-800 bg-slate-800/60'
                }`}
              >
                <div className="flex items-center justify-between font-semibold">
                  <div className="flex items-center gap-1.5 truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                      style={{ backgroundColor: cfg.colorHex }}
                    />
                    <span className="truncate">
                      {sqId} • {player ? player.name : 'Empty'}
                    </span>
                  </div>
                  {sqId === 1 && (
                    <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
                  )}
                </div>

                <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                  <span>
                    {sqId === 1 ? 'King' : sqId === 2 ? 'Contender' : sqId === 3 ? 'Challenger' : 'Rookie'} •{' '}
                    {isYou ? (
                      <strong className="text-sky-300 font-bold">YOU</strong>
                    ) : (
                      'CPU'
                    )}
                  </span>
                  {sqId === 1 && player && (
                    <span className="text-amber-300 font-mono font-bold">
                      {player.crownHolds}/{crownHoldsTarget}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Match details line */}
        <div className="px-3 py-2 bg-slate-950/70 border-t border-slate-800/80 text-[11px] grid grid-cols-3 text-center text-slate-400">
          <div>
            <div className="text-[10px] uppercase text-slate-400 font-bold">Server</div>
            <div className="font-semibold text-slate-200 truncate">{server?.name || '—'}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-slate-400 font-bold">Turn</div>
            <div className="font-bold text-amber-300 truncate">
              {activeTurn?.isHuman ? 'YOU' : activeTurn?.name || '—'}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-slate-400 font-bold">Streak</div>
            <div className="font-bold text-amber-400 font-mono">
              {king ? `${king.crownHolds} / ${crownHoldsTarget}` : '0 / 5'}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-2 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between gap-2">
          <button
            onClick={onResetPoint}
            className="flex-1 py-1.5 px-2 rounded-lg bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs flex items-center justify-center gap-1 transition-all shadow-sm cursor-pointer uppercase"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            REPLAY
          </button>
          <button
            onClick={onExitMatch}
            className="flex-1 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-bold text-xs flex items-center justify-center gap-1 transition-all shadow-sm border border-slate-700 cursor-pointer uppercase"
          >
            <LogOut className="w-3.5 h-3.5" />
            EXIT
          </button>
        </div>
      </div>
    </div>
  );
};
