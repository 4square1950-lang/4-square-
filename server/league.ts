import { createSocial, playerPublicKey as publicKey } from './social';
import type { DatabaseSync } from 'node:sqlite';
import { CLUBS, INITIAL_ELO, type Club, type LeagueData, type LeagueProfile, type LeagueRow, type PublicProfile, type FriendRequestAction } from '../src/services/leagueTypes';

export function createLeague(db: DatabaseSync, now = Date.now) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS league_members (profile TEXT PRIMARY KEY, club TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS league_match_clubs (match TEXT, profile TEXT, club TEXT, division TEXT, PRIMARY KEY(match, profile));
    CREATE INDEX IF NOT EXISTS results_time ON results(time);
    CREATE TABLE IF NOT EXISTS league_ratings (profile TEXT PRIMARY KEY, elo INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS player_names (profile TEXT PRIMARY KEY, public_key TEXT UNIQUE, name TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS player_friend_requests (sender TEXT NOT NULL, recipient TEXT NOT NULL, PRIMARY KEY(sender,recipient));
    CREATE INDEX IF NOT EXISTS friend_requests_recipient ON player_friend_requests(recipient,sender);
    CREATE TABLE IF NOT EXISTS player_follows (follower TEXT NOT NULL, followed TEXT NOT NULL, PRIMARY KEY(follower, followed));
  `);
  const network = createSocial(db,now);
  const stats = 'COUNT(*) AS played, COALESCE(SUM(wins),0) AS wins, COALESCE(SUM(holds),0) AS holds, COALESCE(SUM(hits),0) AS hits, COALESCE(SUM(faults),0) AS faults';
  const getClub = (profile: string) => (db.prepare('SELECT club FROM league_members WHERE profile = ?').get(profile)?.club as Club | undefined) ?? null;
  const rating = (profile: string) => Number(db.prepare('SELECT elo FROM league_ratings WHERE profile=?').get(profile)?.elo ?? INITIAL_ELO);
  const name = (profile: string) => String(db.prepare('SELECT name FROM player_names WHERE profile=?').get(profile)?.name ?? '');
  const requestBetween = db.prepare('SELECT 1 FROM player_friend_requests WHERE sender=? AND recipient=?');
  const doesFollow = db.prepare('SELECT 1 FROM player_follows WHERE follower=? AND followed=?');
  const storeFollow = db.prepare('INSERT OR IGNORE INTO player_follows VALUES (?,?)');
  const clearRequest = db.prepare('DELETE FROM player_friend_requests WHERE sender=? AND recipient=?');
  const social = (profile: string, viewer: string): PublicProfile => {
    const counts = db.prepare(`SELECT
      (SELECT COUNT(*) FROM player_follows WHERE followed=?) AS followers,
      (SELECT COUNT(*) FROM player_follows WHERE follower=?) AS following,
      EXISTS(SELECT 1 FROM player_follows WHERE follower=? AND followed=?) AS followed,
      (SELECT COUNT(*) FROM player_follows f INNER JOIN player_follows b ON f.follower=b.followed AND f.followed=b.follower WHERE f.follower=?) AS friends`).get(profile, profile, viewer, profile,profile);
    const detail = network.details(profile);
    const friendship = profile===viewer ? 'none' : counts?.followed && doesFollow.get(profile,viewer) ? 'friends' : requestBetween.get(viewer,profile) ? 'sent' : requestBetween.get(profile,viewer) ? 'received' : 'none';
    return { key: publicKey(profile), name: name(profile) || 'Player', elo: rating(profile),
      username:String(detail?.username ?? ''), bio:String(detail?.bio ?? ''), npc:Boolean(detail?.npc), mascot:typeof detail?.mascot==='number'?detail.mascot:undefined, youtube:String(detail?.youtube ?? ''),
      followers: Number(counts?.followers), following: Number(counts?.following), friends:Number(counts?.friends), followed: Boolean(counts?.followed), friendship };
  };
  return {
    getClub, name, network, social,
    setName(profile: string, displayName: string) {
      db.prepare('INSERT INTO player_names VALUES (?,?,?) ON CONFLICT(profile) DO UPDATE SET name=excluded.name')
        .run(profile, publicKey(profile), displayName);
    },
    findProfiles(viewer: string, search: string) {
      const rows = db.prepare(`SELECT n.profile FROM player_names n LEFT JOIN rankings_privacy p ON p.profile=n.profile
        WHERE n.profile<>? AND COALESCE(p.visible,1)=1 AND
          ((?='' AND EXISTS(SELECT 1 FROM player_follows f WHERE f.follower=? AND f.followed=n.profile))
          OR (?<>'' AND instr(lower(n.name),lower(?))>0))
        ORDER BY n.name,n.public_key LIMIT 25`).all(viewer, search, viewer, search, search);
      return rows.map(({ profile }) => social(String(profile), viewer));
    },
    follow(viewer: string, key: string, follow: boolean) {
      const target = db.prepare(`SELECT n.profile FROM player_names n LEFT JOIN rankings_privacy p ON p.profile=n.profile
        WHERE n.public_key=? AND n.profile<>? AND (?=0 OR COALESCE(p.visible,1)=1)`).get(key, viewer, +follow)?.profile;
      if (typeof target !== 'string') return undefined;
      if (follow) {
        storeFollow.run(viewer,target);
        if (doesFollow.get(target,viewer)) {
          clearRequest.run(viewer,target);
          clearRequest.run(target,viewer);
        }
      }
      else db.prepare('DELETE FROM player_follows WHERE follower=? AND followed=?').run(viewer,target);
      return social(target, viewer);
    },
    incomingFriendRequests(viewer: string) {
      return db.prepare(`SELECT r.sender FROM player_friend_requests r
        LEFT JOIN rankings_privacy p ON p.profile=r.sender
        WHERE r.recipient=? AND COALESCE(p.visible,1)=1 ORDER BY r.rowid DESC`)
        .all(viewer).map(({sender})=>social(String(sender),viewer));
    },
    friendRequest(viewer: string, key: string, action: FriendRequestAction) {
      const target=network.byKey(key,viewer);
      if(typeof target!=='string'||target===viewer)return undefined;
      const alreadyFriends=doesFollow.get(viewer,target)&&doesFollow.get(target,viewer);
      const received=requestBetween.get(target,viewer);
      if(action==='request'&&!alreadyFriends&&received)return undefined;
      if(action==='accept'&&!alreadyFriends&&!received)return undefined;
      db.exec('BEGIN IMMEDIATE');
      try {
        if(action==='accept'||(action==='request'&&network.details(target)?.npc)){
          storeFollow.run(viewer,target);
          storeFollow.run(target,viewer);
          clearRequest.run(viewer,target);
          clearRequest.run(target,viewer);
        } else if(action==='request'&&!alreadyFriends){
          db.prepare('INSERT OR IGNORE INTO player_friend_requests VALUES (?,?)').run(viewer,target);
        } else if(action==='decline')clearRequest.run(target,viewer);
        else if(action==='cancel')clearRequest.run(viewer,target);
        db.exec('COMMIT');
      } catch(error){db.exec('ROLLBACK');throw error;}
      return social(target,viewer);
    },
    rateMatch(results: { profile: string; wins: number }[]) {
      if (results.length < 2 || results.filter(({ wins }) => wins === 1).length !== 1) return;
      const seed = results.map((entry) => ({ ...entry, elo: rating(entry.profile) }));
      const store = db.prepare('INSERT INTO league_ratings VALUES (?,?) ON CONFLICT(profile) DO UPDATE SET elo=excluded.elo');
      for (const player of seed) {
        const adjustment = seed.filter((opponent) => opponent !== player).reduce((sum, opponent) => {
          const expected = 1 / (1 + 10 ** ((opponent.elo - player.elo) / 400));
          return sum + (player.wins === opponent.wins ? .5 : player.wins) - expected;
        }, 0);
        store.run(player.profile, player.elo + Math.round(32 * adjustment / (seed.length - 1)));
      }
    },
    setClub(profile: string, club: Club | null) {
      if (club) db.prepare('INSERT INTO league_members VALUES (?,?) ON CONFLICT(profile) DO UPDATE SET club=excluded.club').run(profile, club);
      else db.prepare('DELETE FROM league_members WHERE profile=?').run(profile);
    },
    clanDirectory() {
      const totals = db.prepare('SELECT club, COUNT(*) AS members FROM league_members GROUP BY club').all();
      const rows = db.prepare(`SELECT m.club, m.profile, COALESCE(n.name,'Player') AS name,
          COUNT(r.match) AS played, COALESCE(SUM(r.wins),0) AS wins
        FROM league_members m LEFT JOIN rankings_privacy p ON p.profile=m.profile
        LEFT JOIN player_names n ON n.profile=m.profile
        LEFT JOIN league_match_clubs c ON c.profile=m.profile AND c.club=m.club
        LEFT JOIN results r ON r.profile=c.profile AND r.match=c.match
        WHERE COALESCE(p.visible,1)=1 GROUP BY m.club,m.profile
        ORDER BY wins DESC, played ASC, name ASC, m.profile ASC`).all();
      return CLUBS.map(({ id }) => ({
        id, members: Number(totals.find(({ club }) => club === id)?.members ?? 0),
        roster: rows.filter(({ club }) => club === id).map((row) => ({
          key: publicKey(String(row.profile)), name: String(row.name),
          played: Number(row.played), wins: Number(row.wins), elo: rating(String(row.profile)),
        }))
      }));
    },
    recordClub(match: string, profile: string, id: Club | null) {
      const club = CLUBS.find((item) => item.id === id);
      db.prepare('INSERT OR IGNORE INTO league_match_clubs VALUES (?,?,?,?)').run(match, profile, club?.id ?? null, club?.division ?? null);
    },
    profile(profile: string): LeagueProfile {
      const row = db.prepare(`SELECT ${stats}, COALESCE((SELECT name FROM results WHERE profile=? ORDER BY time DESC,match DESC LIMIT 1),'Player') AS name
        FROM results WHERE profile=?`).get(profile,profile) as unknown as LeagueProfile['stats'];
      const history = db.prepare('SELECT time,wins,holds,hits,faults FROM results WHERE profile=? ORDER BY time DESC,match DESC LIMIT 50')
        .all(profile) as unknown as (Omit<LeagueProfile['history'][number], 'won'> & { wins: number })[];
      const displayName = name(profile);
      return { stats: row, club: getClub(profile), xp: row.wins * 100 + (row.played - row.wins) * 25,
        elo: rating(profile), displayName, social: social(profile, profile),
        history: history.map(({ wins, ...match }) => ({ ...match, won: wins > 0 })) };
    },
    query(season: string, stage: string, club: string): LeagueData {
      const date = /^\d{4}$/.test(season) ? season : '';
      const seasons = db.prepare("SELECT DISTINCT strftime('%Y',time/1000,'unixepoch') AS year FROM results ORDER BY year DESC").all()
        .map(({ year }) => String(year));
      const filters = ` FROM results r
        LEFT JOIN rankings_privacy p ON p.profile=r.profile
        LEFT JOIN league_match_clubs c ON c.profile=r.profile AND c.match=r.match
        WHERE COALESCE(p.visible,1)=1 AND (?='' OR strftime('%Y',r.time/1000,'unixepoch')=?)
          AND (?='' OR c.club=?) AND ? <> 'playoffs'`;
      const args = [date,date,club,club,stage];
      const grouped = (key: 'r.profile' | 'c.club' | 'c.division', name: string) => db.prepare(`
        WITH ordered AS (SELECT ${key} AS key, r.profile, r.wins, r.holds, r.hits, r.faults,
          ROW_NUMBER() OVER (PARTITION BY ${key} ORDER BY r.time DESC,r.match DESC,r.profile) AS rank
          ${filters} AND ${key} IS NOT NULL),
        recent AS (SELECT key, wins FROM ordered WHERE rank=1)
        SELECT o.key, ${name} AS name, COUNT(*) AS played, SUM(o.wins) AS wins, SUM(o.holds) AS holds,
          SUM(o.hits) AS hits, SUM(o.faults) AS faults,
          SUM(CASE WHEN o.rank<=10 THEN o.wins ELSE 0 END) AS lastTenWins,
          MIN(COUNT(*),10) AS lastTenPlayed,
          (CASE WHEN recent.wins=1 THEN 'W' ELSE 'L' END) ||
          (COALESCE(MIN(CASE WHEN o.wins<>recent.wins THEN o.rank END),COUNT(*)+1)-1) AS streak
        FROM ordered o JOIN recent ON recent.key=o.key GROUP BY o.key`).all(...args) as unknown as LeagueRow[];
      const raw = grouped('r.profile',
        '(SELECT name FROM results latest WHERE latest.profile=o.profile ORDER BY time DESC,match DESC LIMIT 1)');
      const players = raw.map((row) => ({ ...row, name: name(row.key) || row.name, elo: rating(row.key), key: publicKey(row.key) }));
      function table(kind: 'club' | 'division') {
        return grouped(kind === 'club' ? 'c.club' : 'c.division', 'o.key')
          .map((row) => ({ ...row, elo: 0, name: kind === 'club' ? CLUBS.find(({ id }) => id === row.key)?.name ?? row.name : row.name }));
      }
      return { players, clubs: table('club'), divisions: table('division'), seasons };
    },
  };
}
