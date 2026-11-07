import { SquareId, RuleSet } from '../types/foursquare';

export const COURT_HALF_SIZE = 5.0; // Half width of entire court
export const LINE_HALF_WIDTH = 0.14; // Inside line half width (approx 1.5 inches each side)
export const OUTSIDE_LINE_THICKNESS = 0.22;

export interface SquareInfo {
  id: SquareId;
  name: string;
  role: string;
  colorHex: string;
  lightColorHex: string;
  center: [number, number]; // [x, z]
  defaultPlayerPos: [number, number, number]; // [x, y, z]
}

export const SQUARE_CONFIGS: Record<SquareId, SquareInfo> = {
  1: {
    id: 1,
    name: 'Square 1',
    role: 'Jack (Serve Box)',
    colorHex: '#2563EB', // Bright Royal Blue
    lightColorHex: '#60A5FA',
    center: [-2.5, 2.5],
    defaultPlayerPos: [-2.6, 0, 2.6],
  },
  2: {
    id: 2,
    name: 'Square 2',
    role: 'Queen (Contender)',
    colorHex: '#16A34A', // Forest Green
    lightColorHex: '#4ADE80',
    center: [-2.5, -2.5],
    defaultPlayerPos: [-2.6, 0, -2.6],
  },
  3: {
    id: 3,
    name: 'Square 3',
    role: 'Challenger',
    colorHex: '#F59E0B', // Golden Orange
    lightColorHex: '#FDE68A',
    center: [2.5, -2.5],
    defaultPlayerPos: [2.6, 0, -2.6],
  },
  4: {
    id: 4,
    name: 'Square 4',
    role: 'King (Receiver)',
    colorHex: '#DC2626', // Crimson Red
    lightColorHex: '#F87171',
    center: [2.5, 2.5],
    defaultPlayerPos: [2.6, 0, 2.6],
  },
};

export interface LandingEvaluation {
  square: SquareId | null;
  isInsideLine: boolean;
  isOutsideLine: boolean;
  isOutOfBounds: boolean;
  description: string;
}

/**
 * Checks where a ball touches down on the court plane (x, z)
 * Takes into account League vs School line rules.
 */
export function evaluateBallLanding(x: number, z: number, ruleSet: RuleSet): LandingEvaluation {
  const absX = Math.abs(x);
  const absZ = Math.abs(z);

  // Outside bounds check
  const maxBound = COURT_HALF_SIZE + (ruleSet === 'league' ? OUTSIDE_LINE_THICKNESS : 0);
  if (absX > maxBound || absZ > maxBound) {
    return {
      square: null,
      isInsideLine: false,
      isOutsideLine: false,
      isOutOfBounds: true,
      description: 'Landed out of bounds beyond court boundary!',
    };
  }

  // Outside line check
  const touchingOutsideLine =
    Math.abs(absX - COURT_HALF_SIZE) <= OUTSIDE_LINE_THICKNESS * 0.8 ||
    Math.abs(absZ - COURT_HALF_SIZE) <= OUTSIDE_LINE_THICKNESS * 0.8;

  if (touchingOutsideLine) {
    if (ruleSet === 'league') {
      // In league rules: outside lines are IN!
      // Assign to closest quadrant
      const sq = getQuadrantSquare(x, z);
      return {
        square: sq,
        isInsideLine: false,
        isOutsideLine: true,
        isOutOfBounds: false,
        description: 'Touched outside perimeter line — IN under league rules!',
      };
    } else {
      // In school rules: any line is out
      return {
        square: null,
        isInsideLine: false,
        isOutsideLine: true,
        isOutOfBounds: true,
        description: 'Landed on outside boundary line — OUT under school rules!',
      };
    }
  }

  // Inside dividing cross line check
  const touchingInsideLine = absX <= LINE_HALF_WIDTH || absZ <= LINE_HALF_WIDTH;
  if (touchingInsideLine) {
    return {
      square: null,
      isInsideLine: true,
      isOutsideLine: false,
      isOutOfBounds: true,
      description: 'Touched inside dividing line — OUT! (Inside lines are out)',
    };
  }

  // Inside a square cleanly
  const sq = getQuadrantSquare(x, z);
  return {
    square: sq,
    isInsideLine: false,
    isOutsideLine: false,
    isOutOfBounds: false,
    description: `Clean landing in Square ${sq}`,
  };
}

export function getQuadrantSquare(x: number, z: number): SquareId {
  if (x < 0 && z >= 0) return 1;
  if (x < 0 && z < 0) return 2;
  if (x >= 0 && z < 0) return 3;
  return 4;
}

export interface InitialCharacter {
  name: string;
  avatarColor: string;
  capColor: string;
  skinColor: string;
  skill: number;
}

export const INITIAL_ROSTER: InitialCharacter[] = [
  { name: 'Blip', avatarColor: '#3B82F6', capColor: '#6366F1', skinColor: '#FBBF24', skill: 0.9 },
  { name: 'Rilla Rae', avatarColor: '#10B981', capColor: '#EC4899', skinColor: '#D97706', skill: 0.82 },
  { name: 'Bolt Beacon', avatarColor: '#F59E0B', capColor: '#1E293B', skinColor: '#FCD34D', skill: 0.85 },
  { name: 'Wren Wildcat', avatarColor: '#EC4899', capColor: '#3B82F6', skinColor: '#FDE047', skill: 0.78 },
  // Queue bench players
  { name: 'Sunny Sam', avatarColor: '#EF4444', capColor: '#10B981', skinColor: '#F59E0B', skill: 0.8 },
  { name: 'Ziggy Pop', avatarColor: '#8B5CF6', capColor: '#F59E0B', skinColor: '#FED7AA', skill: 0.75 },
  { name: 'Pip Quick', avatarColor: '#06B6D4', capColor: '#EC4899', skinColor: '#FBBF24', skill: 0.72 },
  { name: 'Luna Loop', avatarColor: '#14B8A6', capColor: '#3B82F6', skinColor: '#D97706', skill: 0.86 },
];
