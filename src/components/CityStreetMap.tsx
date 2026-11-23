import { useLayoutEffect, useRef, useState } from 'react';
import { MapPin, Minus, Plus } from 'lucide-react';

const TILE_SIZE = 256;
const MIN_ZOOM = 12;
const MAX_ZOOM = 18;
const tileServer = import.meta.env.VITE_MAP_TILE_URL ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

export function CityStreetMap({ city, latitude, longitude }: { city: string; latitude: number; longitude: number }) {
  const viewport = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(15);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [failedTiles, setFailedTiles] = useState<Set<string>>(new Set());

  useLayoutEffect(() => {
    const node = viewport.current;
    if (!node) return;
    const measure = () => setSize({ width: node.clientWidth, height: node.clientHeight });
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    measure();
    return () => observer.disconnect();
  }, []);

  const world = TILE_SIZE * 2 ** zoom;
  const latitudeRadians = latitude * Math.PI / 180;
  const venueX = (longitude + 180) / 360 * world;
  const venueY = (1 - Math.asinh(Math.tan(latitudeRadians)) / Math.PI) / 2 * world;
  const centerY = Math.min(world - size.height / 2, Math.max(size.height / 2, venueY + offset.y * world));
  const left = Math.floor(venueX + offset.x * world - size.width / 2);
  const top = Math.floor(centerY - size.height / 2);
  const tiles = [];
  const tileCount = 2 ** zoom;
  if (size.width && size.height) {
    for (let y = Math.floor(top / TILE_SIZE); y <= Math.floor((top + size.height - 1) / TILE_SIZE); y++) {
      for (let x = Math.floor(left / TILE_SIZE); x <= Math.floor((left + size.width - 1) / TILE_SIZE); x++) {
        const wrappedX = ((x % tileCount) + tileCount) % tileCount;
        const url = tileServer.replace('{z}', String(zoom)).replace('{x}', String(wrappedX)).replace('{y}', String(y));
        tiles.push({ key: `${zoom}/${x}/${y}`, url, left: x * TILE_SIZE - left, top: y * TILE_SIZE - top });
      }
    }
  }
  const markerX = venueX - left;
  const markerY = venueY - top;

  return <>
    <div ref={viewport} role="group" aria-label={`${city} street map`}
      className="absolute inset-0 touch-none select-none overflow-hidden bg-[#dce1d9] cursor-grab active:cursor-grabbing"
      onPointerDown={(event) => {
        if (!event.isPrimary || event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
      }}
      onPointerMove={(event) => {
        const point = drag.current;
        if (!point || point.id !== event.pointerId) return;
        const dx = event.clientX - point.x;
        const dy = event.clientY - point.y;
        point.x = event.clientX;
        point.y = event.clientY;
        setOffset(({ x, y }) => ({
          x: x - dx / world,
          y: Math.min(1 - (venueY + size.height / 2) / world, Math.max((size.height / 2 - venueY) / world, y - dy / world)),
        }));
      }}
      onLostPointerCapture={() => { drag.current = null; }}>
      {tiles.filter(({ url }) => !failedTiles.has(url)).map((tile) => (
        <img key={tile.key} alt="" draggable={false} src={tile.url} width={TILE_SIZE} height={TILE_SIZE}
          referrerPolicy="strict-origin-when-cross-origin"
          className="pointer-events-none absolute max-w-none"
          style={{ left: tile.left, top: tile.top }}
          onError={() => setFailedTiles((failed) => new Set(failed).add(tile.url))} />
      ))}
      <span aria-hidden="true" className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-full bg-[#182628] p-1.5 text-amber-200 shadow-lg"
        style={{ left: markerX, top: markerY }}><MapPin size={20} /></span>
    </div>
    <div className="absolute right-3 top-3 z-10 grid divide-y divide-white/15 overflow-hidden rounded-lg bg-[#182628] shadow-lg">
      <button type="button" aria-label="Zoom in" disabled={zoom === MAX_ZOOM} className="p-2 hover:bg-white/10 disabled:opacity-40" onClick={() => setZoom(zoom + 1)}><Plus size={18} /></button>
      <button type="button" aria-label="Zoom out" disabled={zoom === MIN_ZOOM} className="p-2 hover:bg-white/10 disabled:opacity-40" onClick={() => setZoom(zoom - 1)}><Minus size={18} /></button>
    </div>
    {tiles.some(({ url }) => failedTiles.has(url)) && (
      <div className="absolute bottom-9 left-3 z-10 rounded-lg bg-neutral-950/90 px-3 py-2 text-sm" role="status">
        Some map tiles are unavailable. <a className="underline" href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=${zoom}/${latitude}/${longitude}`} target="_blank" rel="noreferrer">Open street map</a>
      </div>
    )}
    <a className="absolute bottom-0 right-0 z-10 bg-neutral-950/90 px-2 py-1 text-xs" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>
  </>;
}
