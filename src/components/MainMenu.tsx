import React, { useState } from 'react';
import {
  Play,
  Footprints,
  Users,
  Trophy,
  GraduationCap,
  ListOrdered,
  Gem,
  Settings as SettingsIcon,
  Palette,
  Pause,
  Play as PlayIcon,
  SkipForward,
  User,
  Compass,
  Sparkles,
  Zap,
  Globe,
  Radio,
  ChevronRight,
  Flame,
  Award,
} from 'lucide-react';
import { VenueDef } from '../types/campaign';
import { FourSquareCoin } from './FourSquareCoin';
import { soundFX } from '../services/soundEffects';

interface MainMenuProps {
  coins: number;
  activeVenue: VenueDef;
  onCampaignMode: () => void;
  onPlayNow: () => void;
  onQuickMatch: () => void;
  onArenas: () => void;
  onOnlineMatch: () => void;
  onTournament: () => void;
  onStandings: () => void;
  onMeetPlayers: () => void;
  onTutorial: () => void;
  onLocker: () => void;
  onCustomizer: () => void;
  onSettings: () => void;
  onCreditsCredibility: () => void;
  onOpenProfile?: () => void;
  isPlayingMusic: boolean;
  onToggleMusic: () => void;
  onNextTrack: () => void;
  currentTrackName: string;
  isCommentaryEnabled?: boolean;
  onToggleCommentary?: () => void;
}

type MainCategory = 'HOME' | 'PLAY' | 'MULTIPLAYER' | 'CHARACTER CUSTOMIZATION';

export const MainMenu: React.FC<MainMenuProps> = ({
  coins,
  activeVenue,
  onCampaignMode,
  onPlayNow,
  onQuickMatch,
  onArenas,
  onOnlineMatch,
  onTournament,
  onStandings,
  onMeetPlayers,
  onTutorial,
  onLocker,
  onCustomizer,
  onSettings,
  onCreditsCredibility,
  onOpenProfile,
  isPlayingMusic,
  onToggleMusic,
  onNextTrack,
  currentTrackName,
  isCommentaryEnabled = false,
  onToggleCommentary,
}) => {
  const [activeTab, setActiveTab] = useState<MainCategory>('HOME');
  const [hoveredTile, setHoveredTile] = useState<string | null>(null);

  const navItems: Array<{ id: MainCategory; label: string }> = [
    { id: 'HOME', label: 'HOME' },
    { id: 'PLAY', label: 'PLAY' },
    { id: 'MULTIPLAYER', label: 'MULTIPLAYER' },
    { id: 'CHARACTER CUSTOMIZATION', label: 'CHARACTER CUSTOMIZATION' },
  ];

  return (
    <div className="absolute inset-0 z-30 pointer-events-none flex flex-col justify-between p-4 sm:p-8 select-none font-sans overflow-hidden text-white">
      {/* Background Subtle Gradient Overlay */}
      <div className="absolute inset-0 bg-linear-to-b from-slate-950/75 via-slate-950/40 to-slate-950/90 pointer-events-none" />

      {/* ========================================================================= */}
      {/* TOP BAR: Navigation Categories & Profile */}
      {/* ========================================================================= */}
      <div className="relative z-10 pointer-events-auto flex items-center justify-between gap-4 flex-wrap">
        {/* Left: 4-Square Logo & Nav Tabs */}
        <div className="flex items-center gap-4 sm:gap-8 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-xl grid grid-cols-2 grid-rows-2 border border-white/20">
              <div className="bg-emerald-500" />
              <div className="bg-amber-400" />
              <div className="bg-rose-500" />
              <div className="bg-blue-600" />
              <div className="absolute inset-0 m-auto w-5 h-5 bg-white rounded-full flex items-center justify-center font-black text-slate-950 text-xs shadow">
                4
              </div>
            </div>
            <div className="font-black italic tracking-tighter text-xl text-white drop-shadow">
              FOUR SQUARE
            </div>
          </div>

          {/* Nav Tabs */}
          <div className="flex items-center gap-1 sm:gap-2 bg-slate-950/90 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-slate-700/60 shadow-xl">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    soundFX.playClick();
                    setActiveTab(item.id);
                    if (item.id === 'MULTIPLAYER') onOnlineMatch();
                    if (item.id === 'CHARACTER CUSTOMIZATION') onCustomizer();
                  }}
                  className={`relative px-4 py-2 rounded-xl text-sm font-black tracking-wider uppercase transition-all cursor-pointer ${
                    isActive
                      ? 'text-white bg-linear-to-r from-blue-600 via-indigo-600 to-blue-700 shadow-md border border-blue-400/40'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Featured Athlete Profile Container, Coins Wallet & Active Venue */}
        <div className="flex items-center gap-3">
          {/* Featured Athlete Profile Card Container */}
          <div
            onClick={() => {
              soundFX.playClick();
              if (onOpenProfile) onOpenProfile();
            }}
            className="h-16 px-5 rounded-2xl bg-linear-to-r from-blue-950/95 via-indigo-950/90 to-slate-900/95 border-2 border-blue-400/80 hover:border-blue-300 shadow-2xl flex items-center gap-3.5 cursor-pointer group hover:scale-[1.02] active:scale-95 transition-all shrink-0"
            title="Open Athlete Profile & Saved Replays"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shadow-md group-hover:scale-110 transition-transform">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                <span>PROFILE</span>
                <span className="text-[10px] font-mono bg-blue-500/30 text-blue-300 px-1.5 py-0.5 rounded border border-blue-400/40">
                  REPLAYS
                </span>
              </div>
              <div className="text-[11px] text-slate-300 font-mono font-medium">
                Stats • Highlights • History
              </div>
            </div>
            <ChevronRight className="w-4.5 h-4.5 text-blue-400 group-hover:translate-x-1 transition-transform ml-1" />
          </div>

          {/* FourSquare Coin Wallet Container Card */}
          <div className="h-16 px-5 rounded-2xl bg-slate-950/95 backdrop-blur-md border-2 border-amber-500/70 text-amber-300 font-mono text-sm font-black shadow-2xl flex items-center gap-3 shrink-0">
            <FourSquareCoin size={22} animate />
            <div className="flex flex-col">
              <span className="text-[10px] text-amber-400/80 font-mono font-bold leading-none">WALLET</span>
              <span className="text-sm font-black text-amber-300">{coins} COINS</span>
            </div>
          </div>

          {/* Active Venue Arena Location Container Card */}
          <div
            onClick={() => {
              soundFX.playClick();
              onArenas();
            }}
            className="hidden xl:flex h-16 px-5 rounded-2xl bg-slate-950/95 hover:bg-slate-900 border-2 border-slate-700/80 hover:border-cyan-400 text-slate-200 font-black shadow-2xl items-center gap-3 cursor-pointer transition-all hover:scale-[1.02] active:scale-95 shrink-0"
          >
            <div className="w-9 h-9 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-500/40 flex items-center justify-center">
              <Compass className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-cyan-400 font-mono font-bold leading-none">ACTIVE ARENA</span>
              <span className="text-sm font-black text-white truncate max-w-[130px]">{activeVenue.name}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MAIN VIEW: DYNAMIC TILE GRID ACCORDING TO ACTIVE TAB */}
      {/* ========================================================================= */}
      <div className="relative z-10 pointer-events-auto my-auto py-4">
        {/* ------------------------------------------------------------- */}
        {/* VIEW 1: HOME & PLAY MODES (Filtered dynamically) */}
        {/* ------------------------------------------------------------- */}
        {(activeTab === 'HOME' || activeTab === 'PLAY') && (
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-4 h-[58vh] max-h-[540px]">
            {/* 1. HERO TILE: Play Now Kickoff Showdown */}
            <div
              onClick={() => {
                soundFX.playClick();
                onPlayNow();
              }}
              onMouseEnter={() => setHoveredTile('kickoff')}
              onMouseLeave={() => setHoveredTile(null)}
              className="md:col-span-4 h-full rounded-3xl overflow-hidden relative border-2 border-blue-500/80 shadow-[0_15px_40px_rgba(37,99,235,0.35)] transition-all duration-200 cursor-pointer group hover:scale-[1.02] hover:border-blue-400 bg-linear-to-b from-blue-950/90 via-slate-950/85 to-black/95 flex flex-col justify-between p-6"
            >
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono font-black tracking-widest uppercase text-blue-400 drop-shadow">
                    INSTANT SCHOOLYARD KICKOFF
                  </span>
                  <h3 className="text-3xl sm:text-4xl font-black italic tracking-tight text-white uppercase drop-shadow-[0_2px_15px_rgba(37,99,235,0.7)] mt-1">
                    PLAY NOW
                  </h3>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black shadow-lg shadow-blue-600/50 group-hover:scale-110 transition-transform">
                  <Play className="w-6 h-6 fill-current" />
                </div>
              </div>

              {/* Middle Matchup Graphics */}
              <div className="relative z-10 my-auto py-4">
                <div className="bg-slate-950/80 backdrop-blur-md rounded-2xl p-4 border border-blue-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-sm shadow">
                      🦅
                    </div>
                    <div>
                      <div className="text-xs font-black text-white">Oakridge Hawks</div>
                      <div className="text-[10px] text-amber-300 font-mono">Rank #1 Contender</div>
                    </div>
                  </div>

                  <span className="text-xs font-mono font-black text-blue-400">VS</span>

                  <div className="flex items-center gap-3 text-right">
                    <div>
                      <div className="text-xs font-black text-white">Metro Aces</div>
                      <div className="text-[10px] text-sky-300 font-mono">Reigning Kings</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow">
                      👑
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom CTA Button */}
              <div className="relative z-10">
                <div className="w-full py-3 px-4 rounded-xl bg-linear-to-r from-blue-600 via-indigo-600 to-blue-700 text-white font-black text-sm uppercase tracking-wider flex items-center justify-between shadow-xl group-hover:brightness-110 transition-all border border-blue-400/30">
                  <span>Kick Off Match</span>
                  <span className="font-mono text-xs bg-black/40 px-2 py-0.5 rounded">↵ Select</span>
                </div>
              </div>
            </div>

            {/* MIDDLE COLUMN: ROSTERS (if HOME) / QUICK MATCH (if PLAY) & TOURNAMENTS */}
            <div className="md:col-span-4 h-full flex flex-col gap-4">
              {activeTab === 'HOME' ? (
                /* Tile 2: ROSTERS (Renamed from ULTIMATE SQUAD) */
                <div
                  onClick={() => {
                    soundFX.playClick();
                    onMeetPlayers();
                  }}
                  onMouseEnter={() => setHoveredTile('squad')}
                  onMouseLeave={() => setHoveredTile(null)}
                  className="flex-1 rounded-3xl overflow-hidden relative border-2 border-indigo-500/70 shadow-lg transition-all duration-200 cursor-pointer group hover:scale-[1.02] hover:border-indigo-400 bg-linear-to-br from-indigo-950/90 via-slate-950/90 to-blue-950/80 p-5 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-mono font-black tracking-widest uppercase text-indigo-400">
                        16 CONTENDERS • COIN BOOSTS
                      </span>
                      <h4 className="text-xl sm:text-2xl font-black italic tracking-tight text-white uppercase mt-0.5">
                        ROSTERS
                      </h4>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow">
                      <Users className="w-4.5 h-4.5" />
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-2 py-1">
                    <div className="w-14 h-20 rounded-xl bg-linear-to-b from-amber-400 to-yellow-600 p-1.5 text-slate-950 flex flex-col justify-between shadow-lg transform -rotate-6">
                      <div className="text-[10px] font-black font-mono leading-none">94<br/><span className="text-[8px]">S</span></div>
                      <div className="text-[10px] text-center">👦</div>
                      <div className="text-[8px] font-black uppercase text-center truncate">PATCH</div>
                    </div>

                    <div className="w-16 h-22 rounded-xl bg-linear-to-b from-blue-400 via-indigo-500 to-blue-700 p-1.5 text-white flex flex-col justify-between shadow-2xl z-10 border border-white/60">
                      <div className="text-xs font-black font-mono leading-none">97<br/><span className="text-[8px]">K</span></div>
                      <div className="text-xs text-center">⚡</div>
                      <div className="text-[9px] font-black uppercase text-center truncate">BOLT</div>
                    </div>

                    <div className="w-14 h-20 rounded-xl bg-linear-to-b from-slate-300 to-slate-500 p-1.5 text-slate-950 flex flex-col justify-between shadow-lg transform rotate-6">
                      <div className="text-[10px] font-black font-mono leading-none">91<br/><span className="text-[8px]">D</span></div>
                      <div className="text-[10px] text-center">🛡️</div>
                      <div className="text-[8px] font-black uppercase text-center truncate">TITAN</div>
                    </div>
                  </div>

                  <div className="text-xs text-indigo-300 font-mono font-bold flex items-center justify-between">
                    <span>Meet the Players & Boost Stats</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ) : (
                /* Tile 2 (PLAY Tab): QUICK MATCH SHOWDOWN */
                <div
                  onClick={() => {
                    soundFX.playClick();
                    onQuickMatch();
                  }}
                  onMouseEnter={() => setHoveredTile('quickmatch')}
                  onMouseLeave={() => setHoveredTile(null)}
                  className="flex-1 rounded-3xl overflow-hidden relative border-2 border-cyan-500/70 shadow-lg transition-all duration-200 cursor-pointer group hover:scale-[1.02] hover:border-cyan-400 bg-linear-to-br from-cyan-950/90 via-slate-950/90 to-blue-950/80 p-5 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-mono font-black tracking-widest uppercase text-cyan-400">
                        INSTANT SHUTOUT RALLY
                      </span>
                      <h4 className="text-xl sm:text-2xl font-black italic tracking-tight text-white uppercase mt-0.5">
                        QUICK MATCH
                      </h4>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-cyan-500 text-slate-950 flex items-center justify-center shadow font-black">
                      <Zap className="w-4.5 h-4.5 fill-current" />
                    </div>
                  </div>

                  <div className="text-xs text-slate-300 font-medium">
                    Jump straight into a 5-point King of the Court rally with randomized contenders.
                  </div>

                  <div className="text-xs text-cyan-300 font-mono font-bold flex items-center justify-between">
                    <span>Instant Kickoff</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              )}

              {/* Tile 3: TOURNAMENTS */}
              <div
                onClick={() => {
                  soundFX.playClick();
                  onTournament();
                }}
                onMouseEnter={() => setHoveredTile('tournament')}
                onMouseLeave={() => setHoveredTile(null)}
                className="flex-1 rounded-3xl overflow-hidden relative border-2 border-amber-500/70 shadow-lg transition-all duration-200 cursor-pointer group hover:scale-[1.02] hover:border-amber-400 bg-linear-to-br from-amber-950/80 via-slate-950/90 to-yellow-950/80 p-5 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-mono font-black tracking-widest uppercase text-amber-400">
                      FULL PAGE 8-PLAYER SHOWDOWN
                    </span>
                    <h4 className="text-xl sm:text-2xl font-black italic tracking-tight text-white uppercase mt-0.5">
                      TOURNAMENTS
                    </h4>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shadow font-black">
                    <Trophy className="w-4.5 h-4.5 fill-current" />
                  </div>
                </div>

                <div className="flex items-center justify-between bg-slate-950/70 px-3.5 py-2 rounded-xl border border-amber-500/30">
                  <span className="text-xs text-slate-300 font-medium">Automatic Federation Venues</span>
                  <span className="text-xs font-mono font-black text-amber-300">250 COINS PRIZE</span>
                </div>

                <div className="text-xs text-amber-300 font-mono font-bold flex items-center justify-between">
                  <span>Enter Championship Bracket</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: CAMPAIGN & TUTORIAL / ARENAS */}
            <div className="md:col-span-4 h-full flex flex-col gap-4">
              {/* Tile 4: CAMPAIGN (Renamed from NEW CAREER) */}
              <div
                onClick={() => {
                  soundFX.playClick();
                  onCampaignMode();
                }}
                onMouseEnter={() => setHoveredTile('career')}
                onMouseLeave={() => setHoveredTile(null)}
                className="flex-1 rounded-3xl overflow-hidden relative border-2 border-blue-500/70 shadow-lg transition-all duration-200 cursor-pointer group hover:scale-[1.02] hover:border-blue-400 bg-linear-to-br from-blue-950/80 via-slate-950/90 to-indigo-950/80 p-5 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-mono font-black tracking-widest uppercase text-blue-400">
                      SCHOOL CAMPUS EXPLORATION
                    </span>
                    <h4 className="text-xl sm:text-2xl font-black italic tracking-tight text-white uppercase mt-0.5">
                      CAMPAIGN
                    </h4>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow font-black">
                    <Footprints className="w-4.5 h-4.5" />
                  </div>
                </div>

                <div className="text-xs text-slate-300 font-medium">
                  Arrive by road trip car, explore school hallways, talk to students & challenge courts!
                </div>

                <div className="text-xs text-blue-300 font-mono font-bold flex items-center justify-between">
                  <span>Enter Campus Tour</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {activeTab === 'HOME' ? (
                /* Tile 5: TUTORIAL (Renamed from SKILL GAMES) */
                <div
                  onClick={() => {
                    soundFX.playClick();
                    onTutorial();
                  }}
                  onMouseEnter={() => setHoveredTile('skills')}
                  onMouseLeave={() => setHoveredTile(null)}
                  className="flex-1 rounded-3xl overflow-hidden relative border-2 border-indigo-500/70 shadow-lg transition-all duration-200 cursor-pointer group hover:scale-[1.02] hover:border-indigo-400 bg-linear-to-br from-indigo-950/80 via-slate-950/90 to-slate-900/80 p-5 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-mono font-black tracking-widest uppercase text-indigo-300">
                        RULES & KNOWLEDGE QUIZZES
                      </span>
                      <h4 className="text-xl sm:text-2xl font-black italic tracking-tight text-white uppercase mt-0.5">
                        TUTORIAL
                      </h4>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow font-black">
                      <GraduationCap className="w-4.5 h-4.5" />
                    </div>
                  </div>

                  <div className="text-xs text-slate-300 font-medium">
                    Classroom lessons, Four Square trivia quizzes, coin prizes & referee tips!
                  </div>

                  <div className="text-xs text-indigo-300 font-mono font-bold flex items-center justify-between">
                    <span>Enter Classroom</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ) : (
                /* Tile 5 (PLAY Tab): VENUES & ARENAS SELECTOR */
                <div
                  onClick={() => {
                    soundFX.playClick();
                    onArenas();
                  }}
                  onMouseEnter={() => setHoveredTile('arenas')}
                  onMouseLeave={() => setHoveredTile(null)}
                  className="flex-1 rounded-3xl overflow-hidden relative border-2 border-emerald-500/70 shadow-lg transition-all duration-200 cursor-pointer group hover:scale-[1.02] hover:border-emerald-400 bg-linear-to-br from-emerald-950/80 via-slate-950/90 to-teal-950/80 p-5 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-mono font-black tracking-widest uppercase text-emerald-400">
                        CIRCUIT LOCATIONS
                      </span>
                      <h4 className="text-xl sm:text-2xl font-black italic tracking-tight text-white uppercase mt-0.5">
                        VENUES & ARENAS
                      </h4>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow font-black">
                      <Compass className="w-4.5 h-4.5" />
                    </div>
                  </div>

                  <div className="text-xs text-slate-300 font-medium">
                    Switch between Blacktop Driveways, Lincoln High Gymnasium, & Championship Stadiums.
                  </div>

                  <div className="text-xs text-emerald-300 font-mono font-bold flex items-center justify-between">
                    <span>Select Active Arena</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 2: MULTIPLAYER TAB VIEW */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'MULTIPLAYER' && (
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 h-[50vh] max-h-[480px]">
            <div
              onClick={() => {
                soundFX.playClick();
                onOnlineMatch();
              }}
              className="rounded-3xl border-2 border-blue-500/80 bg-slate-950/90 backdrop-blur-md p-8 flex flex-col justify-between shadow-2xl hover:border-blue-400 cursor-pointer transition-all group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono font-black text-blue-400 uppercase tracking-widest">
                    GLOBAL LOBBY MATCHMAKING
                  </span>
                  <h3 className="text-3xl font-black italic text-white uppercase mt-1">
                    ONLINE MULTIPLAYER
                  </h3>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg">
                  <Globe className="w-6 h-6" />
                </div>
              </div>
              <p className="text-sm text-slate-300 font-medium">
                Challenge players nationwide over WebSockets. Join room codes or auto-matchmake on the official Four Square server!
              </p>

              <div className="w-full py-3 px-4 rounded-xl bg-blue-600 text-white font-black text-sm uppercase tracking-wider flex items-center justify-between shadow-lg group-hover:bg-blue-500">
                <span>Find Room / Host Match</span>
                <ChevronRight className="w-5 h-5" />
              </div>
            </div>

            <div
              onClick={() => {
                soundFX.playClick();
                onOnlineMatch();
              }}
              className="rounded-3xl border-2 border-indigo-500/80 bg-slate-950/90 backdrop-blur-md p-8 flex flex-col justify-between shadow-2xl hover:border-indigo-400 cursor-pointer transition-all group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono font-black text-indigo-400 uppercase tracking-widest">
                    SAME DEVICE 4-PLAYER
                  </span>
                  <h3 className="text-3xl font-black italic text-white uppercase mt-1">
                    LOCAL PASS & PLAY
                  </h3>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg">
                  <Users className="w-6 h-6" />
                </div>
              </div>
              <p className="text-sm text-slate-300 font-medium">
                Share standard keyboard controls (WASD, Arrows, Numpad, IJKL) for a 4-player local couch competition!
              </p>

              <div className="w-full py-3 px-4 rounded-xl bg-indigo-600 text-white font-black text-sm uppercase tracking-wider flex items-center justify-between shadow-lg group-hover:bg-indigo-500">
                <span>Start Local Match</span>
                <ChevronRight className="w-5 h-5" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* BOTTOM BAR: DISTINCT FEATURE CONTAINER CARDS (Standings, Shop, Credits) */}
      {/* ========================================================================= */}
      <div className="relative z-10 pointer-events-auto flex items-center justify-between gap-4 flex-wrap pt-2">
        {/* Left: Distinct Feature Container Cards (Not standard tiny buttons!) */}
        <div className="flex items-center gap-4 flex-wrap flex-1">
          {/* Container Card 1: STANDINGS & STATS */}
          <div
            onClick={() => {
              soundFX.playClick();
              onStandings();
            }}
            className="flex-1 min-w-[260px] p-4 rounded-3xl bg-linear-to-br from-blue-950/95 via-slate-950/90 to-indigo-950/95 border-2 border-blue-500/70 hover:border-blue-400 shadow-2xl flex items-center gap-4 cursor-pointer group hover:scale-[1.03] transition-all"
          >
            <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black shadow-lg group-hover:scale-110 transition-transform shrink-0">
              <ListOrdered className="w-6 h-6" />
            </div>
            <div>
              <div className="text-base font-black italic tracking-tight uppercase text-white leading-none">
                STANDINGS & STATS
              </div>
              <div className="text-xs text-blue-300 font-mono mt-1 font-medium">
                Contender Rankings & Stats
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-blue-400 group-hover:translate-x-1 transition-transform ml-auto shrink-0" />
          </div>

          {/* Container Card 2: SHOP & STORE */}
          <div
            onClick={() => {
              soundFX.playClick();
              onLocker();
            }}
            className="flex-1 min-w-[240px] p-4 rounded-3xl bg-linear-to-br from-amber-950/95 via-slate-950/90 to-yellow-950/95 border-2 border-amber-500/70 hover:border-amber-400 shadow-2xl flex items-center gap-4 cursor-pointer group hover:scale-[1.03] transition-all"
          >
            <div className="w-11 h-11 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-lg group-hover:scale-110 transition-transform shrink-0">
              <Gem className="w-6 h-6 fill-current" />
            </div>
            <div>
              <div className="text-base font-black italic tracking-tight uppercase text-white leading-none">
                SHOP & STORE
              </div>
              <div className="text-xs text-amber-300 font-mono mt-1 font-medium">
                Unlock Contenders & Boosts
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-amber-400 group-hover:translate-x-1 transition-transform ml-auto shrink-0" />
          </div>

          {/* Container Card 3: CREDITS & CREDIBILITY */}
          <div
            onClick={() => {
              soundFX.playClick();
              onCreditsCredibility();
            }}
            className="flex-1 min-w-[240px] p-4 rounded-3xl bg-linear-to-br from-indigo-950/95 via-slate-950/90 to-slate-900/95 border-2 border-indigo-500/70 hover:border-indigo-400 shadow-2xl flex items-center gap-4 cursor-pointer group hover:scale-[1.03] transition-all"
          >
            <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-lg group-hover:scale-110 transition-transform shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="text-base font-black italic tracking-tight uppercase text-white leading-none">
                CREDITS & CREDIBILITY
              </div>
              <div className="text-xs text-indigo-300 font-mono mt-1 font-medium">
                Rules & Game Creators
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-indigo-400 group-hover:translate-x-1 transition-transform ml-auto shrink-0" />
          </div>
        </div>

        {/* Right: Audio Control Container (Music & Commentary Switch Container Box) */}
        <div className="flex items-center gap-3 bg-slate-950/95 border-2 border-slate-800 p-2.5 px-4 rounded-3xl shadow-2xl shrink-0">
          {/* Music Radio Bar */}
          <div className="flex items-center gap-2 pr-3 border-r border-slate-800 text-slate-200 font-mono text-xs">
            <button
              onClick={onToggleMusic}
              className="p-1 hover:text-amber-400 transition-colors cursor-pointer"
              title={isPlayingMusic ? 'Pause Music' : 'Play Music'}
            >
              {isPlayingMusic ? <Pause className="w-4 h-4 text-amber-400" /> : <PlayIcon className="w-4 h-4 fill-white" />}
            </button>
            <span className="max-w-[120px] truncate text-xs font-sans font-bold text-amber-300 hidden sm:inline">
              {currentTrackName}
            </span>
            <button
              onClick={onNextTrack}
              className="p-1 hover:text-amber-400 transition-colors cursor-pointer"
              title="Next Track"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Direct Voice Commentary Toggle Switch Container */}
          <button
            onClick={() => {
              soundFX.playClick();
              if (onToggleCommentary) onToggleCommentary();
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-mono text-xs font-black uppercase transition-all cursor-pointer border ${
              isCommentaryEnabled
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/60 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                : 'bg-slate-900 text-slate-400 border-slate-700/80 hover:text-slate-200'
            }`}
            title="Toggle Spoken Referee Calls & Commentary"
          >
            <span>🎙️</span>
            <span>Commentary: {isCommentaryEnabled ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
