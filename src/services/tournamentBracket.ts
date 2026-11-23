import type { Player } from '../types/foursquare';
import { CHARACTERS } from '../utils/characters';

export function compareCupPlayers(a: Player, b: Player, winner?: string) {
  return Number(b.id === winner) - Number(a.id === winner) ||
    b.crownHolds - a.crownHolds || (b.points ?? 0) - (a.points ?? 0) ||
    b.totalHits - a.totalHits || (a.faults ?? 0) - (b.faults ?? 0);
}

export function getLocalTournamentBracket(equipped: string, results: string[][]) {
  const botRank = (id: string) => {
    const player = CHARACTERS.find((character) => character.id === id);
    return player ? player.power + player.speed + player.spin : 0;
  };
  const aiQualifiers = (players: string[]) => [...players].sort((a,b) => botRank(b) - botRank(a)).slice(0, 2);
  const entries = [equipped, ...CHARACTERS.map(({ id }) => id).filter((id) => id !== equipped)].slice(0, 16);
  const quarters = Array.from({ length: 4 }, (_, index) => entries.slice(index * 4, index * 4 + 4));
  const quarterQualifiers = quarters.map((players, index) => index === 0 ? results[0] : aiQualifiers(players));
  const semis = [0, 2].map((index) => [...(quarterQualifiers[index] ?? []), ...(quarterQualifiers[index + 1] ?? [])]);
  return [quarters, semis, [[...(results[1] ?? []), ...aiQualifiers(semis[1])]]];
}
