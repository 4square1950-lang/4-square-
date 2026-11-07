export interface FriendUser {
  id: string;
  name: string;
  nickname: string;
  characterId: string;
  avatarEmoji: string;
  avatarColor: string;
  status: 'online' | 'in_match' | 'offline';
  statusLocation?: string;
  rank: number;
  division: string;
  crownHolds: number;
  winRate: string;
  isFollowing: boolean;
}

export interface ActivityItem {
  id: string;
  friendName: string;
  avatarEmoji: string;
  actionText: string;
  timestamp: string;
  type: 'trophy' | 'match_win' | 'streak' | 'rank_up';
}

export interface AchievementBadge {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'career' | 'mastery' | 'social' | 'campaign';
  isUnlocked: boolean;
  unlockedAt?: string;
  progress?: number;
  maxProgress?: number;
}

export interface DetailedProfileStats {
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  winRatePct: number;
  totalCrownHolds: number;
  longestCrownStreak: number;
  peakSmashSpeedMph: number;
  shotAccuracyPct: number;
  totalPointsScored: number;
  totalHits: number;
  totalEliminations: number;
  receiverFaultsSaved: number;
  averageRallyHits: number;
  preferredShot: string;
}
