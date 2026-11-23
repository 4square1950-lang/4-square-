import type { Ranking } from './marketTypes';
export const CLUBS = [
  { id: 'oakridge', name: 'Oakridge', division: 'North' },
  { id: 'kanata', name: 'Kanata', division: 'North' },
  { id: 'sunset', name: 'Sunset', division: 'South' },
  { id: 'metro', name: 'Metro', division: 'South' },
] as const;
export type Club = typeof CLUBS[number]['id'];
export type LeagueRow = Ranking & { key: string; streak: string; lastTenWins: number; lastTenPlayed: number; elo: number };
export interface LeagueData { players: LeagueRow[]; clubs: LeagueRow[]; divisions: LeagueRow[]; seasons: string[] }
export interface ClanSummary {
  id: Club;
  members: number;
  roster: { key: string; name: string; played: number; wins: number; elo: number }[];
}
export interface LeagueProfile {
  stats: Ranking;
  club: Club | null;
  xp: number;
  elo: number;
  displayName: string;
  social: PublicProfile;
  history: { time: number; won: boolean; holds: number; hits: number; faults: number }[];
}

export type FriendRequestAction = 'request' | 'accept' | 'decline' | 'cancel';
export type Friendship = 'none' | 'sent' | 'received' | 'friends';

export interface PublicProfile { key: string; name: string; elo: number; followers: number; following: number; friends:number; followed: boolean; friendship?: Friendship; username:string; bio:string; npc:boolean; mascot?:number; youtube?:string }
export const INITIAL_ELO = 1000;

export const standingsPoints = (wins: number) => wins * 3;

export function clanTier(points: number) {
  if (points >= 150) return 'Elite';
  if (points >= 75) return 'Gold';
  if (points >= 30) return 'Silver';
  return 'Bronze';
}

export function leagueTier(elo: number) {
  if (elo >= 1450) return 'Elite';
  if (elo >= 1250) return 'Gold';
  if (elo >= 1100) return 'Silver';
  return 'Bronze';
}
