import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Trophy,
  Play,
  Pause,
  Crown,
  Sparkles,
  ArrowDown,
  Award,
  Flame,
} from 'lucide-react';
import { CHARACTERS, CharacterDef } from '../utils/characters';
import { soundFX } from '../services/soundEffects';

import diveSaveImg from '../assets/images/foursquare_dive_save_1793935467586.jpg';
import trophyImg from '../assets/images/foursquare_trophy_celebration_1793935469726.jpg';
import pointCelebImg from '../assets/images/foursquare_point_celebration_1793935468632.jpg';
import aerialSlamImg from '../assets/images/foursquare_aerial_slam_1793935468740.jpg';
import streetActionImg from '../assets/images/foursquare_street_action_1790205795362.jpg';
import finalsArenaImg from '../assets/images/foursquare_finals_arena_1790205818716.jpg';
import rooftopImg from '../assets/images/foursquare_rooftop_urban_1790205828882.jpg';
import goldenLegendImg from '../assets/images/golden_legend_1790126756080.jpg';

interface CreditsCredibilityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface CreditEntry {
  id: number;
  role: string;
  name: string;
  category: string;
  character: CharacterDef;
  highlight: string;
  notes: string;
  gameplayAction: string;
  gameplaySnapshot: string;
  actionTag: string;
  venueName: string;
}

// 8 Distinct Authentic Gameplay Instances (diving for the ball, celebrating points, celebrating trophy, aerial slam)
const SNAPSHOT_ROTATION = [
  {
    image: diveSaveImg,
    action: 'Diving Boundary Chalk Save',
    tag: 'DIVE SAVE',
    venue: 'Oakridge Schoolyard Court 4',
  },
  {
    image: trophyImg,
    action: 'World Championship Trophy Celebration',
    tag: 'TROPHY CELEBRATION',
    venue: 'World Grand Finals Arena Podiums',
  },
  {
    image: pointCelebImg,
    action: 'King Ouster Point Celebration',
    tag: 'POINT CELEBRATION',
    venue: 'Asphalt Blacktop Stadium',
  },
  {
    image: aerialSlamImg,
    action: 'Mid-Air Topspin Spike Smash',
    tag: 'AERIAL SLAM',
    venue: 'Varsity Courtyard Quad 1',
  },
  {
    image: streetActionImg,
    action: 'Side-Line Cross Court Save',
    tag: 'STREET SAVE',
    venue: 'Sunset Park Asphalt League',
  },
  {
    image: finalsArenaImg,
    action: 'Stadium Crowd Championship Matchpoint',
    tag: 'CHAMPIONSHIP POINT',
    venue: 'Metropolis Indoor Arena',
  },
  {
    image: rooftopImg,
    action: 'Rooftop Edge Diving Recover',
    tag: 'EDGE RECOVERY',
    venue: 'Downtown Skydeck Court',
  },
  {
    image: goldenLegendImg,
    action: 'Golden King Victory Stand',
    tag: 'VICTORY HOLD',
    venue: 'Federation Hall of Fame Courtyard',
  },
];

// Map 16 Characters to official Credits & Credibility roles and still gameplay snapshots
export const CREDITS_DATA: CreditEntry[] = CHARACTERS.map((char, index) => {
  const roles = [
    'Lead Game Designer & Founder',
    '3D Character Sculptor & Animator',
    'Physics & Court Mechanics Lead',
    'World Audio & Soundtrack Producer',
    'World Federation Rules Commissioner',
    'Campaign Level & World Architect',
    'Tournament Bracket Programmer',
    'Lead UI/UX & Motion Designer',
    'AI Opponent Behavior Specialist',
    'Match Statistics & Analytics Lead',
    'Lighting & Court Material Specialist',
    'Schoolyard Lore & Script Supervisor',
    'Referee Call & Fair Play Director',
    'Sound Effects & Arena Foley Artist',
    'Character Outfits & Shop Stylist',
    'Executive Producer & Federation King',
  ];

  const snap = SNAPSHOT_ROTATION[index % SNAPSHOT_ROTATION.length];

  return {
    id: index + 1,
    role: roles[index % roles.length],
    name: char.name.toUpperCase(),
    category: index < 4 ? 'FOUNDERS & DIRECTORS' : index < 10 ? 'CORE DEVELOPMENT TEAM' : 'FEDERATION HALL OF FAME',
    character: char,
    highlight: `${char.speciesType} • ${char.title}`,
    notes: char.description,
    gameplayAction: snap.action,
    gameplaySnapshot: snap.image,
    actionTag: snap.tag,
    venueName: snap.venue,
  };
});

export const CreditsCredibilityModal: React.FC<CreditsCredibilityModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const activeCredit = CREDITS_DATA[currentIndex] || CREDITS_DATA[0];

  // Auto-scroll downward smoothly
  useEffect(() => {
    if (!isOpen || !isAutoScrolling || !scrollContainerRef.current) return;
    const scrollEl = scrollContainerRef.current;
    let animId: number;

    const scrollStep = () => {
      if (scrollEl) {
        scrollEl.scrollTop += 0.75;
        // If reached bottom, loop smoothly back to top
        if (scrollEl.scrollTop >= scrollEl.scrollHeight - scrollEl.clientHeight - 4) {
          scrollEl.scrollTop = 0;
        }
      }
      animId = requestAnimationFrame(scrollStep);
    };

    animId = requestAnimationFrame(scrollStep);
    return () => cancelAnimationFrame(animId);
  }, [isOpen, isAutoScrolling]);

  const handleNext = () => {
    soundFX.playClick();
    setCurrentIndex((prev) => (prev + 1) % CREDITS_DATA.length);
  };

  const handlePrev = () => {
    soundFX.playClick();
    setCurrentIndex((prev) => (prev - 1 + CREDITS_DATA.length) % CREDITS_DATA.length);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen bg-black flex flex-col select-none animate-in fade-in duration-200 overflow-hidden font-sans text-slate-100">
      {/* ========================================================================= */}
      {/* PREVIOUS AND NEXT BUTTONS ON LEFT AND RIGHT SIDES OF THE ENTIRE SECTION */}
      {/* ========================================================================= */}
      <button
        onClick={handlePrev}
        className="fixed left-4 top-1/2 -translate-y-1/2 z-50 p-4 rounded-2xl bg-slate-900/90 hover:bg-sky-500 text-sky-400 hover:text-slate-950 border border-sky-500/40 shadow-[0_0_30px_rgba(56,189,248,0.4)] transition-all cursor-pointer hover:scale-110 active:scale-95 group backdrop-blur-md"
        title="Previous Character & Role (Left Arrow)"
        aria-label="Previous Credit"
      >
        <ChevronLeft className="w-8 h-8 transition-transform group-hover:-translate-x-1" />
        <span className="sr-only">Previous</span>
      </button>

      <button
        onClick={handleNext}
        className="fixed right-4 top-1/2 -translate-y-1/2 z-50 p-4 rounded-2xl bg-slate-900/90 hover:bg-sky-500 text-sky-400 hover:text-slate-950 border border-sky-500/40 shadow-[0_0_30px_rgba(56,189,248,0.4)] transition-all cursor-pointer hover:scale-110 active:scale-95 group backdrop-blur-md"
        title="Next Character & Role (Right Arrow)"
        aria-label="Next Credit"
      >
        <ChevronRight className="w-8 h-8 transition-transform group-hover:translate-x-1" />
        <span className="sr-only">Next</span>
      </button>

      {/* Top Bar Header */}
      <div className="h-16 px-6 bg-black/90 border-b border-sky-900/40 flex items-center justify-between z-30 shrink-0 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-500 text-slate-950 flex items-center justify-center font-black shadow-[0_0_20px_rgba(56,189,248,0.5)]">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono tracking-widest uppercase text-sky-400 font-black">
              FOUR SQUARE WORLD FEDERATION • OFFICIAL HALL OF FAME
            </span>
            <h1 className="text-base sm:text-lg font-black text-white tracking-wider">
              CREDITS & CREDIBILITY
            </h1>
          </div>
        </div>

        {/* Center Auto-Scroll Status Indicator & Play/Pause */}
        <div className="flex items-center gap-3 bg-slate-950 px-4 py-1.5 rounded-full border border-slate-800">
          <button
            onClick={() => setIsAutoScrolling(!isAutoScrolling)}
            className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
              isAutoScrolling
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                : 'text-slate-400 hover:text-white bg-slate-900'
            }`}
          >
            {isAutoScrolling ? <Pause className="w-3.5 h-3.5 text-sky-400" /> : <Play className="w-3.5 h-3.5" />}
            <span className="font-mono text-[11px] uppercase tracking-wider">
              {isAutoScrolling ? 'Auto-Scrolling Down' : 'Scroll Paused'}
            </span>
          </button>

          <div className="w-px h-4 bg-slate-800" />

          <span className="font-mono text-xs font-black text-sky-300 min-w-[70px] text-center">
            {currentIndex + 1} / {CREDITS_DATA.length}
          </span>
        </div>

        {/* Right Close Button */}
        <button
          onClick={() => {
            soundFX.playClick();
            onClose();
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-lg"
        >
          <X className="w-4 h-4" />
          <span>Close</span>
        </button>
      </div>

      {/* Main Screen Layout: Left Auto-Scrolling Credits Text + Right Real Still Gameplay Snapshot */}
      <div className="flex-1 flex flex-col md:flex-row h-[calc(100vh-4rem)] overflow-hidden">
        {/* LEFT SIDE: Auto-Scrolling Downward Clean Credits Text */}
        <div
          ref={scrollContainerRef}
          onMouseEnter={() => setIsAutoScrolling(false)}
          onMouseLeave={() => setIsAutoScrolling(true)}
          className="w-full md:w-1/2 h-full bg-black flex flex-col p-6 sm:p-12 overflow-y-auto scrollbar-none scroll-smooth relative"
        >
          {/* Top Auto-Scroll Hint */}
          <div className="text-center py-4 mb-4 border-b border-slate-900">
            <span className="text-[10px] font-mono tracking-widest uppercase text-sky-400 flex items-center justify-center gap-1.5 font-bold">
              <ArrowDown className="w-3 h-3 animate-bounce" />
              CREDITS SCROLL DOWN AUTOMATICALLY • HOVER TO PAUSE
            </span>
          </div>

          <div className="space-y-12 max-w-xl mx-auto w-full py-8">
            {/* Active Character Credit Focal Presentation */}
            <div className="space-y-4 py-6 border-b border-sky-900/40 text-center">
              <span className="text-xs font-mono font-black tracking-widest text-sky-400 uppercase">
                {activeCredit.category}
              </span>
              <div className="font-mono text-sm sm:text-base tracking-widest text-sky-300 font-bold uppercase">
                {activeCredit.role}
              </div>
              <div className="font-black text-3xl sm:text-5xl text-white tracking-widest uppercase drop-shadow-[0_2px_15px_rgba(56,189,248,0.4)]">
                {activeCredit.name}
              </div>
              <div className="text-xs font-mono text-slate-400 tracking-wider">
                {activeCredit.highlight}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans max-w-md mx-auto pt-2 italic">
                "{activeCredit.notes}"
              </p>
            </div>

            {/* Continuous Flowing Credits List */}
            <div className="space-y-6 text-center font-mono py-6">
              {CREDITS_DATA.map((entry, idx) => {
                const isCurrent = idx === currentIndex;
                return (
                  <div
                    key={entry.id}
                    onClick={() => {
                      soundFX.playClick();
                      setCurrentIndex(idx);
                    }}
                    className={`py-3 transition-all cursor-pointer group ${
                      isCurrent
                        ? 'text-sky-300 font-black scale-105'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="text-[11px] text-sky-400/90 tracking-widest uppercase mb-1 font-bold">
                      {entry.role}
                    </div>
                    <div className="text-lg sm:text-2xl font-black uppercase text-white tracking-wider group-hover:text-sky-300 transition-colors">
                      {entry.name}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono tracking-wider mt-0.5">
                      {entry.highlight}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* End of Credits Federation Seal */}
            <div className="text-center pt-12 pb-24 space-y-3">
              <div className="w-12 h-12 rounded-full border border-sky-500/60 mx-auto flex items-center justify-center text-sky-400 font-black text-xl">
                4S
              </div>
              <div className="text-xs font-mono tracking-widest text-sky-300 uppercase font-black">
                FOUR SQUARE WORLD TOUR FEDERATION
              </div>
              <p className="text-[11px] text-slate-500 font-mono">
                Dedicated to schoolyard legends, asphalt kings, and court contenders worldwide since 1950.
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE: Pure Still Image of Gameplay Instance (No Orbiting, No Rotation, No Pose Changes) */}
        <div className="w-full md:w-1/2 h-full relative bg-slate-950 border-t md:border-t-0 md:border-l border-slate-900 flex flex-col justify-center items-center p-6 sm:p-10 overflow-hidden">
          {/* Ambient Glow Backdrop */}
          <div className="absolute inset-0 bg-radial from-sky-950/20 via-slate-950 to-black pointer-events-none" />

          {/* Featured Still Gameplay Snapshot Frame */}
          <div className="relative z-10 w-full max-w-xl aspect-4/3 rounded-2xl overflow-hidden border-2 border-sky-500/40 shadow-[0_0_50px_rgba(56,189,248,0.25)] bg-slate-900 flex flex-col group">
            {/* Top Snapshot Overlay Bar */}
            <div className="absolute top-0 inset-x-0 p-4 bg-linear-to-b from-black/80 via-black/40 to-transparent z-20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md bg-sky-500 text-slate-950 text-[10px] font-black uppercase font-mono tracking-wider shadow">
                  {activeCredit.actionTag}
                </span>
                <span className="text-xs font-mono font-bold text-white tracking-wide drop-shadow">
                  {activeCredit.venueName}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-sky-300 bg-slate-900/70 px-2.5 py-1 rounded-md border border-sky-500/30">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>MATCH STILL SNAPSHOT</span>
              </div>
            </div>

            {/* Pure Still Image Element (Non-Rotating, Non-Orbiting) */}
            <img
              key={activeCredit.gameplaySnapshot}
              src={activeCredit.gameplaySnapshot}
              alt={activeCredit.gameplayAction}
              className="w-full h-full object-cover transition-opacity duration-300"
            />

            {/* Bottom Caption Overlay */}
            <div className="absolute bottom-0 inset-x-0 p-5 bg-linear-to-t from-black/90 via-black/60 to-transparent z-20 flex items-end justify-between">
              <div>
                <div className="text-xs font-mono font-bold text-sky-400 uppercase tracking-widest">
                  GAMEPLAY MOMENT
                </div>
                <div className="text-lg sm:text-xl font-black text-white uppercase tracking-wide">
                  {activeCredit.gameplayAction}
                </div>
                <div className="text-xs text-slate-300 font-sans mt-0.5">
                  Featuring <span className="font-bold text-white">{activeCredit.name}</span> in live match play
                </div>
              </div>

              {/* Character Avatar Badge */}
              <div
                className="w-12 h-12 rounded-xl border border-sky-400/50 flex items-center justify-center font-black text-base shadow-lg shrink-0"
                style={{
                  backgroundColor: activeCredit.character.colors.primary,
                  color: activeCredit.character.colors.secondary,
                }}
              >
                {activeCredit.character.name.charAt(0)}
              </div>
            </div>
          </div>

          {/* Bottom Card Information */}
          <div className="relative z-10 mt-6 w-full max-w-xl flex items-center justify-between text-xs font-mono text-slate-400 px-2">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              <span>STILL CAPTURE • {activeCredit.character.speciesType}</span>
            </span>
            <span className="text-sky-300 font-bold">
              USE LEFT & RIGHT ARROWS TO NAVIGATE
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
