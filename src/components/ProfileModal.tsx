import React, { useState } from 'react';
import {
  X,
  User,
  Trophy,
  Award,
  Zap,
  Shield,
  Activity,
  Users,
  Search,
  UserPlus,
  Play,
  Trash2,
  Share2,
  Sparkles,
  ChevronRight,
  TrendingUp,
  Check,
  Flame,
  Radio,
  Clock,
  Swords,
  Target,
} from 'lucide-react';
import { CharacterDef, CharacterCustomization, CHARACTERS } from '../utils/characters';
import { CampaignProgress } from '../types/campaign';
import { soundFX } from '../services/soundEffects';
import { FriendUser, ActivityItem, AchievementBadge } from '../types/profile';
import { INITIAL_FRIENDS, MOCK_ACTIVITY_FEED, INITIAL_ACHIEVEMENTS, getProfileStats } from '../utils/profileData';

export interface SavedReplay {
  id: string;
  title: string;
  date?: string;
  durationSeconds: number;
  winnerName?: string;
  myScore?: number;
  opponentScore?: number;
  venueName: string;
  opponentName?: string;
  timestamp?: number | string;
}

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  equippedCharacter: CharacterDef;
  customization: CharacterCustomization;
  campaignProgress: CampaignProgress;
  savedReplays: SavedReplay[];
  onDeleteReplay: (id: string) => void;
  onOpenCustomizer: () => void;
  onChallengeFriend?: (characterId: string) => void;
}

type ProfileTab = 'stats' | 'friends' | 'rankings' | 'trophies' | 'replays';

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  equippedCharacter,
  customization,
  campaignProgress,
  savedReplays,
  onDeleteReplay,
  onOpenCustomizer,
  onChallengeFriend,
}) => {
  const [activeTab, setActiveTab] = useState<ProfileTab>('stats');
  const [friendsList, setFriendsList] = useState<FriendUser[]>(INITIAL_FRIENDS);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedShare, setCopiedShare] = useState(false);

  if (!isOpen) return null;

  const stats = getProfileStats(campaignProgress);
  const playerName = customization.playerNickname || equippedCharacter.name || 'Patch';
  const playerAvatar = equippedCharacter.name?.includes('Wolf')
    ? '🐺'
    : equippedCharacter.name?.includes('Slime')
    ? '🟢'
    : equippedCharacter.name?.includes('Roxy')
    ? '🛼'
    : '👦';

  // Toggle follow status
  const handleToggleFollow = (friendId: string) => {
    soundFX.playClick();
    setFriendsList((prev) =>
      prev.map((f) => (f.id === friendId ? { ...f, isFollowing: !f.isFollowing } : f))
    );
  };

  // Share profile card
  const handleShareProfile = () => {
    soundFX.playClick();
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);
  };

  // Calculate total saved replay duration (1-hour limit = 3600 seconds)
  const totalReplaySec = savedReplays.reduce((acc, r) => acc + r.durationSeconds, 0);
  const totalReplayMin = Math.floor(totalReplaySec / 60);
  const maxReplayMin = 60; // 1-hour limit

  // Filtered friends
  const filteredFriends = friendsList.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.nickname.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen bg-slate-950 flex flex-col font-sans select-none overflow-hidden text-white animate-in fade-in duration-200">
      {/* ========================================================================= */}
      {/* FULL-SCREEN HERO HEADER: PROFILE & INSTAGRAM-STYLE STATS ROW */}
      {/* ========================================================================= */}
      <div className="relative bg-linear-to-r from-slate-950 via-blue-950/80 to-slate-950 p-6 sm:p-8 border-b border-slate-800 shrink-0">
        <div className="absolute inset-0 bg-radial from-blue-600/20 via-transparent to-transparent pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Left: Avatar & Identity */}
          <div className="flex items-center gap-5 text-center md:text-left">
            <div className="relative">
              <div
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center text-4xl sm:text-5xl shadow-2xl border-4 border-amber-400"
                style={{ backgroundColor: equippedCharacter.avatarColor || '#2563eb' }}
              >
                {playerAvatar}
              </div>
              <div className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-mono text-[10px] font-black uppercase shadow border border-slate-950">
                LVL 14
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap justify-center md:justify-start">
                <h1 className="text-3xl sm:text-4xl font-black italic tracking-tight uppercase text-white drop-shadow">
                  PROFILE
                </h1>
                <span className="text-xs font-mono font-black px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/50">
                  OAKRIDGE KING #1
                </span>
              </div>

              <div className="text-xs text-slate-300 font-mono font-medium flex items-center gap-3 justify-center md:justify-start">
                <span>Athlete: <strong className="text-amber-300">{playerName}</strong></span>
                <span>•</span>
                <span>Division: <strong className="text-cyan-300">Oakridge Squad</strong></span>
              </div>

              {/* XP Progress Bar */}
              <div className="pt-1.5 w-64 max-w-full">
                <div className="flex justify-between text-[10px] font-mono font-bold text-slate-400 mb-1">
                  <span>Level XP Progress</span>
                  <span className="text-amber-300">3,450 / 4,000 XP</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                  <div className="h-full bg-linear-to-r from-amber-400 to-amber-500 rounded-full w-[86%]" />
                </div>
              </div>
            </div>
          </div>

          {/* Center: Instagram-Style Posts / Followers / Following Header Row (Matching uploaded screenshot!) */}
          <div className="flex items-center gap-8 sm:gap-12 bg-slate-950/80 backdrop-blur-md px-6 py-3 rounded-2xl border border-slate-800 shadow-2xl">
            <button
              onClick={() => {
                soundFX.playClick();
                setActiveTab('stats');
              }}
              className="flex flex-col items-center cursor-pointer hover:scale-105 transition-transform"
            >
              <span className="text-xl sm:text-2xl font-black text-white tracking-tight font-mono">
                3,022
              </span>
              <span className="text-xs text-slate-400 font-medium font-sans">
                Matches
              </span>
            </button>

            <button
              onClick={() => {
                soundFX.playClick();
                setActiveTab('friends');
              }}
              className="flex flex-col items-center cursor-pointer hover:scale-105 transition-transform"
            >
              <span className="text-xl sm:text-2xl font-black text-white tracking-tight font-mono">
                67.6K
              </span>
              <span className="text-xs text-slate-400 font-medium font-sans">
                Followers
              </span>
            </button>

            <button
              onClick={() => {
                soundFX.playClick();
                setActiveTab('friends');
              }}
              className="flex flex-col items-center cursor-pointer hover:scale-105 transition-transform"
            >
              <span className="text-xl sm:text-2xl font-black text-white tracking-tight font-mono">
                2,454
              </span>
              <span className="text-xs text-slate-400 font-medium font-sans">
                Following
              </span>
            </button>
          </div>

          {/* Right: Quick Action Controls */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => {
                soundFX.playClick();
                onOpenCustomizer();
              }}
              className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-black text-xs uppercase tracking-wider shadow border border-slate-700 hover:border-amber-400 transition-all cursor-pointer flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Customize</span>
            </button>

            <button
              onClick={handleShareProfile}
              className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-600/30 transition-all cursor-pointer flex items-center gap-2 border border-blue-400/40"
            >
              <Share2 className="w-4 h-4" />
              <span>{copiedShare ? 'Copied Card!' : 'Share Profile'}</span>
            </button>

            <button
              onClick={() => {
                soundFX.playClick();
                onClose();
              }}
              className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer border border-slate-700"
              title="Exit Profile"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

        {/* ========================================================================= */}
        {/* PROFILE TAB NAVIGATION BAR */}
        {/* ========================================================================= */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-800 bg-slate-950/70 overflow-x-auto scrollbar-none">
          {[
            { id: 'stats', label: 'Career Statistics', icon: Activity },
            { id: 'friends', label: 'Friends & Social', icon: Users, badge: `${friendsList.length}` },
            { id: 'rankings', label: 'Circuit Rankings', icon: Trophy },
            { id: 'trophies', label: 'Trophy Case', icon: Award },
            { id: 'replays', label: 'Replay Theater', icon: Play, badge: `${savedReplays.length}` },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  soundFX.playClick();
                  setActiveTab(tab.id as ProfileTab);
                }}
                className={`relative px-4 py-3 rounded-t-2xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                  isActive
                    ? 'text-amber-300 bg-slate-900 border-t-2 border-x border-slate-800 border-t-amber-400 shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                    isActive ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* TAB CONTENT BODY */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 scrollbar-thin scrollbar-thumb-slate-800 bg-slate-900">
          
          {/* ------------------------------------------------------------- */}
          {/* TAB 1: CAREER STATISTICS DASHBOARD */}
          {/* ------------------------------------------------------------- */}
          {activeTab === 'stats' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Top Stat Overview Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 shadow-lg space-y-1">
                  <div className="text-[11px] font-mono font-bold text-slate-400 uppercase">WIN / LOSS RECORD</div>
                  <div className="text-2xl font-black text-white">{stats.matchesWon}W - {stats.matchesLost}L</div>
                  <div className="text-xs font-mono font-bold text-emerald-400">{stats.winRatePct}% Win Rate</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 shadow-lg space-y-1">
                  <div className="text-[11px] font-mono font-bold text-slate-400 uppercase">CROWN HOLDS</div>
                  <div className="text-2xl font-black text-amber-300">{stats.totalCrownHolds} Holds</div>
                  <div className="text-xs font-mono font-bold text-slate-400">Best Streak: {stats.longestCrownStreak}</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 shadow-lg space-y-1">
                  <div className="text-[11px] font-mono font-bold text-slate-400 uppercase">PEAK SMASH SPEED</div>
                  <div className="text-2xl font-black text-cyan-300">{stats.peakSmashSpeedMph} MPH</div>
                  <div className="text-xs font-mono font-bold text-cyan-400">Fast Corner Spike</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 shadow-lg space-y-1">
                  <div className="text-[11px] font-mono font-bold text-slate-400 uppercase">SHOT ACCURACY</div>
                  <div className="text-2xl font-black text-indigo-300">{stats.shotAccuracyPct}%</div>
                  <div className="text-xs font-mono font-bold text-indigo-400">{stats.totalHits} Total Hits</div>
                </div>
              </div>

              {/* Detailed Performance Analytics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800/90 space-y-4">
                  <h3 className="text-xs font-black tracking-wider text-amber-400 uppercase flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    <span>CAREER ACCURACY & CORNER SHOTS</span>
                  </h3>

                  <div className="space-y-3 font-mono text-xs">
                    <div className="flex justify-between items-center py-2 border-b border-slate-800/60">
                      <span className="text-slate-400">Total Career Points Scored</span>
                      <span className="font-bold text-white text-sm">{stats.totalPointsScored} PTS</span>
                    </div>

                    <div className="flex justify-between items-center py-2 border-b border-slate-800/60">
                      <span className="text-slate-400">Opponents Eliminated</span>
                      <span className="font-bold text-rose-400 text-sm">{stats.totalEliminations} KO</span>
                    </div>

                    <div className="flex justify-between items-center py-2 border-b border-slate-800/60">
                      <span className="text-slate-400">Receiver Faults Saved</span>
                      <span className="font-bold text-emerald-400 text-sm">{stats.receiverFaultsSaved} Saved</span>
                    </div>

                    <div className="flex justify-between items-center py-2">
                      <span className="text-slate-400">Average Rally Hits / Point</span>
                      <span className="font-bold text-amber-300 text-sm">{stats.averageRallyHits} Hits</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800/90 space-y-4">
                  <h3 className="text-xs font-black tracking-wider text-blue-400 uppercase flex items-center gap-2">
                    <Flame className="w-4 h-4" />
                    <span>ATHLETE PLAYSTYLE PROFICIENCY</span>
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs font-mono mb-1">
                        <span className="text-slate-300 font-bold">Fast Corner Spikes</span>
                        <span className="text-amber-300 font-bold">95%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full w-[95%]" />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-mono mb-1">
                        <span className="text-slate-300 font-bold">Volley Returns (In-Flight)</span>
                        <span className="text-cyan-300 font-bold">88%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                        <div className="h-full bg-cyan-400 rounded-full w-[88%]" />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-mono mb-1">
                        <span className="text-slate-300 font-bold">Line Defense & Receiver Grace</span>
                        <span className="text-indigo-300 font-bold">92%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                        <div className="h-full bg-indigo-400 rounded-full w-[92%]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB 2: FRIENDS & SOCIAL HUB */}
          {/* ------------------------------------------------------------- */}
          {activeTab === 'friends' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Search & Add Friend Header Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-950/70 p-4 rounded-2xl border border-slate-800 relative z-30">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search friends, followers, or contenders..."
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-amber-400/80 transition-colors"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400 hover:text-white"
                    >
                      Clear
                    </button>
                  )}

                  {/* Real-time Search Dropdown Menu */}
                  {searchQuery.trim().length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-slate-950/95 backdrop-blur-md border border-slate-700 rounded-2xl shadow-2xl p-2 z-50 max-h-72 overflow-y-auto space-y-1 divide-y divide-slate-800/60 animate-in fade-in duration-150">
                      <div className="px-3 py-1.5 text-[10px] font-mono font-bold text-slate-400 uppercase flex justify-between items-center">
                        <span>SEARCH RESULTS ({filteredFriends.length})</span>
                        <span className="text-amber-400">INSTAGRAM SEARCH</span>
                      </div>
                      {filteredFriends.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400 font-mono">
                          No players found matching "{searchQuery}"
                        </div>
                      ) : (
                        filteredFriends.map((f) => (
                          <div key={f.id} className="p-2 rounded-xl hover:bg-slate-900 flex items-center justify-between gap-3 transition-colors">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg shadow border border-white/10" style={{ backgroundColor: f.avatarColor }}>
                                {f.avatarEmoji}
                              </div>
                              <div>
                                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                  <span>{f.name}</span>
                                  <span className="text-[10px] font-mono text-slate-400">({f.nickname})</span>
                                </div>
                                <div className="text-[10px] font-mono text-amber-300">
                                  {f.division} • Rank #{f.rank}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                handleToggleFollow(f.id);
                              }}
                              className={`px-3 py-1 rounded-lg font-mono text-[10px] font-bold uppercase transition-all cursor-pointer ${
                                f.isFollowing
                                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                  : 'bg-blue-600 text-white hover:bg-blue-500'
                              }`}
                            >
                              {f.isFollowing ? 'Following' : '+ Follow'}
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs font-mono text-slate-300">
                  <span>Following: <strong className="text-amber-300 font-black">{friendsList.filter((f) => f.isFollowing).length}</strong></span>
                  <span>•</span>
                  <span>Followers: <strong className="text-cyan-300 font-black">67.6K</strong></span>
                </div>
              </div>

              {/* Friends List Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredFriends.map((friend) => (
                  <div
                    key={friend.id}
                    className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 shadow-xl flex items-center justify-between gap-4 transition-all"
                  >
                    {/* Left: Friend Avatar & Info */}
                    <div className="flex items-center gap-3.5">
                      <div className="relative">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow border border-white/20"
                          style={{ backgroundColor: friend.avatarColor }}
                        >
                          {friend.avatarEmoji}
                        </div>
                        {/* Live Status Indicator */}
                        <span
                          className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-950 ${
                            friend.status === 'online'
                              ? 'bg-emerald-400'
                              : friend.status === 'in_match'
                              ? 'bg-amber-400 animate-pulse'
                              : 'bg-slate-600'
                          }`}
                          title={`Status: ${friend.status}`}
                        />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-sm text-white">{friend.name}</h4>
                          <span className="text-[10px] font-mono text-slate-400">({friend.nickname})</span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {friend.division} • Rank #{friend.rank}
                        </div>
                        <div className="text-[10px] font-mono text-amber-300 font-bold mt-0.5">
                          {friend.crownHolds} Crown Holds • {friend.winRate} Win Rate
                        </div>
                      </div>
                    </div>

                    {/* Right: Challenge Button & Follow Toggle */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          soundFX.playClick();
                          if (onChallengeFriend) onChallengeFriend(friend.characterId);
                          onClose();
                        }}
                        className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase shadow cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
                        title="Challenge this classmate directly to a 4-Square match"
                      >
                        <Swords className="w-3.5 h-3.5" />
                        <span>Challenge</span>
                      </button>

                      <button
                        onClick={() => handleToggleFollow(friend.id)}
                        className={`p-2 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
                          friend.isFollowing
                            ? 'bg-slate-900 border-slate-700 text-slate-300 hover:text-red-400 hover:border-red-500/50'
                            : 'bg-blue-600 border-blue-500 text-white hover:bg-blue-500'
                        }`}
                        title={friend.isFollowing ? 'Unfollow Friend' : 'Follow Friend'}
                      >
                        {friend.isFollowing ? 'Following' : 'Follow'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Live Activity Feed */}
              <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
                <h3 className="text-xs font-black tracking-wider text-indigo-400 uppercase flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  <span>LIVE FRIENDS ACTIVITY FEED</span>
                </h3>

                <div className="space-y-3 divide-y divide-slate-800/60">
                  {MOCK_ACTIVITY_FEED.map((act) => (
                    <div key={act.id} className="pt-3 flex items-start gap-3">
                      <span className="text-xl p-1 bg-slate-900 rounded-lg">{act.avatarEmoji}</span>
                      <div className="flex-1 text-xs">
                        <span className="font-black text-white">{act.friendName}</span>{' '}
                        <span className="text-slate-300">{act.actionText}</span>
                        <div className="text-[10px] font-mono text-slate-500 mt-0.5">{act.timestamp}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB 3: CIRCUIT RANKINGS & STANDINGS */}
          {/* ------------------------------------------------------------- */}
          {activeTab === 'rankings' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="text-lg font-black text-white">Oakridge Division Circuit Ranking</h3>
                    <p className="text-xs text-slate-400">Current season overall contender standings.</p>
                  </div>
                  <div className="px-4 py-2 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/40 text-xs font-mono font-black">
                    RANK #1 IN DIVISION
                  </div>
                </div>

                <div className="space-y-3 pt-2 font-mono text-xs">
                  <div className="flex justify-between items-center py-2.5 px-4 rounded-xl bg-amber-400/10 border border-amber-400/30">
                    <div className="flex items-center gap-3">
                      <span className="font-black text-amber-300 text-sm">1.</span>
                      <span className="text-2xl">👦</span>
                      <span className="font-black text-white">{playerName} (You)</span>
                    </div>
                    <span className="font-black text-amber-300">40 Crown Holds • 142 PTS</span>
                  </div>

                  <div className="flex justify-between items-center py-2.5 px-4 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-400">2.</span>
                      <span className="text-2xl">🟩</span>
                      <span className="font-bold text-slate-200">Blocky</span>
                    </div>
                    <span className="font-bold text-slate-400">29 Crown Holds • 118 PTS</span>
                  </div>

                  <div className="flex justify-between items-center py-2.5 px-4 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-400">3.</span>
                      <span className="text-2xl">🛼</span>
                      <span className="font-bold text-slate-200">Skater Roxy</span>
                    </div>
                    <span className="font-bold text-slate-400">28 Crown Holds • 112 PTS</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB 4: TROPHY CASE & CAREER BADGES */}
          {/* ------------------------------------------------------------- */}
          {activeTab === 'trophies' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {INITIAL_ACHIEVEMENTS.map((badge) => (
                  <div
                    key={badge.id}
                    className={`p-5 rounded-2xl border transition-all ${
                      badge.isUnlocked
                        ? 'bg-slate-950/80 border-amber-500/50 shadow-lg'
                        : 'bg-slate-950/40 border-slate-800/60 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 mb-3">
                      <span className="text-3xl p-2 bg-slate-900 rounded-xl border border-slate-800">{badge.icon}</span>
                      <div>
                        <h4 className="font-black text-sm text-white">{badge.title}</h4>
                        <span className="text-[10px] font-mono uppercase text-amber-400 font-bold">
                          {badge.category}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 font-medium">{badge.description}</p>

                    <div className="mt-3 pt-3 border-t border-slate-800/80 flex justify-between items-center text-[10px] font-mono">
                      {badge.isUnlocked ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <Check className="w-3 h-3" /> Unlocked {badge.unlockedAt}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-bold">
                          Progress: {badge.progress} / {badge.maxProgress}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB 5: REPLAY THEATER (1-HOUR LIMIT) */}
          {/* ------------------------------------------------------------- */}
          {activeTab === 'replays' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Replay Storage Meter Header */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <div className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    <span>SAVED GAMEPLAY REPLAY STORAGE</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    User limit: 1 hour (60 mins) of saved gameplay clips in athlete profile.
                  </div>
                </div>

                <div className="font-mono text-xs font-bold text-cyan-300 bg-cyan-950/60 px-3.5 py-1.5 rounded-xl border border-cyan-500/40">
                  {totalReplayMin} / {maxReplayMin} MINS USED
                </div>
              </div>

              {/* Replays List */}
              {savedReplays.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/40 rounded-2xl border border-slate-800 text-slate-400 space-y-2">
                  <Play className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs font-bold">No saved gameplay replays found.</p>
                  <p className="text-[11px]">Use the Hamburger menu option "Record Game" during any match to save gameplay clips!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedReplays.map((replay) => (
                    <div
                      key={replay.id}
                      className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/40 flex items-center justify-center font-black">
                          <Play className="w-5 h-5 fill-current" />
                        </div>

                        <div>
                          <h4 className="font-black text-sm text-white">{replay.title}</h4>
                          <div className="text-xs text-slate-400 font-mono">
                            {replay.venueName} • {replay.date} • {Math.round(replay.durationSeconds / 60)} mins
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            soundFX.playClick();
                            alert(`Playing recorded gameplay clip: ${replay.title}`);
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase shadow transition-all cursor-pointer"
                        >
                          Watch Replay
                        </button>

                        <button
                          onClick={() => {
                            soundFX.playClick();
                            onDeleteReplay(replay.id);
                          }}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-400 transition-all cursor-pointer"
                          title="Delete Replay"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

      </div>
    </div>
  );
};
