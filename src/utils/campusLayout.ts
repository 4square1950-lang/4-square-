import type { VenueId } from '../types/campaign';
import { COURT_HALF_SIZE } from './courtGeometry';

export const SCHOOL = { minX: -26, maxX: 26, front: -22, rear: -8, doorHalfWidth: 1.8 };
export const CAMPUS_ARRIVAL: [number, number, number] = [0, 0, -35.5];
export const COURT_CLEARANCE = COURT_HALF_SIZE + 2.5;
export const FUNNEL_POSITION = { x: -11, z: 7 };
export const CAMPUS_LIMITS = { left: -45, right: 45, front: -96, rear: 31 };
export const CAMPUS_STREET={center:-46,min:-52.2,max:-39.8,halfWidth:52};
export const ANNEX={left:-15,right:15,front:-66,rear:-90,floor:3.4};
export const ANNEX_STAIRS={left:-12.8,right:-8.6,bottom:-72,top:-85};
export const SCHOOL_UPPER = { left: -7.13, right: 7.13, front: -21.6, rear: -8.4, floor: 3.15 };
export const SCHOOL_STAIRS = { left: -6.65, right: -3.5, bottom: -9.45, top: -20.6 };
export function getCampusElevation(y: number, x: number, z: number) {
  for (const [building, stairs] of [[ANNEX, ANNEX_STAIRS], [SCHOOL_UPPER, SCHOOL_STAIRS]] as const) {
    if (x > stairs.left && x < stairs.right && z > Math.min(stairs.top, stairs.bottom) && z < Math.max(stairs.top, stairs.bottom)) {
      const step = (stairs.bottom - z) / (stairs.bottom - stairs.top) * building.floor;
      if (Math.abs(step - y) < .6 || y >= building.floor - .09) return step;
    }
    if (y > building.floor * .96 && x > building.left && x < building.right &&
      z > Math.min(building.rear, building.front) && z < Math.max(building.rear, building.front)) return building.floor;
  }
  return 0;
}
export const CAMPUS_CAFE = { x: 28, z: -33, width: 10, depth: 7 };
export const CAMPUS_CAFETERIA = { x: -27, z: -32, width: 12, depth: 9 };

export function campusPerimeter() {
  const { left, right, front, rear } = CAMPUS_LIMITS;
  return [
    { x: 0, z: front, width: right - left, depth: .25 },
    { x: 0, z: rear, width: right - left, depth: .25 },
    ...[left, right].flatMap((x) => [
      { x, z: (front + CAMPUS_STREET.min - .25) / 2, width: .25, depth: CAMPUS_STREET.min - .25 - front },
      { x, z: (rear + CAMPUS_STREET.max + .25) / 2, width: .25, depth: rear - CAMPUS_STREET.max - .25 },
    ]),
  ];
}

export const SCHOOL_LIFT = { x: -1.6, z: -12.15, size: 1.8 };
export function campusYardFence(layout: ReturnType<typeof getCampusLayout>) {
  const { left, right, back } = layout.yard;
  const gateStart = back - 5.8;
  const gateEnd = back - 2.8;
  return [
    { x: (left + right) * .5, z: back, length: right-left, side: false },
    ...[left, right].flatMap((x) => [[SCHOOL.rear,gateStart], [gateEnd,back]].map(([a,b]) => ({x, z:(a+b)*.5, length:b-a, side:true}))),
  ];
}

export function campusPlayground(id?: VenueId) {
  const variant = getCampusLayout(id);
  const x = variant.wings.some((wing) => wing.x > 0) ? -34 : 34;
  const z = variant.yard.back + 1.8;
  return { x, z, width: 9, depth: 10,
    equipment: [
      { x: x - 2.25, z: z - .42, width: 2.05, depth: 3.3, height: 2.1 },
      { x: x + 1.65, z: z + .6, width: 2.55, depth: 1.3, height: 1.7 },
    ],
  };
}

type Roof = 'flat' | 'gable' | 'shed' | 'sawtooth' | 'mansard';
type Surface = 'brick' | 'stone' | 'clapboard' | 'plaster' | 'metal';
type Boundary = 'masonry' | 'ranch' | 'mesh';

interface Wing {
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  roof: Roof;
}

interface CampusLayout {
  roof: Roof;
  height: number;
  rise: number;
  wall: Surface;
  boundary: Boundary;
  window: 'sash' | 'arch' | 'ribbon';
  yard: { left: number; right: number; back: number };
  lineColor: number;
  shade: number;
  wings: Wing[];
}

export const CAMPUS_VARIANTS = {
  buenos_aires_argentina: {
    roof: 'flat', height: 7.8, rise: 0.8, wall: 'plaster', boundary: 'masonry', window: 'arch',
    yard: { left: -17, right: 17, back: 15 }, lineColor: 0xe8dac6, shade: 0x645f58,
    wings: [{ x: -22, z: -4.75, width: 8, depth: 5.3, height: 5.5, roof: 'flat' }, { x: 22, z: -4.5, width: 8, depth: 5.8, height: 5.5, roof: 'flat' }],
  },
  bridgton_maine: {
    roof: 'gable', height: 5.8, rise: 3.9, wall: 'clapboard', boundary: 'ranch', window: 'sash',
    yard: { left: -15, right: 13, back: 13 }, lineColor: 0xe0ddd0, shade: 0x525456,
    wings: [{ x: 20.5, z: -4, width: 8, depth: 6, height: 3.2, roof: 'gable' }],
  },
  boston_mass: {
    roof: 'flat', height: 10.4, rise: 0.8, wall: 'brick', boundary: 'masonry', window: 'sash',
    yard: { left: -15, right: 18, back: 15 }, lineColor: 0xe9dec8, shade: 0x514f4d,
    wings: [{ x: -22, z: -2, width: 7, depth: 10, height: 7.2, roof: 'flat' }],
  },
  burlington_vermont: {
    roof: 'shed', height: 5.5, rise: 2.45, wall: 'clapboard', boundary: 'mesh', window: 'ribbon',
    yard: { left: -17, right: 19, back: 12 }, lineColor: 0xede4d2, shade: 0x575e60,
    wings: [{ x: -21.5, z: -3.5, width: 8, depth: 7.5, height: 3.8, roof: 'shed' }],
  },
  needham_mass: {
    roof: 'gable', height: 7.6, rise: 2.6, wall: 'brick', boundary: 'ranch', window: 'sash',
    yard: { left: -17, right: 17, back: 17 }, lineColor: 0xeee0c5, shade: 0x53575a,
    wings: [{ x: -21, z: -4, width: 9, depth: 6.5, height: 4.2, roof: 'gable' }],
  },
  youngstown_ohio: {
    roof: 'sawtooth', height: 7.9, rise: 1.9, wall: 'brick', boundary: 'mesh', window: 'ribbon',
    yard: { left: -20, right: 15, back: 16 }, lineColor: 0xe8dcbd, shade: 0x4d5053,
    wings: [{ x: 21.5, z: 0, width: 10, depth: 14, height: 5.9, roof: 'sawtooth' }],
  },
  north_manchester_indiana: {
    roof: 'gable', height: 8.7, rise: 4.2, wall: 'brick', boundary: 'masonry', window: 'arch',
    yard: { left: -17, right: 18, back: 18 }, lineColor: 0xeee4ce, shade: 0x525657,
    wings: [{ x: 21.5, z: -2.2, width: 9, depth: 9.7, height: 7.4, roof: 'gable' }],
  },
  melbourne_australia: {
    roof: 'shed', height: 7.5, rise: 2, wall: 'stone', boundary: 'mesh', window: 'arch',
    yard: { left: -19, right: 14, back: 16 }, lineColor: 0xeee0c3, shade: 0x56534d,
    wings: [{ x: -22, z: -2.4, width: 8, depth: 9, height: 4.6, roof: 'shed' }],
  },
  montreal_quebec: {
    roof: 'mansard', height: 8.2, rise: 4.5, wall: 'stone', boundary: 'masonry', window: 'sash',
    yard: { left: -15, right: 17, back: 15 }, lineColor: 0xe6dbc4, shade: 0x55595e,
    wings: [{ x: -21.5, z: -4, width: 9, depth: 6.5, height: 6, roof: 'mansard' }, { x: 21.5, z: -4, width: 9, depth: 6.5, height: 6, roof: 'mansard' }],
  },
  calgary_alberta: {
    roof: 'flat', height: 6.6, rise: 0.75, wall: 'stone', boundary: 'ranch', window: 'ribbon',
    yard: { left: -17, right: 18, back: 19 }, lineColor: 0xece1c8, shade: 0x535455,
    wings: [{ x: -22, z: 1, width: 10, depth: 16, height: 5.1, roof: 'flat' }],
  },
} satisfies Partial<Record<VenueId, CampusLayout>>;

export function getCampusLayout(id?: VenueId): CampusLayout {
  return (CAMPUS_VARIANTS as Partial<Record<VenueId, CampusLayout>>)[id ?? 'bridgton_maine'] ?? CAMPUS_VARIANTS.bridgton_maine;
}

export function campusNpcSpot(index: number): [number, number, number] {
  return [10, 0, -3.2 + index * 5.4];
}

export function campusTrees(layout: CampusLayout): [number, number][] {
  const { left, right, back } = layout.yard;
  return [[-15, -32], [16, -33], [left - 3.3, back + 3], [right + 4, back + 4], [3.5, back + 5.2],
    [-30, -17], [31, -20], [-32, 8], [32, 5], [-25, back + 8], [23, back + 9]];
}

export function campusWalls(layout: CampusLayout) {
  const walls = [
    { x: SCHOOL.minX + 0.22, z: -15, width: 0.44, depth: 14, height: layout.height },
    { x: SCHOOL.maxX - 0.22, z: -15, width: 0.44, depth: 14, height: layout.height },
  ];
  for (const z of [SCHOOL.front + 0.22, SCHOOL.rear - 0.22]) {
    for (const side of [-1, 1]) {
      const width = SCHOOL.maxX - SCHOOL.doorHalfWidth - 0.44;
      walls.push({ x: side * (SCHOOL.doorHalfWidth + width / 2), z, width, depth: 0.44, height: layout.height });
    }
  }
  return [...walls, ...layout.wings.map((wing) => ({ ...wing, z: SCHOOL.rear + wing.depth / 2 }))];
}
