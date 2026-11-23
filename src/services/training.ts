import type { SquareId } from '../types/foursquare';

export const TRAINING_DRILLS = [
  {id:'footwork',title:'Footwork',instructions:'Reach both gold rings. Click a ring to move, or use WASD, the arrows, or the left stick.',coins:10,xp:50},
  {id:'reach',title:'Extended reach',instructions:'Move to the gold ring. Hold F or RB / R1 as you reach it.',coins:10,xp:50},
  {id:'serve',title:'Diagonal serve',instructions:'Serve from Square 1 into Square 4. Click the lit square or press 4, Space, or A / Cross.',coins:15,xp:75},
  {id:'bounce',title:'Read the bounce',instructions:'Wait for one bounce, then return to Square 2. Click it, press 2, or use D-pad up.',coins:15,xp:75},
  {id:'dive-return',title:'Diving return',instructions:'Watch the deep bounce in Square 4. Hold F or RB / R1, then hit to Square 2. You can aim just before the bounce.',coins:20,xp:100},
  {id:'cross',title:'Cross-court return',instructions:'Send the next return diagonally into Square 1. Click it, press 1, or use D-pad left.',coins:15,xp:75},
  {id:'placement',title:'Deep corner',instructions:'Aim for the gold circle inside Square 3. Click the circle, press 3, or use D-pad down.',coins:20,xp:100},
  {id:'power',title:'Power return',instructions:'Hit a fast return to Square 2. Hold Shift or RT / R2 while choosing the square.',coins:20,xp:100},
  {id:'rally',title:'Two-shot rally',instructions:'Return to Square 2. After the feeder sends it back, return to Square 1.',coins:25,xp:125},
] as const;

export type DrillId = typeof TRAINING_DRILLS[number]['id'];

export function trainingTotals(completed: readonly string[] = []) {
  return TRAINING_DRILLS.filter(({id})=>completed.includes(id)).reduce((total,drill)=>({
    drills:total.drills+1,coins:total.coins+drill.coins,xp:total.xp+drill.xp,
  }),{drills:0,coins:0,xp:0});
}

export const DRILL_DPAD: ReadonlyArray<readonly [number,SquareId]> = [[12,2],[15,4],[13,3],[14,1]];
