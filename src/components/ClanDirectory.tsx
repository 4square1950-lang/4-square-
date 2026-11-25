import { useEffect, useState } from 'react';
import { Shield, Trophy, Users } from 'lucide-react';
import { CLUBS, clanTier, standingsPoints, type ClanSummary, type Club, type LeagueRow } from '../services/leagueTypes';
import { preparePlayerSession } from '../services/marketClient';

type Directory = { memberOf: Club | null; clans: ClanSummary[] };
const clanColours: Record<Club, string> = { oakridge: '#526c4c', kanata: '#415b72', sunset: '#854b3a', metro: '#6c5979' };

export function ClanDirectory({ results }: { results: LeagueRow[] }) {
  const [directory, setDirectory] = useState<Directory>();
  const [selected, setSelected] = useState<Club>();
  const [mode, setMode] = useState<'browse' | 'mine'>('browse');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');

  async function load(signal?: AbortSignal): Promise<Directory> {
    const response = await fetch('/api/league/clans', { signal, cache: 'no-store' });
    if (!response.ok) throw Error('Clan directory unavailable.');
    return response.json();
  }

  useEffect(() => {
    const request = new AbortController();
    void preparePlayerSession().then(() => load(request.signal)).then(setDirectory)
      .catch(() => { if (!request.signal.aborted) setMessage('Clan directory unavailable.'); });
    return () => request.abort();
  }, []);

  async function changeMembership(club: Club | null) {
    setPending(true);
    setMessage('');
    try {
      const response = await fetch('/api/player/club', { method: 'PUT',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ club }) });
      if (!response.ok) throw Error('Could not change membership.');
      setDirectory(await load());
      setMode(club ? 'mine' : 'browse');
      setMessage(club ? 'Joined clan.' : 'Left clan.');
    } catch {
      setMessage('Could not change membership. Try again.');
    } finally { setPending(false); }
  }

  const id = mode === 'mine' ? directory?.memberOf : selected ?? directory?.memberOf ?? CLUBS[0].id;
  const clan = CLUBS.find((entry) => entry.id === id);
  const summary = directory?.clans.find((entry) => entry.id === id);
  const totals = results.find((entry) => entry.key === id);
  const wins = totals?.wins ?? 0;
  const points = standingsPoints(wins);

  return <section aria-label="Clans" className="space-y-4">
    <nav aria-label="Clan views" className="flex flex-wrap gap-2">
      <a className="league-button" href={`${(import.meta.env.VITE_CLAN_HUB_URL || 'http://localhost:4110').replace(/\/$/, '')}/?game=four-square`} target="_blank" rel="noopener">Cross-game clans</a>
      <button className="league-button" aria-pressed={mode === 'browse'} onClick={() => setMode('browse')}>Find a clan</button>
      <button className="league-button" aria-pressed={mode === 'mine'} onClick={() => setMode('mine')}>My clan</button>
    </nav>
    {mode === 'browse' && <div className="flex flex-wrap gap-2">{CLUBS.map((entry) =>
      <button className="league-button" key={entry.id} aria-pressed={id === entry.id} onClick={() => setSelected(entry.id)}>
        {entry.name}
      </button>)}</div>}
    {message && <p role="status" className="text-sm text-amber-200">{message}</p>}
    {clan ? <>
      <article className="field-panel grid items-center gap-4 p-5 sm:grid-cols-[auto_1fr_auto]">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/20" style={{ background: clanColours[clan.id] }}><Shield size={44}/></div>
        <div><p className="text-sm text-amber-200">{clanTier(points)} · {clan.division} Division</p>
          <h3 className="text-3xl font-black">{clan.name}</h3>
          <dl className="mt-3 flex flex-wrap gap-5 text-sm">
            <div><dt className="text-stone-400">Points</dt><dd className="font-bold">{points}</dd></div>
            <div><dt className="text-stone-400">Wins</dt><dd>{wins}</dd></div>
            <div><dt className="text-stone-400">Losses</dt><dd>{(totals?.played ?? 0) - wins}</dd></div>
            <div><dt className="text-stone-400">Members</dt><dd>{summary?.members ?? '—'}</dd></div>
          </dl>
        </div>
        <button className="league-primary" disabled={!directory || pending}
          onClick={() => void changeMembership(directory?.memberOf === clan.id ? null : clan.id)}>
          {directory?.memberOf === clan.id ? 'Leave clan' : directory?.memberOf ? 'Switch clan' : 'Join clan'}
        </button>
      </article>
      <div className="field-panel overflow-auto">
        <h3 className="flex items-center gap-2 p-4 font-bold"><Users size={16}/> Roster</h3>
        {summary?.roster.length ? <table className="w-full min-w-[450px] text-left text-sm">
          <thead><tr className="text-stone-400"><th className="px-4 pb-2">Member</th><th>Played</th><th>Wins</th><th>Losses</th><th>Elo</th><th>Points</th></tr></thead>
          <tbody>{summary.roster.map((member, index) => <tr key={member.key} className="border-t border-white/10">
            <th className="px-4 py-3">{index + 1}. {member.name}</th><td>{member.played}</td><td>{member.wins}</td>
            <td>{member.played - member.wins}</td><td>{member.elo}</td>
            <td><span className="inline-flex items-center gap-2 text-amber-200">{standingsPoints(member.wins)} <Trophy size={14}/></span></td>
          </tr>)}</tbody></table> : <p className="px-4 pb-4 text-sm text-stone-400">{directory ? 'No public members yet.' : 'Loading roster…'}</p>}
      </div>
    </> : <p className="field-panel p-5 text-sm">{directory ? 'Join a clan to see it here.' : 'Loading membership…'}</p>}
  </section>;
}
