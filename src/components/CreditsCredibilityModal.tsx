import { useEffect, useState } from 'react';
import { CharacterLineup } from './CharacterLineup';
import { CHARACTERS } from '../utils/characters';
import type { VictoryEdition } from '../types/campaign';

const scenes = [
  { title: 'Champions on the court', mode: 'court', characters: CHARACTERS.slice(0, 5) },
  { title: 'Victory dance', mode: 'dance', characters: CHARACTERS.slice(4, 9) },
  { title: 'Pool party', mode: 'pool', characters: CHARACTERS.slice(7, 14) },
] as const;
const crew = [
  { role: 'Animation', names: ['Amara Price', 'Felix Ibarra', 'June Sato'] },
  { role: 'Court design', names: ['Mina Wells', 'Theo Park', 'Luis Bennett'] },
  { role: 'Writing', names: ['Nora Vale', 'Caleb Reyes', 'Dani Brooks'] },
  { role: 'Music & sound', names: ['Imani Reed', 'Aaron Kim', 'Jessa Bell'] },
  { role: 'Playtesting', names: ['Tess Morgan', 'Nico Ellis', 'Suri Lane', 'Eli Cruz'] },
];

export function CreditsCredibilityModal({ isOpen, onClose, edition }: { isOpen: boolean; onClose: () => void; edition?: VictoryEdition }) {
  const [scene, setScene] = useState(-1);
  useEffect(() => { if (isOpen) setScene(-1); }, [isOpen]);
  useEffect(() => {
    if (!isOpen || scene < 0 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setTimeout(() => setScene((previous) => (previous + 1) % scenes.length), 6500);
    return () => clearTimeout(timer);
  }, [scene, isOpen]);
  if (!isOpen || !edition) return null;
  const active = scenes[scene];
  return <div className="league-overlay victory-overlay" role="dialog" aria-modal="true" aria-label="Championship celebration">
    {!active ? <article className="victory-paper">
      <header><span>{new Date(edition.date).toLocaleDateString()}</span><strong>The Blacktop Chronicle</strong><span>Sports</span></header>
      <p>Championship edition</p>
      <h2>{edition.winner} takes the crown</h2>
      <p>{edition.event} final · {edition.venue}</p>
      <div className="victory-actions"><button className="league-button" onClick={onClose}>Skip</button><button className="league-primary" onClick={() => setScene(0)}>Continue to credits</button></div>
    </article> : <section className="league-panel victory-panel">
      <header className="league-header"><h2>Credits & credibility</h2><button className="league-button" onClick={onClose}>Close</button></header>
      <div className="victory-split">
        <div className="victory-crew"><h3>Four Square</h3><p>Built by the Four Square project.</p><p>World map data by Natural Earth.</p>
          <h3>In-universe crew</h3><p>Fictional credits</p>
          <dl>{crew.flatMap(({ role, names }) => names.map((name) =>
            <div key={name}><dt>{role}</dt><dd>{name}</dd></div>
          ))}</dl>
        </div>
        <div className="victory-cast"><div key={active.mode} className="victory-scene"><CharacterLineup characters={active.characters} celebration={active.mode}/></div>
          <div className="victory-actions"><span>{active.title}</span><button className="league-button" onClick={() => setScene((scene + 1) % scenes.length)}>Next scene</button></div>
        </div>
      </div>
    </section>}
  </div>;
}
