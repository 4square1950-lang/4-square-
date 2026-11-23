import { Building2, Sun } from 'lucide-react';

interface Props {
  isOpen: boolean;
  selectedVenueType: 'outdoor' | 'indoor';
  onSelectVenueType: (type: 'outdoor' | 'indoor') => void;
  onConfirm: () => void;
  onCancel: () => void;
}

const surfaces = [
  { id: 'outdoor', name: 'Outdoor blacktop', icon: Sun, surface: 'Asphalt' },
  { id: 'indoor', name: 'Indoor gymnasium', icon: Building2, surface: 'Hardwood' },
] as const;

export function VenueSelectModal({ isOpen, selectedVenueType, onSelectVenueType, onConfirm, onCancel }: Props) {
  if (!isOpen) return null;
  return <div className="league-overlay" role="dialog" aria-modal="true" aria-label="Choose court">
    <section className="league-panel max-w-lg">
      <header className="league-header"><h2>Choose court</h2><button className="league-button" onClick={onCancel}>Cancel</button></header>
      <div className="grid grid-cols-2 gap-3 p-4">
        {surfaces.map(({ id, name, icon: Icon, surface }) => <button key={id} className="league-button grid min-h-28 content-center justify-items-center gap-2" aria-pressed={selectedVenueType === id} onClick={() => onSelectVenueType(id)}>
          <Icon aria-hidden="true" size={24}/><strong>{name}</strong><span className="font-normal opacity-75">{surface}</span>
        </button>)}
      </div>
      <footer className="league-footer"><button onClick={onConfirm} className="league-primary">Start match</button></footer>
    </section>
  </div>;
}
