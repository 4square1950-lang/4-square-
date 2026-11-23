import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import type { CupView, CupPlayer, CupRules } from '../src/services/tournamentTypes';
import type { Player } from '../src/types/foursquare';
import { compareCupPlayers } from '../src/services/tournamentBracket';

interface Entry { profile: string; name: string }
interface Heat { id: string; room: string; profiles: string[]; advanced: string[] }
interface Cup {
  id: string;
  name: string;
  official: boolean;
  starts: number;
  venueId?:string;
  rules?:CupRules;
  players: Entry[];
  heats: Heat[];
}

export function createTournaments(db: DatabaseSync, now: () => number) {
  const live = new Set<string>();
  const settings = (cup:Cup) => ({ venueId:cup.venueId ?? 'bridgton_maine', rules:cup.rules ?? {mode:'points' as const,target:5} });
  db.exec('CREATE TABLE IF NOT EXISTS tournaments (id TEXT PRIMARY KEY, starts INTEGER NOT NULL, detail TEXT NOT NULL)');
  const load = (id: string) => {
    const row = db.prepare('SELECT detail FROM tournaments WHERE id=?').get(id);
    return row ? JSON.parse(String(row.detail)) as Cup : undefined;
  };
  const save = (cup: Cup) => db.prepare('INSERT INTO tournaments VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET detail=excluded.detail')
    .run(cup.id, cup.starts, JSON.stringify(cup));
  const latest = () => db.prepare('SELECT detail FROM tournaments ORDER BY starts DESC LIMIT 100').all()
    .map(({ detail }) => JSON.parse(String(detail)) as Cup);
  const registrationOpen = (cup: Cup) => cup.players.length < 8 && !cup.heats.length &&
    (!cup.official || new Date(now()).toISOString().slice(0, 7) === new Date(cup.starts).toISOString().slice(0, 7));
  const heat = (id: string, profiles: string[]): Heat => ({
    id, profiles, room: `CUP-${randomUUID().replaceAll('-', '').slice(0, 19).toUpperCase()}`, advanced: [],
  });
  const ready = (cup: Cup) => {
    if (cup.players.length !== 8 || cup.heats.length || now() < cup.starts) return;
    const profiles = cup.players.map(({ profile }) => profile);
    cup.heats = [heat('Semifinal A', profiles.slice(0, 4)), heat('Semifinal B', profiles.slice(4))];
    save(cup);
  };
  const monthCup = () => {
    const date = new Date(now());
    const year = date.getUTCFullYear(), month = date.getUTCMonth();
    const id = `official-${year}-${month + 1}`;
    if (!load(id)) {
      const weekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
      const starts = Date.UTC(year, month, 1 + ((6 - weekday + 7) % 7), 16);
      const label = new Intl.DateTimeFormat('en', { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(date);
      save({ id, name: `${label} Open`, official: true, starts, players: [], heats: [] });
    }
  };
  const list = (viewer: string): CupView[] => {
    monthCup();
    return latest().map((cup) => {
      ready(cup);
      const entrants = new Map(cup.players.map(({ profile, name }, index) => [profile, { key: String(index + 1), name }]));
      const participants = (profiles: string[]): CupPlayer[] => profiles.map((profile) => entrants.get(profile)!);
      return { id: cup.id, name: cup.name, official: cup.official, starts: cup.starts,
        ...settings(cup),
        players: [...entrants.values()], joined: entrants.has(viewer), registrationOpen: registrationOpen(cup),
        heats: cup.heats.map((game) => ({
          id: game.id, players: participants(game.profiles), advanced: participants(game.advanced),
          room: !game.advanced.length && game.profiles.includes(viewer) ? game.room : undefined,
          watchRoom: !game.advanced.length && live.has(game.room) ? game.room : undefined,
        })),
      };
    });
  };
  const byRoom = (room: string) => {
    const rows = db.prepare("SELECT detail FROM tournaments WHERE instr(detail,?) > 0").all(room);
    for (const row of rows) {
      const cup = JSON.parse(String(row.detail)) as Cup;
      const game = cup.heats.find((entry) => entry.room === room && !entry.advanced.length);
      if (game) return { cup, game };
    }
  };
  return {
    list,
    create(profile: string, name: string, displayName: string, setup?: {venueId:string;starts:number;rules:CupRules}) {
      save({ id: randomUUID(), name, official: false, starts: now(), ...setup, players: [{ profile, name: displayName }], heats: [] });
    },
    join(id: string, profile: string, name: string) {
      const cup = load(id);
      if (!cup || !registrationOpen(cup)) return false;
      if (!cup.players.some((player) => player.profile === profile)) {
        cup.players.push({ profile, name });
        save(cup);
      }
      ready(cup);
      return true;
    },
    seats(room: string) { return byRoom(room)?.game.profiles; },
    settings(room:string) { const assignment=byRoom(room); return assignment && settings(assignment.cup); },
    isLive(room:string) { return live.has(room); },
    markLive(room:string, active:boolean) { if(active)live.add(room);else live.delete(room); },
    finish(room: string, standings: { profile: string; player: Player }[], winner: string | undefined) {
      const assignment = byRoom(room);
      if (!assignment) return false;
      const { cup, game } = assignment;
      const advancing = game.id === 'Final' ? 1 : 2;
      if (advancing === 1 && !standings.some(({ player }) => player.id === winner)) return false;
      const ranked = standings.filter(({ profile }) => game.profiles.includes(profile)).sort((a,b) =>
        compareCupPlayers(a.player, b.player, winner) || game.profiles.indexOf(a.profile) - game.profiles.indexOf(b.profile));
      if (ranked.length < advancing) return false;
      game.advanced = ranked.slice(0, advancing).map(({ profile }) => profile);
      if (cup.heats.length === 2 && cup.heats.every(({ advanced }) => advanced.length === 2)) {
        cup.heats.push(heat('Final', cup.heats.flatMap(({ advanced }) => advanced)));
      }
      save(cup);
      return true;
    },
  };
}
