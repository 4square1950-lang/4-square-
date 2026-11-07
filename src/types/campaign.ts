import { RuleSet } from './foursquare';

export type VenueId =
  | 'bridgton_maine'
  | 'boston_mass'
  | 'burlington_vermont'
  | 'needham_mass'
  | 'youngstown_ohio'
  | 'north_manchester_indiana'
  | 'melbourne_australia'
  | 'montreal_quebec'
  | 'calgary_alberta'
  | 'buenos_aires_argentina'
  | 'driveway'
  | 'backyard_bbq'
  | 'garage'
  | 'montreal_courtyard'
  | 'lakeside_cottage'
  | 'kingston_schoolyard'
  | 'rooftop_toronto'
  | 'winter_rec_room'
  | 'games_house_buffalo'
  | 'community_house_ottawa';

export interface CampaignNPC {
  id: string;
  name: string;
  role: string; // e.g. "Friend & Host", "Barbecue Chef", "Referee", "Regular"
  characterId: string;
  position: [number, number, number];
  rotationY: number;
  dialogueLines: string[];
  tips?: string;
  isOpponent?: boolean;
}

export interface PracticeSpot {
  id: string;
  title: string;
  type: 'garage_wall' | 'serve_target' | 'placement_cones' | 'return_machine';
  position: [number, number, number];
  description: string;
}

export interface VenueDef {
  id: VenueId;
  order: number;
  rank?: number;
  reasonForRanking?: string;
  keyMilestone?: string;
  name: string;
  location: string;
  region: string;
  mapCoords: { x: number; y: number }; // Relative coordinates for the 2D world map (0-100%)
  role: string;
  theme: string;
  courtSurface: string;
  defaultRuleSet: RuleSet;
  houseRule?: string;
  description: string;
  courtPersonality: string;
  campaignObjective: {
    title: string;
    description: string;
    targetRank: number; // 1
    requiredCrownHolds: number;
    extraCondition?: string;
  };
  npcs: CampaignNPC[];
  practiceSpots: PracticeSpot[];
  carParkPosition: [number, number, number];
  carRotationY: number;
  signBoardPosition: [number, number, number];
  spawnPosition: [number, number, number];
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  musicTrack: string;
}

export interface CampaignProgress {
  unlockedVenues: VenueId[];
  completedVenues: VenueId[];
  currentVenueId: VenueId;
  venueRecords: Partial<
    Record<
      VenueId,
      {
        bestStreak: number;
        completedDate?: string;
        notes: string[];
        unlockedVariation?: boolean;
      }
    >
  >;
  coins: number;
  equippedCharacterId: string;
  matchesWon?: number;
  playerLevel?: number;
  lessonsCompleted?: string[];
}

export interface ChatMessage {
  id: string;
  sender: string;
  avatarColor?: string;
  text: string;
  venueId?: VenueId;
  timestamp: number;
  isSpectator?: boolean;
}
