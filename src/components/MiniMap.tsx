import React, { useState } from 'react';
import { Compass, Maximize2, Minimize2, User, Car, Target, MapPin, Sparkles, Navigation } from 'lucide-react';
import { Player, SquareId } from '../types/foursquare';
import { VenueDef } from '../types/campaign';

interface MiniMapProps {
  mode: 'exploration' | 'match';
  venue: VenueDef;
  playerPosition: [number, number, number];
  players?: Player[];
  activeTurnPlayerId?: string;
  servingPlayerId?: string;
}

export const MiniMap: React.FC<MiniMapProps> = ({
  mode,
  venue,
  playerPosition,
  players = [],
  activeTurnPlayerId,
  servingPlayerId,
}) => {
  const [isZoomedOut, setIsZoomedOut] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Coordinate mapping
  // Exploration range: Zoomed In: 32 units, Zoomed Out: 54 units
  const range = isZoomedOut ? 54 : 32;
  const toPercent = (x: number, z: number) => {
    const px = Math.max(2, Math.min(98, ((x + range / 2) / range) * 100));
    const pz = Math.max(2, Math.min(98, ((z + range / 2) / range) * 100));
    return { left: `${px}%`, top: `${pz}%` };
  };

  const [px, , pz] = playerPosition;

  return (
    <div className="absolute bottom-4 right-4 z-30 pointer-events-auto select-none flex flex-col items-end">
      {/* Top Controls Bar (Zoom & Minimize) */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <button
          onClick={() => setIsZoomedOut((prev) => !prev)}
          className="px-2.5 py-1 rounded-xl bg-slate-900/95 hover:bg-slate-800 border border-slate-700/80 text-[10px] font-mono font-bold text-amber-300 shadow-md backdrop-blur-md cursor-pointer transition-colors"
          title={isZoomedOut ? 'Zoom to Court' : 'Zoom to Campus'}
        >
          {isZoomedOut ? '1x Zoom' : '2x Zoom'}
        </button>

        <button
          onClick={() => setIsCollapsed((prev) => !prev)}
          className="p-1.5 rounded-xl bg-slate-900/95 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white shadow-md backdrop-blur-md cursor-pointer transition-colors"
          title={isCollapsed ? 'Expand Map' : 'Minimize Map'}
        >
          {isCollapsed ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
        </button>
      </div>

      {!isCollapsed && (
        <div className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-3xl bg-slate-950/95 border-2 border-amber-400/60 shadow-[0_15px_40px_rgba(0,0,0,0.9)] backdrop-blur-2xl overflow-hidden p-2.5 flex flex-col">
          {/* Map Header / Coordinates HUD (No Radar) */}
          <div className="relative z-10 flex items-center justify-between px-1 pb-1 text-[9px] font-mono font-black text-amber-400 border-b border-slate-800/80">
            <div className="flex items-center gap-1.5 uppercase tracking-wider">
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              <span>{mode === 'match' ? 'TACTICAL COURT' : 'CAMPUS OVERVIEW'}</span>
            </div>
            <div className="text-slate-400 font-mono">
              X:{Math.round(px)} Z:{Math.round(pz)}
            </div>
          </div>

          {/* Compass Cardinal Marks */}
          <div className="absolute top-8 left-1/2 -translate-x-1/2 text-[8px] font-mono font-black text-amber-400 z-10">
            N
          </div>
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[8px] font-mono font-black text-slate-500 z-10">
            S
          </div>
          <div className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[8px] font-mono font-black text-slate-500 z-10">
            W
          </div>
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[8px] font-mono font-black text-slate-500 z-10">
            E
          </div>

          {/* Main Map Ground Canvas */}
          <div className="relative flex-1 w-full h-full mt-1.5 rounded-2xl bg-[#475569]/30 border border-slate-800 overflow-hidden shadow-inner">
            {/* Asphalt subtle grid ground */}
            <div className="absolute inset-0 opacity-25 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:12px_12px]" />

            {mode === 'match' ? (
              /* MATCH MODE: Detailed 4-Square Court Breakdown */
              <div className="w-full h-full p-2 grid grid-cols-2 grid-rows-2 gap-2 relative">
                {/* Square 2 (Top Left - Yellow) */}
                <div className="relative rounded-xl bg-amber-500/30 border-2 border-amber-400 flex flex-col items-center justify-center p-1 shadow-md">
                  <span className="font-black text-sm text-amber-300">2</span>
                  {players.find((p) => p.rank === 2) && (
                    <span className="text-[9px] font-black text-slate-100 truncate max-w-full">
                      {players.find((p) => p.rank === 2)?.name}
                    </span>
                  )}
                  {activeTurnPlayerId === players.find((p) => p.rank === 2)?.id && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 border border-slate-950 animate-ping" />
                  )}
                </div>

                {/* Square 3 (Top Right - Green) */}
                <div className="relative rounded-xl bg-emerald-500/30 border-2 border-emerald-400 flex flex-col items-center justify-center p-1 shadow-md">
                  <span className="font-black text-sm text-emerald-300">3</span>
                  {players.find((p) => p.rank === 3) && (
                    <span className="text-[9px] font-black text-slate-100 truncate max-w-full">
                      {players.find((p) => p.rank === 3)?.name}
                    </span>
                  )}
                  {activeTurnPlayerId === players.find((p) => p.rank === 3)?.id && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border border-slate-950 animate-ping" />
                  )}
                </div>

                {/* Square 1 (Bottom Left - Red - King's Square) */}
                <div className="relative rounded-xl bg-rose-500/40 border-2 border-rose-400 flex flex-col items-center justify-center p-1 shadow-[0_0_15px_rgba(244,63,94,0.4)]">
                  <span className="font-black text-sm text-rose-300 flex items-center gap-0.5">
                    1 👑
                  </span>
                  {players.find((p) => p.rank === 1) && (
                    <span className="text-[9px] font-black text-rose-100 truncate max-w-full">
                      {players.find((p) => p.rank === 1)?.name}
                    </span>
                  )}
                  {activeTurnPlayerId === players.find((p) => p.rank === 1)?.id && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-rose-400 border border-slate-950 animate-ping" />
                  )}
                </div>

                {/* Square 4 (Bottom Right - Blue) */}
                <div className="relative rounded-xl bg-blue-500/30 border-2 border-blue-400 flex flex-col items-center justify-center p-1 shadow-md">
                  <span className="font-black text-sm text-blue-300">4</span>
                  {players.find((p) => p.rank === 4) && (
                    <span className="text-[9px] font-black text-slate-100 truncate max-w-full">
                      {players.find((p) => p.rank === 4)?.name}
                    </span>
                  )}
                  {activeTurnPlayerId === players.find((p) => p.rank === 4)?.id && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-blue-400 border border-slate-950 animate-ping" />
                  )}
                </div>
              </div>
            ) : (
              /* EXPLORATION MODE: High-Detail Architectural Campus Objects */
              <div className="w-full h-full relative">
                {/* 1. School Building (Brick Red Wall + Roof + Windows) */}
                <div
                  style={{
                    left: `${((10 + range / 2) / range) * 100}%`,
                    top: `${((-18 + range / 2) / range) * 100}%`,
                    width: `${(20 / range) * 100}%`,
                    height: `${(22 / range) * 100}%`,
                  }}
                  className="absolute bg-[#881337] border-2 border-[#4c0519] rounded-sm shadow-xl flex flex-col justify-between p-1 overflow-hidden"
                  title="School Building"
                >
                  <div className="flex justify-between gap-1 opacity-80">
                    <div className="w-2 h-1.5 bg-sky-200 border border-sky-400 rounded-[1px]" />
                    <div className="w-2 h-1.5 bg-sky-200 border border-sky-400 rounded-[1px]" />
                  </div>
                  <div className="text-[6px] font-black text-rose-200 tracking-wider text-center uppercase">
                    SCHOOL
                  </div>
                  <div className="flex justify-between gap-1 opacity-80">
                    <div className="w-2 h-1.5 bg-sky-200 border border-sky-400 rounded-[1px]" />
                    <div className="w-2 h-1.5 bg-sky-200 border border-sky-400 rounded-[1px]" />
                  </div>
                </div>

                {/* 2. Concrete School Entrance Steps */}
                <div
                  style={toPercent(12, -6)}
                  className="absolute -translate-x-1/2 -translate-y-1/2 w-4 h-2.5 rounded bg-slate-400 border border-slate-200 text-[6px] text-slate-950 font-black flex items-center justify-center shadow"
                  title="School Entrance"
                >
                  DOOR
                </div>

                {/* 3. Center Four Square Court (with 4 distinct quadrant tiles) */}
                <div
                  style={toPercent(0, 0)}
                  className="absolute -translate-x-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 rounded-sm border-2 border-white bg-slate-950 grid grid-cols-2 grid-rows-2 shadow-2xl"
                  title="Four Square Court"
                >
                  {/* Square 2 (Yellow) */}
                  <div className="bg-[#eab308] border-r border-b border-white flex items-center justify-center text-[7px] font-black text-slate-950">
                    2
                  </div>
                  {/* Square 3 (Green) */}
                  <div className="bg-[#22c55e] border-b border-white flex items-center justify-center text-[7px] font-black text-slate-950">
                    3
                  </div>
                  {/* Square 1 (Red King) */}
                  <div className="bg-[#ef4444] border-r border-white flex items-center justify-center text-[7px] font-black text-white">
                    1👑
                  </div>
                  {/* Square 4 (Blue) */}
                  <div className="bg-[#0284c7] flex items-center justify-center text-[7px] font-black text-white">
                    4
                  </div>
                </div>

                {/* 4. Realistic Red Funnel Ball Stand */}
                <div
                  style={toPercent(-7.5, 3.5)}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer group/funnel"
                  title="Red Funnel Ball Stand"
                >
                  <div className="w-4 h-4 rounded-full bg-red-600 border border-yellow-300 flex items-center justify-center shadow-lg">
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-300" />
                  </div>
                  <span className="text-[6px] font-black text-red-400 mt-0.5 leading-none">FUNNEL</span>
                </div>

                {/* 5. Realistic Basketball Hoop */}
                <div
                  style={toPercent(-6.0, -10.0)}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                  title="Basketball Hoop"
                >
                  <div className="w-3 h-1 bg-white border border-slate-900 rounded-[1px] flex items-center justify-center">
                    <div className="w-1 h-0.5 bg-red-500" />
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full border border-orange-500 bg-orange-400/40 -mt-0.5" />
                </div>

                {/* 6. Realistic Blue Hatchback Car with Luggage */}
                <div
                  style={toPercent(venue.carParkPosition[0], venue.carParkPosition[2])}
                  className="absolute -translate-x-1/2 -translate-y-1/2 w-6 h-3.5 rounded bg-blue-600 border border-cyan-300 shadow-xl flex items-center justify-center"
                  title="Your Road Trip Car"
                >
                  <div className="w-3 h-1.5 rounded bg-amber-700 border border-amber-900" />
                </div>

                {/* 7. Wooden Benches & Bleachers */}
                <div
                  style={toPercent(-5.0, -7.0)}
                  className="absolute -translate-x-1/2 -translate-y-1/2 w-4 h-1.5 rounded-sm bg-amber-800 border border-amber-950 shadow-sm"
                  title="Wooden Sideline Bench"
                />

                {/* 8. Trees (Green Foliage Canopies) */}
                <div
                  style={toPercent(-14, -12)}
                  className="absolute -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-emerald-700 border border-emerald-900 shadow-md flex items-center justify-center"
                  title="Pine Tree"
                >
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                <div
                  style={toPercent(-12, 14)}
                  className="absolute -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-emerald-700 border border-emerald-900 shadow-md flex items-center justify-center"
                  title="Pine Tree"
                >
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>

                {/* 9. Sign-In Board */}
                <div
                  style={toPercent(venue.signBoardPosition[0], venue.signBoardPosition[2])}
                  className="absolute -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-sm bg-amber-400 border border-slate-950 flex items-center justify-center text-[7px] font-black text-slate-950 shadow"
                  title="Campus Sign-In Board"
                >
                  📌
                </div>

                {/* 10. NPC Classmates (Colored Characters) */}
                {venue.npcs.map((npc) => (
                  <div
                    key={npc.id}
                    style={toPercent(npc.position[0], npc.position[2])}
                    className="absolute -translate-x-1/2 -translate-y-1/2 group/npc cursor-pointer z-15"
                  >
                    <div className="w-3 h-3 rounded-full bg-emerald-400 border border-white shadow-[0_0_8px_rgba(52,211,153,0.9)] flex items-center justify-center text-[6px] font-black text-slate-950">
                      {npc.name[0]}
                    </div>
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 rounded-lg bg-slate-950 text-emerald-300 text-[8px] font-bold whitespace-nowrap opacity-0 group-hover/npc:opacity-100 pointer-events-none transition-opacity border border-emerald-500/40 shadow-xl z-20">
                      {npc.name} ({npc.role})
                    </div>
                  </div>
                ))}

                {/* 11. Active Player Avatar Marker (with Directional Vision Cone) */}
                <div
                  style={toPercent(px, pz)}
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none"
                >
                  {/* Glowing Forward Indicator */}
                  <div className="w-4 h-4 rounded-full bg-cyan-400 border-2 border-white shadow-[0_0_12px_rgba(34,211,238,1)] flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
