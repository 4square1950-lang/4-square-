import type { BallState } from '../types/foursquare';

export const STRIKE_STEP = 1.05;
export const DIVE_STEP = 1.55;

export function returnReach(ball: Pick<BallState, 'x' | 'y' | 'z'>, pose: { x: number; z: number; reaching: boolean }) {
  const distance = Math.hypot(ball.x - pose.x, ball.z - pose.z);
  const low = ball.y <= 0.48;
  const high = ball.y > 1.23;
  if (ball.y > 1.83) return 'high';
  const normalRange = low ? 1.38 : high ? 1.18 : 1.55;
  if (distance <= normalRange) return 'ready';
  if (distance <= (low ? 2.04 : high ? 1.53 : 2.07) && ball.y <= 1.5) {
    return pose.reaching ? 'ready' : 'extend';
  }
  return 'far';
}
