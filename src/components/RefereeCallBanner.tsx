import React from 'react';
import { RefereeCall } from '../types/foursquare';
import { ShieldAlert, CheckCircle2, AlertTriangle, Flame } from 'lucide-react';

interface RefereeCallBannerProps {
  call: RefereeCall;
}

export const RefereeCallBanner: React.FC<RefereeCallBannerProps> = ({ call }) => {
  const isWarning =
    call.type === 'inside_line_out' ||
    call.type === 'outside_court_out' ||
    call.type === 'own_square_out' ||
    call.type === 'double_bounce_out' ||
    call.type === 'poaching_out';

  const isFault = call.type === 'serve_fault_one';

  return (
    <div className="absolute top-4 right-4 z-20 pointer-events-auto">
      <div
        className={`px-4 py-2.5 rounded-2xl border-2 shadow-2xl backdrop-blur-md flex items-center gap-3 transition-all transform animate-in fade-in slide-in-from-top-2 duration-200 ${
          isWarning
            ? 'bg-red-950/90 border-red-500 text-red-100 shadow-red-900/30'
            : isFault
            ? 'bg-amber-950/90 border-amber-400 text-amber-100 shadow-amber-900/30'
            : 'bg-slate-900/90 border-slate-700 text-slate-100'
        }`}
      >
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            isWarning
              ? 'bg-red-500 text-slate-950 font-black'
              : isFault
              ? 'bg-amber-400 text-slate-950 font-black'
              : 'bg-slate-800 text-amber-400'
          }`}
        >
          {isWarning ? (
            <ShieldAlert className="w-5 h-5" />
          ) : isFault ? (
            <AlertTriangle className="w-5 h-5" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          )}
        </div>

        <div>
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            REFEREE CALL
          </div>
          <div className="text-sm font-bold leading-tight">
            {call.subMessage || call.message}
          </div>
        </div>
      </div>
    </div>
  );
};
