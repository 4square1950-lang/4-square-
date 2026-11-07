import React from 'react';
import { X, Trophy, Play, Target, Eye, ClipboardCheck, Sparkles, HelpCircle } from 'lucide-react';
import { VenueDef } from '../types/campaign';

interface SignInBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  venue: VenueDef;
  onSelectOption: (option: 'campaign_match' | 'free_play' | 'practice' | 'spectate') => void;
}

export const SignInBoardModal: React.FC<SignInBoardModalProps> = ({
  isOpen,
  onClose,
  venue,
  onSelectOption,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md select-none animate-in zoom-in-95 duration-200">
      <div className="bg-slate-900 border-2 border-amber-400 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col">
        {/* Header styled as a physical wooden/cork sign-in board */}
        <div className="p-5 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-slate-950 flex items-center justify-between border-b-2 border-amber-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-950 text-amber-400 flex items-center justify-center shadow-lg font-black">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono tracking-widest uppercase text-slate-900 font-extrabold">
                OFFICIAL COURT SIGN-IN BOARD
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-950 leading-tight">
                {venue.name}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-950/20 hover:bg-slate-950/40 text-slate-950 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Board Notice / Local Variation Callout */}
        <div className="p-4 bg-slate-950/60 border-b border-slate-800 space-y-1">
          <div className="text-xs text-amber-300 font-bold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Active Court Rules: {venue.defaultRuleSet === 'league' ? 'Official League Baseline' : 'Playworks Schoolyard'}</span>
          </div>
          {venue.houseRule && (
            <div className="text-xs text-rose-300 font-semibold">
              Notice: {venue.houseRule}
            </div>
          )}
          <div className="text-xs text-slate-400">
            Campaign Objective: <strong className="text-slate-200">{venue.campaignObjective.title}</strong> — {venue.campaignObjective.description}
          </div>
        </div>

        {/* 4 Choices */}
        <div className="p-5 grid grid-cols-1 gap-2.5">
          {/* 1. Campaign Match */}
          <button
            onClick={() => {
              onSelectOption('campaign_match');
              onClose();
            }}
            className="group p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-400 hover:to-orange-500 border-2 border-amber-400/60 hover:border-yellow-200 flex items-center justify-between text-left transition-all cursor-pointer shadow-lg active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black group-hover:bg-slate-950 group-hover:text-amber-400 transition-colors shadow">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <div className="font-black text-sm text-white group-hover:text-slate-950 transition-colors">
                  Campaign Match
                </div>
                <div className="text-xs text-slate-300 group-hover:text-slate-900 transition-colors">
                  Begin this venue’s story challenge and record your victory
                </div>
              </div>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold bg-amber-400/20 group-hover:bg-slate-950 group-hover:text-amber-300 px-2.5 py-1 rounded-full text-amber-300">
              STORY
            </span>
          </button>

          {/* 2. Free Play */}
          <button
            onClick={() => {
              onSelectOption('free_play');
              onClose();
            }}
            className="group p-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 hover:border-slate-500 flex items-center justify-between text-left transition-all cursor-pointer shadow active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center font-black group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors shadow">
                <Play className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-sm text-white">Free Play</div>
                <div className="text-xs text-slate-400 group-hover:text-slate-200">
                  Play this court casually with local regulars without campaign stakes
                </div>
              </div>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold bg-slate-900 px-2.5 py-1 rounded-full text-slate-400">
              CASUAL
            </span>
          </button>

          {/* 3. Practice */}
          <button
            onClick={() => {
              onSelectOption('practice');
              onClose();
            }}
            className="group p-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 hover:border-slate-500 flex items-center justify-between text-left transition-all cursor-pointer shadow active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-purple-400 flex items-center justify-center font-black group-hover:bg-purple-500 group-hover:text-slate-950 transition-colors shadow">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-sm text-white">Practice Drills</div>
                <div className="text-xs text-slate-400 group-hover:text-slate-200">
                  Open drills for serves, returns, placement, and movement
                </div>
              </div>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold bg-slate-900 px-2.5 py-1 rounded-full text-slate-400">
              TRAIN
            </span>
          </button>

          {/* 4. Watch Next Game */}
          <button
            onClick={() => {
              onSelectOption('spectate');
              onClose();
            }}
            className="group p-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 hover:border-slate-500 flex items-center justify-between text-left transition-all cursor-pointer shadow active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-cyan-400 flex items-center justify-center font-black group-hover:bg-cyan-500 group-hover:text-slate-950 transition-colors shadow">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-sm text-white">Watch Next Game</div>
                <div className="text-xs text-slate-400 group-hover:text-slate-200">
                  Observe the local players and scout their habits from the sidelines
                </div>
              </div>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold bg-slate-900 px-2.5 py-1 rounded-full text-slate-400">
              SCOUT
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
