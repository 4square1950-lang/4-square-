import React from 'react';
import { Player } from '../types/foursquare';

interface EndGameStatsModalProps {
  isOpen: boolean;
  winner: Player | null;
  players: Player[];
  humanPlayerId: string;
  totalRounds: number;
  onRematch: () => void;
  onSwitchVenue?: () => void;
  rematchDisabled?: boolean;
  rematchLabel?: string;
  onReturnToMenu: () => void;
  campaignAction?: { label: string; onClick: () => void };
}

export const EndGameStatsModal: React.FC<EndGameStatsModalProps> = ({
  isOpen,
  winner,
  players,
  humanPlayerId,
  totalRounds,
  onRematch,
  onSwitchVenue,
  rematchDisabled = false,
  rematchLabel = 'Rematch',
  onReturnToMenu,
  campaignAction,
}) => {
  if (!isOpen) return null;
  const ranked = [...players].sort((a,b) => b.crownHolds-a.crownHolds || (b.points ?? 0)-(a.points ?? 0) || b.totalHits-a.totalHits);
  const button = 'rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold hover:bg-white/10';
  return <div className="fixed inset-0 z-50 grid place-items-center overflow-auto bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Match results">
    <section className="field-panel w-full max-w-3xl overflow-hidden">
      <header className="border-b border-white/10 px-5 py-6 sm:px-8">
        <p className="text-sm font-semibold text-amber-200">Match results</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight">{winner ? `${winner.name} wins` : 'Match complete'}</h2>
        <p className="mt-2 text-sm text-stone-400">{totalRounds} rounds · {winner?.crownHolds ?? 0} crown holds</p>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[430px] text-left text-sm">
          <thead><tr className="text-stone-400">{['Player','Holds','Hits','Faults','Points'].map((label) => <th scope="col" key={label} className="px-4 py-3">{label}</th>)}</tr></thead>
          <tbody>{ranked.map((player,index) => <tr key={player.id} className={`border-t border-white/10 ${player.id === humanPlayerId ? 'bg-[#303b36]' : ''}`}>
            <th scope="row" className="px-4 py-3 font-semibold">{index+1}. {player.name}{player.id === humanPlayerId && <span className="ml-2 text-xs text-amber-200">You</span>}</th>
            <td className="px-4 py-3">{player.crownHolds}</td><td className="px-4 py-3">{player.totalHits}</td><td className="px-4 py-3">{player.faults ?? 0}</td><td className="px-4 py-3">{player.points ?? 0}</td>
          </tr>)}</tbody>
        </table>
      </div>
      <footer className="flex flex-wrap gap-2 border-t border-white/10 p-4">
        <button onClick={onReturnToMenu} className={button}>Main menu</button>
        {campaignAction && <button onClick={campaignAction.onClick} className={button}>{campaignAction.label}</button>}
        {onSwitchVenue && <button onClick={onSwitchVenue} className={button}>Switch venue</button>}
        <button onClick={onRematch} disabled={rematchDisabled} className="ml-auto rounded-lg bg-amber-200 px-4 py-2 text-sm font-bold text-neutral-950 disabled:opacity-50">{rematchLabel}</button>
      </footer>
    </section>
  </div>;
};
