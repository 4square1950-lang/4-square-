import { useState } from 'react';
import { X } from 'lucide-react';
import type { VenueDef } from '../types/campaign';
import type { Player } from '../types/foursquare';
import { ANNEX, SCHOOL_LIFT, campusPerimeter, CAMPUS_CAFE, CAMPUS_CAFETERIA, campusNpcSpot, campusPlayground, FUNNEL_POSITION, getCampusLayout, SCHOOL } from '../utils/campusLayout';
import { COURT_HALF_SIZE, SQUARE_CONFIGS } from '../utils/courtGeometry';
interface Props { mode: 'exploration' | 'match'; venue: VenueDef; playerPosition: [number, number, number]; players?: Player[]; activeTurnPlayerId?: string; }
export function MiniMap({ venue, playerPosition }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [x, elevation, z] = playerPosition;
  const layout = getCampusLayout(venue.id);
  const { left, right, back } = layout.yard;
  const playground = campusPlayground(venue.id);
  const plot = (small: boolean) => <svg viewBox="-48 -98 96 131" className="block h-full w-full" aria-label="Campus position">
    <rect x="-48" y="-98" width="96" height="131" fill="#232e2a" />
    <path d="M-43 -46H43" stroke="#454c4b" strokeWidth="10" />
    <path d="M0 -40V-22" stroke="#aaa398" strokeWidth="6" />
    <path d="M0 -53V-66" stroke="#aaa398" strokeWidth="4" />
    <rect x={ANNEX.left} y={ANNEX.rear} width={ANNEX.right-ANNEX.left} height={ANNEX.front-ANNEX.rear} fill="#75736a"/>
    {campusPerimeter().map(({x,z,width,depth},i) => <rect key={i} x={x-width/2} y={z-depth/2} width={width} height={depth} fill="#a8b68c"/>)}
    <rect x={left} y={SCHOOL.rear} width={right-left} height={back-SCHOOL.rear} fill="#252929" stroke="#78817b" strokeWidth=".4" />
    <rect x={SCHOOL.minX} y={SCHOOL.front} width={SCHOOL.maxX-SCHOOL.minX} height={SCHOOL.rear-SCHOOL.front} fill="#75736a" />
    {[...layout.wings, CAMPUS_CAFE, CAMPUS_CAFETERIA, playground].map(({x,z,width,depth}, index) => <rect key={index} x={x-width/2} y={z-depth/2} width={width} height={depth} fill={index === layout.wings.length + 2 ? '#a78564' : '#756556'}/>)}
    <path d="M0 -22V-8" stroke="#ded0ad" strokeWidth="1" />
    {Object.values(SQUARE_CONFIGS).map(({ id, center, colorHex }) => <rect key={id} x={center[0]-COURT_HALF_SIZE/2} y={center[1]-COURT_HALF_SIZE/2} width={COURT_HALF_SIZE} height={COURT_HALF_SIZE} fill={colorHex} stroke="#eee4c9" strokeWidth=".3" />)}
    {!small && <>
      <text x="0" y="-75" fill="#fff7df" fontSize="3.3" textAnchor="middle">Library</text>
      <circle cx={SCHOOL_LIFT.x} cy={SCHOOL_LIFT.z} r=".8" fill="#f4dc98"><title>Elevator</title></circle>
      <text x="4" y="-14" fill="#fff7df" fontSize="3.3">School</text>
      <text x={CAMPUS_CAFETERIA.x} y={CAMPUS_CAFETERIA.z+.9} fill="#fff7df" textAnchor="middle" fontSize="2.3">Dining</text>
      <text x={CAMPUS_CAFE.x} y={CAMPUS_CAFE.z+.9} fill="#fff7df" textAnchor="middle" fontSize="2.3">Café</text>
      <text x={playground.x} y={playground.z+.9} fill="#fff7df" textAnchor="middle" fontSize="1.65">Playground</text>
      <circle cx={FUNNEL_POSITION.x} cy={FUNNEL_POSITION.z} r="1" fill="#c87557" />
      {venue.npcs.map((npc, i) => { const [nx,,nz] = campusNpcSpot(i); return <circle key={npc.id} cx={nx} cy={nz} r="1.25" fill="#a0b695"><title>{npc.name}</title></circle>; })}
    </>}
    <circle cx={x} cy={z} r={small ? 4 : 2} fill="#f4dc98" stroke="#151a1a" strokeWidth=".7"><title>You</title></circle>
  </svg>;
  return <div className="absolute bottom-4 right-4 z-30">
    {expanded ? <section className="field-panel field-module flex flex-col overflow-hidden">
      <header className="flex items-center justify-between px-3 py-2 text-sm font-semibold">{elevation > 1 ? (z < ANNEX.front ? "Library · upstairs" : "School · upstairs") : "Campus"} <button aria-label="Close campus map" onClick={() => setExpanded(false)}><X size={18} /></button></header>
      <div className="min-h-0 flex-1">{plot(false)}</div>
    </section> : <button className="field-icon overflow-hidden" aria-label="Expand campus map" onClick={() => setExpanded(true)}>{plot(true)}</button>}
  </div>;
}
