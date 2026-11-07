import React from 'react';
import { Crown, Sparkles, X } from 'lucide-react';
import { soundFX } from '../services/soundEffects';

interface KingHouseRuleModalProps {
  isOpen: boolean;
  activeRule: string | null;
  onSelectRule: (ruleName: string | null) => void;
  onClose: () => void;
}

const HOUSE_RULES = [
  {
    id: null,
    title: 'Standard Official Rules',
    desc: 'Official baseline (volleys legal, outside in, inside out).',
    badge: 'Baseline',
  },
  {
    id: 'No Volleys (School Style)',
    title: 'No Volleys (School Style)',
    desc: 'All players must let the ball bounce once before returning. No aerial smashes!',
    badge: 'Playworks',
  },
  {
    id: 'Cherry Bomb (High Bouncers)',
    title: 'Cherry Bomb (High Bouncers)',
    desc: 'High-altitude pops allowed; ball must bounce over head height!',
    badge: 'Street Variant',
  },
  {
    id: 'Underhand Palm Only',
    title: 'Underhand Palm Only',
    desc: 'Only gentle underhand open-palm hits permitted. No hard downward spikes!',
    badge: 'Finesse',
  },
  {
    id: 'Corner Duster Showdown',
    title: 'Corner Duster Showdown',
    desc: 'Hits must land within 1 foot of the outer perimeter lines!',
    badge: 'Precision',
  },
];

export const KingHouseRuleModal: React.FC<KingHouseRuleModalProps> = ({
  isOpen,
  activeRule,
  onSelectRule,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-slate-900 border-2 border-amber-400 w-full max-w-md rounded-3xl shadow-2xl p-5 text-slate-100 flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-400 text-slate-950 font-black">
              <Crown className="w-5 h-5 fill-slate-950" />
            </div>
            <div>
              <h3 className="font-black text-white text-base">KING'S HOUSE RULE CALL</h3>
              <p className="text-[11px] text-amber-300">
                Rule 08: Player in Square 1 may announce a modifier for this round!
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {HOUSE_RULES.map((rule) => {
            const isSelected = activeRule === rule.id;
            return (
              <button
                key={rule.title}
                onClick={() => {
                  soundFX.playClick();
                  onSelectRule(rule.id);
                  onClose();
                }}
                className={`w-full p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-400/20 border-amber-400 text-white ring-1 ring-amber-400/40'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-600 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-amber-300">{rule.title}</span>
                  <span className="text-[10px] font-mono py-0.5 px-2 rounded-full bg-slate-800 text-slate-300">
                    {rule.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{rule.desc}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
