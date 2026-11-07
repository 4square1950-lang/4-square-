import React from 'react';
import { Player } from '../types/foursquare';
import { Trophy, Crown, Flame, Award, RefreshCw, MapPin, Home } from 'lucide-react';
import { FourSquareCoin } from './FourSquareCoin';

interface EndGameStatsModalProps {
  isOpen: boolean;
  winner: Player | null;
  players: Player[];
  humanPlayerId: string;
  totalRounds: number;
  onRematch: () => void;
  onSwitchVenue: () => void;
  onReturnToMenu: () => void;
}

export const EndGameStatsModal: React.FC<EndGameStatsModalProps> = ({
  isOpen,
  winner,
  players,
  humanPlayerId,
  totalRounds,
  onRematch,
  onSwitchVenue,
  onReturnToMenu,
}) => {
  if (!isOpen) return null;

  // Rank players by crown holds first, then points, then total hits
  const rankedPlayers = [...players].sort((a, b) => {
    if (b.crownHolds !== a.crownHolds) {
      return b.crownHolds - a.crownHolds;
    }
    const ptsB = b.points || (b.crownHolds * 200 + (b.totalHits || 0) * 25);
    const ptsA = a.points || (a.crownHolds * 200 + (a.totalHits || 0) * 25);
    return ptsB - ptsA;
  });

  const isHumanWinner = winner?.id === humanPlayerId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-amber-400/80 rounded-3xl shadow-[0_25px_60px_rgba(251,191,36,0.3)] overflow-hidden flex flex-col">
        {/* Header Ribbon */}
        <div className="relative px-6 py-5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 text-center font-black">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-slate-950 text-amber-400 text-xs uppercase tracking-widest font-mono mb-1">
            <Trophy className="w-3.5 h-3.5" />
            <span>MATCH CONCLUDED • 5 CROWN HOLDS VICTORY</span>
          </div>
          <h2 className="text-2xl sm:text-3xl uppercase tracking-wider">
            {isHumanWinner ? '🏆 YOU ARE THE FOUR SQUARE CHAMPION!' : `👑 ${winner?.name || 'King'} CLAIMS THE CROWN!`}
          </h2>
          <p className="text-xs text-slate-900 font-bold mt-0.5">
            Target 5 King defenses reached after {totalRounds} competitive rounds
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[65vh]">
          {/* Winner Spotlight Card */}
          {winner && (
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-transparent border border-amber-500/40">
              <div className="relative flex-shrink-0 w-16 h-16 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center shadow-lg border-2 border-amber-300">
                <Crown className="w-9 h-9" />
                <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-slate-950 text-amber-300 font-mono text-[10px] font-bold border border-amber-400">
                  5/5
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black text-white truncate">{winner.name}</span>
                  {winner.id === humanPlayerId && (
                    <span className="px-2 py-0.5 rounded-full bg-cyan-500 text-slate-950 font-black text-[10px] uppercase">
                      YOU
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold text-xs border border-amber-400/30">
                    MATCH MVP
                  </span>
                </div>
                <div className="text-xs text-slate-300 font-medium mt-1 flex flex-wrap gap-x-4 gap-y-1">
                  <span>Crown Holds: <strong className="text-amber-400">{winner.crownHolds}</strong></span>
                  <span>Total Hits: <strong className="text-cyan-400">{winner.totalHits || 0}</strong></span>
                  <span>Match Points: <strong className="text-emerald-400">{winner.points || winner.crownHolds * 200 + (winner.totalHits || 0) * 25}</strong></span>
                </div>
              </div>
            </div>
          )}

          {/* Full Player Leaderboard & Stats Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-400" />
                <span>Final Match Standings & Performance Stats</span>
              </h3>
              <span className="text-[11px] font-mono text-slate-500">4 Players Total</span>
            </div>

            <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/60 divide-y divide-slate-800/60">
              {rankedPlayers.map((p, idx) => {
                const pts = p.points || Math.max(0, p.crownHolds * 200 + (p.totalHits || 0) * 25 - (p.faults || 0) * 50);
                const isWinner = idx === 0;
                const isSelf = p.id === humanPlayerId;

                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between p-3.5 transition-colors ${
                      isWinner
                        ? 'bg-amber-400/10'
                        : isSelf
                        ? 'bg-cyan-500/10'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Rank & Name */}
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs ${
                          idx === 0
                            ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-500/30'
                            : idx === 1
                            ? 'bg-slate-300 text-slate-950'
                            : idx === 2
                            ? 'bg-amber-700 text-amber-100'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {idx + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white">{p.name}</span>
                          {isSelf && (
                            <span className="px-1.5 py-0.2 rounded bg-cyan-400 text-slate-950 text-[10px] font-black uppercase">
                              YOU
                            </span>
                          )}
                          {isWinner && (
                            <Crown className="w-3.5 h-3.5 text-amber-400 inline" />
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Square {p.rank || 4} • {p.title}
                        </div>
                      </div>
                    </div>

                    {/* Stats Metrics */}
                    <div className="flex items-center gap-4 text-right font-mono">
                      <div className="hidden sm:block">
                        <div className="text-[10px] text-slate-500 uppercase">Crowns</div>
                        <div className="text-xs font-bold text-amber-300">{p.crownHolds} / 5</div>
                      </div>
                      <div className="hidden sm:block">
                        <div className="text-[10px] text-slate-500 uppercase">Hits</div>
                        <div className="text-xs font-bold text-cyan-300">{p.totalHits || 0}</div>
                      </div>
                      <div className="hidden sm:block">
                        <div className="text-[10px] text-slate-500 uppercase">Fouls</div>
                        <div className="text-xs font-bold text-rose-400">{p.faults || 0}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase">Points</div>
                        <div className="text-sm font-black text-emerald-400">{pts}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-5 border-t border-slate-800 bg-slate-950/80 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={onReturnToMenu}
            className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase flex items-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <Home className="w-4 h-4" />
            <span>Main Menu</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onSwitchVenue}
              className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-400/40 font-bold text-xs uppercase flex items-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              <MapPin className="w-4 h-4 text-amber-400" />
              <span>Switch Venue</span>
            </button>
            <button
              onClick={onRematch}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-[0_8px_20px_rgba(251,191,36,0.4)] flex items-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Rematch (First to 5)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
