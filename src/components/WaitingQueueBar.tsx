import React from 'react';
import { Player } from '../types/foursquare';
import { Users } from 'lucide-react';

interface WaitingQueueBarProps {
  queue: Player[];
}

export const WaitingQueueBar: React.FC<WaitingQueueBarProps> = ({ queue }) => {
  if (queue.length === 0) return null;

  return (
    <div className="absolute bottom-4 right-4 z-20 pointer-events-auto hidden md:block">
      <div className="bg-slate-900/85 border border-slate-700/80 rounded-2xl shadow-xl px-3 py-2 backdrop-blur-md text-slate-100 flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold shrink-0">
          <Users className="w-3.5 h-3.5 text-amber-400" />
          <span>WAITING LINE ({queue.length}):</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-xs">
          {queue.map((p, idx) => (
            <div
              key={p.id}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-[11px] shrink-0"
            >
              <span className="font-mono text-amber-400 font-bold">#{idx + 1}</span>
              <span className="truncate max-w-[80px] font-semibold text-slate-200">{p.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
