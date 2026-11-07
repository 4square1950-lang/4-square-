import React, { useState } from 'react';
import {
  X,
  Trophy,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Calendar,
  Filter,
  Check,
  TrendingUp,
  Award,
  Shield,
  Zap,
} from 'lucide-react';
import { CHARACTERS, CharacterDef } from '../utils/characters';
import { soundFX } from '../services/soundEffects';

interface StandingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  progress?: any;
}

type MainTab = 'statistics' | 'standings';
type StatsSubTab = 'Individual Contenders' | 'Kings & Hitters' | 'Defenders & Aces' | 'Cycling Team Stables' | 'Glossary';
type StandingsSubTab = 'Individual Rankings' | 'Cycling Team Branches' | 'Circuit Divisions';

export const StandingsModal: React.FC<StandingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  // Main Top-level View Toggle
  const [mainTab, setMainTab] = useState<MainTab>('statistics');

  // Statistics State
  const [statsSubTab, setStatsSubTab] = useState<StatsSubTab>('Individual Contenders');
  const [statSeason, setStatSeason] = useState('2026-27');
  const [statStage, setStatStage] = useState('Regular Season');
  const [statFranchise, setStatFranchise] = useState('All Contenders');
  const [hittersMetric, setHittersMetric] = useState<'Points' | 'Goals' | 'Assists'>('Points');
  const [defendersMetric, setDefendersMetric] = useState<'GAA' | 'SV %' | 'Shutouts'>('GAA');
  const [defensemenMetric, setDefensemenMetric] = useState<'Points' | 'Goals' | 'Assists'>('Points');
  const [rookiesMetric, setRookiesMetric] = useState<'Points' | 'Goals' | 'Assists'>('Points');
  const [activeLeaderModal, setActiveLeaderModal] = useState<string | null>(null);

  // Standings State
  const [standingsSubTab, setStandingsSubTab] = useState<StandingsSubTab>('Individual Rankings');
  const [standingsSeason, setStandingsSeason] = useState('2026-27');
  const [dateIndex, setDateIndex] = useState(4); // "Nov 5"

  const DATES = ['Nov 1', 'Nov 2', 'Nov 3', 'Nov 4', 'Nov 5', 'Nov 6', 'Nov 7'];

  if (!isOpen) return null;

  // Individual Contender Standings with Cycling-Style Team Stable Branches
  const INDIVIDUAL_CONTENDERS = [
    { rank: 1, name: 'Toby "Patch"', teamBranch: 'Oakridge Squad', kingHolds: 40, pts: 142, wins: 18, losses: 3, winPct: '.857', streak: 'W6', smashMph: 48, avatar: '👦', color: '#2563eb' },
    { rank: 2, name: 'Blocky', teamBranch: 'Kanata Stables', kingHolds: 29, pts: 118, wins: 15, losses: 5, winPct: '.750', streak: 'W3', smashMph: 44, avatar: '🟩', color: '#16a34a' },
    { rank: 3, name: 'Skater Roxy', teamBranch: 'Sunset Contenders', kingHolds: 28, pts: 112, wins: 14, losses: 6, winPct: '.700', streak: 'W2', smashMph: 46, avatar: '🛼', color: '#dc2626' },
    { rank: 4, name: 'Fang Wolf', teamBranch: 'Apex Racers Branch', kingHolds: 27, pts: 106, wins: 13, losses: 6, winPct: '.684', streak: 'L1', smashMph: 52, avatar: '🐺', color: '#9333ea' },
    { rank: 5, name: 'Gloop Slime King', teamBranch: 'Kanata Stables', kingHolds: 26, pts: 98, wins: 12, losses: 7, winPct: '.632', streak: 'W1', smashMph: 42, avatar: '🟢', color: '#059669' },
    { rank: 6, name: 'Astro Nova', teamBranch: 'Metro Aces Team', kingHolds: 26, pts: 95, wins: 12, losses: 8, winPct: '.600', streak: 'W1', smashMph: 47, avatar: '🚀', color: '#0284c7' },
    { rank: 7, name: 'Ren', teamBranch: 'Oakridge Squad', kingHolds: 22, pts: 84, wins: 10, losses: 8, winPct: '.556', streak: 'L2', smashMph: 45, avatar: '⚡', color: '#eab308' },
    { rank: 8, name: 'Shinobi Zephyr', teamBranch: 'Apex Racers Branch', kingHolds: 22, pts: 82, wins: 10, losses: 9, winPct: '.526', streak: 'W1', smashMph: 50, avatar: '🥷', color: '#06b6d4' },
    { rank: 9, name: 'Arcade Pete', teamBranch: 'Metro Aces Team', kingHolds: 22, pts: 79, wins: 9, losses: 9, winPct: '.500', streak: 'L1', smashMph: 43, avatar: '🕹️', color: '#4f46e5' },
    { rank: 10, name: 'Magma Rex', teamBranch: 'Sunset Contenders', kingHolds: 22, pts: 76, wins: 9, losses: 10, winPct: '.474', streak: 'L3', smashMph: 55, avatar: '🌋', color: '#ea580c' },
  ];

  // Cycling-style Team Stables (Individual points rolling up under team branches)
  const CYCLING_TEAM_STABLES = [
    { rank: 1, teamName: 'Oakridge Squad', riders: ['Toby "Patch"', 'Ren', 'Kai', 'Maya'], totalPts: 310, leader: 'Toby "Patch" (142 PTS)', color: '#2563eb', crest: '🦅' },
    { rank: 2, teamName: 'Kanata Stables', riders: ['Blocky', 'Gloop Slime King', 'Titus', 'Lulu'], totalPts: 275, leader: 'Blocky (118 PTS)', color: '#16a34a', crest: '☘️' },
    { rank: 3, teamName: 'Sunset Contenders', riders: ['Skater Roxy', 'Magma Rex', 'Sasha', 'Leo'], totalPts: 248, leader: 'Skater Roxy (112 PTS)', color: '#dc2626', crest: '🌅' },
    { rank: 4, teamName: 'Apex Racers Branch', riders: ['Fang Wolf', 'Shinobi Zephyr', 'Viper', 'Drake'], totalPts: 235, leader: 'Fang Wolf (106 PTS)', color: '#9333ea', crest: '⚡' },
    { rank: 5, teamName: 'Metro Aces Team', riders: ['Astro Nova', 'Arcade Pete', 'Zane', 'Chloe'], totalPts: 220, leader: 'Astro Nova (95 PTS)', color: '#0284c7', crest: '👑' },
  ];

  // Circuit Division Teams (For Circuit Divisions sub-tab)
  const TEAMS = [
    { rank: 1, name: 'Oakridge Bruins Stable', crest: '🦅', gp: 16, w: 11, l: 4, ot: 1, pts: 23, pPct: '.719', rw: 8, row: 10, gf: 58, ga: 38, diff: '+20', home: '7-1-0', away: '4-3-1', so: '1-0', l10: '7-2-1', strk: 'W2' },
    { rank: 2, name: 'Kanata Stables', crest: '☘️', gp: 15, w: 9, l: 3, ot: 3, pts: 21, pPct: '.700', rw: 6, row: 7, gf: 52, ga: 47, diff: '+5', home: '4-2-2', away: '5-1-1', so: '2-0', l10: '7-1-2', strk: 'OT1' },
    { rank: 3, name: 'Ottawa Senators Stables', crest: '🏛️', gp: 17, w: 10, l: 6, ot: 1, pts: 21, pPct: '.618', rw: 8, row: 8, gf: 54, ga: 52, diff: '+2', home: '5-2-0', away: '5-4-1', so: '2-0', l10: '5-4-1', strk: 'W1' },
    { rank: 4, name: 'Tampa Bay Lightning Stables', crest: '⚡', gp: 14, w: 9, l: 3, ot: 2, pts: 20, pPct: '.714', rw: 8, row: 9, gf: 52, ga: 45, diff: '+7', home: '7-0-0', away: '2-3-2', so: '0-1', l10: '6-2-2', strk: 'W1' },
    { rank: 5, name: 'Florida Panthers Stables', crest: '🐆', gp: 16, w: 9, l: 5, ot: 2, pts: 20, pPct: '.625', rw: 7, row: 9, gf: 52, ga: 47, diff: '+5', home: '4-2-0', away: '5-3-2', so: '0-0', l10: '7-3-0', strk: 'W1' },
    { rank: 6, name: 'Toronto Maple Leafs Stables', crest: '🍁', gp: 17, w: 8, l: 7, ot: 2, pts: 18, pPct: '.529', rw: 7, row: 8, gf: 62, ga: 56, diff: '+6', home: '4-4-1', away: '4-3-1', so: '0-1', l10: '5-4-1', strk: 'L1' },
    { rank: 7, name: 'Buffalo Sabres Stables', crest: '🦬', gp: 15, w: 7, l: 5, ot: 3, pts: 17, pPct: '.567', rw: 5, row: 7, gf: 44, ga: 51, diff: '-7', home: '3-4-0', away: '4-1-3', so: '0-1', l10: '5-2-3', strk: 'L1' },
    { rank: 8, name: 'Detroit Red Wings Stables', crest: '🛞', gp: 16, w: 7, l: 6, ot: 3, pts: 17, pPct: '.531', rw: 5, row: 5, gf: 48, ga: 50, diff: '-2', home: '4-4-1', away: '3-2-2', so: '2-2', l10: '6-3-1', strk: 'L1' },
    { rank: 9, name: 'Carolina Hurricanes Stables', crest: '🌀', gp: 17, w: 12, l: 3, ot: 2, pts: 26, pPct: '.765', rw: 11, row: 12, gf: 64, ga: 40, diff: '+24', home: '5-1-1', away: '7-2-1', so: '0-1', l10: '7-2-1', strk: 'L1' },
    { rank: 10, name: 'New Jersey Devils Stables', crest: '😈', gp: 15, w: 10, l: 5, ot: 0, pts: 20, pPct: '.667', rw: 7, row: 9, gf: 52, ga: 43, diff: '+9', home: '7-2-0', away: '3-3-0', so: '1-0', l10: '8-2-0', strk: 'W2' },
    { rank: 11, name: 'New York Rangers Stables', crest: '🗽', gp: 16, w: 8, l: 7, ot: 1, pts: 17, pPct: '.531', rw: 8, row: 8, gf: 48, ga: 47, diff: '+1', home: '7-2-0', away: '1-5-1', so: '0-0', l10: '4-5-1', strk: 'W1' },
  ];

  // Helper calculations for 4 quadrants in Statistics
  const getLeaderData = (category: string, metric: string) => {
    const list = [...CHARACTERS].map((char, index) => {
      let statVal = 0;
      let displayVal = '';

      if (category === 'hitters') {
        if (metric === 'Points') {
          statVal = Math.round(40 - index * 1.8);
          displayVal = `${statVal}`;
        } else if (metric === 'Goals') {
          statVal = Math.round(22 - index * 1.1);
          displayVal = `${statVal}`;
        } else {
          statVal = Math.round(18 - index * 0.9);
          displayVal = `${statVal}`;
        }
      } else if (category === 'defenders') {
        if (metric === 'GAA') {
          statVal = 1.33 + index * 0.12;
          displayVal = statVal.toFixed(2);
        } else if (metric === 'SV %') {
          statVal = 94.2 - index * 0.8;
          displayVal = `.${Math.round(statVal * 10)}`;
        } else {
          statVal = Math.max(1, Math.round(5 - index * 0.3));
          displayVal = `${statVal}`;
        }
      } else if (category === 'defensemen') {
        if (metric === 'Points') {
          statVal = Math.round(28 - index * 1.4);
          displayVal = `${statVal}`;
        } else if (metric === 'Goals') {
          statVal = Math.round(9 - index * 0.5);
          displayVal = `${statVal}`;
        } else {
          statVal = Math.round(19 - index * 1.0);
          displayVal = `${statVal}`;
        }
      } else {
        // rookies
        if (metric === 'Points') {
          statVal = Math.round(12 - index * 0.6);
          displayVal = `${statVal}`;
        } else if (metric === 'Goals') {
          statVal = Math.round(6 - index * 0.3);
          displayVal = `${statVal}`;
        } else {
          statVal = Math.round(6 - index * 0.3);
          displayVal = `${statVal}`;
        }
      }

      return {
        rank: index === 0 ? '1.' : index === 4 ? 'T5.' : index === 6 ? 'T7.' : `${index + 1}.`,
        name: char.name,
        teamCode: char.homeCourt.substring(0, 3).toUpperCase(),
        number: `#${index * 7 + 1}`,
        pos: category === 'defenders' ? 'G' : category === 'defensemen' ? 'D' : 'C',
        val: displayVal,
        character: char,
      };
    });

    return list;
  };

  const hittersList = getLeaderData('hitters', hittersMetric);
  const defendersList = getLeaderData('defenders', defendersMetric);
  const defensemenList = getLeaderData('defensemen', defensemenMetric);
  const rookiesList = getLeaderData('rookies', rookiesMetric);

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen bg-slate-950 text-slate-100 flex flex-col select-none overflow-hidden font-sans">
      {/* Black Theme Top Main Navigation Bar with Toggle between Statistics and Standings */}
      <div className="h-16 px-6 sm:px-10 border-b border-slate-800 bg-slate-900 flex items-center justify-between shrink-0 shadow-xl z-30">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shadow-md">
              <Trophy className="w-5 h-5" />
            </div>
            <span className="font-mono text-xs font-black tracking-widest text-blue-400 uppercase">
              INDIVIDUAL CONTENDERS & CYCLING SQUAD STABLES
            </span>
          </div>

          <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => {
                soundFX.playClick();
                setMainTab('statistics');
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                mainTab === 'statistics'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Individual Statistics
            </button>
            <button
              onClick={() => {
                soundFX.playClick();
                setMainTab('standings');
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                mainTab === 'standings'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Circuit Standings
            </button>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={() => {
            soundFX.playClick();
            onClose();
          }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-linear-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-lg border border-blue-400/30"
        >
          <X className="w-4 h-4" />
          <span>Close Window</span>
        </button>
      </div>

      {/* Main View Area */}
      <div className="flex-1 overflow-y-auto bg-white p-6 sm:p-10">
        {/* ========================================================================= */}
        {/* VIEW 1: STATISTICS (Exact replica of Reference Image 1) */}
        {/* ========================================================================= */}
        {mainTab === 'statistics' && (
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Title */}
            <h1 className="text-4xl sm:text-5xl font-black text-black tracking-tight">
              Statistics
            </h1>

            {/* Sub-Tabs: Home, Skaters/Kings & Hitters, Goalies/Defenders, Teams, Glossary */}
            <div className="flex items-center gap-8 border-b border-slate-200 text-sm font-bold text-slate-500">
              {(['Home', 'Kings & Hitters', 'Defenders & Aces', 'Teams', 'Glossary'] as StatsSubTab[]).map((tab) => {
                const isActive = statsSubTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => {
                      soundFX.playClick();
                      setStatsSubTab(tab);
                    }}
                    className={`pb-3 font-semibold transition-colors cursor-pointer relative ${
                      isActive ? 'text-black font-black' : 'hover:text-black'
                    }`}
                  >
                    {tab}
                    {isActive && (
                      <span className="absolute bottom-0 inset-x-0 h-1 bg-black rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Filter Bar with Dropdowns and Get Stats Button */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <div className="relative">
                <select
                  value={statSeason}
                  onChange={(e) => setStatSeason(e.target.value)}
                  className="appearance-none pl-4 pr-10 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-800 shadow-xs hover:border-slate-400 focus:outline-none cursor-pointer"
                >
                  <option value="2026-27">2026-27</option>
                  <option value="2025-26">2025-26</option>
                  <option value="2024-25">2024-25</option>
                  <option value="All-Time">All-Time Circuit</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <div className="relative">
                <select
                  value={statStage}
                  onChange={(e) => setStatStage(e.target.value)}
                  className="appearance-none pl-4 pr-10 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-800 shadow-xs hover:border-slate-400 focus:outline-none cursor-pointer"
                >
                  <option value="Regular Season">Regular Season</option>
                  <option value="Playoffs">Playoffs</option>
                  <option value="Grand Finals">Grand Finals</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <div className="relative">
                <select
                  value={statFranchise}
                  onChange={(e) => setStatFranchise(e.target.value)}
                  className="appearance-none pl-4 pr-10 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-800 shadow-xs hover:border-slate-400 focus:outline-none cursor-pointer"
                >
                  <option value="All Franchises">All Franchises</option>
                  <option value="Boston Bruins Quad">Boston Bruins Quad</option>
                  <option value="Montreal Four Aces">Montreal Four Aces</option>
                  <option value="Carolina Storm Courts">Carolina Storm Courts</option>
                  <option value="New York Asphalt Rangers">New York Asphalt Rangers</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <button
                onClick={() => {
                  soundFX.playClick();
                }}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-colors cursor-pointer border border-slate-200 shadow-xs"
              >
                Get Stats
              </button>
            </div>

            {/* 4 Quadrants Grid Matching Reference Image 1 Exactly */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-10 pt-4">
              {/* QUADRANT 1: Skaters / Hitters */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setActiveLeaderModal('Hitters Leaders')}
                    className="flex items-center gap-1.5 text-2xl font-black text-black hover:text-blue-600 transition-colors cursor-pointer"
                  >
                    <span>Skaters</span>
                    <ChevronRight className="w-6 h-6 stroke-[3]" />
                  </button>
                </div>

                {/* Subcategory Pills: Points, Goals, Assists */}
                <div className="flex items-center gap-6 border-b border-slate-200 text-xs font-bold text-slate-500 pb-2">
                  {(['Points', 'Goals', 'Assists'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => {
                        soundFX.playClick();
                        setHittersMetric(m);
                      }}
                      className={`pb-1 font-bold cursor-pointer relative ${
                        hittersMetric === m ? 'text-black font-black' : 'hover:text-black'
                      }`}
                    >
                      {m}
                      {hittersMetric === m && (
                        <span className="absolute bottom-0 inset-x-0 h-0.5 bg-black" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Content: Featured Cutout Left + Ranked 1-10 List Right with #1 in Blue Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-start pt-2">
                  {/* Left Featured Cutout */}
                  <div className="sm:col-span-5 flex flex-col items-center text-center">
                    <div
                      className="w-32 h-32 rounded-full flex items-center justify-center text-5xl font-black shadow-md border-4 border-slate-100 overflow-hidden relative"
                      style={{ backgroundColor: hittersList[0].character.colors.primary }}
                    >
                      <span className="drop-shadow-md">{hittersList[0].character.isHuman ? '👦' : '⚡'}</span>
                    </div>

                    <div className="mt-3">
                      <div className="text-xl font-black text-black leading-tight">
                        {hittersList[0].name}
                      </div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5 flex items-center justify-center gap-1.5">
                        <span className="w-3.5 h-3.5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-black">
                          4
                        </span>
                        <span>{hittersList[0].teamCode} • {hittersList[0].number} • {hittersList[0].pos}</span>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
                        {hittersMetric.toUpperCase()}
                      </div>
                      <div className="text-6xl font-black text-black tracking-tight mt-0.5">
                        {hittersList[0].val}
                      </div>
                    </div>
                  </div>

                  {/* Right Top-10 Leaderboard */}
                  <div className="sm:col-span-7 space-y-1 text-sm font-medium">
                    {hittersList.slice(0, 10).map((player, idx) => {
                      if (idx === 0) {
                        return (
                          <div
                            key={player.name}
                            className="bg-blue-600 text-white rounded-md px-3.5 py-1.5 flex items-center justify-between font-bold shadow-sm"
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-5 font-mono">{player.rank}</span>
                              <span className="truncate max-w-[150px]">{player.name}</span>
                            </div>
                            <span className="font-mono font-black">{player.val}</span>
                          </div>
                        );
                      }
                      return (
                        <div
                          key={player.name}
                          className="px-3.5 py-1.5 flex items-center justify-between hover:bg-slate-50 rounded-md transition-colors"
                        >
                          <div className="flex items-center gap-3 text-slate-700">
                            <span className="w-5 font-mono text-slate-400">{player.rank}</span>
                            <span className="truncate max-w-[150px] font-semibold">{player.name}</span>
                          </div>
                          <span className="font-mono font-bold text-slate-900">{player.val}</span>
                        </div>
                      );
                    })}

                    <div className="pt-2 text-right">
                      <button
                        onClick={() => {
                          soundFX.playClick();
                          setActiveLeaderModal('Skaters Leaders');
                        }}
                        className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                      >
                        All Leaders
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* QUADRANT 2: Goalies / Defenders */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setActiveLeaderModal('Goalies Leaders')}
                    className="flex items-center gap-1.5 text-2xl font-black text-black hover:text-blue-600 transition-colors cursor-pointer"
                  >
                    <span>Goalies</span>
                    <ChevronRight className="w-6 h-6 stroke-[3]" />
                  </button>
                  <span className="text-xs text-slate-500 font-medium">
                    (played for 5 or more games)
                  </span>
                </div>

                {/* Subcategory Pills: GAA, SV %, Shutouts */}
                <div className="flex items-center gap-6 border-b border-slate-200 text-xs font-bold text-slate-500 pb-2">
                  {(['GAA', 'SV %', 'Shutouts'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => {
                        soundFX.playClick();
                        setDefendersMetric(m);
                      }}
                      className={`pb-1 font-bold cursor-pointer relative ${
                        defendersMetric === m ? 'text-black font-black' : 'hover:text-black'
                      }`}
                    >
                      {m}
                      {defendersMetric === m && (
                        <span className="absolute bottom-0 inset-x-0 h-0.5 bg-black" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Content: Featured Cutout Left + Ranked 1-10 List Right with #1 in Blue Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-start pt-2">
                  {/* Left Featured Cutout */}
                  <div className="sm:col-span-5 flex flex-col items-center text-center">
                    <div
                      className="w-32 h-32 rounded-full flex items-center justify-center text-5xl font-black shadow-md border-4 border-slate-100 overflow-hidden relative"
                      style={{ backgroundColor: defendersList[0].character.colors.primary }}
                    >
                      <span className="drop-shadow-md">{defendersList[0].character.isHuman ? '👦' : '🛡️'}</span>
                    </div>

                    <div className="mt-3">
                      <div className="text-xl font-black text-black leading-tight">
                        {defendersList[0].name}
                      </div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5 flex items-center justify-center gap-1.5">
                        <span className="w-3.5 h-3.5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-black">
                          🛡️
                        </span>
                        <span>{defendersList[0].teamCode} • {defendersList[0].number} • {defendersList[0].pos}</span>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
                        {defendersMetric}
                      </div>
                      <div className="text-6xl font-black text-black tracking-tight mt-0.5">
                        {defendersList[0].val}
                      </div>
                    </div>
                  </div>

                  {/* Right Top-10 Leaderboard */}
                  <div className="sm:col-span-7 space-y-1 text-sm font-medium">
                    {defendersList.slice(0, 10).map((player, idx) => {
                      if (idx === 0) {
                        return (
                          <div
                            key={player.name}
                            className="bg-blue-600 text-white rounded-md px-3.5 py-1.5 flex items-center justify-between font-bold shadow-sm"
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-5 font-mono">{player.rank}</span>
                              <span className="truncate max-w-[150px]">{player.name}</span>
                            </div>
                            <span className="font-mono font-black">{player.val}</span>
                          </div>
                        );
                      }
                      return (
                        <div
                          key={player.name}
                          className="px-3.5 py-1.5 flex items-center justify-between hover:bg-slate-50 rounded-md transition-colors"
                        >
                          <div className="flex items-center gap-3 text-slate-700">
                            <span className="w-5 font-mono text-slate-400">{player.rank}</span>
                            <span className="truncate max-w-[150px] font-semibold">{player.name}</span>
                          </div>
                          <span className="font-mono font-bold text-slate-900">{player.val}</span>
                        </div>
                      );
                    })}

                    <div className="pt-2 text-right">
                      <button
                        onClick={() => {
                          soundFX.playClick();
                          setActiveLeaderModal('Goalies Leaders');
                        }}
                        className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                      >
                        All Leaders
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* QUADRANT 3: Defensemen */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setActiveLeaderModal('Defensemen Leaders')}
                    className="flex items-center gap-1.5 text-2xl font-black text-black hover:text-blue-600 transition-colors cursor-pointer"
                  >
                    <span>Defensemen</span>
                    <ChevronRight className="w-6 h-6 stroke-[3]" />
                  </button>
                </div>

                {/* Subcategory Pills: Points, Goals, Assists */}
                <div className="flex items-center gap-6 border-b border-slate-200 text-xs font-bold text-slate-500 pb-2">
                  {(['Points', 'Goals', 'Assists'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => {
                        soundFX.playClick();
                        setDefensemenMetric(m);
                      }}
                      className={`pb-1 font-bold cursor-pointer relative ${
                        defensemenMetric === m ? 'text-black font-black' : 'hover:text-black'
                      }`}
                    >
                      {m}
                      {defensemenMetric === m && (
                        <span className="absolute bottom-0 inset-x-0 h-0.5 bg-black" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Content */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-start pt-2">
                  <div className="sm:col-span-5 flex flex-col items-center text-center">
                    <div
                      className="w-32 h-32 rounded-full flex items-center justify-center text-5xl font-black shadow-md border-4 border-slate-100 overflow-hidden relative"
                      style={{ backgroundColor: defensemenList[0].character.colors.primary }}
                    >
                      <span className="drop-shadow-md">🛡️</span>
                    </div>

                    <div className="mt-3">
                      <div className="text-xl font-black text-black leading-tight">
                        {defensemenList[0].name}
                      </div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">
                        {defensemenList[0].teamCode} • {defensemenList[0].number} • D
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
                        {defensemenMetric.toUpperCase()}
                      </div>
                      <div className="text-6xl font-black text-black tracking-tight mt-0.5">
                        {defensemenList[0].val}
                      </div>
                    </div>
                  </div>

                  <div className="sm:col-span-7 space-y-1 text-sm font-medium">
                    {defensemenList.slice(0, 10).map((player, idx) => {
                      if (idx === 0) {
                        return (
                          <div
                            key={player.name}
                            className="bg-blue-600 text-white rounded-md px-3.5 py-1.5 flex items-center justify-between font-bold shadow-sm"
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-5 font-mono">{player.rank}</span>
                              <span className="truncate max-w-[150px]">{player.name}</span>
                            </div>
                            <span className="font-mono font-black">{player.val}</span>
                          </div>
                        );
                      }
                      return (
                        <div
                          key={player.name}
                          className="px-3.5 py-1.5 flex items-center justify-between hover:bg-slate-50 rounded-md transition-colors"
                        >
                          <div className="flex items-center gap-3 text-slate-700">
                            <span className="w-5 font-mono text-slate-400">{player.rank}</span>
                            <span className="truncate max-w-[150px] font-semibold">{player.name}</span>
                          </div>
                          <span className="font-mono font-bold text-slate-900">{player.val}</span>
                        </div>
                      );
                    })}

                    <div className="pt-2 text-right">
                      <button
                        onClick={() => {
                          soundFX.playClick();
                          setActiveLeaderModal('Defensemen Leaders');
                        }}
                        className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                      >
                        All Leaders
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* QUADRANT 4: Rookies */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setActiveLeaderModal('Rookies Leaders')}
                    className="flex items-center gap-1.5 text-2xl font-black text-black hover:text-blue-600 transition-colors cursor-pointer"
                  >
                    <span>Rookies</span>
                    <ChevronRight className="w-6 h-6 stroke-[3]" />
                  </button>
                </div>

                {/* Subcategory Pills: Points, Goals, Assists */}
                <div className="flex items-center gap-6 border-b border-slate-200 text-xs font-bold text-slate-500 pb-2">
                  {(['Points', 'Goals', 'Assists'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => {
                        soundFX.playClick();
                        setRookiesMetric(m);
                      }}
                      className={`pb-1 font-bold cursor-pointer relative ${
                        rookiesMetric === m ? 'text-black font-black' : 'hover:text-black'
                      }`}
                    >
                      {m}
                      {rookiesMetric === m && (
                        <span className="absolute bottom-0 inset-x-0 h-0.5 bg-black" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Content */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-start pt-2">
                  <div className="sm:col-span-5 flex flex-col items-center text-center">
                    <div
                      className="w-32 h-32 rounded-full flex items-center justify-center text-5xl font-black shadow-md border-4 border-slate-100 overflow-hidden relative"
                      style={{ backgroundColor: rookiesList[0].character.colors.primary }}
                    >
                      <span className="drop-shadow-md">✨</span>
                    </div>

                    <div className="mt-3">
                      <div className="text-xl font-black text-black leading-tight">
                        {rookiesList[0].name}
                      </div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">
                        {rookiesList[0].teamCode} • {rookiesList[0].number} • C
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
                        {rookiesMetric.toUpperCase()}
                      </div>
                      <div className="text-6xl font-black text-black tracking-tight mt-0.5">
                        {rookiesList[0].val}
                      </div>
                    </div>
                  </div>

                  <div className="sm:col-span-7 space-y-1 text-sm font-medium">
                    {rookiesList.slice(0, 10).map((player, idx) => {
                      if (idx === 0) {
                        return (
                          <div
                            key={player.name}
                            className="bg-blue-600 text-white rounded-md px-3.5 py-1.5 flex items-center justify-between font-bold shadow-sm"
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-5 font-mono">{player.rank}</span>
                              <span className="truncate max-w-[150px]">{player.name}</span>
                            </div>
                            <span className="font-mono font-black">{player.val}</span>
                          </div>
                        );
                      }
                      return (
                        <div
                          key={player.name}
                          className="px-3.5 py-1.5 flex items-center justify-between hover:bg-slate-50 rounded-md transition-colors"
                        >
                          <div className="flex items-center gap-3 text-slate-700">
                            <span className="w-5 font-mono text-slate-400">{player.rank}</span>
                            <span className="truncate max-w-[150px] font-semibold">{player.name}</span>
                          </div>
                          <span className="font-mono font-bold text-slate-900">{player.val}</span>
                        </div>
                      );
                    })}

                    <div className="pt-2 text-right">
                      <button
                        onClick={() => {
                          soundFX.playClick();
                          setActiveLeaderModal('Rookies Leaders');
                        }}
                        className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                      >
                        All Leaders
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: STANDINGS (Exact replica of Reference Image 2) */}
        {/* ========================================================================= */}
        {mainTab === 'standings' && (
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Filter Bar: Season Selector + Date Navigation */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <select
                  value={standingsSeason}
                  onChange={(e) => setStandingsSeason(e.target.value)}
                  className="appearance-none pl-4 pr-10 py-2 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-800 shadow-xs focus:outline-none cursor-pointer"
                >
                  <option value="2026-27">2026-27</option>
                  <option value="2025-26">2025-26</option>
                  <option value="2024-25">2024-25</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Date Selector with < Nov 5 > Buttons */}
              <div className="flex items-center border border-slate-300 rounded-xl bg-white shadow-xs px-2 py-1 text-sm font-bold text-slate-800">
                <button
                  onClick={() => {
                    soundFX.playClick();
                    setDateIndex((prev) => Math.max(0, prev - 1));
                  }}
                  className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer"
                  title="Previous Date"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 min-w-[70px] text-center">{DATES[dateIndex]}</span>
                <button
                  onClick={() => {
                    soundFX.playClick();
                    setDateIndex((prev) => Math.min(DATES.length - 1, prev + 1));
                  }}
                  className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer"
                  title="Next Date"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
              {/* Sub-Tabs: Individual Rankings, Cycling Team Branches, Circuit Divisions */}
            <div className="flex items-center gap-8 border-b border-slate-200 text-sm font-bold text-slate-500">
              {(['Individual Rankings', 'Cycling Team Branches', 'Circuit Divisions'] as StandingsSubTab[]).map((tab) => {
                const isActive = standingsSubTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => {
                      soundFX.playClick();
                      setStandingsSubTab(tab);
                    }}
                    className={`pb-3 font-semibold transition-colors cursor-pointer relative ${
                      isActive ? 'text-black font-black' : 'hover:text-black'
                    }`}
                  >
                    {tab}
                    {isActive && (
                      <span className="absolute bottom-0 inset-x-0 h-1 bg-black rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Conference Section Title */}
            <div className="space-y-6 pt-2">
              <h2 className="text-2xl font-black text-black">Eastern</h2>

              {/* Section 1: Atlantic Division */}
              <div className="space-y-3">
                <h3 className="text-lg font-black text-slate-800">Atlantic</h3>
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs font-semibold">
                    <thead className="bg-white border-b border-slate-200 text-slate-600 font-bold">
                      <tr>
                        <th className="py-2.5 px-3 text-center w-12">Rank</th>
                        <th className="py-2.5 px-4 min-w-[200px]">Team</th>
                        <th className="py-2.5 px-3 text-center">GP</th>
                        <th className="py-2.5 px-3 text-center">W</th>
                        <th className="py-2.5 px-3 text-center">L</th>
                        <th className="py-2.5 px-3 text-center">OT</th>
                        <th className="py-2.5 px-3 text-center bg-blue-50 text-blue-800 font-black">
                          PTS
                        </th>
                        <th className="py-2.5 px-3 text-center">P%</th>
                        <th className="py-2.5 px-3 text-center">RW</th>
                        <th className="py-2.5 px-3 text-center">ROW</th>
                        <th className="py-2.5 px-3 text-center">GF</th>
                        <th className="py-2.5 px-3 text-center">GA</th>
                        <th className="py-2.5 px-3 text-center">DIFF</th>
                        <th className="py-2.5 px-3 text-center">HOME</th>
                        <th className="py-2.5 px-3 text-center">AWAY</th>
                        <th className="py-2.5 px-3 text-center">S/O</th>
                        <th className="py-2.5 px-3 text-center">L10</th>
                        <th className="py-2.5 px-3 text-center">STRK</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {TEAMS.slice(0, 3).map((team) => (
                        <tr key={team.name} className="hover:bg-slate-50">
                          <td className="py-3 px-3 text-center font-bold text-slate-700">{team.rank}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <span className="text-base">{team.crest}</span>
                              <span className="font-black text-black">{team.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">{team.gp}</td>
                          <td className="py-3 px-3 text-center">{team.w}</td>
                          <td className="py-3 px-3 text-center">{team.l}</td>
                          <td className="py-3 px-3 text-center">{team.ot}</td>
                          <td className="py-3 px-3 text-center bg-blue-50/60 font-black text-blue-900">{team.pts}</td>
                          <td className="py-3 px-3 text-center">{team.pPct}</td>
                          <td className="py-3 px-3 text-center">{team.rw}</td>
                          <td className="py-3 px-3 text-center">{team.row}</td>
                          <td className="py-3 px-3 text-center">{team.gf}</td>
                          <td className="py-3 px-3 text-center">{team.ga}</td>
                          <td className={`py-3 px-3 text-center font-bold ${team.diff.startsWith('+') ? 'text-emerald-600' : 'text-red-500'}`}>{team.diff}</td>
                          <td className="py-3 px-3 text-center">{team.home}</td>
                          <td className="py-3 px-3 text-center">{team.away}</td>
                          <td className="py-3 px-3 text-center">{team.so}</td>
                          <td className="py-3 px-3 text-center">{team.l10}</td>
                          <td className="py-3 px-3 text-center font-bold">{team.strk}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 2: Metropolitan Division */}
              <div className="space-y-3">
                <h3 className="text-lg font-black text-slate-800">Metropolitan</h3>
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs font-semibold">
                    <thead className="bg-white border-b border-slate-200 text-slate-600 font-bold">
                      <tr>
                        <th className="py-2.5 px-3 text-center w-12">Rank</th>
                        <th className="py-2.5 px-4 min-w-[200px]">Team</th>
                        <th className="py-2.5 px-3 text-center">GP</th>
                        <th className="py-2.5 px-3 text-center">W</th>
                        <th className="py-2.5 px-3 text-center">L</th>
                        <th className="py-2.5 px-3 text-center">OT</th>
                        <th className="py-2.5 px-3 text-center bg-blue-50 text-blue-800 font-black">
                          PTS
                        </th>
                        <th className="py-2.5 px-3 text-center">P%</th>
                        <th className="py-2.5 px-3 text-center">RW</th>
                        <th className="py-2.5 px-3 text-center">ROW</th>
                        <th className="py-2.5 px-3 text-center">GF</th>
                        <th className="py-2.5 px-3 text-center">GA</th>
                        <th className="py-2.5 px-3 text-center">DIFF</th>
                        <th className="py-2.5 px-3 text-center">HOME</th>
                        <th className="py-2.5 px-3 text-center">AWAY</th>
                        <th className="py-2.5 px-3 text-center">S/O</th>
                        <th className="py-2.5 px-3 text-center">L10</th>
                        <th className="py-2.5 px-3 text-center">STRK</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {TEAMS.slice(8, 11).map((team) => (
                        <tr key={team.name} className="hover:bg-slate-50">
                          <td className="py-3 px-3 text-center font-bold text-slate-700">{team.rank}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <span className="text-base">{team.crest}</span>
                              <span className="font-black text-black">{team.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">{team.gp}</td>
                          <td className="py-3 px-3 text-center">{team.w}</td>
                          <td className="py-3 px-3 text-center">{team.l}</td>
                          <td className="py-3 px-3 text-center">{team.ot}</td>
                          <td className="py-3 px-3 text-center bg-blue-50/60 font-black text-blue-900">{team.pts}</td>
                          <td className="py-3 px-3 text-center">{team.pPct}</td>
                          <td className="py-3 px-3 text-center">{team.rw}</td>
                          <td className="py-3 px-3 text-center">{team.row}</td>
                          <td className="py-3 px-3 text-center">{team.gf}</td>
                          <td className="py-3 px-3 text-center">{team.ga}</td>
                          <td className={`py-3 px-3 text-center font-bold ${team.diff.startsWith('+') ? 'text-emerald-600' : 'text-red-500'}`}>{team.diff}</td>
                          <td className="py-3 px-3 text-center">{team.home}</td>
                          <td className="py-3 px-3 text-center">{team.away}</td>
                          <td className="py-3 px-3 text-center">{team.so}</td>
                          <td className="py-3 px-3 text-center">{team.l10}</td>
                          <td className="py-3 px-3 text-center font-bold">{team.strk}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 3: Wild Card (Showing Playoff Qualifying Cutoff Line) */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-slate-800">Wild Card</h3>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                    Top 2 Seeds Qualify for Championship Playoffs
                  </span>
                </div>
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs font-semibold">
                    <thead className="bg-white border-b border-slate-200 text-slate-600 font-bold">
                      <tr>
                        <th className="py-2.5 px-3 text-center w-12">Rank</th>
                        <th className="py-2.5 px-4 min-w-[200px]">Team</th>
                        <th className="py-2.5 px-3 text-center">GP</th>
                        <th className="py-2.5 px-3 text-center">W</th>
                        <th className="py-2.5 px-3 text-center">L</th>
                        <th className="py-2.5 px-3 text-center">OT</th>
                        <th className="py-2.5 px-3 text-center bg-blue-50 text-blue-800 font-black">
                          PTS
                        </th>
                        <th className="py-2.5 px-3 text-center">P%</th>
                        <th className="py-2.5 px-3 text-center">RW</th>
                        <th className="py-2.5 px-3 text-center">ROW</th>
                        <th className="py-2.5 px-3 text-center">GF</th>
                        <th className="py-2.5 px-3 text-center">GA</th>
                        <th className="py-2.5 px-3 text-center">DIFF</th>
                        <th className="py-2.5 px-3 text-center">HOME</th>
                        <th className="py-2.5 px-3 text-center">AWAY</th>
                        <th className="py-2.5 px-3 text-center">S/O</th>
                        <th className="py-2.5 px-3 text-center">L10</th>
                        <th className="py-2.5 px-3 text-center">STRK</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {/* Wild Card Top 2 (In the Playoffs) */}
                      {TEAMS.slice(3, 5).map((team, idx) => (
                        <tr key={team.name} className="hover:bg-emerald-50/30 bg-emerald-50/10">
                          <td className="py-3 px-3 text-center font-bold text-slate-700">{idx + 1}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <span className="text-base">{team.crest}</span>
                              <span className="font-black text-black">{team.name}</span>
                              <span className="text-[10px] bg-emerald-600 text-white font-black px-1.5 py-0.5 rounded">
                                PLAYOFFS
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">{team.gp}</td>
                          <td className="py-3 px-3 text-center">{team.w}</td>
                          <td className="py-3 px-3 text-center">{team.l}</td>
                          <td className="py-3 px-3 text-center">{team.ot}</td>
                          <td className="py-3 px-3 text-center bg-blue-50/60 font-black text-blue-900">{team.pts}</td>
                          <td className="py-3 px-3 text-center">{team.pPct}</td>
                          <td className="py-3 px-3 text-center">{team.rw}</td>
                          <td className="py-3 px-3 text-center">{team.row}</td>
                          <td className="py-3 px-3 text-center">{team.gf}</td>
                          <td className="py-3 px-3 text-center">{team.ga}</td>
                          <td className={`py-3 px-3 text-center font-bold ${team.diff.startsWith('+') ? 'text-emerald-600' : 'text-red-500'}`}>{team.diff}</td>
                          <td className="py-3 px-3 text-center">{team.home}</td>
                          <td className="py-3 px-3 text-center">{team.away}</td>
                          <td className="py-3 px-3 text-center">{team.so}</td>
                          <td className="py-3 px-3 text-center">{team.l10}</td>
                          <td className="py-3 px-3 text-center font-bold">{team.strk}</td>
                        </tr>
                      ))}

                      {/* PLAYOFF CUTOFF DIVIDER LINE */}
                      <tr className="bg-red-50 border-y-2 border-red-500">
                        <td colSpan={18} className="py-1 px-4 text-center">
                          <span className="text-[10px] font-mono font-black text-red-600 uppercase tracking-widest">
                            ----------------- PLAYOFF CUTOFF LINE (TOP SEEDS ADVANCE TO TOURNAMENT FINALS) -----------------
                          </span>
                        </td>
                      </tr>

                      {/* Wild Card Teams below the cutoff line */}
                      {TEAMS.slice(5, 8).map((team, idx) => (
                        <tr key={team.name} className="hover:bg-slate-50 text-slate-600">
                          <td className="py-3 px-3 text-center font-bold">{idx + 3}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <span className="text-base">{team.crest}</span>
                              <span className="font-bold text-slate-800">{team.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">{team.gp}</td>
                          <td className="py-3 px-3 text-center">{team.w}</td>
                          <td className="py-3 px-3 text-center">{team.l}</td>
                          <td className="py-3 px-3 text-center">{team.ot}</td>
                          <td className="py-3 px-3 text-center bg-blue-50/30 font-black text-slate-900">{team.pts}</td>
                          <td className="py-3 px-3 text-center">{team.pPct}</td>
                          <td className="py-3 px-3 text-center">{team.rw}</td>
                          <td className="py-3 px-3 text-center">{team.row}</td>
                          <td className="py-3 px-3 text-center">{team.gf}</td>
                          <td className="py-3 px-3 text-center">{team.ga}</td>
                          <td className={`py-3 px-3 text-center font-bold ${team.diff.startsWith('+') ? 'text-emerald-600' : 'text-red-500'}`}>{team.diff}</td>
                          <td className="py-3 px-3 text-center">{team.home}</td>
                          <td className="py-3 px-3 text-center">{team.away}</td>
                          <td className="py-3 px-3 text-center">{team.so}</td>
                          <td className="py-3 px-3 text-center">{team.l10}</td>
                          <td className="py-3 px-3 text-center font-bold">{team.strk}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* "All Leaders" Modal View when clicked */}
      {activeLeaderModal && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-xl font-black text-black">
                {activeLeaderModal} • Full Circuit Roster
              </h3>
              <button
                onClick={() => setActiveLeaderModal(null)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto divide-y divide-slate-100 text-sm">
              {CHARACTERS.map((char, index) => (
                <div key={char.id} className="py-2.5 px-3 flex items-center justify-between hover:bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-slate-400 font-bold w-6">{index + 1}.</span>
                    <span className="font-black text-slate-900">{char.name}</span>
                    <span className="text-xs text-slate-500 font-mono">({char.homeCourt})</span>
                  </div>
                  <span className="font-mono font-black text-blue-600">
                    {Math.round(40 - index * 1.8)} PTS
                  </span>
                </div>
              ))}
            </div>

            <div className="text-right pt-2">
              <button
                onClick={() => setActiveLeaderModal(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
