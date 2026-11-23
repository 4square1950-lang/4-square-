import { useState } from 'react';
import { BookOpen, Gamepad2, X } from 'lucide-react';
import { LOCAL_SEATS } from '../services/localMultiplayer';

const topics=[
  {title:'Serve',summary:'Square 1 serves underhand to Square 4.',lines:['Drop the ball for a bounce in Square 1, then hit diagonally.','Aim inside Square 4 for a legal first landing.']},
  {title:'Return',summary:'Let the ball bounce once in your square.',lines:['Return it to a different square with one clean hit.','A second bounce, catch, carry, or double hit is a fault.']},
  {title:'Lines',summary:'Keep the ball inside the outside boundary.',lines:['A ball beyond the painted boundary is out.','Inside line calls and serve retries follow the active ruleset.']},
  {title:'Rotation',summary:'When someone faults, the queue rotates.',lines:['The next player enters Square 4. Players ahead of the open square move toward Square 1.','Hold Square 1 and win rallies to earn crown holds.']},
  {title:'Win',summary:'Meet the match’s crown-hold target.',lines:['The target appears on the match scoreboard.','Timed tournaments use the rules and time limit shown in their event listing.']},
];

const controls=[
  ['Move on campus or in single player','WASD or arrows','Left stick'],
  ['Look around campus','Drag the mouse','Right stick'],
  ['Interact on campus','E or click','A / Cross'],
  ['Serve','Space, 4, or click Square 4','A / Cross'],
  ['Aim and hit','1–4 or click a square','D-pad'],
  ['Reach in single player','Hold F','Hold RB / R1'],
  ['Fast return in offline matches','Hold Shift while hitting','Hold RT / R2 while hitting'],
  ['Open pause menu','Esc','Menu / Options'],
];

export function ControlGuide() {
  return <div className="rules-controls">
    <div className="rules-controls-scroll"><table>
      <thead><tr><th scope="col">Action</th><th scope="col">Keyboard &amp; mouse</th><th scope="col">Xbox / PlayStation</th></tr></thead>
      <tbody>{controls.map(([action,keyboard,gamepad])=><tr key={action}><th scope="row">{action}</th><td>{keyboard}</td><td>{gamepad}</td></tr>)}</tbody>
    </table></div>
    <p>D-pad up, right, down, and left aim at squares 2, 4, 3, and 1.</p>
    <details><summary>Local pass-and-play keys</summary>
      <ul>{LOCAL_SEATS.map((seat)=><li key={seat.id}>{seat.name} · {seat.keysLabel} aim at squares 1–4 · {seat.quickLabel} quick shot</li>)}</ul>
      <p>A shared controller acts for the current player.</p>
    </details>
  </div>;
}

export function RulebookModal({isOpen,onClose}:{isOpen:boolean;onClose:()=>void}) {
  const [selection,setSelection]=useState(0);
  const [page,setPage]=useState<'rules'|'controls'>('rules');
  if(!isOpen)return null;
  const topic=topics[selection];
  return <section className="rulebook-page" role="dialog" aria-modal="true" aria-label="Rules and controls" onKeyDown={(event)=>{if(event.code==='Escape')onClose();}}>
    <header><h2><BookOpen size={22}/> Rules &amp; controls</h2><button autoFocus aria-label="Close rules and controls" className="league-button" onClick={onClose}><X size={18}/></button></header>
    <main>
      <nav aria-label="Guide sections">
        <button className="league-button" aria-pressed={page==='rules'} onClick={()=>setPage('rules')}>Rules</button>
        <button className="league-button inline-flex items-center gap-2" aria-pressed={page==='controls'} onClick={()=>setPage('controls')}><Gamepad2 size={17}/>Controls</button>
      </nav>
      {page==='controls' ? <ControlGuide/> : <div className="rulebook-columns">
        <div>{topics.map(({title,summary},index)=><button className="rulebook-row" key={title} aria-pressed={selection===index} onClick={()=>setSelection(index)}><strong>{title}</strong><span>{summary}</span></button>)}</div>
        <aside className="field-panel"><h3>{topic.title}</h3><p>{topic.summary}</p><ul>{topic.lines.map((line)=><li key={line}>{line}</li>)}</ul></aside>
      </div>}
    </main>
  </section>;
}
