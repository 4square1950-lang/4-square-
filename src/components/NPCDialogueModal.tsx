import React, { useState } from 'react';
import { X, MessageCircle, Sparkles, ChevronRight, HelpCircle } from 'lucide-react';
import { CampaignNPC } from '../types/campaign';

interface NPCDialogueModalProps {
  npc: CampaignNPC | null;
  onClose: () => void;
  onChallengePractice?: () => void;
}

export const NPCDialogueModal: React.FC<NPCDialogueModalProps> = ({
  npc,
  onClose,
  onChallengePractice,
}) => {
  const [lineIdx, setLineIdx] = useState(0);

  if (!npc) return null;

  const currentLine = npc.dialogueLines[lineIdx] || npc.dialogueLines[0];
  const hasMore = lineIdx < npc.dialogueLines.length - 1;

  const handleNext = () => {
    if (hasMore) {
      setLineIdx((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:p-8 bg-slate-950/60 backdrop-blur-xs select-none animate-in fade-in duration-150">
      <div className="bg-slate-900 border-2 border-amber-400 w-full max-w-2xl rounded-3xl shadow-2xl p-5 text-slate-100 flex flex-col gap-3">
        {/* Speaker Name & Role */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-sm shadow">
              {npc.name[0]}
            </div>
            <div>
              <h3 className="font-black text-base text-white leading-none">{npc.name}</h3>
              <span className="text-[11px] font-mono text-amber-400 font-bold">{npc.role}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dialogue Bubble */}
        <div className="py-2 text-sm sm:text-base text-slate-100 leading-relaxed font-medium min-h-[56px]">
          "{currentLine}"
        </div>

        {/* Pro Tip if available */}
        {npc.tips && (
          <div className="px-3 py-2 rounded-xl bg-amber-400/10 border border-amber-400/20 text-xs text-amber-300 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span><strong>Court Tip:</strong> {npc.tips}</span>
          </div>
        )}

        {/* Action Buttons: Challenge to Match & Dialogue Navigation */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800 gap-2 flex-wrap">
          <div className="text-[11px] font-mono text-slate-500">
            Line {lineIdx + 1} of {npc.dialogueLines.length}
          </div>

          <div className="flex items-center gap-2">
            {onChallengePractice && (
              <button
                onClick={() => {
                  onChallengePractice();
                  onClose();
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md hover:scale-105 active:scale-95"
              >
                <span>Play Four Square Match</span>
              </button>
            )}

            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow active:scale-95"
            >
              <span>{hasMore ? 'Continue' : 'Got it'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
