import { Player, BallState, SquareId, RuleSet, RefereeCall, ShotType } from '../types/foursquare';
import {
  SQUARE_CONFIGS,
  evaluateBallLanding,
  COURT_HALF_SIZE,
  LINE_HALF_WIDTH,
} from '../utils/courtGeometry';
import {
  CHARACTERS,
  CharacterDef,
  getStoredCoins,
  saveStoredCoins,
  getEquippedCharacterId,
} from '../utils/characters';
import { soundFX } from './soundEffects';

export interface GameEngineState {
  matchId: string;
  players: Player[]; // Active 4 players on court [0..3]
  waitingQueue: Player[]; // Players on bench (6 characters)
  humanPlayerId: string;
  servingPlayerId: string;
  activeTurnPlayerId: string | null;
  receiverFaultCount: number; // 0 or 1
  ballState: BallState;
  ruleSet: RuleSet;
  activeHouseRule: string | null;
  crownHoldsTarget: number; // default 5
  rallyCount: number;
  totalRounds: number;
  coins: number;
  refereeCall: RefereeCall;
  isPaused: boolean;
  isGameOver: boolean;
  gameWinner: Player | null;
  showdownState: {
    active: boolean;
    playerA: Player;
    playerB: Player;
    reason: string;
  } | null;
}

const BALL_RADIUS = 0.22;
export const BOT_RETURN_DELAY_MS = 180;
const GRAVITY = 9.8;

function timeToCourt(ball: BallState) {
  const height = Math.max(0, ball.y - BALL_RADIUS);
  return (ball.vy + Math.sqrt(ball.vy ** 2 + 2 * GRAVITY * height)) / GRAVITY;
}

export function incomingReturn(state: GameEngineState) {
  const ball = state.ballState;
  if (!ball.isLive || ball.hasBouncedThisPlay || state.isGameOver || state.isPaused) return;
  const seconds = timeToCourt(ball);
  const landing = evaluateBallLanding(ball.x + ball.vx * seconds, ball.z + ball.vz * seconds, state.ruleSet);
  if (landing.isOutOfBounds || landing.square === ball.lastHitterSquare ||
    (state.rallyCount === 0 && landing.square !== 4)) return;
  const player = state.players.find(({ rank }) => rank === landing.square);
  return player ? { player, seconds } : undefined;
}

export function createInitialState(
  ruleSet: RuleSet = 'league',
  customEquippedCharId?: string,
  customOpponentCharId?: string,
  lineupIds?: readonly string[],
): GameEngineState {
  const equippedId = customEquippedCharId || (typeof window === 'undefined' ? undefined : getEquippedCharacterId());
  const equippedDef = CHARACTERS.find((c) => c.id === equippedId) || CHARACTERS[0];

  const selectedOpponent = CHARACTERS.find((c) => c.id === customOpponentCharId && c.id !== equippedDef.id);
  const otherDefs = CHARACTERS.filter((c) => c.id !== equippedDef.id && c.id !== selectedOpponent?.id);
  const selectedCpu = [...new Set(lineupIds)].filter((id) => id !== equippedDef.id)
    .flatMap((id) => CHARACTERS.filter((character) => character.id === id));
  const validLineup = lineupIds?.includes(equippedDef.id) && selectedCpu.length === 3;
  const kingDef = validLineup ? selectedCpu[0] : otherDefs.find((c) => c.archetype === 'king_rex') || otherDefs[0];
  const remainingDefs = otherDefs.filter((c) => c.id !== kingDef.id);
  const contenderDef = validLineup ? selectedCpu[1] : selectedOpponent ?? remainingDefs[0];
  const rookieDef = validLineup ? selectedCpu[2] : selectedOpponent ? remainingDefs[0] : remainingDefs[1];

  const humanPlayer: Player = {
    id: `player-human-${equippedDef.id}`,
    characterId: equippedDef.id,
    name: equippedDef.name,
    archetype: equippedDef.archetype,
    avatarColor: equippedDef.avatarColor,
    capColor: equippedDef.capColor,
    skinColor: equippedDef.skinColor,
    isHuman: true,
    title: 'Challenger',
    rank: 3,
    crownHolds: 0,
    totalHits: 0,
    totalEliminations: 0,
    skill: 0.88,
    points: 0,
    accuracy: 92,
    faults: 0,
  };

  const kingPlayer: Player = {
    id: `player-cpu-${kingDef.id}`,
    characterId: kingDef.id,
    name: kingDef.name,
    archetype: kingDef.archetype,
    avatarColor: kingDef.avatarColor,
    capColor: kingDef.capColor,
    skinColor: kingDef.skinColor,
    isHuman: false,
    title: 'King',
    rank: 1,
    crownHolds: 0,
    totalHits: 0,
    totalEliminations: 0,
    skill: 0.9,
    points: 0,
    accuracy: 90,
    faults: 0,
  };

  const contenderPlayer: Player = {
    id: `player-cpu-${contenderDef.id}`,
    characterId: contenderDef.id,
    name: contenderDef.name,
    archetype: contenderDef.archetype,
    avatarColor: contenderDef.avatarColor,
    capColor: contenderDef.capColor,
    skinColor: contenderDef.skinColor,
    isHuman: false,
    title: 'Contender',
    rank: 2,
    crownHolds: 0,
    totalHits: 0,
    totalEliminations: 0,
    skill: 0.83,
    points: 0,
    accuracy: 85,
    faults: 0,
  };

  const rookiePlayer: Player = {
    id: `player-cpu-${rookieDef.id}`,
    characterId: rookieDef.id,
    name: rookieDef.name,
    archetype: rookieDef.archetype,
    avatarColor: rookieDef.avatarColor,
    capColor: rookieDef.capColor,
    skinColor: rookieDef.skinColor,
    isHuman: false,
    title: 'Rookie',
    rank: 4,
    crownHolds: 0,
    totalHits: 0,
    totalEliminations: 0,
    skill: 0.76,
    points: 0,
    accuracy: 80,
    faults: 0,
  };

  // Strictly 4 active players for the 4 squares (no bench queue cluttering court)
  const activePlayers = [kingPlayer, contenderPlayer, humanPlayer, rookiePlayer];
  const queuePlayers: Player[] = [];

  const currentCoins = typeof window === 'undefined' ? 0 : getStoredCoins();

  return {
    matchId: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
    players: activePlayers,
    waitingQueue: queuePlayers,
    humanPlayerId: humanPlayer.id,
    servingPlayerId: kingPlayer.id,
    activeTurnPlayerId: kingPlayer.id,
    receiverFaultCount: 0,
    coins: currentCoins,
    ballState: {
      x: SQUARE_CONFIGS[1].center[0],

      y: 1.0,
      z: SQUARE_CONFIGS[1].center[1],
      vx: 0,
      vy: 0,
      vz: 0,
      targetSquare: 4,
      lastHitterId: null,
      lastHitterSquare: null,
      bounceCountInCurrentSquare: 0,
      currentSquareOwner: null,
      hasBouncedThisPlay: false,
      isLive: false,
      isServing: true,
    },
    ruleSet,
    activeHouseRule: null,
    crownHoldsTarget: 5,
    rallyCount: 0,
    totalRounds: 0,
    refereeCall: {
      type: 'serve_ready',
      message: `${kingPlayer.name} serves to Square 4!`,
      subMessage: 'Click Square 4 to serve or pass to receiver.',
      timestamp: Date.now(),
    },
    isPaused: false,
    isGameOver: false,
    gameWinner: null,
    showdownState: null,
  };
}

export function createSoloLineup(ruleSet: RuleSet, lineup: readonly string[], name: string, seat: SquareId): GameEngineState {
  const state = createInitialState(ruleSet, lineup[seat - 1], undefined, lineup);
  if (lineup.length !== 4 || new Set(lineup).size !== 4 ||
    !lineup.every((id) => state.players.some(({ characterId }) => characterId === id))) return state;
  const players = lineup.map((id, index) => {
    const player = state.players.find(({ characterId }) => characterId === id)!;
    return { ...player, rank: (index + 1) as SquareId, title: ['King', 'Contender', 'Challenger', 'Rookie'][index],
      name: player.isHuman ? name.trim() || 'Player' : player.name };
  });
  const king = players[0];
  return { ...state, players, servingPlayerId: king.id, activeTurnPlayerId: king.id,
    refereeCall: { ...state.refereeCall, message: `${king.name} serves to Square 4!` } };
}

/**
 * Calculates ball trajectory parameters to land near target (tx, tz)
 */
export function calculateBallTrajectory(
  startX: number,
  startY: number,
  startZ: number,
  targetX: number,
  targetZ: number,
  shotType: ShotType,
  ruleSet: RuleSet
) {
  const dx = targetX - startX;
  const dz = targetZ - startZ;
  const dist = Math.sqrt(dx * dx + dz * dz);

  let duration = 0.85; // seconds
  let arcHeight = 2.4;

  if (shotType === 'fast') {
    duration = 0.55;
    arcHeight = 1.3;
  } else if (shotType === 'high_pop') {
    duration = 1.25;
    arcHeight = 4.2;
  } else if (shotType === 'corner') {
    duration = 0.75;
    arcHeight = 2.0;
  } else if (shotType === 'volley') {
    duration = 0.58;
    arcHeight = 1.6;
  }

  // Horizontal velocity
  const vx = dx / duration;
  const vz = dz / duration;

  // Ballistic arc matching physics loop gravity g = 9.8
  // y(t) = y0 + vy * t - 0.5 * g * t^2 -> 0.22 = y0 + vy * duration - 0.5 * g * duration^2
  const vy = (BALL_RADIUS - startY + 0.5 * GRAVITY * duration * duration) / duration;

  return { vx, vy, vz, duration };
}

/**
 * Performs a legal hit by a player towards target square
 */
export function executeHit(
  state: GameEngineState,
  hitterId: string,
  targetSquare: SquareId,
  shotType: ShotType = 'normal',
  customTargetCoords?: { x: number; z: number }
): GameEngineState {
  const hitter = state.players.find((p) => p.id === hitterId);
  if (!hitter?.rank || state.isGameOver || state.isPaused) return state;

  const isServe = state.ballState.isServing;
  if (isServe) {
    if (hitterId !== state.servingPlayerId) return state;
    if (targetSquare !== 4 || shotType !== 'normal') {
      return resetServe(state, 'Serve underhand to Square 4.');
    }
  } else {
    if (!state.ballState.isLive || hitterId === state.ballState.lastHitterId) return state;
    if (state.ballState.hasBouncedThisPlay) {
      if (hitterId !== state.activeTurnPlayerId) return state;
    } else if (shotType !== 'volley' || state.ruleSet === 'school' || state.rallyCount === 0) {
      return state;
    }
  }

  // Sound effect
  soundFX.playHandStrike(shotType === 'volley');

  // Determine target coordinates
  let tx = SQUARE_CONFIGS[targetSquare].center[0];
  let tz = SQUARE_CONFIGS[targetSquare].center[1];

  if (customTargetCoords) {
    tx = customTargetCoords.x;
    tz = customTargetCoords.z;
  } else if (shotType === 'corner') {
    // Risky outer corner placement
    const dirX = tx > 0 ? 1 : -1;
    const dirZ = tz > 0 ? 1 : -1;
    tx = dirX * (COURT_HALF_SIZE - 0.6);
    tz = dirZ * (COURT_HALF_SIZE - 0.6);
  } else {
    // Normal shot: slight organic offset towards inner center of target square
    const jitter = (Math.random() - 0.5) * 0.7;
    tx += jitter;
    tz += jitter;
  }

  // Safety check: ensure aim doesn't hit inside line by accident unless low skill
  if (!customTargetCoords && (hitter.isHuman || Math.random() < hitter.skill)) {
    if (Math.abs(tx) < LINE_HALF_WIDTH + 0.3) {
      tx = tx >= 0 ? LINE_HALF_WIDTH + 0.5 : -(LINE_HALF_WIDTH + 0.5);
    }
    if (Math.abs(tz) < LINE_HALF_WIDTH + 0.3) {
      tz = tz >= 0 ? LINE_HALF_WIDTH + 0.5 : -(LINE_HALF_WIDTH + 0.5);
    }
  }

  const { x: startX, y: startY, z: startZ } = isServe
    ? serveContactPosition(hitter.rank)
    : state.ballState;

  const { vx, vy, vz } = calculateBallTrajectory(
    startX,
    startY,
    startZ,
    tx,
    tz,
    shotType,
    state.ruleSet
  );

  const updatedPlayers = state.players.map((p) =>
    p.id === hitterId ? { ...p, totalHits: p.totalHits + 1, points: (p.points || 0) + 25 } : p
  );

  return {
    ...state,
    players: updatedPlayers,
    activeTurnPlayerId: null,
    rallyCount: isServe ? 0 : state.rallyCount + 1,
    ballState: {
      ...state.ballState,
      x: startX,
      y: startY,
      z: startZ,
      vx,
      vy,
      vz,
      targetSquare,
      lastHitterId: hitter.id,
      lastHitterSquare: hitter.rank,
      bounceCountInCurrentSquare: 0,
      currentSquareOwner: null,
      hasBouncedThisPlay: false,
      isLive: true,
      isServing: false,
      hitCount: (state.ballState.hitCount ?? 0) + 1,
      lastContact: { x: startX, y: startY, z: startZ },
    },
    refereeCall: {
      type: 'clean_hit',
      message: `${hitter.name} strikes to Square ${targetSquare}!`,
      subMessage: shotType === 'volley' ? '⚡ Clean volley strike in flight!' : 'Clean hit, play on!',
      timestamp: Date.now(),
    },
  };
}

export function serveContactPosition(square: SquareId) {
  const [x, , z] = SQUARE_CONFIGS[square].defaultPlayerPos;
  const yaw = Math.atan2(-x, -z);
  return {
    x: x * 0.88 + Math.sin(yaw) * 0.44 + Math.cos(yaw) * 0.16,
    y: 0.86,
    z: z * 0.88 + Math.cos(yaw) * 0.44 - Math.sin(yaw) * 0.16,
  };
}

export function advanceBall(state: GameEngineState, elapsedSeconds: number): GameEngineState {
  const ball = state.ballState;
  if (!ball.isLive || state.isGameOver || state.isPaused || elapsedSeconds <= 0) return state;

  const timeToBounce = timeToCourt(ball);
  const time = Math.min(elapsedSeconds, timeToBounce);
  const x = ball.x + ball.vx * time;
  const z = ball.z + ball.vz * time;
  const vy = ball.vy - GRAVITY * time;

  if (elapsedSeconds < timeToBounce) {
    const y = ball.y + ball.vy * time - GRAVITY * time ** 2 / 2;
    return { ...state, ballState: { ...ball, x, y, z, vy } };
  }

  soundFX.playBallBounce();
  if (ball.hasBouncedThisPlay) {
    const owner = state.players.find((player) => player.rank === ball.currentSquareOwner);
    if (!owner) return state;
    if (state.rallyCount === 0) return handleReceiverFault(state, owner, 'Missed the serve return');
    return eliminatePlayer(state, owner.id, `Missed the return from Square ${owner.rank}`, 'double_bounce_out');
  }

  const landing = evaluateBallLanding(x, z, state.ruleSet);
  if (state.rallyCount === 0 && landing.square !== 4) {
    return resetServe(state, 'Serve must first bounce in Square 4.');
  }

  const hitOwnSquare = landing.square !== null && landing.square === ball.lastHitterSquare;
  if (landing.isOutOfBounds || hitOwnSquare) {
    const hitter = state.players.find((player) => player.id === ball.lastHitterId);
    if (!hitter) return state;
    const reason = hitOwnSquare ? 'Hit into own square' : landing.description;
    if (state.rallyCount === 1 && hitter.rank === 4) return handleReceiverFault(state, hitter, reason);
    const call = hitOwnSquare ? 'own_square_out' : landing.isInsideLine ? 'inside_line_out' : 'outside_court_out';
    return eliminatePlayer(state, hitter.id, reason, call);
  }

  const receiver = state.players.find((player) => player.rank === landing.square);
  return {
    ...state,
    activeTurnPlayerId: receiver?.id ?? null,
    ballState: {
      ...ball,
      x,
      y: BALL_RADIUS,
      z,
      vy: -vy * 0.76,
      bounceCountInCurrentSquare: 1,
      currentSquareOwner: landing.square,
      hasBouncedThisPlay: true,
    },
  };
}

/**
 * Handle player elimination and court rotation
 */
export function eliminatePlayer(
  state: GameEngineState,
  eliminatedPlayerId: string,
  reason: string,
  callType: RefereeCall['type']
): GameEngineState {
  if (state.isGameOver) return state;
  const eliminatedPlayer = state.players.find((p) => p.id === eliminatedPlayerId);
  if (!eliminatedPlayer || !eliminatedPlayer.rank) return state;

  const eliminatedRank = eliminatedPlayer.rank;

  // Sound effects
  soundFX.playWhistle();

  // If eliminated player was King (1), check if they set a record
  // If human player in 1 was not eliminated, increment crown hold!
  const kingPlayer = state.players.find((p) => p.rank === 1);
  const kingSurvived = kingPlayer && kingPlayer.id !== eliminatedPlayerId;

  const faults = (eliminatedPlayer.faults || 0) + 1;
  const outPlayer: Player = {
    ...eliminatedPlayer,
    rank: null,
    title: 'Waiting Queue',
    crownHolds: 0,
    faults,
    points: Math.max(0, eliminatedPlayer.totalHits * 25 - faults * 50),
    totalEliminations: eliminatedPlayer.totalEliminations + 1,
  };

  // Remaining active players
  const remainingPlayers = state.players.filter((p) => p.id !== eliminatedPlayerId);

  // Take the next person from the waiting queue
  const nextQueue = [...state.waitingQueue];
  let incomingPlayer: Player;

  if (nextQueue.length > 0) {
    incomingPlayer = nextQueue.shift()!;
    nextQueue.push(outPlayer);
  } else {
    // If no queue, cycling back directly to 4 (short group rule)
    incomingPlayer = outPlayer;
  }

  // Shift ranks according to Rule 06:
  // "Everyone below the vacant rank advances one rank.
  // The first waiting player enters 4."
  const rotatedPlayers: Player[] = [];

  remainingPlayers.forEach((p) => {
    let newRank = p.rank!;
    if (p.rank! > eliminatedRank) {
      // Step up one rank!
      newRank = (p.rank! - 1) as SquareId;
    }

    const title =
      newRank === 1 ? 'King' : newRank === 2 ? 'Contender' : newRank === 3 ? 'Challenger' : 'Rookie';

    let crownHolds = p.crownHolds;
    if (newRank === 1 && p.rank === 1 && kingSurvived) {
      crownHolds += 1;
    }

    const currentHits = p.totalHits || 0;
    const currentFaults = p.faults || 0;
    const pts = Math.max(0, crownHolds * 200 + currentHits * 25 - currentFaults * 50);

    rotatedPlayers.push({
      ...p,
      rank: newRank,
      title,
      crownHolds,
      points: pts,
    });
  });

  rotatedPlayers.push({
    ...incomingPlayer,
    rank: 4,
    title: 'Rookie',
    crownHolds: 0,
  });

  // Sort by rank 1, 2, 3, 4
  rotatedPlayers.sort((a, b) => a.rank! - b.rank!);

  const newKing = rotatedPlayers.find((p) => p.rank === 1)!;

  // Check victory condition: whoever holds spot #1 for 5 times wins the game!
  const crownWinner = rotatedPlayers.find((p) => p.rank === 1 && p.crownHolds >= state.crownHoldsTarget);
  const isGameOver = Boolean(crownWinner);

  if (isGameOver && crownWinner) {
    soundFX.playCheer();
  }

  // Calculate earned coins
  const humanPlayer = rotatedPlayers.find((p) => p.id === state.humanPlayerId);
  let earnedCoins = state.humanPlayerId ? 10 : 0;
  if (humanPlayer && humanPlayer.rank === 1 && kingSurvived) {
    earnedCoins += 50; // Bonus for surviving round as King!
  }
  if (crownWinner && crownWinner.id === state.humanPlayerId) {
    earnedCoins += 500; // Championship bonus!
  }
  const nextCoins = state.coins + earnedCoins;
  if (earnedCoins > 0 && typeof window !== 'undefined') saveStoredCoins(nextCoins);

  return {
    ...state,
    players: rotatedPlayers,
    waitingQueue: nextQueue,
    servingPlayerId: newKing.id,
    activeTurnPlayerId: newKing.id,
    receiverFaultCount: 0,
    totalRounds: state.totalRounds + 1,
    coins: nextCoins,
    isGameOver,
    gameWinner: crownWinner || null,
    ballState: {

      x: SQUARE_CONFIGS[1].center[0],
      y: 1.0,
      z: SQUARE_CONFIGS[1].center[1],
      vx: 0,
      vy: 0,
      vz: 0,
      targetSquare: 4,
      lastHitterId: null,
      lastHitterSquare: null,
      bounceCountInCurrentSquare: 0,
      currentSquareOwner: null,
      hasBouncedThisPlay: false,
      isLive: false,
      isServing: true,
    },
    refereeCall: {
      type: callType,
      message: `${reason} · ${eliminatedPlayer.name} out`,
      subMessage: `${newKing.name} serves to Square 4.`,
      offendingPlayerName: eliminatedPlayer.name,
      offendingSquare: eliminatedRank,
      timestamp: Date.now(),
    },
  };
}

/**
 * Handle receiver serve fault allowance (Rule 03)
 */
export function handleReceiverFault(
  state: GameEngineState,
  receiver: Player,
  reason: string
): GameEngineState {
  if ((state.ruleSet === 'league' || state.ruleSet === 'championship') && state.receiverFaultCount === 0) {
    // 1st Fault: Free redo allowance!
    soundFX.playWhistle();
    const server = state.players.find((p) => p.rank === 1)!;
    return {
      ...state,
      receiverFaultCount: 1,
      activeTurnPlayerId: server.id,
      ballState: {
        x: SQUARE_CONFIGS[1].center[0],
        y: 1.0,
        z: SQUARE_CONFIGS[1].center[1],
        vx: 0,
        vy: 0,
        vz: 0,
        targetSquare: 4,
        lastHitterId: null,
        lastHitterSquare: null,
        bounceCountInCurrentSquare: 0,
        currentSquareOwner: null,
        hasBouncedThisPlay: false,
        isLive: false,
        isServing: true,
      },
      refereeCall: {
        type: 'serve_fault_one',
        message: `${reason} · Replay serve`,
        subMessage: `First receiver fault on ${receiver.name}.`,
        offendingPlayerName: receiver.name,
        offendingSquare: receiver.rank ?? undefined,
        timestamp: Date.now(),
      },
    };
  }

  // 2nd Fault or school mode: elimination!
  return eliminatePlayer(
    state,
    receiver.id,
    reason,
    'serve_fault_out'
  );
}

/**
 * Resets serve point if server committed an invalid serve (redo without receiver penalty)
 */
export function resetServe(state: GameEngineState, reason: string): GameEngineState {
  soundFX.playWhistle();
  const server = state.players.find((p) => p.rank === 1)!;
  return {
    ...state,
    activeTurnPlayerId: server.id,
    ballState: {
      x: SQUARE_CONFIGS[1].center[0],
      y: 1.0,
      z: SQUARE_CONFIGS[1].center[1],
      vx: 0,
      vy: 0,
      vz: 0,
      targetSquare: 4,
      lastHitterId: null,
      lastHitterSquare: null,
      bounceCountInCurrentSquare: 0,
      currentSquareOwner: null,
      hasBouncedThisPlay: false,
      isLive: false,
      isServing: true,
    },
    refereeCall: {
      type: 'serve_ready',
      message: `Serve Redo: ${reason}`,
      subMessage: `${server.name} serves again to Square 4.`,
      timestamp: Date.now(),
    },
  };
}
