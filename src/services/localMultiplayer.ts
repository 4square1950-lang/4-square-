import type { RuleSet, SquareId } from '../types/foursquare';
import { CHARACTERS } from '../utils/characters';
import { createInitialState, type GameEngineState } from './foursquareEngine';

interface LocalSeat {
  id: string;
  name: string;
  startSquare: SquareId;
  color: string;
  targetKeys: readonly string[];
  quickKey: string;
  quickLabel: string;
  keysLabel: string;
}

export const LOCAL_SEATS: readonly LocalSeat[] = [
  { id: 'local-p1', name: 'Player 1', startSquare: 1, color: 'text-rose-400', targetKeys: ['KeyW', 'KeyA', 'KeyS', 'KeyD'], quickKey: 'Space', quickLabel: 'Space', keysLabel: 'W / A / S / D' },
  { id: 'local-p2', name: 'Player 2', startSquare: 4, color: 'text-amber-400', targetKeys: ['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'], quickKey: 'Enter', quickLabel: 'Enter', keysLabel: '↑ / ← / ↓ / →' },
  { id: 'local-p3', name: 'Player 3', startSquare: 2, color: 'text-emerald-400', targetKeys: ['KeyI', 'KeyJ', 'KeyK', 'KeyL'], quickKey: 'KeyU', quickLabel: 'U', keysLabel: 'I / J / K / L' },
  { id: 'local-p4', name: 'Player 4', startSquare: 3, color: 'text-blue-400', targetKeys: ['KeyT', 'KeyF', 'KeyG', 'KeyH'], quickKey: 'KeyY', quickLabel: 'Y', keysLabel: 'T / F / G / H' },
];

export const DEFAULT_LOCAL_PICKS = ['char-patch', 'char-blocky', 'char-skater-roxy', 'char-maya'];

export function createLocalMatch(ruleSet: RuleSet, characterIds: readonly string[]): GameEngineState {
  const picks = characterIds.map((id, index) =>
    CHARACTERS.find((character) => character.id === id) ?? CHARACTERS[index]);
  const bots = CHARACTERS.filter((character) => !picks.includes(character));
  const initial = createInitialState(ruleSet);
  let botIndex = 0;
  const players = initial.players.map((player) => {
    const index = LOCAL_SEATS.findIndex((seat) => seat.startSquare === player.rank);
    const seat = LOCAL_SEATS[index];
    const pick = picks[index];
    const character = pick ?? bots[botIndex++];
    return {
      ...player,
      id: pick ? seat.id : `local-bot-${player.rank}`,
      name: pick ? `${seat.name} (${character.name})` : character.name,
      characterId: character.id,
      archetype: character.archetype,
      avatarColor: character.avatarColor,
      capColor: character.capColor,
      skinColor: character.skinColor,
      isHuman: Boolean(pick),
    };
  });

  return {
    ...initial,
    players,
    humanPlayerId: '',
    servingPlayerId: players[0].id,
    activeTurnPlayerId: players[0].id,
    refereeCall: { ...initial.refereeCall, message: `${players[0].name} serves to Square 4!` },
  };
}

export function localShotTarget(state: GameEngineState, code: string): SquareId | undefined {
  const player = state.players.find(({ id }) => id === state.activeTurnPlayerId);
  if (state.isGameOver || state.isPaused || !player?.isHuman) return;
  const seat = LOCAL_SEATS.find(({ id }) => id === player.id);
  if (!seat) return;

  const index = seat.targetKeys.indexOf(code);
  if (code === seat.quickKey) return state.ballState.isServing || player.rank !== 4 ? 4 : 1;
  if (index < 0) return;

  const target = (index + 1) as SquareId;
  if (target === player.rank || (state.ballState.isServing && target !== 4)) return;
  return target;
}
