import type { CharacterArchetype } from '../utils/characters';

export type SquareId = 1 | 2 | 3 | 4;

export type RuleSet = 'league' | 'school' | 'championship'; // League & Championship: outside in, inside out, volleys legal, diagonal serve. School: all lines out, bounce required.

export type ShotType = 'normal' | 'corner' | 'fast' | 'high_pop' | 'volley';

export interface Player {
  id: string;
  name: string;
  characterId: string;
  archetype: CharacterArchetype;
  avatarColor: string;
  capColor: string;
  skinColor: string;
  isHuman: boolean;
  title: string; // King, Contender, Challenger, Rookie, or Waiting
  rank: SquareId | null; // 1, 2, 3, 4, or null if in queue
  crownHolds: number; // rounds survived in square 1
  totalHits: number;
  totalEliminations: number;
  skill: number; // 0.6 to 0.95
  points?: number;
  accuracy?: number;
  faults?: number;
}

export interface BallState {
  x: number;
  y: number; // vertical height (0 = ground)
  z: number;
  vx: number;
  vy: number;
  vz: number;
  targetSquare: SquareId | null;
  lastHitterId: string | null;
  lastHitterSquare: SquareId | null;
  bounceCountInCurrentSquare: number;
  currentSquareOwner: SquareId | null;
  hasBouncedThisPlay: boolean;
  isLive: boolean;
  isServing: boolean;
}

export type RefereeCallType = 
  | 'clean_hit'
  | 'serve_ready'
  | 'serve_fault_one'
  | 'serve_fault_out'
  | 'inside_line_out'
  | 'outside_court_out'
  | 'own_square_out'
  | 'double_bounce_out'
  | 'poaching_out'
  | 'missed_return_out'
  | 'delay_of_game_out'
  | 'illegal_contact'
  | 'showdown_dispute'
  | 'rotation_complete';

export interface RefereeCall {
  type: RefereeCallType;
  message: string;
  subMessage?: string;
  offendingPlayerName?: string;
  advancingSummary?: string;
  timestamp: number;
}

export interface CourtConfig {
  courtSizeFeet: number; // 16 for league, 10 for school
  outsideLinesIn: boolean; // true in league, false in school
  insideLinesOut: boolean; // true in league (inside line = out)
  volleysAllowed: boolean; // true in league, false in school
  receiverFaultAllowed: boolean; // 1 free fault for receiver
  showdownOnDispute: boolean;
  activeHouseRule: string | null;
}

export interface GameStats {
  longestRally: number;
  currentRally: number;
  totalRounds: number;
  userKingTimeRounds: number;
  userWins: number;
}
