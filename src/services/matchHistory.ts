import type { GameEngineState } from './foursquareEngine';

const key = 'foursquare_results_v1';
type MatchMode = 'Solo' | 'Local' | 'Campaign';
export interface MatchResult {
  id: string;
  time: number;
  mode: MatchMode;
  venue: string;
  winner: string;
  won: boolean;
  holds: number;
  hits: number;
  faults: number;
}

export function getMatchHistory(): MatchResult[] {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

export function recordMatchResult(state: GameEngineState, mode: MatchMode, venue: string) {
  if (!state.isGameOver || !state.gameWinner) return;
  const results = getMatchHistory();
  if (results.some(({ id }) => id === state.matchId)) return;
  const player = mode === 'Local' ? state.gameWinner : [...state.players, ...state.waitingQueue].find(({ id }) => id === state.humanPlayerId);
  try {
    localStorage.setItem(key, JSON.stringify([{
      id: state.matchId, time: Date.now(), mode, venue, winner: state.gameWinner.name,
      won: state.gameWinner.id === state.humanPlayerId,
      holds: player?.crownHolds ?? 0, hits: player?.totalHits ?? 0, faults: player?.faults ?? 0,
    }, ...results]));
  } catch (error) {
    console.warn('Could not save match history', error);
  }
}
