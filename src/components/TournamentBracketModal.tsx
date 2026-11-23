import { useEffect, useRef, useState } from 'react';
import { CHARACTERS } from '../utils/characters';
import { VENUES } from '../utils/venueData';
import type { TournamentStage } from '../types/campaign';
import type { CupHeat, CupView } from '../services/tournamentTypes';
import { preparePlayerSession } from '../services/marketClient';
import { getLocalTournamentBracket } from '../services/tournamentBracket';

export const TOURNAMENT_ROUNDS = ['quarterfinals', 'semifinals', 'finals', 'champion'] as const;
const roundNames = ['Quarterfinals', 'Semifinals', 'Final'];
const sections = ['Current','Schedule','Watch','Create','Local'] as const;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onEnterMatch: (opponents: string[]) => void;
  onEnterOnline: (room: string, final: boolean) => void;
  onWatch: (room:string) => void;
  onReset: () => void;
  equippedCharId: string;
  playerName: string;
  tournamentStage: TournamentStage;
  eliminated: boolean;
  qualifiers: string[][];
}

function Heat({ name, names, status, action }: { name: string; names: string[]; status: string; action?: () => void }) {
  return <article className="cup-heat">
    <header><strong>{name}</strong><small>{status}</small></header>
    <ol>{names.map((player, index) => <li key={index}>{player}</li>)}</ol>
    {action && <button className="league-primary" onClick={action}>Enter court</button>}
  </article>;
}

export function TournamentBracketModal({ isOpen, onClose, onEnterMatch, onEnterOnline, onWatch, onReset, equippedCharId, playerName, tournamentStage, eliminated, qualifiers }: Props) {
  const [tab, setTab] = useState<typeof sections[number]>('Current');
  const [search,setSearch] = useState('');
  const [classification,setClassification] = useState('all');
  const [format,setFormat] = useState('all');
  const [venueId,setVenueId] = useState<string>(VENUES[0].id);
  const [start,setStart] = useState('');
  const [mode,setMode] = useState<'points'|'timed'>('points');
  const [target,setTarget] = useState(5);
  const [cups, setCups] = useState<CupView[]>([]);
  const [eventId, setEventId] = useState('');
  const [title, setTitle] = useState('');
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!isOpen || tab === 'Local') return;
    let active = true;
    const refresh = async () => {
      const response = await fetch('/api/tournaments', { cache: 'no-store' });
      if (!response.ok) throw Error();
      const listing: CupView[] = await response.json();
      if (active) setCups(listing);
    };
    void preparePlayerSession().then(() => { if (active) return refresh(); }).catch(() => { if (active) setFeedback('Online tournaments are unavailable.'); });
    const poll = window.setInterval(() => { if (!busy) void refresh().catch(() => {}); }, 2500);
    return () => { active = false; window.clearInterval(poll); };
  }, [isOpen, tab, busy]);
  if (!isOpen) return null;
  const selected = cups.find(({ id }) => id === eventId);
  const table = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const [tableWidth,setTableWidth]=useState(0);
  useEffect(()=>{
    const panel=table.current;
    const content=panel?.querySelector('table');
    if(!panel || !content)return;
    const measure=()=>setTableWidth(Math.max(panel.clientWidth,panel.scrollWidth));
    const observer=new ResizeObserver(measure);
    observer.observe(panel);observer.observe(content);measure();
    return()=>observer.disconnect();
  },[isOpen,tab]);
  const stage = TOURNAMENT_ROUNDS.indexOf(tournamentStage);
  const send = async (action: 'create' | 'join', id?: string) => {
    setBusy(true);
    try {
      await preparePlayerSession();
      const response = await fetch('/api/tournaments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, id, title, venueId, starts:start?new Date(start).getTime():Date.now(),mode,target }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setCups(data);
      if (action === 'create') {
        setEventId(data.find((cup: CupView) => cup.joined && !cup.official && cup.name === title.trim())?.id ?? '');
        setTitle('');
        setTab('Current');
      }
      setFeedback('');
    } catch (error) { setFeedback(error instanceof Error ? error.message : 'Could not update the event.'); }
    finally { setBusy(false); }
  };
  const drawOnline = (heat: CupHeat) => <Heat key={heat.id} name={heat.id} names={heat.players.map(({ name }) => name)}
    status={heat.advanced.length ? (heat.id === 'Final' ? 'Champion' : 'Advanced') + ' · ' + heat.advanced.map(({ name }) => name).join(', ') : 'Ready to play'}
    action={heat.room ? () => onEnterOnline(heat.room!, heat.id === 'Final') : undefined}/>;
  return <div className="league-overlay" role="dialog" aria-modal="true" aria-label="Tournament">
    <section className="league-panel cup-panel">
      <header className="league-header"><h2>Tournaments</h2><button className="league-button" onClick={onClose}>Close</button></header>
      <nav className="league-tabs" aria-label="Tournament mode">{sections.map((name) =>
        <button className="league-button" key={name} aria-pressed={tab === name} onClick={() => { setTab(name); setFeedback(''); }}>{name}</button>)}</nav>
      {feedback && <p role="status" className="profile-status">{feedback}</p>}
      {tab === 'Local' ? <>
        <div className="cup-bracket">{getLocalTournamentBracket(equippedCharId, qualifiers).map((round, index) => (
          <section key={roundNames[index]}><h3>{roundNames[index]}</h3>
            <div>{round.map((heat, heatIndex) => <Heat key={heatIndex} name={index === 2 ? 'Championship' : 'Court ' + (heatIndex + 1)}
              names={Array.from({ length: 4 }, (_, seat) => { const id = heat[seat]; return id === equippedCharId ? playerName + ' (You)' : CHARACTERS.find((character) => character.id === id)?.name ?? 'Qualifier'; })}
              status={index < stage ? 'Complete' : index === stage && heatIndex === 0 ? eliminated ? 'Eliminated' : 'Your match' : 'CPU bracket'}
              action={!eliminated && index === stage && heatIndex === 0 && heat.length === 4 ? () => onEnterMatch(heat.filter((id) => id !== equippedCharId)) : undefined}/>)}</div>
          </section>
        ))}</div>
        {(eliminated || stage === 3 || (stage > 0 && qualifiers.length < stage && stage < 3)) && <footer className="league-footer">
          <strong>{eliminated ? 'Eliminated' : stage === 3 ? 'Champion · 150 coins awarded' : 'Start a new bracket'}</strong>
          <button className="league-button" onClick={onReset}>Enter again</button></footer>}
      </> : <>
        {tab==='Create' ? <form className="cup-create" onSubmit={(event)=>{event.preventDefault();void send('create');}}>
          <h3 className="text-xl font-bold">Create a community tournament</h3>
          <div className="cup-format-choices">
            <button type="button" className="league-button" aria-pressed={mode==='points'} onClick={()=>{setMode('points');setTarget(5);}}>Point bracket · First to the crown target</button>
            <button type="button" className="league-button" aria-pressed={mode==='timed'} onClick={()=>{setMode('timed');setTarget(5);}}>Timed bracket · Highest finish at the buzzer</button>
          </div>
          <label>Name<input placeholder="Tournament name" maxLength={36} required value={title} onChange={(e)=>setTitle(e.target.value)}/></label>
          <label>Venue<select value={venueId} onChange={(e)=>setVenueId(e.target.value)}>{VENUES.map(({id,name})=><option key={id} value={id}>{name}</option>)}</select></label>
          <label>Start time<input type="datetime-local" value={start} onChange={(e)=>setStart(e.target.value)}/></label>
          <label>{mode==='timed'?'Minutes per match':'Crown holds to win'}<input type="number" required min={1} max={20} value={target} onChange={(e)=>setTarget(Number(e.target.value))}/></label>
          <p>8 players · Two semifinals · Four-player final</p>
          <button className="league-primary" disabled={busy}>Create tournament</button>
        </form> : <>
          <div className="cup-controls">
            <label className="grid gap-1">Search tournaments<input value={search} onChange={(e)=>setSearch(e.target.value)}/></label>
            <label className="grid gap-1">Type<select value={classification} onChange={(e)=>setClassification(e.target.value)}>
              <option value="all">All types</option><option value="official">Official</option><option value="community">Community</option>
            </select></label>
            <label className="grid gap-1">Rules<select value={format} onChange={(e)=>setFormat(e.target.value)}>
              <option value="all">All rules</option><option value="points">Point based</option><option value="timed">Timed</option>
            </select></label>
          </div>
          <div className="cup-table-wrap" ref={table} onScroll={()=>{if(bar.current && table.current && bar.current.scrollLeft!==table.current.scrollLeft)bar.current.scrollLeft=table.current.scrollLeft;}}>
            <table className="cup-table"><thead><tr><th>Starts</th><th>Tournament</th><th>Venue</th><th>Rules</th><th>Players</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>{cups.filter((cup)=>{
                const live=cup.heats.some((heat)=>heat.watchRoom);
                return (tab==='Watch'?live:tab==='Schedule'?cup.starts>Date.now():cup.starts<=Date.now()) &&
                  (classification==='all'||cup.official===(classification==='official')) &&
                  (format==='all'||cup.rules.mode===format) &&
                  (cup.name+' '+(VENUES.find(({id})=>id===cup.venueId)?.name??'')).toLowerCase().includes(search.trim().toLowerCase());
              }).map((cup)=>{
                const heat=cup.heats.find((entry)=>entry.watchRoom);
                const done=cup.heats.some((entry)=>entry.id==='Final'&&entry.advanced.length);
                return <tr key={cup.id}>
                  <td>{new Date(cup.starts).toLocaleString([], {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}</td>
                  <th scope="row"><button onClick={()=>setEventId(cup.id)}>{cup.name}</button><small>{cup.official?'Official':'Community'}</small></th>
                  <td>{VENUES.find(({id})=>id===cup.venueId)?.name}</td>
                  <td>{cup.rules.mode==='timed'?cup.rules.target+' min':cup.rules.target+' crown holds'}</td>
                  <td>{cup.players.length}/8</td>
                  <td>{done?'Finished':heat?'Live':cup.registrationOpen?'Registration':cup.heats.length?'Bracket ready':'Waiting'}</td>
                  <td><div className="flex gap-2">{heat?.watchRoom&&<button className="league-button" onClick={()=>onWatch(heat.watchRoom!)}>Watch</button>}
                    {!cup.joined&&cup.registrationOpen?<button className="league-primary" disabled={busy} onClick={()=>{setEventId(cup.id);void send('join',cup.id);}}>Join</button>
                      :<button className="league-button" onClick={()=>setEventId(cup.id)}>Bracket</button>}</div></td>
                </tr>;
              })}</tbody>
            </table>
            {tab==='Watch'&&!cups.some((cup)=>cup.heats.some((heat)=>heat.watchRoom))&&<p className="p-4">No live tournament courts.</p>}
          </div>
        </>}
        {selected && tab!=='Create' && <div className="cup-selected p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3><strong>{selected.name}</strong> · {selected.players.length}/8 registered</h3>
            {!selected.joined && selected.registrationOpen && <button className="league-primary" disabled={busy} onClick={() => void send('join', selected.id)}>Join tournament</button>}
            {selected.joined && <span>Registered</span>}
          </div>
          {selected.official && <p className="text-sm text-stone-300">Monthly opener · {new Date(selected.starts).toLocaleString()}</p>}
          {!selected.heats.length && <p className="mt-3 text-sm">The bracket opens with eight players{Date.now() < selected.starts ? ' at the scheduled time' : ''}.</p>}
          <div className="cup-bracket cup-bracket-online">
            <section><h3>Entrants</h3><Heat name="Registration" names={selected.players.map(({ name }) => name)} status={selected.registrationOpen ? 'Open' : selected.players.length === 8 ? 'Full' : 'Closed'}/></section>
            <section><h3>Semifinals</h3><div>{selected.heats.filter(({ id }) => id !== 'Final').map(drawOnline)}</div></section>
            <section><h3>Final</h3>{selected.heats.filter(({ id }) => id === 'Final').map(drawOnline)}</section>
          </div>
        </div>}
        {tab!=='Create' && <div className="cup-bottom-scroll" tabIndex={0} aria-label="Scroll tournament columns" ref={bar}
          onScroll={()=>{if(table.current && bar.current && bar.current.scrollLeft!==table.current.scrollLeft)table.current.scrollLeft=bar.current.scrollLeft;}}>
          <div style={{width:tableWidth,height:1}}/>
        </div>}
      </>}
    </section>
  </div>;
}
