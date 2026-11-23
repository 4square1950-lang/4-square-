import type { GameEngineState } from './foursquareEngine';
import type { BallState, SquareId } from '../types/foursquare';

export interface RoomMember {
  id: string;
  name: string;
  characterId: string;
  squareId: SquareId;
  isHost: boolean;
  ready: boolean;
}

export interface RoomChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
}

export interface MatchSnapshot {
  state: GameEngineState;
  turnId: number;
  venueId: string;
  endsAt?:number;
  serveDeadline?: number;
}

export type RoomEvent =
  | { event: 'room_joined'; payload: { playerId: string; players: RoomMember[]; chatMessages: RoomChatMessage[] } }
  | { event: 'room_members'; payload: RoomMember[] }
  | { event: 'chat_received'; payload: RoomChatMessage }
  | { event: 'room_error'; payload: string }
  | { event: 'match_started' | 'match_state'; payload: MatchSnapshot }
  | { event: 'match_ball'; payload: BallState };

export type RoomCommand =
  | { type:'watch_room'; payload:{roomId:string} }
  | { type: 'join_room'; payload: { roomId: string; userName: string; characterId: string; venueId: string } }
  | { type: 'send_chat'; payload: { text: string } }
  | { type: 'ready' | 'rematch' }
  | { type: 'hit_ball' | 'queue_return'; payload: { targetSquare: SquareId; turnId: number; point?: { x: number; z: number } } };
