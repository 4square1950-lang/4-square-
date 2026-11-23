import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Lock, MapPin, RotateCcw, X } from 'lucide-react';
import type { CampaignProgress, VenueDef, VenueId } from '../types/campaign';
import { LADDER_VENUES, VENUES } from '../utils/venueData';
import { getVenueArt, venueStill } from '../utils/venueArt';
import { WorldGlobe } from './WorldGlobe';
import { CityStreetMap } from './CityStreetMap';
import { useCityWeather } from '../services/cityWeather';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  progress: CampaignProgress;
  level?:number;
  onSelectVenue: (venue: VenueDef) => void;
  onResumeExploration?: () => void;
}

const route = LADDER_VENUES.map((id) => VENUES.find((venue) => venue.id === id)!);
const routeIds = route.map(({ id }) => id);

export function WorldMapModal({ isOpen, onClose, progress, onSelectVenue, onResumeExploration, level=0 }: Props) {
  const [selection, setSelection] = useState<VenueId>(progress.currentVenueId);
  const [angle, setAngle] = useState({ x: 8, y: 0 });
  const [view,setView]=useState<'city'|'globe'>('city');
  const drag = useRef<{ id: number; x: number; y: number; startX: number; startY: number; moved: boolean } | undefined>(undefined);
  const index = route.findIndex(({ id }) => id === selection);
  const venue = route[index] ?? route[0];
  const weather=useCityWeather(venue.id,isOpen);
  const {latitude,longitude}=getVenueArt(venue.id);
  const current = venue.id === progress.currentVenueId;
  const unlocked = progress.unlockedVenues.includes(venue.id);
  const requiredLevel = Math.max(0,Math.floor(index/3));
  const prev = () => setSelection(route[(index - 1 + route.length) % route.length].id);
  const next = () => setSelection(route[(index + 1) % route.length].id);

  useEffect(() => {
    if (isOpen) {
      setSelection(progress.currentVenueId);
      setAngle({ x: 8, y: 0 });
    }
  }, [isOpen, progress.currentVenueId]);

  if (!isOpen) return null;
  return (
    <section role="dialog" aria-modal="true" aria-label="World Tour" className="fixed inset-0 z-50 overflow-auto bg-[#15191b] text-stone-100"
      onKeyDown={(event) => { if (event.key === 'Escape') onClose(); if (event.key === 'ArrowLeft') prev(); if (event.key === 'ArrowRight') next(); }}>
      <header className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4 sm:px-9">
        <h2 className="text-3xl font-black tracking-tight">World Tour</h2>
        <div className="ml-auto flex gap-2">{(['city','globe'] as const).map((mode)=><button key={mode} className="league-button" aria-pressed={view===mode} onClick={()=>setView(mode)}>{mode==='city'?'Street map':'Globe'}</button>)}</div>
        <button onClick={onClose} aria-label="Close world map" className="rounded-lg p-2 hover:bg-white/10"><X /></button>
      </header>
      <main className="mx-auto grid max-w-[1500px] items-start gap-5 p-4 md:grid-cols-[minmax(0,1fr)_246px] xl:grid-cols-[minmax(0,1fr)_340px] lg:p-8">
        <div className="overflow-hidden rounded-2xl border border-white/12 bg-[#20282a]">
          {view==='city' ? <div className="relative h-[min(58vh,550px)] min-h-80">
            <CityStreetMap key={venue.id} city={getVenueArt(venue.id).city} latitude={latitude} longitude={longitude} />
            {weather?.value && <div aria-hidden="true" className={`weather-layer weather-${weather.value.condition.toLowerCase()}`}/>}
            <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-lg bg-neutral-950/90 px-3 py-2">
              <strong>{getVenueArt(venue.id).city}</strong><p className="text-sm">{weather?.value?`${weather.value.condition} · ${Math.round(weather.value.temperature)}°C`:weather?.failed?'Weather unavailable':'Loading weather…'}</p>
            </div>
            <a className="absolute bottom-0 left-0 z-10 bg-neutral-950/90 px-2 py-1 text-xs" href="https://open-meteo.com/" target="_blank" rel="noreferrer">Weather by Open-Meteo</a>
          </div> : <div className="relative touch-none cursor-grab select-none overflow-hidden active:cursor-grabbing" style={{ perspective: '1200px' }}
            onPointerDown={(event) => {
              if (event.button !== 0 || !event.isPrimary) return;
              drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, moved: false };
            }}
            onPointerMove={(event) => {
              const point = drag.current;
              if (!point || point.id !== event.pointerId || !event.buttons) return;
              if (!point.moved && Math.hypot(event.clientX - point.startX, event.clientY - point.startY) < 5) return;
              if (!point.moved) event.currentTarget.setPointerCapture(event.pointerId);
              point.moved = true;
              const dx = event.clientX - point.x, dy = event.clientY - point.y;
              point.x = event.clientX; point.y = event.clientY;
              setAngle(({ x, y }) => ({ x: Math.min(75, Math.max(-75, x - dy * 0.17)), y: Math.min(360, Math.max(-360, y + dx * 0.17)) }));
            }}
            onPointerUp={() => { drag.current = undefined; }}
            onPointerCancel={() => { drag.current = undefined; }}
            onPointerLeave={(event) => { if (!event.currentTarget.hasPointerCapture(event.pointerId)) drag.current = undefined; }}>
            <div className="h-[min(58vh,550px)] min-h-80"><WorldGlobe ids={routeIds} active={venue.id} angle={angle} /></div>
            {weather?.value && <div aria-hidden="true" className={`weather-layer weather-${weather.value.condition.toLowerCase()}`}/>}
            <button aria-label="Reset map angle" onClick={() => setAngle({ x: 8, y: 0 })} className="absolute bottom-3 right-3 rounded-lg bg-neutral-950/80 p-2"><RotateCcw size={18} /></button>
          </div>}
          <div className="grid grid-cols-5 gap-1 border-t border-white/10 px-3 py-3 sm:grid-cols-10">
            {route.map((item, i) => <button key={item.id} title={getVenueArt(item.id).city} aria-label={`${i + 1}. ${getVenueArt(item.id).city}`} aria-pressed={item.id === selection}
              onClick={() => setSelection(item.id)} className={`rounded-lg py-2 text-sm font-black ${item.id === selection ? 'bg-amber-200 text-neutral-950' : 'bg-black/25 text-neutral-300 hover:bg-white/10'}`}>{i + 1}</button>)}
          </div>
        </div>
        <article className="overflow-hidden rounded-2xl border border-white/12 bg-[#202426]">
          <div className="aspect-video bg-[#2d4141] bg-cover bg-center" style={{ backgroundImage: `url("${venueStill(venue.id)}")` }} />
          <div className="p-5">
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-amber-200"><MapPin size={14} />{venue.location}</p>
            <h3 className="text-2xl font-black leading-tight">{venue.name}</h3>
            <p className="mt-2 text-sm text-stone-400">Chapter {requiredLevel+1} · Level {requiredLevel}</p>
            <p className="mt-2 text-sm text-stone-400">{progress.completedVenues.includes(venue.id) ? 'Completed' : current ? 'Current stop' : unlocked ? 'Available' : level<requiredLevel ? `Reach level ${requiredLevel} to unlock this chapter.` :'Win the previous stop to unlock.'}</p>
            <div className="mt-5 grid grid-cols-[auto_1fr_auto] gap-2">
              <button onClick={prev} aria-label="Previous city" className="rounded-lg bg-black/35 p-2"><ChevronLeft /></button>
              <button disabled={!unlocked} onClick={() => {
                if (current && onResumeExploration) { onClose(); onResumeExploration(); }
                else { onSelectVenue(venue); onClose(); }
              }} className="flex items-center justify-center gap-2 rounded-lg bg-amber-200 px-4 py-2 font-bold text-neutral-950 disabled:bg-neutral-800 disabled:text-neutral-400">
                {!unlocked && <Lock size={14} />}{!unlocked ? 'Locked' : current ? 'Enter venue' : 'Travel'}
              </button>
              <button onClick={next} aria-label="Next city" className="rounded-lg bg-black/35 p-2"><ChevronRight /></button>
            </div>
          </div>
        </article>
      </main>
    </section>
  );
}
