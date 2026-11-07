import { VenueDef, VenueId, CampaignProgress } from '../types/campaign';

/**
 * Top 10 Ranked Competitive Four Square Cities Worldwide
 * Exact ranking, primary reasons, and key historical milestones.
 */
export const VENUES: VenueDef[] = [
  // 1. Bridgton & Naples, Maine — Home of the Four Square World Championship
  {
    id: 'bridgton_maine',
    order: 1,
    rank: 1,
    name: 'Bridgton & Naples World Arena',
    location: 'Bridgton & Naples, Maine',
    region: 'Maine, USA',
    reasonForRanking: 'Home of the Four Square World Championship',
    keyMilestone: 'Hosted continuously every spring since 2005',
    mapCoords: { x: 50, y: 18 },
    role: 'The Crown Stage of World Four Square',
    theme: 'world_championship',
    courtSurface: 'hardwood_arena',
    defaultRuleSet: 'championship',
    description:
      'The sacred global epicenter of competitive four square. Every spring since 2005, elite athletes and purists journey to Western Maine to compete under strict international championship rules on pristine courts surrounded by roaring bleachers.',
    courtPersonality:
      'Championship regulation hardwood. Laser-straight boundary lines, immaculate ball bounce physics, and electric spectator energy. Every error is fatal.',
    campaignObjective: {
      title: 'Hold the World Championship Crown',
      description: 'Advance to Square 1 and defend the World Crown for 5 consecutive rallies against international masters.',
      targetRank: 1,
      requiredCrownHolds: 5,
    },
    npcs: [
      {
        id: 'npc-maine-director',
        name: 'Commissioner Dave (Tournament Director)',
        role: 'Tournament Director',
        characterId: 'char-foursquare-pro',
        position: [-4.2, 0, -2.5],
        rotationY: 0.8,
        dialogueLines: [
          'Welcome to Maine! Since 2005, the world championship crown has been decided right here on this floor.',
          'Square 1 serves diagonally to Square 4. Clean palm contact, zero carries, and respect the referee calls.',
          'Win 5 crown holds in the King Square to etch your name onto the world cup trophy!',
        ],
        tips: 'Keep your serves deep into the back corner of Square 4 to force high returns.',
      },
      {
        id: 'npc-maine-scout',
        name: 'Sarah (Championship Official)',
        role: 'Head Referee',
        characterId: 'char-blocky',
        position: [4.5, 0, -3.2],
        rotationY: -0.9,
        dialogueLines: [
          'The lines are in play in Maine! Watch the baseline spin.',
          'The crowd travelled across oceans to see this match. Play hard and play fair!',
        ],
      },
    ],
    practiceSpots: [
      {
        id: 'prac-maine-wall',
        title: 'Championship Rally Rebounder',
        type: 'garage_wall',
        position: [0, 0, -7.2],
        description: 'Warm up your hand-eye reflexes against the arena rebound board.',
      },
    ],
    carParkPosition: [-7.2, 0, 4.2],
    carRotationY: 0.3,
    signBoardPosition: [-3.6, 0, 0],
    spawnPosition: [-6.2, 0, 3.2],
    bounds: { minX: -14, maxX: 14, minZ: -12, maxZ: 12 },
    musicTrack: 'World Championship Overture',
  },

  // 2. Boston, Massachusetts — Blueprint city for structured adult competitive play
  {
    id: 'boston_mass',
    order: 2,
    rank: 2,
    name: 'Boston Common & Squarefour League',
    location: 'Boston, Massachusetts',
    region: 'Massachusetts, USA',
    reasonForRanking: 'Blueprint city for structured adult competitive play',
    keyMilestone: 'Birthplace of the massive multi-year Squarefour League',
    mapCoords: { x: 74, y: 30 },
    role: 'The Blueprint of Modern Adult Leagues',
    theme: 'urban_park',
    courtSurface: 'smooth_asphalt',
    defaultRuleSet: 'league',
    description:
      'The intellectual and competitive pioneer of structured adult four square. Home to the legendary Squarefour League, where thousands of matches established modern competitive rulebooks and tournament bracket systems.',
    courtPersonality:
      'Firm asphalt surrounded by brownstones and park benches. Players here emphasize tactical spins and defensive corner angling.',
    campaignObjective: {
      title: 'Squarefour League Title',
      description: 'Climb from Square 4 to Square 1 and defend the crown for 5 rounds against veteran Boston league captains.',
      targetRank: 1,
      requiredCrownHolds: 5,
    },
    npcs: [
      {
        id: 'npc-boston-captain',
        name: 'Liam (Squarefour League Captain)',
        role: 'League Veteran',
        characterId: 'char-patch',
        position: [5.2, 0, -2.8],
        rotationY: -1.2,
        dialogueLines: [
          'Boston took recess four square and turned it into an adult competitive science.',
          'Watch the spin off the front corner—our veterans know every millimeter of this pavement.',
        ],
        tips: 'Aim for the seam where two squares meet to force indecisive footwork.',
      },
    ],
    practiceSpots: [
      {
        id: 'prac-boston-target',
        title: 'Corner Placement Target',
        type: 'placement_cones',
        position: [3.8, 0, 4.0],
        description: 'Practice pinpoint boundary strikes.',
      },
    ],
    carParkPosition: [-8.0, 0, 6.0],
    carRotationY: 0.1,
    signBoardPosition: [-3.8, 0, -0.5],
    spawnPosition: [-6.8, 0, 4.8],
    bounds: { minX: -14, maxX: 14, minZ: -12, maxZ: 12 },
    musicTrack: 'Boston League Anthem',
  },

  // 3. Burlington, Vermont — Primary regional expansion hub for competitive leagues
  {
    id: 'burlington_vermont',
    order: 3,
    rank: 3,
    name: 'Lake Champlain Waterfront Courts',
    location: 'Burlington, Vermont',
    region: 'Vermont, USA',
    reasonForRanking: 'Primary regional expansion hub for competitive leagues',
    keyMilestone: 'Over a decade of organized community & school tournaments',
    mapCoords: { x: 30, y: 26 },
    role: 'The Regional Grassroots Powerhouse',
    theme: 'lakefront',
    courtSurface: 'brushed_concrete',
    defaultRuleSet: 'league',
    description:
      'Perched along Lake Champlain, Burlington served as the primary northeastern expansion hub for competitive leagues with over a decade of continuous community, school, and invitational tournaments.',
    courtPersonality:
      'Breezy lakeside court with fast rebounds. Players excel at dynamic trajectory drops and windy weather reads.',
    campaignObjective: {
      title: 'Waterfront Invitational Crown',
      description: 'Hold the King Square through 5 rallies against Vermont regional finalists.',
      targetRank: 1,
      requiredCrownHolds: 5,
    },
    npcs: [
      {
        id: 'npc-burlington-coach',
        name: 'Maya (Community Organizer)',
        role: 'Regional Coordinator',
        characterId: 'char-foursquare-pro',
        position: [-4.5, 0, 3.2],
        rotationY: 0.5,
        dialogueLines: [
          'Burlington has been running school and community brackets for over ten years straight.',
          'The lake breeze adds just a touch of drift to floaters—stay centered over the ball.',
        ],
      },
    ],
    practiceSpots: [
      {
        id: 'prac-burlington-wind',
        title: 'Waterfront Practice Net',
        type: 'garage_wall',
        position: [0, 0, -7.0],
        description: 'Calibrate your strike force against steady lakeside currents.',
      },
    ],
    carParkPosition: [-7.5, 0, 5.0],
    carRotationY: 0.2,
    signBoardPosition: [-3.5, 0, 0],
    spawnPosition: [-6.5, 0, 4.0],
    bounds: { minX: -14, maxX: 14, minZ: -12, maxZ: 12 },
    musicTrack: 'Green Mountain Breeze',
  },

  // 4. Needham, Massachusetts — Global capital for extreme endurance play
  {
    id: 'needham_mass',
    order: 4,
    rank: 4,
    name: 'Needham Marathon Stadium',
    location: 'Needham, Massachusetts',
    region: 'Massachusetts, USA',
    reasonForRanking: 'Global capital for extreme endurance play',
    keyMilestone: 'Broke the ultimate Guinness World Record at 34 hours straight',
    mapCoords: { x: 86, y: 44 },
    role: 'The Endurance Epicenter of the Earth',
    theme: 'marathon_track',
    courtSurface: 'cushioned_polyurethane',
    defaultRuleSet: 'championship',
    description:
      'Legendary battleground where human endurance met the four square court. Needham broke the ultimate Guinness World Record with an astonishing 34 hours of continuous non-stop play.',
    courtPersonality:
      'Resilient sports court surface designed for long rallies and heavy athletic lunging. Fatigue is your only enemy.',
    campaignObjective: {
      title: '34-Hour Marathon Crown',
      description: 'Defend Square 1 for 5 intense rallies without making a single fault.',
      targetRank: 1,
      requiredCrownHolds: 5,
    },
    npcs: [
      {
        id: 'npc-needham-record',
        name: 'Coach Marcus (Guinness Record Holder)',
        role: 'Endurance Legend',
        characterId: 'char-blocky',
        position: [4.8, 0, -3.0],
        rotationY: -1.0,
        dialogueLines: [
          '34 hours without sleeping or sitting down. That is Needham four square!',
          'Focus on your breathing and rhythm. In an endurance game, steady placement outlasts raw smash.',
        ],
      },
    ],
    practiceSpots: [
      {
        id: 'prac-needham-stamina',
        title: 'Endurance Volley Station',
        type: 'return_machine',
        position: [0, 0, -6.8],
        description: 'Practice rapid rhythm returns to build tournament stamina.',
      },
    ],
    carParkPosition: [-8.0, 0, 5.5],
    carRotationY: 0.1,
    signBoardPosition: [-3.8, 0, 0],
    spawnPosition: [-6.8, 0, 4.2],
    bounds: { minX: -14, maxX: 14, minZ: -12, maxZ: 12 },
    musicTrack: 'Endurance Pace',
  },

  // 5. Youngstown, Ohio — Major Midwestern hub for competitive endurance marathons
  {
    id: 'youngstown_ohio',
    order: 5,
    rank: 5,
    name: 'Youngstown Steel Valley Fieldhouse',
    location: 'Youngstown, Ohio',
    region: 'Ohio, USA',
    reasonForRanking: 'Major Midwestern hub for competitive endurance marathons',
    keyMilestone: 'Previously held the world record with a 29-hour continuous game',
    mapCoords: { x: 44, y: 50 },
    role: 'The Midwestern Steel Fortress',
    theme: 'industrial_gym',
    courtSurface: 'hardwood_arena',
    defaultRuleSet: 'league',
    description:
      'A tough-as-iron Midwestern hub where community marathons became global headlines. Youngstown set the four square world ablaze when it captured a historic 29-hour continuous game world record.',
    courtPersonality:
      'Industrial indoor arena with echoing hardwood bounces and fierce, competitive Midwestern defense.',
    campaignObjective: {
      title: 'Steel Valley Crown',
      description: 'Advance to Square 1 and survive 5 consecutive challenge volleys.',
      targetRank: 1,
      requiredCrownHolds: 5,
    },
    npcs: [
      {
        id: 'npc-youngstown-vet',
        name: 'Tyler (Steel Valley Regular)',
        role: 'Veteran Player',
        characterId: 'char-foursquare-pro',
        position: [-4.8, 0, 2.5],
        rotationY: 0.7,
        dialogueLines: [
          'We held that 29-hour record proudly in Ohio! In Youngstown, no ball hits the ground uncontested.',
          'Stay low in your stance and keep your wrists loose.',
        ],
      },
    ],
    practiceSpots: [
      {
        id: 'prac-youngstown-wall',
        title: 'Steel Valley Rebounder',
        type: 'garage_wall',
        position: [0, 0, -7.0],
        description: 'Test your reaction time with rapid rebounds.',
      },
    ],
    carParkPosition: [-7.8, 0, 5.2],
    carRotationY: 0.2,
    signBoardPosition: [-3.6, 0, 0],
    spawnPosition: [-6.5, 0, 4.0],
    bounds: { minX: -14, maxX: 14, minZ: -12, maxZ: 12 },
    musicTrack: 'Steel Valley Drive',
  },

  // 6. North Manchester, Indiana — Collegiate stronghold for competitive four square culture
  {
    id: 'north_manchester_indiana',
    order: 6,
    rank: 6,
    name: 'Manchester University Campus Quad',
    location: 'North Manchester, Indiana',
    region: 'Indiana, USA',
    reasonForRanking: 'Collegiate stronghold for competitive four square culture',
    keyMilestone: 'Set a historic 30-hour continuous game milestone at Manchester University',
    mapCoords: { x: 22, y: 56 },
    role: 'The Collegiate Culture Stronghold',
    theme: 'college_campus',
    courtSurface: 'brick_plaza',
    defaultRuleSet: 'school',
    description:
      'Manchester University students and faculty turned the campus quad into a collegiate sports phenomenon, setting a historic 30-hour continuous game world milestone and cementing four square as a university legacy.',
    courtPersonality:
      'Smooth collegiate campus quad pavement surrounded by cheering students and dormitory flags.',
    campaignObjective: {
      title: 'Collegiate Quad Championship',
      description: 'Reach Square 1 and defend the student crown for 5 consecutive rounds.',
      targetRank: 1,
      requiredCrownHolds: 5,
    },
    npcs: [
      {
        id: 'npc-indiana-student',
        name: 'Zach (University Quad President)',
        role: 'Campus Leader',
        characterId: 'char-patch',
        position: [4.6, 0, -2.6],
        rotationY: -1.1,
        dialogueLines: [
          'Manchester University brought college four square to the front pages of world records with 30 straight hours!',
          'Our student body lives and breathes this game between classes.',
        ],
      },
    ],
    practiceSpots: [
      {
        id: 'prac-manchester-quad',
        title: 'Campus Quad Practice Wall',
        type: 'garage_wall',
        position: [0, 0, -7.0],
        description: 'Practice high-arcing university drop serves.',
      },
    ],
    carParkPosition: [-7.6, 0, 5.4],
    carRotationY: 0.15,
    signBoardPosition: [-3.6, 0, 0],
    spawnPosition: [-6.5, 0, 4.2],
    bounds: { minX: -14, maxX: 14, minZ: -12, maxZ: 12 },
    musicTrack: 'Campus Quad Cadence',
  },

  // 7. Melbourne, Australia — International hub where the sport is federally institutionalized
  {
    id: 'melbourne_australia',
    order: 7,
    rank: 7,
    name: 'Melbourne Downball Arena',
    location: 'Melbourne, Australia',
    region: 'Victoria, Australia',
    reasonForRanking: 'International hub where the sport is federally institutionalized',
    keyMilestone: 'Integrated nationwide into PE curriculums as "Downball" or "Handball"',
    mapCoords: { x: 88, y: 76 },
    role: 'The Southern Hemisphere Capital',
    theme: 'downball_stadium',
    courtSurface: 'smooth_asphalt',
    defaultRuleSet: 'championship',
    description:
      'In Australia, four square is federally institutionalized into physical education curriculums nationwide under the revered names "Downball" and "Handball". Melbourne boasts millions of players from kindergarten through adult leagues.',
    courtPersonality:
      'Blazing sun, high-bounce asphalt, and lightning-fast downward smashes. Aussie Downball rules demand lightning reflexes.',
    campaignObjective: {
      title: 'Aussie Downball Crown',
      description: 'Rule Square 1 (The Ace) for 5 consecutive points against Australian national champions.',
      targetRank: 1,
      requiredCrownHolds: 5,
    },
    npcs: [
      {
        id: 'npc-melbourne-ace',
        name: 'Jack "Downball" Miller',
        role: 'Australian Champion',
        characterId: 'char-blocky',
        position: [-4.6, 0, 3.0],
        rotationY: 0.6,
        dialogueLines: [
          'G’day mate! Down here every single Aussie kid learns Downball before they learn long division.',
          'Hit the ball down first and keep your slams tight to the boundary line!',
        ],
      },
    ],
    practiceSpots: [
      {
        id: 'prac-downball-box',
        title: 'Downball Smash Wall',
        type: 'garage_wall',
        position: [0, 0, -7.0],
        description: 'Master downward palm strikes and quick reflex returns.',
      },
    ],
    carParkPosition: [-7.8, 0, 5.0],
    carRotationY: 0.2,
    signBoardPosition: [-3.6, 0, 0],
    spawnPosition: [-6.6, 0, 4.0],
    bounds: { minX: -14, maxX: 14, minZ: -12, maxZ: 12 },
    musicTrack: 'Downball Sunburst',
  },

  // 8. Montreal, Quebec — Highest-density playground playground footprint in Canada
  {
    id: 'montreal_quebec',
    order: 8,
    rank: 8,
    name: 'Mont-Royal Playground & Courtyard',
    location: 'Montreal, Quebec',
    region: 'Quebec, Canada',
    reasonForRanking: 'Highest-density playground playground footprint in Canada',
    keyMilestone: 'Deeply rooted in urban recess culture under the name "Champ"',
    mapCoords: { x: 62, y: 38 },
    role: 'The French Canadian Recess Heartland',
    theme: 'montreal_courtyard',
    courtSurface: 'cobblestone_courtyard',
    defaultRuleSet: 'school',
    description:
      'Montreal boasts the highest density of four square playground courts in all of Canada. Deeply rooted in Quebec urban recess culture under the name "Champ" or "Carré de Quatre", matches are fast, artistic, and passionately contested.',
    courtPersonality:
      'Classic urban stone schoolyard with painted lines and echoing brick walls. Spin shots bounce uniquely off the pavement.',
    campaignObjective: {
      title: 'Courtyard Champ Crown',
      description: 'Capture Square 1 and defend it for 5 rallies against the top recess veterans of Montreal.',
      targetRank: 1,
      requiredCrownHolds: 5,
    },
    npcs: [
      {
        id: 'npc-montreal-champ',
        name: 'Étienne (Le Champion)',
        role: 'Courtyard Regular',
        characterId: 'char-foursquare-pro',
        position: [4.8, 0, -2.8],
        rotationY: -1.0,
        dialogueLines: [
          'Bienvenue à Montréal! Ici, tout le monde joue au Champ depuis l’école primaire.',
          'Watch the spin when the ball hits the painted white line—it kicks hard to the left!',
        ],
      },
    ],
    practiceSpots: [
      {
        id: 'prac-montreal-rebound',
        title: 'Brick Wall Rebounder',
        type: 'garage_wall',
        position: [0, 0, -7.0],
        description: 'Practice trick angle returns off brick facades.',
      },
    ],
    carParkPosition: [-7.8, 0, 5.2],
    carRotationY: 0.2,
    signBoardPosition: [-3.6, 0, 0],
    spawnPosition: [-6.6, 0, 4.0],
    bounds: { minX: -14, maxX: 14, minZ: -12, maxZ: 12 },
    musicTrack: 'Courtyard Chansons',
  },

  // 9. Calgary, Alberta — Premier Canadian regional tournament hotspot
  {
    id: 'calgary_alberta',
    order: 9,
    rank: 9,
    name: 'Calgary Stampede King’s Court',
    location: 'Calgary, Alberta',
    region: 'Alberta, Canada',
    reasonForRanking: 'Premier Canadian regional tournament hotspot',
    keyMilestone: 'Famed for generating highly competitive variations like "King\'s Court"',
    mapCoords: { x: 14, y: 34 },
    role: 'Western Canadian Tournament Hotspot',
    theme: 'stampede_court',
    courtSurface: 'smooth_asphalt',
    defaultRuleSet: 'league',
    description:
      'Western Canada’s ultimate four square hotspot. Calgary is famed for generating intense, competitive tournament variations including the widely adopted "King’s Court" ruleset with sudden-death overtime rallies.',
    courtPersonality:
      'Fast, aggressive prairie asphalt court. Players favor power spikes and rapid-fire corner switches.',
    campaignObjective: {
      title: 'King’s Court Crown',
      description: 'Advance through the bracket to Square 1 and hold it for 5 rallies against Calgary power hitters.',
      targetRank: 1,
      requiredCrownHolds: 5,
    },
    npcs: [
      {
        id: 'npc-calgary-king',
        name: 'Brett (King’s Court Master)',
        role: 'Western Champion',
        characterId: 'char-patch',
        position: [-4.6, 0, 2.8],
        rotationY: 0.7,
        dialogueLines: [
          'Out here in Calgary, we don’t wait around—we play King’s Court with full-speed returns!',
          'Make sure you get beneath the ball so you can redirect power into the open corner.',
        ],
      },
    ],
    practiceSpots: [
      {
        id: 'prac-calgary-power',
        title: 'Prairie Power Target',
        type: 'placement_cones',
        position: [3.8, 0, 4.0],
        description: 'Practice high-velocity corner placement.',
      },
    ],
    carParkPosition: [-7.6, 0, 5.4],
    carRotationY: 0.15,
    signBoardPosition: [-3.6, 0, 0],
    spawnPosition: [-6.6, 0, 4.2],
    bounds: { minX: -14, maxX: 14, minZ: -12, maxZ: 12 },
    musicTrack: 'Prairie Stampede Beat',
  },

  // 10. Buenos Aires, Argentina — Premier South American competitive outpost
  {
    id: 'buenos_aires_argentina',
    order: 10,
    rank: 10,
    name: 'Plaza de Mayo Arena',
    location: 'Buenos Aires, Argentina',
    region: 'Buenos Aires, Argentina',
    reasonForRanking: 'Premier South American competitive outpost',
    keyMilestone: 'Captured a 29-hour Guinness World Record endurance title',
    mapCoords: { x: 48, y: 84 },
    role: 'South American World Record Outpost',
    theme: 'buenos_aires_plaza',
    courtSurface: 'polished_stone',
    defaultRuleSet: 'championship',
    description:
      'South America’s most celebrated competitive four square destination. In a sensational display of athletic passion and perseverance, Buenos Aires captured a famous 29-hour Guinness World Record endurance title in front of thousands of cheering fans.',
    courtPersonality:
      'Polished stone plaza with crisp rhythmic bounces, passionate crowd cheers, and world-record intensity.',
    campaignObjective: {
      title: 'Plaza de Mayo World Record Crown',
      description: 'Take the King Square and defend it for 5 heart-pounding rallies against Argentina’s endurance champions.',
      targetRank: 1,
      requiredCrownHolds: 5,
    },
    npcs: [
      {
        id: 'npc-ba-campeon',
        name: 'Mateo (El Maestro de la Plaza)',
        role: 'South American Record Holder',
        characterId: 'char-foursquare-pro',
        position: [4.6, 0, -2.6],
        rotationY: -1.1,
        dialogueLines: [
          '¡Bienvenidos a Buenos Aires! 29 hours of non-stop four square showed the world our passion.',
          'Play with heart, watch your spin, and honor the court!',
        ],
      },
    ],
    practiceSpots: [
      {
        id: 'prac-ba-wall',
        title: 'Plaza Rebound Wall',
        type: 'garage_wall',
        position: [0, 0, -7.0],
        description: 'Test your quick-touch volleys and high-spin recovery.',
      },
    ],
    carParkPosition: [-7.8, 0, 5.2],
    carRotationY: 0.2,
    signBoardPosition: [-3.6, 0, 0],
    spawnPosition: [-6.6, 0, 4.0],
    bounds: { minX: -14, maxX: 14, minZ: -12, maxZ: 12 },
    musicTrack: 'Tango Bounce de Mayo',
  },
];

// Helper functions for campaign storage and City 10 -> City 1 ladder progression
const CAMPAIGN_STORAGE_KEY = 'foursquare_campaign_v2';

export const LADDER_VENUES: VenueId[] = [
  'buenos_aires_argentina',   // Rank 10: Starting City!
  'calgary_alberta',          // Rank 9
  'montreal_quebec',          // Rank 8
  'melbourne_australia',      // Rank 7
  'north_manchester_indiana', // Rank 6
  'youngstown_ohio',          // Rank 5
  'needham_mass',             // Rank 4
  'burlington_vermont',       // Rank 3
  'boston_mass',              // Rank 2
  'bridgton_maine',           // Rank 1: World Championship Pinnacle!
];

export function getNextLadderVenueId(currentId: VenueId): VenueId | null {
  const idx = LADDER_VENUES.indexOf(currentId);
  if (idx >= 0 && idx < LADDER_VENUES.length - 1) {
    return LADDER_VENUES[idx + 1];
  }
  return null;
}

export function loadCampaignProgress(): CampaignProgress {
  try {
    const raw = localStorage.getItem(CAMPAIGN_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Ensure current venue exists in VENUES; otherwise default to Tenth City (Buenos Aires)
      if (!VENUES.some((v) => v.id === parsed.currentVenueId)) {
        parsed.currentVenueId = 'buenos_aires_argentina';
      }
      return parsed;
    }
  } catch (err) {
    console.error('Failed to load campaign progress:', err);
  }

  // Starts at the Tenth City (Buenos Aires, Argentina) and works up to the First City (Maine)!
  return {
    unlockedVenues: ['buenos_aires_argentina'],
    completedVenues: [],
    currentVenueId: 'buenos_aires_argentina',
    venueRecords: {
      buenos_aires_argentina: { bestStreak: 0, notes: [] },
      calgary_alberta: { bestStreak: 0, notes: [] },
      montreal_quebec: { bestStreak: 0, notes: [] },
      melbourne_australia: { bestStreak: 0, notes: [] },
      north_manchester_indiana: { bestStreak: 0, notes: [] },
      youngstown_ohio: { bestStreak: 0, notes: [] },
      needham_mass: { bestStreak: 0, notes: [] },
      burlington_vermont: { bestStreak: 0, notes: [] },
      boston_mass: { bestStreak: 0, notes: [] },
      bridgton_maine: { bestStreak: 0, notes: [] },
    },
    coins: 70,
    equippedCharacterId: 'char-patch',
  };
}

export function saveCampaignProgress(progress: CampaignProgress) {
  try {
    localStorage.setItem(CAMPAIGN_STORAGE_KEY, JSON.stringify(progress));
  } catch (err) {
    console.error('Failed to save campaign progress:', err);
  }
}
