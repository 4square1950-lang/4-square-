import React from 'react';
import { Sun, Building2, Check, Sparkles } from 'lucide-react';

interface VenueSelectModalProps {
  isOpen: boolean;
  selectedVenueType: 'outdoor' | 'indoor';
  onSelectVenueType: (type: 'outdoor' | 'indoor') => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export const VenueSelectModal: React.FC<VenueSelectModalProps> = ({
  isOpen,
  selectedVenueType,
  onSelectVenueType,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-amber-400 rounded-3xl shadow-2xl p-6 text-white">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold uppercase tracking-widest border border-amber-400/40 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>MATCH ARENA SETUP</span>
          </div>
          <h2 className="text-2xl font-black text-amber-400 uppercase tracking-wide">
            Select Match Venue
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Choose whether to play on the sunlit outdoor school blacktop or inside the indoor arena
          </p>
        </div>

        {/* Venue Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Outdoor School Blacktop */}
          <button
            onClick={() => onSelectVenueType('outdoor')}
            className={`p-4 rounded-2xl border-2 text-left cursor-pointer transition-all flex flex-col justify-between ${
              selectedVenueType === 'outdoor'
                ? 'border-amber-400 bg-amber-400/10 shadow-[0_0_20px_rgba(251,191,36,0.25)]'
                : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="p-2.5 rounded-xl bg-amber-400 text-slate-950">
                  <Sun className="w-5 h-5" />
                </div>
                {selectedVenueType === 'outdoor' && (
                  <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </span>
                )}
              </div>
              <h3 className="font-bold text-sm text-white">Outdoor Blacktop</h3>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Lincoln High Schoolyard. Fresh air, painted asphalt lines, sunny sky, and playground sidelines.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-800/80 text-[10px] font-mono text-amber-300/80 font-bold uppercase">
              Asphalt • Playground Acoustics
            </div>
          </button>

          {/* Indoor Gymnasium */}
          <button
            onClick={() => onSelectVenueType('indoor')}
            className={`p-4 rounded-2xl border-2 text-left cursor-pointer transition-all flex flex-col justify-between ${
              selectedVenueType === 'indoor'
                ? 'border-amber-400 bg-amber-400/10 shadow-[0_0_20px_rgba(251,191,36,0.25)]'
                : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="p-2.5 rounded-xl bg-cyan-400 text-slate-950">
                  <Building2 className="w-5 h-5" />
                </div>
                {selectedVenueType === 'indoor' && (
                  <span className="w-5 h-5 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </span>
                )}
              </div>
              <h3 className="font-bold text-sm text-white">Indoor Gymnasium</h3>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Lincoln High Fieldhouse. Polished maple hardwood court, wall padding mats, arena floodlights, and championship banners.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-800/80 text-[10px] font-mono text-cyan-300 font-bold uppercase">
              Hardwood Maple • Arena Loudspeakers
            </div>
          </button>
        </div>

        {/* Modal Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase cursor-pointer transition-all active:scale-95"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg cursor-pointer transition-all active:scale-95"
          >
            Confirm & Enter Court
          </button>
        </div>
      </div>
    </div>
  );
};
