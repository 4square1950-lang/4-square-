import React, { useRef, useState } from 'react';
import {
  Play,
  Footprints,
  Users,
  Trophy,
  GraduationCap,
  ListOrdered,
  Gem,
  Settings as SettingsIcon,
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
  Video,
  VideoOff,
  Accessibility,
  Eye,
  Sliders,
  Volume2,
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
  isMenuVideoDisabled?: boolean;
  onToggleDisableMenuVideo?: () => void;
}

export type MenuNavKey =
  | 'PROFILE'
  | 'SETTINGS'
  | 'PLAY_NOW'
  | 'ROSTERS'
  | 'CAMPAIGN'
  | 'TOURNAMENTS'
  | 'TUTORIAL'
  | 'ONLINE_MULTIPLAYER'
  | 'LOCAL_MULTIPLAYER'
  | 'STANDINGS_STATS'
  | 'SHOP_STORE'
  | 'CHARACTER_CUSTOMIZATION'
  | 'VENUES_ARENAS'
  | 'CREDITS_CREDIBILITY';

interface NavOption {
  id: MenuNavKey;
  label: string;
  subtitle: string;
  category: string;
  description: string;
  badge?: string;
  tagline: string;
  action: () => void;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  crestShieldText: string;
  crestEmoji: string;
}

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
  isMenuVideoDisabled = false,
  onToggleDisableMenuVideo,
}) => {
  // Navigation options array with Profile placed directly above Settings near bottom
  const menuOptions: NavOption[] = [
    {
      id: 'PLAY_NOW',
      label: 'PLAY NOW',
      subtitle: 'PLAY NOW',
      category: 'INSTANT SCHOOLYARD KICKOFF',
      description: 'Instant schoolyard kickoff match with full 4-square rules and contenders.',
      tagline: 'Instant Schoolyard Kickoff',
      badge: 'POPULAR',
      action: onPlayNow,
      icon: Play,
      accentColor: '#3b82f6',
      crestShieldText: 'PLAY NOW',
      crestEmoji: '⚡',
    },
    {
      id: 'ROSTERS',
      label: 'PLAYERS',
      subtitle: 'PLAYERS',
      category: '16 CONTENDERS • COIN BOOSTS',
      description: 'Inspect 16 unique contenders, view stats, and boost your athlete attributes.',
      tagline: 'Meet the Contenders & Boost Stats',
      action: onMeetPlayers,
      icon: Users,
      accentColor: '#8b5cf6',
      crestShieldText: 'PLAYERS',
      crestEmoji: '👥',
    },
    {
      id: 'CAMPAIGN',
      label: 'CAMPAIGN',
      subtitle: 'CAMPAIGN',
      category: 'SCHOOL CAMPUS EXPLORATION',
      description: 'Arrive by road trip car, explore school hallways, talk to students & challenge courts!',
      tagline: 'Enter Campus Tour',
      badge: 'FEATURED',
      action: onCampaignMode,
      icon: Footprints,
      accentColor: '#38bdf8',
      crestShieldText: 'CAMPAIGN',
      crestEmoji: '🏫',
    },
    {
      id: 'TOURNAMENTS',
      label: 'TOURNAMENTS',
      subtitle: 'TOURNAMENTS',
      category: 'FULL PAGE 8-PLAYER SHOWDOWN',
      description: 'Automatic federation venues, 8-player bracket showdown, and 250 coins grand prize!',
      tagline: 'Enter Championship Bracket • 250 Coins Prize',
      badge: '250 COINS',
      action: onTournament,
      icon: Trophy,
      accentColor: '#eab308',
      crestShieldText: 'TOURNAMENTS',
      crestEmoji: '🏆',
    },
    {
      id: 'TUTORIAL',
      label: 'TUTORIAL',
      subtitle: 'TUTORIAL',
      category: 'RULES & KNOWLEDGE QUIZZES',
      description: 'Classroom lessons, Four Square trivia quizzes, coin prizes & referee tips!',
      tagline: 'Enter Classroom',
      action: onTutorial,
      icon: GraduationCap,
      accentColor: '#10b981',
      crestShieldText: 'TUTORIAL',
      crestEmoji: '🎓',
    },
    {
      id: 'ONLINE_MULTIPLAYER',
      label: 'ONLINE NOW',
      subtitle: 'ONLINE NOW',
      category: 'ONLINE MULTIPLAYER & LOCAL PASS & PLAY',
      description: 'Challenge players nationwide over WebSockets or play same-device 4-player couch Pass & Play!',
      tagline: 'Online Matchmaking & Local Pass & Play',
      badge: 'LIVE',
      action: onOnlineMatch,
      icon: Globe,
      accentColor: '#06b6d4',
      crestShieldText: 'ONLINE NOW',
      crestEmoji: '🌐',
    },
    {
      id: 'STANDINGS_STATS',
      label: 'STANDINGS & STATS',
      subtitle: 'STANDINGS & STATS',
      category: 'INDIVIDUAL PLAYER RANKINGS',
      description: 'Contender rankings, individual stats, win rates, crown streaks, and smash speeds.',
      tagline: 'Contender Rankings & Stats',
      action: onStandings,
      icon: ListOrdered,
      accentColor: '#3b82f6',
      crestShieldText: 'STANDINGS',
      crestEmoji: '📊',
    },
    {
      id: 'SHOP_STORE',
      label: 'SHOP',
      subtitle: 'SHOP',
      category: 'LOCKER & EQUIPMENT PACKS',
      description: 'Unlock retro outfits, beast avatars, gold chains, and game boosters with your coins.',
      tagline: 'Unlock Contenders & Boosts',
      action: onLocker,
      icon: Gem,
      accentColor: '#f97316',
      crestShieldText: 'SHOP',
      crestEmoji: '💎',
    },
    {
      id: 'CHARACTER_CUSTOMIZATION',
      label: 'CHARACTER STUDIO',
      subtitle: 'CHARACTER STUDIO',
      category: 'FULL 3D ATHLETE CUSTOMIZER',
      description: 'Creature archetypes, jerseys, number, skin tones, accessories, sunglasses, and attributes.',
      tagline: 'Customize Your Contender',
      action: onCustomizer,
      icon: Sparkles,
      accentColor: '#a855f7',
      crestShieldText: 'STUDIO',
      crestEmoji: '✨',
    },
    {
      id: 'VENUES_ARENAS',
      label: 'VENUES',
      subtitle: 'VENUES',
      category: 'CIRCUIT LOCATIONS',
      description: 'Switch between Blacktop Driveways, Lincoln High Gymnasium, & Championship Stadiums.',
      tagline: `Select Active Arena • Current: ${activeVenue.name}`,
      action: onArenas,
      icon: Compass,
      accentColor: '#14b8a6',
      crestShieldText: 'VENUES',
      crestEmoji: '📍',
    },
    {
      id: 'PROFILE',
      label: 'PROFILE',
      subtitle: 'PROFILE',
      category: 'ATHLETE STATISTICS & FRIENDS',
      description: 'View full athlete stats, followers, friends activity feed, trophy case badges, and win rates.',
      tagline: 'Athlete Profile & Social Feed',
      badge: 'PRO',
      action: () => { if (onOpenProfile) onOpenProfile(); },
      icon: User,
      accentColor: '#3b82f6',
      crestShieldText: 'PROFILE',
      crestEmoji: '👤',
    },
    {
      id: 'SETTINGS',
      label: 'SETTINGS',
      subtitle: 'SETTINGS',
      category: 'AUDIO, VOICE & DISPLAY CONTROLS',
      description: 'Configure sound FX, music tracks, voice commentary, graphic quality, and game preferences.',
      tagline: 'Game Settings & Voice Controls',
      action: onSettings,
      icon: SettingsIcon,
      accentColor: '#6366f1',
      crestShieldText: 'SETTINGS',
      crestEmoji: '⚙️',
    },
    {
      id: 'CREDITS_CREDIBILITY',
      label: 'CREDITS & CREDIBILITY',
      subtitle: 'CREDITS & CREDIBILITY',
      category: 'GAME ARCHITECTURE & RULES',
      description: 'Official rules, game origins, federation history, and creator credibility.',
      tagline: 'Rules & Game Creators',
      action: onCreditsCredibility,
      icon: Award,
      accentColor: '#6366f1',
      crestShieldText: 'CREDITS',
      crestEmoji: '📜',
    },
  ];

  const [selectedId, setSelectedId] = useState<MenuNavKey>('PLAY_NOW');
  const selectedOption = menuOptions.find((o) => o.id === selectedId) || menuOptions[0];
  const lastButtonClickRef = useRef<{ id: MenuNavKey; time: number } | null>(null);
  const lastLaunchTimeRef = useRef<number>(0);

  const launchOption = (opt: NavOption) => {
    const now = performance.now();
    if (now - lastLaunchTimeRef.current < 350) return;
    lastLaunchTimeRef.current = now;
    opt.action();
  };

  return (
    <div className="absolute inset-0 z-30 pointer-events-none flex flex-col justify-between select-none font-sans overflow-hidden text-white">
      {/* Background Subtle Vignette Overlay - Open and Transparent on Right Side to view 3D Match Video */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/25 to-transparent pointer-events-none" />

      {/* ========================================================================= */}
      {/* TOP HEADER: FS27 BRANDING, WALLET & ARENA INFO (CLEAN, NO MIDDLE BUTTON)  */}
      {/* ========================================================================= */}
      <div className="relative z-20 pointer-events-auto flex items-center justify-between px-6 pt-5 pb-3">
        {/* Top Left: Stylized FS27 Logo Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 font-black italic tracking-tighter text-2xl text-white drop-shadow-[0_2px_8px_rgba(255,255,255,0.4)]">
            <span className="text-amber-400">⚡</span>
            <span>FS</span>
            <span className="text-blue-400">27</span>
          </div>

          <button
            onClick={() => {
              soundFX.playClick();
              if (onToggleCommentary) onToggleCommentary();
            }}
            className={`h-9 px-3 rounded-xl border flex items-center gap-2 transition-all cursor-pointer shadow-lg ${
              isCommentaryEnabled
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                : 'bg-slate-900/90 border-slate-700 text-slate-400 hover:text-white'
            }`}
            title={`Voice Commentary: ${isCommentaryEnabled ? 'ON' : 'OFF'}`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span className="hidden xl:inline text-[11px] font-bold uppercase">VOICE {isCommentaryEnabled ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        {/* Top Center: Clean and Unobstructed Area (No floating buttons) */}
        <div className="hidden md:flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-950/60 border border-slate-800 text-slate-300 text-xs font-mono font-bold tracking-widest uppercase shadow">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>3D WORLD ARENA LIVE</span>
        </div>

        {/* Top Right: Wallet & Active Arena Info */}
        <div className="flex items-center gap-3">
          {/* Wallet */}
          <div className="h-10 px-3.5 rounded-xl bg-slate-900/90 border border-amber-500/60 text-amber-300 font-mono text-xs font-black flex items-center gap-2 shadow-lg">
            <FourSquareCoin size={16} animate />
            <span>{coins}</span>
          </div>

          {/* Active Arena */}
          <button
            onClick={() => {
              soundFX.playClick();
              onArenas();
            }}
            className="hidden md:flex h-10 px-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-cyan-500/50 hover:border-cyan-400 text-cyan-300 font-mono text-xs font-bold items-center gap-2 shadow-lg cursor-pointer transition-all"
            title="Change Venue Arena"
          >
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span className="max-w-[110px] truncate">{activeVenue.name}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MIDDLE CONTENT AREA: ALL BUTTONS ON LEFT + CENTER HERO + ENTIRE RIGHT SIDE */}
      {/* ========================================================================= */}
      <div className="relative z-10 pointer-events-auto flex-1 flex flex-col md:flex-row items-center px-4 sm:px-8 py-2 overflow-hidden gap-6">
        {/* ------------------------------------------------------------- */}
        {/* COLUMN 1: ALL BUTTONS LIST ON LEFT (UNIFORM COLOR & STYLING)  */}
        {/* ------------------------------------------------------------- */}
        <div className="w-full md:w-[300px] lg:w-[340px] h-full max-h-[76vh] shrink-0 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 space-y-1.5 pr-2">
          {menuOptions.map((opt) => {
            const isSelected = opt.id === selectedId;
            return (
              <button
                key={opt.id}
                onClick={() => {
                  soundFX.playClick();
                  const now = performance.now();
                  const prev = lastButtonClickRef.current;
                  if (prev && prev.id === opt.id && now - prev.time < 420) {
                    lastButtonClickRef.current = null;
                    setSelectedId(opt.id);
                    launchOption(opt);
                    return;
                  }
                  lastButtonClickRef.current = { id: opt.id, time: now };
                  setSelectedId(opt.id);
                }}
                onDoubleClick={() => {
                  soundFX.playClick();
                  setSelectedId(opt.id);
                  launchOption(opt);
                }}
                className={`w-full text-left px-4 py-3 rounded-2xl transition-all cursor-pointer flex items-center justify-between group border ${
                  isSelected
                    ? 'bg-white/25 text-white font-black backdrop-blur-md shadow-xl border-l-8 border-l-amber-400 border-y-white/40 border-r-white/30 translate-x-1.5'
                    : 'bg-slate-950/60 hover:bg-white/15 text-slate-200 hover:text-white border-slate-800/90 font-extrabold shadow-md'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <opt.icon className={`w-4 h-4 ${isSelected ? 'text-amber-400' : 'text-slate-400 group-hover:text-white'}`} />
                  <span
                    className={`text-sm sm:text-base tracking-wider uppercase font-black transition-colors ${
                      isSelected ? 'text-white drop-shadow-[0_2px_8px_rgba(255,255,255,0.5)]' : 'text-slate-200 group-hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </span>
                </div>

                {opt.badge && (
                  <span
                    className={`text-[9px] font-mono px-2.5 py-0.5 rounded-full font-black uppercase tracking-tight shrink-0 ${
                      isSelected ? 'bg-amber-400 text-slate-950 shadow' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {opt.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* COLUMN 2: CENTER HERO CARD                                     */}
        {/* ------------------------------------------------------------- */}
        <div className="flex-1 flex flex-col justify-center px-2 sm:px-8 py-4 max-w-2xl">
          {/* FC Geometric Triangle Monogram Logo Icon */}
          <div className="mb-3">
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full text-white/90 drop-shadow-[0_4px_12px_rgba(255,255,255,0.4)]">
                <polygon
                  points="10,15 90,15 50,90"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeLinejoin="round"
                />
                <polygon
                  points="25,25 75,25 50,70"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinejoin="round"
                />
                <text
                  x="50"
                  y="46"
                  textAnchor="middle"
                  fill="currentColor"
                  fontSize="20"
                  fontFamily="sans-serif"
                  fontWeight="900"
                  fontStyle="italic"
                >
                  FS
                </text>
              </svg>
            </div>
          </div>

          {/* Subtitle / Mode Title */}
          <div className="space-y-2">
            <h2 className="text-3xl sm:text-5xl font-black italic uppercase tracking-tight text-white drop-shadow-[0_3px_15px_rgba(0,0,0,0.8)]">
              {selectedOption.subtitle}
            </h2>

            {/* Tagline */}
            <p className="text-sm sm:text-base font-bold text-emerald-400 drop-shadow">
              {selectedOption.description}
            </p>
          </div>

          {/* Enter Action Button (Clean, no X badge) */}
          <div className="mt-6 flex items-center gap-4">
            <button
              onClick={() => {
                soundFX.playClick();
                launchOption(selectedOption);
              }}
              onDoubleClick={() => {
                soundFX.playClick();
                launchOption(selectedOption);
              }}
              className="px-7 py-3 rounded-2xl bg-white/95 hover:bg-white text-slate-950 font-black text-sm uppercase tracking-wider shadow-[0_10px_25px_rgba(255,255,255,0.4)] flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 border-2 border-white whitespace-nowrap shrink-0"
            >
              <span className="text-slate-950 font-black tracking-tight text-base">Enter</span>
            </button>

            <span className="text-xs font-mono font-bold text-slate-300 hidden sm:inline">
              Double click any menu button or click Enter to open
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BOTTOM BRANDING STRIP: FS 27 LOGO & MUSIC CONTROLS                       */}
      {/* ========================================================================= */}
      <div className="relative z-20 pointer-events-auto flex items-center justify-between px-8 py-3 bg-gradient-to-t from-black/90 via-black/70 to-transparent">
        {/* Left: Empty spacing to keep logo centered */}
        <div className="w-24 hidden sm:block" />

        {/* Center: FS SPORTS LOGO ("FS27") */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-950 border-2 border-white/80 flex flex-col items-center justify-center text-[7px] font-black tracking-tighter text-white shadow-xl">
            <span className="leading-none">FS</span>
            <span className="text-[6px] text-amber-400 leading-none">SPORTS</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black italic tracking-tighter text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.4)]">
            FS<span className="text-blue-400">27</span>
          </div>
        </div>

        {/* Right: Audio Player Mini Bar */}
        <div className="flex items-center gap-3 bg-slate-950/90 border border-slate-800 px-3.5 py-1.5 rounded-xl shadow-xl">
          <button
            onClick={onToggleMusic}
            className="p-1 hover:text-amber-400 transition-colors cursor-pointer text-slate-300"
            title={isPlayingMusic ? 'Pause Music' : 'Play Music'}
          >
            {isPlayingMusic ? <Pause className="w-4 h-4 text-amber-400" /> : <PlayIcon className="w-4 h-4 fill-white" />}
          </button>
          <span className="max-w-[100px] truncate text-xs font-sans font-bold text-amber-300 hidden sm:inline">
            {currentTrackName}
          </span>
          <button
            onClick={onNextTrack}
            className="p-1 hover:text-amber-400 transition-colors cursor-pointer text-slate-300"
            title="Next Track"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};


