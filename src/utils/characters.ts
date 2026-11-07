export type CharacterArchetype =
  | 'patch'
  | 'blocky'
  | 'skater_roxy'
  | 'ref_leo'
  | 'maya'
  | 'slime_goo'
  | 'arcade_bot'
  | 'cyber_ronin'
  | 'astro_nova'
  | 'shinobi_zephyr'
  | 'magma_rex'
  | 'yeti_frost'
  | 'titan_golem'
  | 'phoenix_blaze'
  | 'turbo_kart'
  | 'king_rex'
  | 'fang_wolf'
  | 'skully_bones';

export interface CharacterDef {
  id: string;
  name: string;
  nickname: string;
  title: string;
  speciesType: string;
  isHuman: boolean;
  price: number; // 0 for free
  isFree: boolean;
  avatarColor: string;
  capColor: string;
  skinColor: string;
  colors: { primary: string; secondary: string };
  quote: string;
  archetype: CharacterArchetype;

  // 6 Core Four Square Stats
  kingCourtHolds: number;     // Total King rounds held
  smashVelocityMph: number;   // Peak downward smash speed (MPH)
  cornerCutAccuracy: number;  // Corner edge landing precision (%)
  faultRecoveryRate: number;  // Diving dig & save recovery rate (%)
  spinControlRpm: number;     // Rotations per minute on spin cuts (RPM)
  careerEliminations: number; // Total contenders knocked out to queue (KOs)

  speed: number; // 1-10
  power: number; // 1-10
  spin: number; // 1-10
  description: string;
  insideShot: number;
  outsideShot: number;
  ballhandling: number;
  defense: number;
  quickness: number;
  serveControl: number;
  qualities: string[];
  homeCourt: string;
  division: 'mens' | 'womens' | 'all';
  teamCrest: string;
}

// Exactly 16 Streamlined League Characters (Diverse Humans & Distinctive Schoolyard Rivals)
type RawCharacterDef = Omit<CharacterDef, 'colors'>;
const RAW_CHARACTERS: RawCharacterDef[] = [
  // 1 - Toby "Patch" McCall (FREE)
  {
    id: 'char-patch',
    name: 'Toby "Patch" McCall',
    nickname: 'Classic Street Legend',
    title: 'Schoolyard Prodigy',
    speciesType: 'Human (Schoolyard Legend)',
    isHuman: true,
    price: 0,
    isFree: true,
    avatarColor: '#2563EB',
    capColor: '#EF4444',
    skinColor: '#FBBF24',
    quote: "Humans don't back down. Let's keep the rally rolling!",
    archetype: 'patch',
    kingCourtHolds: 142,
    smashVelocityMph: 64,
    cornerCutAccuracy: 94,
    faultRecoveryRate: 91,
    spinControlRpm: 1280,
    careerEliminations: 384,
    speed: 8,
    power: 7,
    spin: 8,
    insideShot: 8,
    outsideShot: 9,
    ballhandling: 8,
    defense: 8,
    quickness: 9,
    serveControl: 9,
    qualities: ['Human Grit', 'Corner Slicer', 'Iron Palm Dig'],
    homeCourt: 'Lincoln High Blacktop',
    division: 'all',
    teamCrest: 'patch_star',
    description: 'The iconic schoolyard captain. Agile, disciplined, and possessing razor-sharp court vision.',
  },

  // 2 - Blocky (FREE)
  {
    id: 'char-blocky',
    name: 'Blocky Voxel',
    nickname: 'Geometric Brick',
    title: 'The Living Voxel Ace',
    speciesType: 'Voxel Construct',
    isHuman: false,
    price: 0,
    isFree: true,
    avatarColor: '#10B981',
    capColor: '#047857',
    skinColor: '#34D399',
    quote: "90-degree angles are mathematically unbreakable!",
    archetype: 'blocky',
    kingCourtHolds: 118,
    smashVelocityMph: 68,
    cornerCutAccuracy: 97,
    faultRecoveryRate: 84,
    spinControlRpm: 920,
    careerEliminations: 312,
    speed: 6,
    power: 8,
    spin: 7,
    insideShot: 9,
    outsideShot: 8,
    ballhandling: 7,
    defense: 8,
    quickness: 6,
    serveControl: 9,
    qualities: ['Perfect Right Angles', 'Grid Precision', 'Flat Wall Block'],
    homeCourt: 'Oakridge Math Courtyard',
    division: 'all',
    teamCrest: 'voxel_cube',
    description: 'Constructed from pure emerald voxels, Blocky uses mathematical geometry to land shots directly on boundary chalk.',
  },

  // 3 - Skater Roxy (FREE)
  {
    id: 'char-skater-roxy',
    name: 'Roxy Wheeler',
    nickname: 'Roller Derby Queen',
    title: 'Inline Speedster',
    speciesType: 'Human (Derby Striker)',
    isHuman: true,
    price: 0,
    isFree: true,
    avatarColor: '#EC4899',
    capColor: '#9333EA',
    skinColor: '#FBCFE8',
    quote: "Can't touch this momentum! Out of the way!",
    archetype: 'skater_roxy',
    kingCourtHolds: 126,
    smashVelocityMph: 62,
    cornerCutAccuracy: 88,
    faultRecoveryRate: 95,
    spinControlRpm: 1540,
    careerEliminations: 340,
    speed: 10,
    power: 6,
    spin: 9,
    insideShot: 7,
    outsideShot: 8,
    ballhandling: 9,
    defense: 9,
    quickness: 10,
    serveControl: 8,
    qualities: ['Inline Drift', 'Sideline Glide', 'High-Speed Dig'],
    homeCourt: 'Venice Beach Boardwalk Court',
    division: 'womens',
    teamCrest: 'roller_skate',
    description: 'Skating on dual quad wheels, Roxy drifts around the perimeter to retrieve impossible out-of-reach shots.',
  },

  // 4 - Coach Leo (Veteran Educator)
  {
    id: 'char-ref-leo',
    name: 'Coach Leo',
    nickname: 'Whistle Boss',
    title: 'Head Physical Instructor',
    speciesType: 'Human (Head Coach)',
    isHuman: true,
    price: 150,
    isFree: false,
    avatarColor: '#F59E0B',
    capColor: '#1E3A8A',
    skinColor: '#F1C27D',
    quote: "Feet behind the line! Respect the whistle!",
    archetype: 'ref_leo',
    kingCourtHolds: 165,
    smashVelocityMph: 72,
    cornerCutAccuracy: 95,
    faultRecoveryRate: 90,
    spinControlRpm: 1100,
    careerEliminations: 420,
    speed: 7,
    power: 8,
    spin: 7,
    insideShot: 9,
    outsideShot: 9,
    ballhandling: 9,
    defense: 9,
    quickness: 8,
    serveControl: 10,
    qualities: ['Referee Authority', 'Textbook Form', 'Zero Receiver Faults'],
    homeCourt: 'Oakridge Gymnasium Fieldhouse',
    division: 'mens',
    teamCrest: 'gold_whistle',
    description: 'Has officiated over 5,000 matches. His textbook fundamentals make him nearly impossible to eliminate on standard serves.',
  },

  // 5 - Maya Rodriguez (Spin Queen)
  {
    id: 'char-maya',
    name: 'Maya Rodriguez',
    nickname: 'Spin Queen',
    title: 'Curving Curveball Specialist',
    speciesType: 'Human (Spin Tactician)',
    isHuman: true,
    price: 100,
    isFree: false,
    avatarColor: '#8B5CF6',
    capColor: '#C084FC',
    skinColor: '#D4A373',
    quote: "You think that ball is going straight? Guess again!",
    archetype: 'maya',
    kingCourtHolds: 112,
    smashVelocityMph: 58,
    cornerCutAccuracy: 96,
    faultRecoveryRate: 88,
    spinControlRpm: 1850,
    careerEliminations: 278,
    speed: 8,
    power: 6,
    spin: 10,
    insideShot: 9,
    outsideShot: 9,
    ballhandling: 10,
    defense: 8,
    quickness: 9,
    serveControl: 9,
    qualities: ['Magnus Curve', 'Baseline Hook', 'Deceptive Spin'],
    homeCourt: 'Montreal Urban Courtyard',
    division: 'womens',
    teamCrest: 'spiral_cyclone',
    description: 'The master of aerodynamics. Her wrist whip creates heavy sideways torque that veers across court dividers.',
  },

  // 6 - Gloop the Slime King
  {
    id: 'char-slime-goo',
    name: 'Gloop Slime King',
    nickname: 'Viscous Gel',
    title: 'Liquid Gel Master',
    speciesType: 'Bio-Gel Slime',
    isHuman: false,
    price: 120,
    isFree: false,
    avatarColor: '#84CC16',
    capColor: '#4D7C0F',
    skinColor: '#A3E635',
    quote: "Squelch! Your hard smashes simply bounce right back!",
    archetype: 'slime_goo',
    kingCourtHolds: 105,
    smashVelocityMph: 55,
    cornerCutAccuracy: 91,
    faultRecoveryRate: 98,
    spinControlRpm: 1680,
    careerEliminations: 295,
    speed: 7,
    power: 5,
    spin: 9,
    insideShot: 7,
    outsideShot: 8,
    ballhandling: 9,
    defense: 10,
    quickness: 8,
    serveControl: 8,
    qualities: ['Dampened Absorber', 'Liquid Reach', 'Gel Trajectory'],
    homeCourt: 'Swamp Rec Center',
    division: 'all',
    teamCrest: 'slime_drop',
    description: 'Absorbs downward momentum like a sponge, returning thunderous spikes with soft, unreturnable baseline floaters.',
  },

  // 7 - Byte 8-Bit (Arcade Synth Android)
  {
    id: 'char-arcade-bot',
    name: 'Byte 8-Bit',
    nickname: 'Synth Runner',
    title: 'Arcade Champion',
    speciesType: 'Synth Automaton',
    isHuman: false,
    price: 180,
    isFree: false,
    avatarColor: '#06B6D4',
    capColor: '#0891B2',
    skinColor: '#67E8F9',
    quote: "INSERT COIN. Player 1 ready to dominate!",
    archetype: 'arcade_bot',
    kingCourtHolds: 134,
    smashVelocityMph: 70,
    cornerCutAccuracy: 95,
    faultRecoveryRate: 86,
    spinControlRpm: 1320,
    careerEliminations: 356,
    speed: 8,
    power: 8,
    spin: 8,
    insideShot: 8,
    outsideShot: 9,
    ballhandling: 9,
    defense: 8,
    quickness: 8,
    serveControl: 9,
    qualities: ['CRT Scanline Vision', 'Pixel Precision', 'Chiptune Rallies'],
    homeCourt: 'Retro Arcade Pavilion',
    division: 'all',
    teamCrest: 'arcade_joystick',
    description: 'Built inside an authentic 1984 arcade cabinet. Calculates ball parabolas in 60 frames per second.',
  },

  // 8 - Kenji Takahashi (Cyber Ronin)
  {
    id: 'char-cyber-ronin',
    name: 'Kenji Takahashi',
    nickname: 'Cyber Blade',
    title: 'Precision Striker',
    speciesType: 'Human (Neo-Tokyo Striker)',
    isHuman: true,
    price: 220,
    isFree: false,
    avatarColor: '#E11D48',
    capColor: '#9F1239',
    skinColor: '#FECDD3',
    quote: "One clean stroke. One perfect point.",
    archetype: 'cyber_ronin',
    kingCourtHolds: 148,
    smashVelocityMph: 75,
    cornerCutAccuracy: 98,
    faultRecoveryRate: 89,
    spinControlRpm: 1450,
    careerEliminations: 395,
    speed: 9,
    power: 8,
    spin: 8,
    insideShot: 9,
    outsideShot: 10,
    ballhandling: 9,
    defense: 8,
    quickness: 9,
    serveControl: 10,
    qualities: ['Katana Slice Angle', 'Focus Reflexes', 'Baseline Snipe'],
    homeCourt: 'Tokyo High Rooftop',
    division: 'mens',
    teamCrest: 'cyber_blade',
    description: 'Strikes the Voit rubber ball with the precision of an artisan blade, slicing corner chalk lines with unmatched accuracy.',
  },

  // 9 - Nova Starling (Space Cadet Ace)
  {
    id: 'char-astro-nova',
    name: 'Nova Starling',
    nickname: 'Zero-G Ace',
    title: 'Cosmic Navigator',
    speciesType: 'Human (Aeronautics Cadet)',
    isHuman: true,
    price: 200,
    isFree: false,
    avatarColor: '#3B82F6',
    capColor: '#1D4ED8',
    skinColor: '#BFDBFE',
    quote: "Gravity is just a suggestion out here!",
    archetype: 'astro_nova',
    kingCourtHolds: 139,
    smashVelocityMph: 66,
    cornerCutAccuracy: 93,
    faultRecoveryRate: 94,
    spinControlRpm: 1600,
    careerEliminations: 362,
    speed: 9,
    power: 7,
    spin: 9,
    insideShot: 8,
    outsideShot: 9,
    ballhandling: 9,
    defense: 9,
    quickness: 9,
    serveControl: 9,
    qualities: ['Lunar Hangtime', 'Apex Floater', 'Zero-G Dig'],
    homeCourt: 'Orbital Hangar Court',
    division: 'womens',
    teamCrest: 'cosmic_planet',
    description: 'Trained in low-gravity flight simulators, Nova hangs in the air for extra tenths of a second to redirect downward hits.',
  },

  // 10 - Ren Hayabusa (Shinobi Striker)
  {
    id: 'char-shinobi-zephyr',
    name: 'Ren Hayabusa',
    nickname: 'Shadow Step',
    title: 'Shinobi Striker',
    speciesType: 'Human (Shinobi Athlete)',
    isHuman: true,
    price: 240,
    isFree: false,
    avatarColor: '#475569',
    capColor: '#0F172A',
    skinColor: '#E2E8F0',
    quote: "You cannot return what you cannot see.",
    archetype: 'shinobi_zephyr',
    kingCourtHolds: 152,
    smashVelocityMph: 71,
    cornerCutAccuracy: 96,
    faultRecoveryRate: 96,
    spinControlRpm: 1500,
    careerEliminations: 410,
    speed: 10,
    power: 7,
    spin: 9,
    insideShot: 9,
    outsideShot: 9,
    ballhandling: 10,
    defense: 9,
    quickness: 10,
    serveControl: 9,
    qualities: ['Smoke Step', 'Blindside Palm', 'Shadow Recovery'],
    homeCourt: 'Kyoto Courtyard Pavilions',
    division: 'mens',
    teamCrest: 'shuriken_leaf',
    description: 'Ren teleports across baseline boundaries with lightning footwork, leaving opponents guessing which quadrant the return will strike.',
  },

  // 11 - Magma Rex (Volcanic Powerhouse)
  {
    id: 'char-magma-rex',
    name: 'Magma Rex',
    nickname: 'Molten Smasher',
    title: 'Volcanic Titan',
    speciesType: 'Elemental Titan',
    isHuman: false,
    price: 260,
    isFree: false,
    avatarColor: '#DC2626',
    capColor: '#7F1D1D',
    skinColor: '#F87171',
    quote: "FEEL THE HEAT OF THE DOWNWARD SLAM!",
    archetype: 'magma_rex',
    kingCourtHolds: 160,
    smashVelocityMph: 84,
    cornerCutAccuracy: 89,
    faultRecoveryRate: 82,
    spinControlRpm: 1200,
    careerEliminations: 445,
    speed: 6,
    power: 10,
    spin: 7,
    insideShot: 8,
    outsideShot: 8,
    ballhandling: 7,
    defense: 8,
    quickness: 6,
    serveControl: 8,
    qualities: ['Volcanic Slam', 'Ground Tremor', 'Maximum Velocity'],
    homeCourt: 'Obsidian Caldera Arena',
    division: 'all',
    teamCrest: 'molten_flame',
    description: 'Holds the world record for hardest Four Square smash at 84 MPH. When Magma Rex spikes, the pavement rattles.',
  },

  // 12 - Frost Golem (Sub-Zero Wall)
  {
    id: 'char-yeti-frost',
    name: 'Frost Golem',
    nickname: 'Sub-Zero Wall',
    title: 'Alpine Guardian',
    speciesType: 'Glacial Elemental',
    isHuman: false,
    price: 250,
    isFree: false,
    avatarColor: '#0284C7',
    capColor: '#075985',
    skinColor: '#BAE6FD',
    quote: "Your rallies freeze solid before reaching my court.",
    archetype: 'yeti_frost',
    kingCourtHolds: 145,
    smashVelocityMph: 60,
    cornerCutAccuracy: 92,
    faultRecoveryRate: 97,
    spinControlRpm: 1350,
    careerEliminations: 380,
    speed: 6,
    power: 8,
    spin: 8,
    insideShot: 8,
    outsideShot: 9,
    ballhandling: 8,
    defense: 10,
    quickness: 7,
    serveControl: 9,
    qualities: ['Glacial Shield', 'Cold Rebound', 'Iron Reach'],
    homeCourt: 'Burlington Lakefront Ice Court',
    division: 'all',
    teamCrest: 'snowflake_shield',
    description: 'A monolithic defender who covers the entire quadrant with freezing reach, turning aggressive attacks into effortless returns.',
  },

  // 13 - Titan Colossus (Ancient Stone Guardian)
  {
    id: 'char-titan-golem',
    name: 'Titan Colossus',
    nickname: 'Living Granite',
    title: 'Earth Anchor',
    speciesType: 'Ancient Stone Guardian',
    isHuman: false,
    price: 280,
    isFree: false,
    avatarColor: '#78350F',
    capColor: '#451A03',
    skinColor: '#A8A29E',
    quote: "Granite does not bend. Step up and strike.",
    archetype: 'titan_golem',
    kingCourtHolds: 158,
    smashVelocityMph: 78,
    cornerCutAccuracy: 90,
    faultRecoveryRate: 88,
    spinControlRpm: 1050,
    careerEliminations: 430,
    speed: 6,
    power: 10,
    spin: 6,
    insideShot: 9,
    outsideShot: 8,
    ballhandling: 7,
    defense: 10,
    quickness: 6,
    serveControl: 9,
    qualities: ['Granite Stance', 'Unyielding Block', 'Heavy Strike'],
    homeCourt: 'Coliseum Stone Courtyard',
    division: 'all',
    teamCrest: 'stone_pillar',
    description: 'An ancient guardian carved from mountain granite. Immovable in Square 1 and capable of launching high-arc floaters.',
  },

  // 14 - Pyra Phoenix (Solar Flight Smasher)
  {
    id: 'char-phoenix-blaze',
    name: 'Pyra Phoenix',
    nickname: 'Solar Wing',
    title: 'Flame Striker',
    speciesType: 'Avian Fire Spirit',
    isHuman: false,
    price: 300,
    isFree: false,
    avatarColor: '#EA580C',
    capColor: '#9A3412',
    skinColor: '#FDBA74',
    quote: "From the ashes of fault, I rise to King!",
    archetype: 'phoenix_blaze',
    kingCourtHolds: 168,
    smashVelocityMph: 80,
    cornerCutAccuracy: 95,
    faultRecoveryRate: 93,
    spinControlRpm: 1720,
    careerEliminations: 460,
    speed: 9,
    power: 9,
    spin: 9,
    insideShot: 9,
    outsideShot: 9,
    ballhandling: 9,
    defense: 9,
    quickness: 9,
    serveControl: 9,
    qualities: ['Blazing Arc', 'Rebirth Dig', 'Solar Spin'],
    homeCourt: 'Sunfire Summit Court',
    division: 'womens',
    teamCrest: 'phoenix_crest',
    description: 'Electrifies the court with solar bursts. Renowned for rebounding from near-elimination rallies to reclaim Square 1.',
  },

  // 15 - Turbo Dasher (High-Speed Circuit Racer)
  {
    id: 'char-turbo-kart',
    name: 'Marcus "Turbo" Cole',
    nickname: 'Speed Demon',
    title: 'Velocity Champion',
    speciesType: 'Human (Speed Racer)',
    isHuman: true,
    price: 320,
    isFree: false,
    avatarColor: '#EAB308',
    capColor: '#CA8A04',
    skinColor: '#FEF08A',
    quote: "Blink and you'll find yourself at the back of the queue!",
    archetype: 'turbo_kart',
    kingCourtHolds: 172,
    smashVelocityMph: 76,
    cornerCutAccuracy: 93,
    faultRecoveryRate: 95,
    spinControlRpm: 1580,
    careerEliminations: 475,
    speed: 10,
    power: 8,
    spin: 8,
    insideShot: 9,
    outsideShot: 9,
    ballhandling: 9,
    defense: 9,
    quickness: 10,
    serveControl: 9,
    qualities: ['Supersonic Sprint', 'Reflex Spike', 'Nitrous Return'],
    homeCourt: 'Speedway Paddock Court',
    division: 'mens',
    teamCrest: 'checkered_flag',
    description: 'Human speed prodigy whose reaction times were clocked at professional racing levels. Unmatched in transition defense.',
  },

  // 16 - Sovereign King Rex (The Four Square Grandmaster)
  {
    id: 'char-king-rex',
    name: 'Sovereign King Rex',
    nickname: 'The Crown',
    title: 'World Grandmaster',
    speciesType: 'Regal Champion',
    isHuman: true,
    price: 500,
    isFree: false,
    avatarColor: '#EAB308',
    capColor: '#7E22CE',
    skinColor: '#FDE047',
    quote: "Square 1 is my domain. You must earn your passage.",
    archetype: 'king_rex',
    kingCourtHolds: 215,
    smashVelocityMph: 82,
    cornerCutAccuracy: 99,
    faultRecoveryRate: 98,
    spinControlRpm: 1900,
    careerEliminations: 620,
    speed: 9,
    power: 9,
    spin: 10,
    insideShot: 10,
    outsideShot: 10,
    ballhandling: 10,
    defense: 10,
    quickness: 9,
    serveControl: 10,
    qualities: ['Supreme Authority', 'House Rule Master', 'Faultless Placement'],
    homeCourt: 'Bridgton World Championship Arena',
    division: 'all',
    teamCrest: 'sovereign_crown',
    description: 'The reigning four-time World Four Square Champion. Possesses absolute mastery over serving trajectory, house rule declarations, and defensive recovery.',
  },
];

export const CHARACTERS: CharacterDef[] = RAW_CHARACTERS.map((c) => ({
  ...c,
  colors: { primary: c.avatarColor, secondary: c.capColor },
}));

// Persistent Stat Upgrades
export interface UpgradedStats {
  speedBoost: number;
  powerBoost: number;
  spinBoost: number;
  recoveryBoost: number;
}

const UPGRADED_STATS_KEY = 'foursquare_char_upgrades_v2';

export function getStoredCharUpgrades(): Record<string, UpgradedStats> {
  try {
    const raw = localStorage.getItem(UPGRADED_STATS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

export function saveStoredCharUpgrades(upgrades: Record<string, UpgradedStats>): void {
  try {
    localStorage.setItem(UPGRADED_STATS_KEY, JSON.stringify(upgrades));
  } catch {}
}

export function getCharacterUpgrades(charId: string): UpgradedStats {
  const all = getStoredCharUpgrades();
  return all[charId] || { speedBoost: 0, powerBoost: 0, spinBoost: 0, recoveryBoost: 0 };
}

// Tiered Pricing: 50 coins (stats 1-5), 100 coins (stats 6-8), 250 coins (stats 9-10)
export function getStatBoostCost(currentStatValue: number): number {
  if (currentStatValue <= 5) return 50;
  if (currentStatValue <= 8) return 100;
  return 250;
}

export function getCharacterWithUpgrades(charDef: CharacterDef): CharacterDef {
  const boosts = getCharacterUpgrades(charDef.id);
  return {
    ...charDef,
    speed: Math.min(10, charDef.speed + (boosts.speedBoost || 0)),
    power: Math.min(10, charDef.power + (boosts.powerBoost || 0)),
    spin: Math.min(10, charDef.spin + (boosts.spinBoost || 0)),
    faultRecoveryRate: Math.min(99, charDef.faultRecoveryRate + (boosts.recoveryBoost || 0) * 2),
    cornerCutAccuracy: Math.min(99, charDef.cornerCutAccuracy + (boosts.spinBoost || 0)),
    smashVelocityMph: Math.min(95, charDef.smashVelocityMph + (boosts.powerBoost || 0) * 2),
  };
}

export function boostCharacterStat(
  charId: string,
  statType: 'speed' | 'power' | 'spin' | 'recovery'
): { success: boolean; newCost: number } {
  const all = getStoredCharUpgrades();
  const current = all[charId] || { speedBoost: 0, powerBoost: 0, spinBoost: 0, recoveryBoost: 0 };
  const baseChar = CHARACTERS.find((c) => c.id === charId) || CHARACTERS[0];
  const charWithUpg = getCharacterWithUpgrades(baseChar);

  let currentVal = 5;
  if (statType === 'speed') currentVal = charWithUpg.speed;
  if (statType === 'power') currentVal = charWithUpg.power;
  if (statType === 'spin') currentVal = charWithUpg.spin;
  if (statType === 'recovery') currentVal = Math.round(charWithUpg.faultRecoveryRate / 10);

  if (currentVal >= 10) {
    return { success: false, newCost: 250 };
  }

  if (statType === 'speed') current.speedBoost = (current.speedBoost || 0) + 1;
  if (statType === 'power') current.powerBoost = (current.powerBoost || 0) + 1;
  if (statType === 'spin') current.spinBoost = (current.spinBoost || 0) + 1;
  if (statType === 'recovery') current.recoveryBoost = (current.recoveryBoost || 0) + 1;

  all[charId] = current;
  saveStoredCharUpgrades(all);

  const nextVal = currentVal + 1;
  return { success: true, newCost: getStatBoostCost(nextVal) };
}

// Player Customization
export type CreatureArchetype = 'athlete' | 'slime' | 'mecha' | 'doggo' | 'golem' | 'dragon' | 'alien' | 'shadow' | 'bot' | 'wolf';

export const ACCESSORY_TYPES = ['none', 'chain', 'headphones', 'wristbands', 'shades'];
export const SHIRT_TYPES = ['solid', 'striped', 'crest', 'retro'];
export const PANTS_TYPES = ['shorts', 'sweatpants', 'jeans'];
export const SHOES_TYPES = ['sneakers', 'high_tops', 'boots'];

export interface CharacterCustomization {
  skinColor: string;
  shirtColor: string;
  pantsColor: string;
  shoeColor: string;
  capColor: string;
  archetype: CreatureArchetype;
  playerNickname?: string;
  playerLevel?: number;
  hasGoldChain?: boolean;
  hasHeadphones?: boolean;
  headphonesColor?: string;
  hasWristbands?: boolean;
  wristbandColor?: string;
  hasShades?: boolean;
  shadesColor?: string;
  hatType?: string;
  hatColor?: string;
  accessoryType?: string;
  accessoryColor?: string;
  creatureArchetype?: CreatureArchetype | string;
  shirtPattern?: string;
  shirtSecondaryColor?: string;
  jerseyNumber?: string | number;
  shoesColor?: string;
  hairColor?: string;
  hairStyle?: string;
}

export const DEFAULT_CUSTOMIZATION: CharacterCustomization = {
  skinColor: '#FBBF24',
  shirtColor: '#2563EB',
  pantsColor: '#1E293B',
  shoeColor: '#FFFFFF',
  capColor: '#EF4444',
  archetype: 'athlete',
};

const STORAGE_KEY = 'foursquare_customization_v1';
const EQUIPPED_KEY = 'foursquare_equipped_char_v1';
const UNLOCKED_KEY = 'foursquare_unlocked_chars_v1';

export function getStoredCoins(): number {
  try {
    const raw = localStorage.getItem('foursquare_campaign_progress_v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.coins === 'number') return parsed.coins;
    }
  } catch {}
  return 150;
}

export function saveStoredCoins(coins: number): void {
  try {
    const raw = localStorage.getItem('foursquare_campaign_progress_v1');
    const prog = raw ? JSON.parse(raw) : {};
    prog.coins = coins;
    localStorage.setItem('foursquare_campaign_progress_v1', JSON.stringify(prog));
  } catch {}
}

export function getStoredCustomization(): CharacterCustomization {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_CUSTOMIZATION, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_CUSTOMIZATION;
}

export function saveStoredCustomization(c: CharacterCustomization): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
  } catch {}
}

export function getEquippedCharacterId(): string {
  try {
    const raw = localStorage.getItem(EQUIPPED_KEY);
    if (raw) return raw;
  } catch {}
  return 'char-patch';
}

export function setEquippedCharacterId(id: string): void {
  try {
    localStorage.setItem(EQUIPPED_KEY, id);
  } catch {}
}

export function getUnlockedCharacters(): string[] {
  try {
    const raw = localStorage.getItem(UNLOCKED_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return ['char-patch', 'char-blocky', 'char-skater-roxy'];
}

export const getUnlockedCharacterIds = getUnlockedCharacters;
export const unlockCreatureForm = unlockCharacter;
export function getUnlockedCreatureForms(): string[] {
  return getUnlockedCharacters();
}

export function unlockCharacter(id: string): string[] {
  try {
    const current = getUnlockedCharacters();
    if (!current.includes(id)) {
      const updated = [...current, id];
      localStorage.setItem(UNLOCKED_KEY, JSON.stringify(updated));
      return updated;
    }
    return current;
  } catch {
    return ['char-patch', 'char-blocky', 'char-skater-roxy'];
  }
}
