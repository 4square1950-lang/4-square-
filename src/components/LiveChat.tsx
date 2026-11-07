import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Send, Users, Sparkles, Volume2, VolumeX, MessageSquare, Flame, Trophy, ThumbsUp } from 'lucide-react';
import { ChatMessage, VenueId } from '../types/campaign';
import { soundFX } from '../services/soundEffects';

interface LiveChatProps {
  venueId: VenueId;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
}

export const LiveChat: React.FC<LiveChatProps> = ({
  venueId,
  messages,
  onSendMessage,
}) => {
  // Starts automatically closed as requested!
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const prevMessagesLength = useRef(messages.length);

  // Tab key listener to toggle chat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Track unread messages when closed
  useEffect(() => {
    if (!isOpen && messages.length > prevMessagesLength.current) {
      setUnreadCount((c) => Math.min(99, c + (messages.length - prevMessagesLength.current)));
    }
    if (isOpen) {
      setUnreadCount(0);
    }
    prevMessagesLength.current = messages.length;
  }, [messages.length, isOpen]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (chatScrollRef.current && isOpen) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    soundFX.playClick();
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleQuickEmote = (emote: string) => {
    soundFX.playClick();
    onSendMessage(emote);
  };

  return (
    <div className="absolute bottom-4 left-4 z-30 pointer-events-auto select-none">
      {/* 1. Closed State: Double-sized 96px orange button with two people talking to each other */}
      {!isOpen ? (
        <button
          onClick={() => {
            soundFX.playClick();
            setIsOpen(true);
            setUnreadCount(0);
          }}
          className="group relative w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-500 via-orange-500 to-orange-600 hover:from-amber-400 hover:via-orange-500 hover:to-orange-700 border-2 border-orange-200/90 shadow-[0_10px_35px_rgba(249,115,22,0.65)] hover:shadow-[0_16px_50px_rgba(249,115,22,0.85)] flex flex-col items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer ring-4 ring-orange-500/30"
          title="Open Live Chat [Tab]"
          aria-label="Open Live Chat"
        >
          {/* Symbol of Two People Talking to Each Other */}
          <svg
            viewBox="0 0 48 48"
            className="w-14 h-14 text-white fill-current transition-transform duration-200 group-hover:scale-110 drop-shadow-md"
          >
            {/* Left person talking (facing right) */}
            <circle cx="12" cy="18" r="5" fill="currentColor" />
            <path
              d="M6 34c0-4.4 3.6-7 8-7s8 2.6 8 7v2H6v-2z"
              fill="currentColor"
            />

            {/* Right person talking (facing left) */}
            <circle cx="36" cy="18" r="5" fill="currentColor" />
            <path
              d="M30 34c0-4.4 3.6-7 8-7s8 2.6 8 7v2H30v-2z"
              fill="currentColor"
            />

            {/* Speech bubble from left person (pointing left) */}
            <path
              d="M17 11h9a4 4 0 0 1 4 4v2a4 4 0 0 1-4 4h-4l-4 3v-3h-1a4 4 0 0 1-4-4v-2a4 4 0 0 1 4-4z"
              fill="#ffffff"
            />
            {/* Conversation dots in left bubble */}
            <circle cx="20" cy="16" r="1.2" fill="#ea580c" />
            <circle cx="24" cy="16" r="1.2" fill="#ea580c" />
            <circle cx="28" cy="16" r="1.2" fill="#ea580c" />

            {/* Secondary speech bubble from right person */}
            <path
              d="M26 4h11a3.5 3.5 0 0 1 3.5 3.5v1.5a3.5 3.5 0 0 1-3.5 3.5h-1v2.5l-3-2.5h-7a3.5 3.5 0 0 1-3.5-3.5V7.5A3.5 3.5 0 0 1 26 4z"
              fill="#fed7aa"
            />
            <circle cx="30" cy="8.5" r="0.9" fill="#9a3412" />
            <circle cx="33" cy="8.5" r="0.9" fill="#9a3412" />
            <circle cx="36" cy="8.5" r="0.9" fill="#9a3412" />
          </svg>

          {/* Label underneath */}
          <span className="text-[10px] font-black tracking-wider uppercase text-amber-100 drop-shadow">
            LIVE CHAT
          </span>

          {/* Glowing Live Indicator Dot */}
          <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-5 w-5 bg-emerald-500 border-2 border-slate-950 shadow-md" />
          </span>

          {/* Unread Message Pill if any */}
          {unreadCount > 0 && (
            <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-rose-500 text-white font-black text-xs shadow-xl border-2 border-slate-950 animate-bounce">
              {unreadCount}
            </span>
          )}

          {/* Hover Tooltip */}
          <div className="absolute left-full ml-3 px-3 py-1.5 rounded-xl bg-slate-900/95 border border-orange-500/40 text-orange-200 text-xs font-bold whitespace-nowrap shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity flex items-center gap-2">
            <span>Tournament Live Chat</span>
            <span className="px-1.5 py-0.5 rounded bg-orange-950 text-orange-300 text-[10px] font-mono border border-orange-800">
              Tab
            </span>
          </div>
        </button>
      ) : (
        /* 2. Open State: Live Stream Chat Window with Warm Orange Accents */
        <div className="w-[300px] sm:w-[340px] bg-slate-950/95 border-2 border-orange-500/70 rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.85)] backdrop-blur-xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header Bar */}
          <div className="bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 px-3.5 py-2.5 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-orange-700/60 flex items-center justify-center text-white">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <div className="text-white font-black text-xs tracking-wider uppercase flex items-center gap-1.5">
                  <span>COURT CHAT</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                </div>
                <div className="text-[10px] text-orange-100 font-medium flex items-center gap-1">
                  <Users className="w-3 h-3" /> 1,420 watching
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-purple-200 font-mono bg-purple-900/60 px-1.5 py-0.5 rounded border border-purple-400/40">
                [Tab]
              </span>
              <button
                onClick={() => {
                  soundFX.playClick();
                  setIsOpen(false);
                }}
                className="w-7 h-7 rounded-lg bg-purple-900/50 hover:bg-purple-900 text-white flex items-center justify-center transition-colors cursor-pointer active:scale-95"
                title="Collapse Chat"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Message Feed */}
          <div
            ref={chatScrollRef}
            className="h-52 sm:h-60 overflow-y-auto p-3 space-y-2.5 text-xs font-sans scrollbar-thin scrollbar-thumb-purple-900/60 bg-slate-950/80"
          >
            <div className="text-center py-1">
              <span className="text-[10px] text-purple-300/60 font-mono bg-purple-950/40 px-2.5 py-1 rounded-full border border-purple-900/40">
                Welcome to Four Square Circuit Live Chat!
              </span>
            </div>

            {messages.map((msg) => {
              const isMod = msg.sender.includes('Ref') || msg.sender === 'Marcus';
              const isVIP = msg.sender.includes('King') || msg.sender.includes('Patch');

              return (
                <div key={msg.id} className="leading-snug animate-in fade-in duration-150 break-words">
                  {/* Badge */}
                  {isMod && (
                    <span className="inline-block px-1 py-0.2 rounded bg-emerald-600 text-white font-mono text-[9px] font-black mr-1.5 align-middle">
                      MOD
                    </span>
                  )}
                  {isVIP && (
                    <span className="inline-block px-1 py-0.2 rounded bg-[#9146FF] text-white font-mono text-[9px] font-black mr-1.5 align-middle">
                      VIP
                    </span>
                  )}

                  <span
                    className="font-black text-xs mr-1.5"
                    style={{ color: msg.avatarColor || '#a970ff' }}
                  >
                    {msg.sender}:
                  </span>
                  <span className="text-slate-200 font-medium">{msg.text}</span>
                </div>
              );
            })}
          </div>

          {/* Quick Emote Reactions Bar */}
          <div className="px-2.5 py-1.5 bg-slate-900/90 border-t border-purple-900/40 flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => handleQuickEmote('POGGERS 🔥')}
              className="px-2 py-1 rounded-lg bg-purple-950/80 hover:bg-purple-900 text-purple-300 text-[10px] font-bold border border-purple-800/60 shrink-0 cursor-pointer transition-colors"
            >
              Pog 🔥
            </button>
            <button
              onClick={() => handleQuickEmote('GG clean line call! 🏆')}
              className="px-2 py-1 rounded-lg bg-purple-950/80 hover:bg-purple-900 text-purple-300 text-[10px] font-bold border border-purple-800/60 shrink-0 cursor-pointer transition-colors"
            >
              GG 🏆
            </button>
            <button
              onClick={() => handleQuickEmote('Hold Square 1! 👑')}
              className="px-2 py-1 rounded-lg bg-purple-950/80 hover:bg-purple-900 text-purple-300 text-[10px] font-bold border border-purple-800/60 shrink-0 cursor-pointer transition-colors"
            >
              Hold 1 👑
            </button>
            <button
              onClick={() => handleQuickEmote('LUL that bounce! 💥')}
              className="px-2 py-1 rounded-lg bg-purple-950/80 hover:bg-purple-900 text-purple-300 text-[10px] font-bold border border-purple-800/60 shrink-0 cursor-pointer transition-colors"
            >
              LUL 💥
            </button>
          </div>

          {/* Chat Input Bar */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 p-2 bg-slate-900/95 border-t border-purple-900/50"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Send message to stream..."
              className="flex-1 bg-slate-950/90 border border-purple-900/50 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#9146FF] transition-colors"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2 rounded-xl bg-[#9146FF] hover:bg-[#772CE8] text-white disabled:opacity-30 transition-all cursor-pointer active:scale-95 shadow-md flex items-center justify-center"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
