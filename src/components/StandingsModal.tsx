import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { CLUBS, standingsPoints, type LeagueData, type LeagueProfile, type LeagueRow } from '../services/leagueTypes';
import { ClanDirectory } from './ClanDirectory';
import { getMatchHistory } from '../services/matchHistory';
import { preparePlayerSession } from '../services/marketClient';

const sections = ['Stats', 'Standings', 'Clans'] as const;
const statViews = ['Leaders', 'Players', 'Kings & hitters', 'Defenders', 'My history', 'Glossary'] as const;
const rankViews = ['Players', 'Clubs', 'Divisions'] as const;
type View = typeof statViews[number] | typeof rankViews[number];
const columns = [
  ['elo','Elo'],
  ['points','Points'],
  ['played','Played'], ['wins','Wins'], ['losses','Losses'], ['rate','Win %'],
  ['holds','Crown holds'], ['hits','Hits'], ['faults','Faults'], ['lastTenWins','Last 10'],
] as const;
type Metric = typeof columns[number][0];
const value = (row: LeagueRow, metric: Metric) => metric === 'rate' ? row.played ? Math.round(row.wins / row.played * 100) : 0
  : metric === 'losses' ? row.played - row.wins : metric === 'points' ? standingsPoints(row.wins) : row[metric];
export function StandingsModal({ isOpen, onClose, initialView = 'Standings' }: { isOpen: boolean; onClose: () => void; initialView?: typeof sections[number] }) {
  const [section, setSection] = useState<typeof sections[number]>(initialView);
  const [tab, setTab] = useState<View>(initialView === 'Stats' ? 'Leaders' : 'Players');
  const [data,setData] = useState<LeagueData>();
  const [season,setSeason] = useState('');
  const [stage,setStage] = useState('');
  const [club,setClub] = useState('');
  const [sort,setSort] = useState<{ metric: Metric; ascending: boolean }>({ metric:initialView === 'Stats' ? 'hits' : 'points', ascending:false });
  const [selected,setSelected] = useState<string>();
  const [error,setError] = useState(false);
  const [onlineHistory, setOnlineHistory] = useState<LeagueProfile['history']>();
  const [historyError, setHistoryError] = useState(false);
  const [clanResults, setClanResults] = useState<LeagueRow[]>([]);
  useEffect(() => {
    if (!isOpen || section !== 'Clans') return;
    const request = new AbortController();
    fetch('/api/league', { signal: request.signal }).then((response) => {
      if (!response.ok) throw Error();
      return response.json();
    }).then((league: LeagueData) => setClanResults(league.clubs)).catch(() => {});
    return () => request.abort();
  }, [isOpen,section]);
  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    setError(false);
    setData(undefined);
    const q = new URLSearchParams({season,stage,club});
    fetch('/api/league?' + q, {signal:controller.signal}).then((response) => {
      if (!response.ok) throw Error('League unavailable');
      return response.json();
    }).then((result: LeagueData) => setData(result)).catch(() => { if (!controller.signal.aborted) { setError(true); setData(undefined); } });
    return () => controller.abort();
  }, [isOpen, season, stage, club]);
  useEffect(() => {
    if (!isOpen || tab !== 'My history') return;
    const request = new AbortController();
    setHistoryError(false);
    setOnlineHistory(undefined);
    void preparePlayerSession().then(async () => {
      if (request.signal.aborted) return;
      const response = await fetch('/api/player/profile', { signal: request.signal, cache: 'no-store' });
      if (!response.ok) throw Error();
      const profile: LeagueProfile = await response.json();
      if (!request.signal.aborted) setOnlineHistory(profile.history);
    }).catch(() => { if (!request.signal.aborted) setHistoryError(true); });
    return () => request.abort();
  }, [isOpen, tab]);
  if (!isOpen) return null;
  const pool = tab === 'Clubs' ? data?.clubs : tab === 'Divisions' ? data?.divisions : data?.players;
  const rows = [...(pool ?? [])].sort((a,b) => (value(b,sort.metric)-value(a,sort.metric)) * (sort.ascending ? -1 : 1) || b.holds-a.holds || a.name.localeCompare(b.name));
  const detail = pool?.find(({key}) => key === selected);
  const individual = tab !== 'Clubs' && tab !== 'Divisions';
  const shownColumns = section === 'Standings' ? columns.filter(([key]) => ['points','played','wins','losses','rate','elo','lastTenWins'].includes(key) && (individual || (key !== 'elo' && key !== 'lastTenWins')))
    : tab === 'Kings & hitters' ? columns.filter(([key]) => ['played','wins','holds','hits'].includes(key))
    : tab === 'Defenders' ? columns.filter(([key]) => ['played','holds','faults','rate'].includes(key))
    : columns.filter(([key]) => ['elo','played','holds','hits','faults'].includes(key));
  const selectClass = 'rounded-lg border border-white/15 bg-[#222c2a] px-3 py-2 text-sm';
  return <div role="dialog" aria-modal="true" aria-label="Online league" className="fixed inset-0 z-50 overflow-auto bg-black p-5 text-stone-100 sm:p-9">
    <div className="mx-auto max-w-6xl">
      <header className="flex justify-between"><h2 className="text-3xl font-black">{section}</h2><button aria-label="Close league" onClick={onClose}><X/></button></header>
      <nav className="my-5 flex flex-wrap gap-2" aria-label="League sections">{sections.map((view) => <button key={view} className="league-button" aria-pressed={section === view} onClick={() => {
        setSection(view); setTab(view === 'Stats' ? 'Leaders' : 'Players'); setSelected(undefined);
        setSort({ metric: view === 'Stats' ? 'hits' : 'points', ascending: false });
      }}>{view}</button>)}</nav>
      {section === 'Clans' ? <ClanDirectory results={clanResults}/> : <>
      <nav className="my-5 flex flex-wrap gap-2" aria-label="League views">{(section === 'Stats' ? statViews : rankViews).map((view) => <button key={view} className={`rounded-lg px-3 py-2 text-sm ${tab===view ? 'bg-[#34433d] text-amber-100' : 'bg-white/5'}`} onClick={() => {
        setTab(view);
        setSelected(undefined);
        setSort({ metric: section === 'Standings' ? 'points' : view === 'Kings & hitters' || view === 'Defenders' ? 'holds' : 'hits', ascending: false });
      }} aria-pressed={tab===view}>{view}</button>)}</nav>
      {tab === 'Glossary' ? <dl className="field-panel space-y-3 p-5">
        <div><dt className="font-bold">Elo</dt><dd>Career rating starts at 1,000 and updates after verified online matches with a human winner.</dd></div>
        <div><dt className="font-bold">Crown holds</dt><dd>Successful defenses of Square 1.</dd></div>
        <div><dt className="font-bold">Win %</dt><dd>Wins divided by finished online matches.</dd></div>
        <div><dt className="font-bold">Standings points</dt><dd>Each win earns three points.</dd></div>
        <div><dt className="font-bold">Club and division totals</dt><dd>Results of their members at the start of each match.</dd></div>
      </dl>
      : tab === 'My history' ? <div className="field-panel space-y-3 p-5">
        <h3 className="font-bold">Verified online</h3>
        {onlineHistory?.length ? onlineHistory.map((match, index) => <p key={index}>{new Date(match.time).toLocaleDateString()} · {match.won ? 'Win' : 'Loss'} · {match.holds} holds · {match.hits} hits · {match.faults} faults</p>)
          : <p>{historyError ? 'Online history unavailable.' : onlineHistory ? 'No verified online matches.' : 'Loading online history…'}</p>}
        <h3 className="font-bold">On this device</h3>
        {getMatchHistory().length ? getMatchHistory().map((match) => <p key={match.id}>{match.mode} · {match.venue} · {match.winner}</p>) : <p>No completed matches on this device.</p>}
      </div>
      : <>
        <div className="mb-5 flex flex-wrap gap-2">
          <select aria-label="Season" className={selectClass} value={season} onChange={(e) => setSeason(e.target.value)}><option value="">All seasons</option>{[...new Set([...(data?.seasons ?? []), ...(season ? [season] : [])])].map((year) => <option key={year}>{year}</option>)}</select>
          <select aria-label="Stage" className={selectClass} value={stage} onChange={(e) => setStage(e.target.value)}><option value="">All stages</option><option value="regular">Regular season</option><option value="playoffs">Playoffs</option></select>
          <select aria-label="Club" className={selectClass} value={club} onChange={(e) => setClub(e.target.value)}><option value="">All clubs</option>{CLUBS.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select>
        </div>
        {tab==='Leaders' && rows.length>0 && <div className="mb-5 grid gap-3 sm:grid-cols-3">{(['wins','holds','hits'] as const).map((metric) => {
          const first = [...rows].sort((a,b)=>b[metric]-a[metric])[0];
          return <button key={metric} className="field-panel p-4 text-left" onClick={() => setSelected(first.key)}><span className="text-sm text-amber-200">{columns.find(([key])=>key===metric)?.[1]} leader</span><b className="mt-2 block">{first.name} · {first[metric]}</b></button>;
        })}</div>}
        {detail && <aside className="field-panel mb-4 flex flex-wrap items-center justify-between gap-3 p-4"><strong>{detail.name}</strong><span>{detail.wins} wins in {detail.played} results · {detail.holds} holds · {detail.hits} hits · {detail.faults} faults{individual && ` · ${detail.streak}`}</span>
          {tab === 'Clubs' && <button className="league-button" onClick={() => { setClub(detail.key); setTab('Players'); setSelected(undefined); setSort({ metric: 'elo', ascending: false }); }}>View players</button>}
          <button aria-label="Close details" onClick={() => setSelected(undefined)}><X size={16}/></button></aside>}
        <div className="field-panel overflow-auto">
          {rows.length ? <table className="w-full min-w-[590px] text-left text-sm"><thead><tr><th className="px-4 py-3">{tab==='Clubs' ? 'Club' : tab==='Divisions' ? 'Division' : 'Player'}</th>{shownColumns.map(([key,label])=><th key={key} className="px-3 py-3" aria-sort={sort.metric===key ? sort.ascending ? 'ascending' : 'descending' : 'none'}><button onClick={()=>setSort({metric:key,ascending:sort.metric===key&&!sort.ascending})}>{label}</button></th>)}{individual && <th className="px-3 py-3">Streak</th>}</tr></thead>
          <tbody>{(tab==='Leaders' ? rows.slice(0,10) : rows).map((row,i)=><tr key={row.key} className="border-t border-white/10"><th scope="row" className="px-4 py-3">{i+1}. <button onClick={()=>setSelected(row.key)} className="text-amber-100 hover:underline">{row.name}</button></th>{shownColumns.map(([metric])=><td className="px-3" key={metric}>{value(row,metric)}{metric === 'rate' ? '%' : metric === 'lastTenWins' ? `–${row.lastTenPlayed - row.lastTenWins}` : ''}</td>)}{individual && <td className="px-3">{row.streak}</td>}</tr>)}</tbody></table>
          : <p className="p-5 text-stone-400">{error ? 'Could not load the league.' : data ? 'No verified results for this view.' : 'Loading standings…'}</p>}
        </div>
        {tab==='Leaders'&&rows.length>0&&<button className="mt-4 text-sm text-amber-200" onClick={()=>setTab('Players')}>All players</button>}
      </>}
      </>}
    </div>
  </div>;
}
