import { Player, SquareId, ShotType, RuleSet } from '../types/foursquare';

export interface AIDecision {
  targetSquare: SquareId;
  shotType: ShotType;
  delayMs: number;
  customCoords?: { x: number; z: number };
}

/**
 * Computes AI shot decision when ball enters CPU player's square or court
 */
export function getAIDecision(
  aiPlayer: Player,
  activePlayers: Player[],
  ruleSet: RuleSet,
  isServe: boolean
): AIDecision {
  // If AI is serving, mandatory diagonal serve to Square 4 as per Rule 03
  if (isServe) {
    return {
      targetSquare: 4,
      shotType: 'normal',
      delayMs: 650 + Math.random() * 400,
    };
  }

  // Current rank
  const myRank = aiPlayer.rank!;

  // Must hit into another player's square (Rule 04 & 05)
  const candidateSquares: SquareId[] = ([1, 2, 3, 4] as SquareId[]).filter(
    (sq) => sq !== myRank
  );

  // Strategy: AI prefers targeting the King (Square 1) to dethrone them, or human player!
  const humanPlayer = activePlayers.find((p) => p.isHuman);
  let targetSquare: SquareId;

  const roll = Math.random();
  if (myRank !== 1 && roll < 0.45) {
    // Attack King!
    targetSquare = 1;
  } else if (humanPlayer && humanPlayer.rank && humanPlayer.rank !== myRank && roll < 0.75) {
    // Challenge the Human player!
    targetSquare = humanPlayer.rank;
  } else {
    // Random available opponent square
    targetSquare = candidateSquares[Math.floor(Math.random() * candidateSquares.length)];
  }

  // Shot type selection based on skill
  let shotType: ShotType = 'normal';
  const shotRoll = Math.random();

  if (ruleSet === 'league' && shotRoll < 0.22 && aiPlayer.skill > 0.8) {
    // Volley attempt
    shotType = 'volley';
  } else if (shotRoll < 0.45) {
    shotType = 'corner';
  } else if (shotRoll < 0.65) {
    shotType = 'fast';
  } else if (shotRoll < 0.8) {
    shotType = 'high_pop';
  }

  // Reaction delay (realistic human timing between 350ms and 750ms)
  const delayMs = Math.max(300, (1.05 - aiPlayer.skill) * 1200 + Math.random() * 300);

  return {
    targetSquare,
    shotType,
    delayMs,
  };
}
