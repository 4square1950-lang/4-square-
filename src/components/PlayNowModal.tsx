import React from 'react';
import { X, Play, Zap, Globe, Users, Target, ArrowRight, Trophy, Sparkles } from 'lucide-react';
import { soundFX } from '../services/soundEffects';

interface PlayNowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuickMatch: () => void;
  onOnlineMatch: () => void;
  onLocalMultiplayer: () => void;
  onPracticeDrills: () => void;
  activeVenueName: string;
}

export const PlayNowModal: React.FC<PlayNowModalProps> = ({
  isOpen,
  onClose,
  onQuickMatch,
  onOnlineMatch,
  onLocalMultiplayer,
  onPracticeDrills,
  activeVenueName,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-slate-900 border-2 border-amber-400/90 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-100 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-400/20">
              <Play className="w-5 h-5 fill-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white tracking-wide">PLAY NOW</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 uppercase">
                  Game Modes
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Choose your showdown style. Current court: <span className="text-amber-300 font-bold">{activeVenueName}</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              soundFX.playClick();
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options List */}
        <div className="p-5 space-y-3.5">
          {/* 1. Quick Match */}
          <button
            onClick={() => {
              soundFX.playClick();
              onClose();
              onQuickMatch();
            }}
            className="w-full p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-transparent hover:from-amber-500/30 hover:via-orange-500/25 border-2 border-amber-400/60 hover:border-amber-400 text-left transition-all cursor-pointer group shadow-md flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 flex items-center justify-center font-black shadow-lg group-hover:scale-105 transition-transform shrink-0">
                <Zap className="w-6 h-6 fill-slate-950" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-black text-white group-hover:text-amber-300 transition-colors">
                    QUICK MATCH
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold">
                    SOLO VS BOTS
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Instant playground rotation. Start in Square 4 and climb to King with authentic referee calls.
                </p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-amber-400 group-hover:translate-x-1 transition-transform shrink-0" />
          </button>

          {/* 2. Online Match */}
          <button
            onClick={() => {
              soundFX.playClick();
              onClose();
              onOnlineMatch();
            }}
            className="w-full p-4 rounded-2xl bg-slate-950/70 hover:bg-slate-950 border-2 border-slate-800 hover:border-cyan-400/80 text-left transition-all cursor-pointer group shadow-sm flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-400/30 flex items-center justify-center font-black group-hover:scale-105 transition-transform shrink-0">
                <Globe className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-black text-white group-hover:text-cyan-300 transition-colors">
                    ONLINE MATCH
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 font-bold">
                    MULTIPLAYER LOBBY
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Global matchmaking, private room codes, and live synchronized court rallies with friends.
                </p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-cyan-400 group-hover:translate-x-1 transition-transform shrink-0" />
          </button>

          {/* 3. Local Pass & Play */}
          <button
            onClick={() => {
              soundFX.playClick();
              onClose();
              onLocalMultiplayer();
            }}
            className="w-full p-4 rounded-2xl bg-slate-950/70 hover:bg-slate-950 border-2 border-slate-800 hover:border-emerald-400/80 text-left transition-all cursor-pointer group shadow-sm flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 flex items-center justify-center font-black group-hover:scale-105 transition-transform shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-black text-white group-hover:text-emerald-300 transition-colors">
                    LOCAL PASS & PLAY
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 font-bold">
                    SAME DEVICE
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  2 to 4 players competing on one keyboard or touch screen with turn-by-turn action.
                </p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-emerald-400 group-hover:translate-x-1 transition-transform shrink-0" />
          </button>

          {/* 4. Practice & Free Hit */}
          <button
            onClick={() => {
              soundFX.playClick();
              onClose();
              onPracticeDrills();
            }}
            className="w-full p-4 rounded-2xl bg-slate-950/70 hover:bg-slate-950 border-2 border-slate-800 hover:border-amber-400/80 text-left transition-all cursor-pointer group shadow-sm flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-400/30 flex items-center justify-center font-black group-hover:scale-105 transition-transform shrink-0">
                <Target className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-black text-white group-hover:text-amber-300 transition-colors">
                    PRACTICE & DRILLS
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold">
                    TRAINING
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Master your bounce timing, corner spins, and learn receiver fault mechanics with zero pressure.
                </p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-amber-400 group-hover:translate-x-1 transition-transform shrink-0" />
          </button>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 text-center text-xs text-slate-400">
          Official Four Square League rules enabled: inside lines are out, outside lines are in.
        </div>
      </div>
    </div>
  );
};
