import type { PublicProfile } from './leagueTypes';

export function profileLevel(xp: number) {
  const earned = Math.max(0, Math.floor(xp));
  const threshold = (level: number) => 500 * level * (level+1);
  const level = Math.floor((Math.sqrt(1 + earned / 125)-1)/2);
  return { level, current: earned-threshold(level), required: (level+1)*1000, earned };
}
export type ConnectionView = 'friends' | 'followers' | 'following' | 'search';
export interface ProfileEdit { username: string; displayName: string; bio: string; mascot?: number; youtube?: string }
export interface DirectMessage { id: number; mine: boolean; body: string; time: number }

export type MessageContact = PublicProfile & { latest?: DirectMessage };
