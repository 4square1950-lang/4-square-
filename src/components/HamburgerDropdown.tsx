import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Music,
  Settings as SettingsIcon,
  GraduationCap,
  LogOut,
  Camera,
  BookOpen,
  ChevronRight,
  Video,
  Disc,
} from 'lucide-react';
import { soundFX } from '../services/soundEffects';

export type CameraViewMode = 'first_person' | 'third_person' | 'isometric' | 'top_down' | 'action';

interface HamburgerDropdownProps {
  cameraView: CameraViewMode;
  onOpenCameras: () => void;
  onOpenMusic: () => void;
  onOpenSettings: () => void;
  onOpenTutorial?: () => void;
  onOpenRulebook?: () => void;
  onSaveAndExit: () => void;
  onExitMatch?: () => void;
  isMatchMode?: boolean;
  isRecording?: boolean;
  recordingSeconds?: number;
  onToggleRecordGame?: () => void;
}

export const HamburgerDropdown: React.FC<HamburgerDropdownProps> = ({
  cameraView,
  onOpenCameras,
  onOpenMusic,
  onOpenSettings,
  onOpenTutorial,
  onOpenRulebook,
  onSaveAndExit,
  onExitMatch,
  isMatchMode = false,
  isRecording = false,
  recordingSeconds = 0,
  onToggleRecordGame,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener('mousedown', handleOutside);
    }
    return () => window.removeEventListener('mousedown', handleOutside);
  }, [isOpen]);

  const toggleDropdown = () => {
    soundFX.playClick();
    setIsOpen((prev) => !prev);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div ref={dropdownRef} className="relative z-40">
      {/* Main Hamburger Trigger Button */}
      <button
        onClick={toggleDropdown}
        title="Open Circuit System Menu"
        className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shadow-xl transition-all duration-200 cursor-pointer active:scale-95 border-2 ${
          isOpen
            ? 'bg-slate-900 border-amber-400 text-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.5)]'
            : isRecording
            ? 'bg-red-950/90 border-red-500 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.5)]'
            : 'bg-slate-900/95 hover:bg-slate-800 border-slate-700 hover:border-amber-400 text-white shadow-black/60'
        }`}
      >
        {isRecording ? (
          <div className="w-3.5 h-3.5 rounded-full bg-red-500 animate-ping" />
        ) : (
          <Menu className="w-6 h-6" />
        )}
      </button>

      {/* Dropdown Menu Container */}
      {isOpen && (
        <div className="absolute top-14 right-0 w-72 rounded-3xl bg-slate-950/95 border-2 border-amber-400/50 shadow-[0_20px_50px_rgba(0,0,0,0.85)] p-3 flex flex-col gap-2 backdrop-blur-2xl animate-in slide-in-from-top-3 duration-150 text-slate-100">
          {/* Header Title */}
          <div className="pb-1 px-2 flex items-center justify-between border-b border-slate-800">
            <span className="text-[11px] font-mono tracking-widest uppercase text-amber-400 font-black flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              SYSTEM MENU
            </span>
            {isRecording && (
              <span className="text-[10px] font-mono text-red-400 font-black flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                REC {formatTime(recordingSeconds)}
              </span>
            )}
          </div>

          {/* Menu Items */}
          <div className="flex flex-col gap-1.5 pt-1">
            {/* RECORD GAME BUTTON */}
            {onToggleRecordGame && (
              <button
                onClick={() => {
                  soundFX.playClick();
                  onToggleRecordGame();
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl border transition-all cursor-pointer shadow-sm group ${
                  isRecording
                    ? 'bg-red-950/80 border-red-500 text-red-200 hover:bg-red-900/80'
                    : 'bg-slate-900/90 hover:bg-slate-800/90 border-slate-800 hover:border-red-500/60 text-slate-100 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                      isRecording
                        ? 'bg-red-500 text-white border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.6)] animate-pulse'
                        : 'bg-red-500/20 group-hover:bg-red-500/30 text-red-400 border-red-500/30'
                    }`}
                  >
                    <Disc className={`w-4 h-4 ${isRecording ? 'animate-spin' : ''}`} />
                  </div>
                  <div>
                    <span className="text-xs font-black uppercase tracking-wide block">
                      {isRecording ? 'Stop Recording' : 'Record Game'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono block">
                      {isRecording ? `Saved to Profile (${formatTime(recordingSeconds)})` : 'Saves to Profile (Max 1 hr)'}
                    </span>
                  </div>
                </div>
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
              </button>
            )}

            {/* 1. Camera (renamed from Camera Angles) */}
            <button
              onClick={() => {
                soundFX.playClick();
                setIsOpen(false);
                onOpenCameras();
              }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-amber-400/60 text-slate-100 hover:text-white transition-all cursor-pointer shadow-sm group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 group-hover:bg-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                  <Camera className="w-4 h-4" />
                </div>
                <span className="text-xs font-black uppercase tracking-wide">Camera</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
            </button>

            {/* 2. Music (renamed from Music & Radio) */}
            <button
              onClick={() => {
                soundFX.playClick();
                setIsOpen(false);
                onOpenMusic();
              }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-indigo-400/60 text-slate-100 hover:text-white transition-all cursor-pointer shadow-sm group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 group-hover:bg-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30">
                  <Music className="w-4 h-4" />
                </div>
                <span className="text-xs font-black uppercase tracking-wide">Music</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
            </button>

            {/* 3. Settings (renamed from Game Settings) */}
            <button
              onClick={() => {
                soundFX.playClick();
                setIsOpen(false);
                onOpenSettings();
              }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-cyan-400/60 text-slate-100 hover:text-white transition-all cursor-pointer shadow-sm group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 group-hover:bg-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/30">
                  <SettingsIcon className="w-4 h-4" />
                </div>
                <span className="text-xs font-black uppercase tracking-wide">Settings</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
            </button>

            {/* 4. Tutorial (renamed from Tutorial Academy) */}
            {onOpenTutorial && (
              <button
                onClick={() => {
                  soundFX.playClick();
                  setIsOpen(false);
                  onOpenTutorial();
                }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-emerald-400/60 text-slate-100 hover:text-white transition-all cursor-pointer shadow-sm group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 group-hover:bg-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-wide">Tutorial</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
              </button>
            )}

            {/* 5. Rules (renamed from Official Rules) */}
            {onOpenRulebook && (
              <button
                onClick={() => {
                  soundFX.playClick();
                  setIsOpen(false);
                  onOpenRulebook();
                }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-purple-400/60 text-slate-100 hover:text-white transition-all cursor-pointer shadow-sm group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/20 group-hover:bg-purple-500/30 text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/30">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-wide">Rules</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition-colors" />
              </button>
            )}

            {/* Exit Match (If in active match) */}
            {isMatchMode && (
              <button
                onClick={() => {
                  soundFX.playClick();
                  setIsOpen(false);
                  if (onExitMatch) onExitMatch();
                  else onSaveAndExit();
                }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 transition-all cursor-pointer shadow-sm group mt-1"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/40">
                    <LogOut className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-wide">Exit Match</span>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}

            {/* Main Menu Exit */}
            <button
              onClick={() => {
                soundFX.playClick();
                setIsOpen(false);
                onSaveAndExit();
              }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-rose-950/40 hover:bg-rose-900/50 border border-rose-900/60 hover:border-rose-500/80 text-rose-300 hover:text-rose-100 transition-all cursor-pointer shadow-sm group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-rose-500/20 group-hover:bg-rose-500/30 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
                  <LogOut className="w-4 h-4" />
                </div>
                <span className="text-xs font-black uppercase tracking-wide">Main Menu</span>
              </div>
              <ChevronRight className="w-4 h-4 text-rose-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
