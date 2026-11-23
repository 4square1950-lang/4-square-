import React, { useState } from 'react';
import { X, Users, Play, Gamepad2, Sparkles, Check } from 'lucide-react';
import { CHARACTERS } from '../utils/characters';
import { DEFAULT_LOCAL_PICKS, LOCAL_SEATS } from '../services/localMultiplayer';

interface LocalMultiplayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartLocalMatch: (characterIds: string[]) => void;
}

export const LocalMultiplayerModal: React.FC<LocalMultiplayerModalProps> = ({
  isOpen,
  onClose,
  onStartLocalMatch,
}) => {
  const [playerCount, setPlayerCount] = useState<2 | 3 | 4>(2);
  const [selectedChars, setSelectedChars] = useState(() => [...DEFAULT_LOCAL_PICKS]);

  if (!isOpen) return null;

  const handleStart = () => {
    onStartLocalMatch(selectedChars.slice(0, playerCount));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md select-none animate-in zoom-in-95 duration-200">
      <div className="bg-slate-900 border-2 border-emerald-500 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 text-slate-950 flex items-center justify-between border-b-2 border-emerald-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-950 text-emerald-400 flex items-center justify-center shadow-lg font-black">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono tracking-widest uppercase text-slate-900 font-extrabold">
                SAME-SCREEN MULTIPLAYER
              </span>
              <h2 className="text-2xl font-black text-slate-950">Local Match Setup</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-950/20 hover:bg-slate-950/40 text-slate-950 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Player count selector */}
        <div className="p-5 border-b border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
              Select Number of Players
            </span>
            <div className="flex gap-2">
              {[2, 3, 4].map((count) => (
                <button
                  key={count}
                  onClick={() => setPlayerCount(count as 2 | 3 | 4)}
                  className={`px-4 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
                    playerCount === count
                      ? 'bg-emerald-400 text-slate-950 shadow-md scale-105'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {count} Players
                </button>
              ))}
            </div>
          </div>

          {/* Player roster cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {LOCAL_SEATS.slice(0, playerCount).map((ctrl, i) => (
              <div
                key={ctrl.id}
                className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-black ${ctrl.color}`}>{ctrl.name}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">
                    Square {ctrl.startSquare}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Squares 1–4: <strong className="text-slate-200">{ctrl.keysLabel}</strong> · Quick shot: {ctrl.quickLabel}
                </div>

                {/* Character Picker for this slot */}
                <select
                  value={selectedChars[i]}
                  aria-label={`${ctrl.name} character`}
                  onChange={(e) => {
                    const next = [...selectedChars];
                    next[i] = e.target.value;
                    setSelectedChars(next);
                  }}
                  className="w-full bg-slate-900 border border-slate-700 text-xs text-white rounded-lg p-1.5 focus:outline-none focus:border-emerald-400 cursor-pointer"
                >
                  {CHARACTERS.map((char) => (
                    <option key={char.id} value={char.id}>
                      {char.name} ({char.nickname})
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 bg-slate-950 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Remaining spots will be filled by AI schoolyard players!
          </div>
          <button
            onClick={handleStart}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-500/20 cursor-pointer transition-all active:scale-95"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>Launch Local Match</span>
          </button>
        </div>
      </div>
    </div>
  );
};
