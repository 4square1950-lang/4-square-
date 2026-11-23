import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PerspectiveCamera, Vector3 } from 'three';
import { fitMatchCamera } from '../src/utils/matchCamera';
import { returnReach } from '../src/services/returnReach';
import {
  advanceBall,
  createInitialState,
  createSoloLineup,
  eliminatePlayer,
  executeHit,
  incomingReturn,
  type GameEngineState,
} from '../src/services/foursquareEngine';
import type { SquareId } from '../src/types/foursquare';
import { COURT_HALF_SIZE, evaluateBallLanding, SQUARE_CONFIGS } from '../src/utils/courtGeometry';
import { createLocalMatch, DEFAULT_LOCAL_PICKS, LOCAL_SEATS, localShotTarget } from '../src/services/localMultiplayer';
import { createCampaignProgress, LADDER_VENUES, loadCampaignProgress, recordCampaignWin, saveCampaignProgress, VENUES } from '../src/utils/venueData';

test('the match camera keeps the court, tall ball, and controlled player on screen when zoomed in', () => {
  for (const aspect of [16 / 9, 870 / 763, 390 / 844]) {
    const camera = new PerspectiveCamera(50, aspect, 0.12, 260);
    camera.position.set(4.45 * 0.32, 6.5 * 0.75, 9.75 * 0.75);
    camera.lookAt(4.45 * 0.22, 0.65, 0.15);
    const player = new Vector3(4.45, 0.035, 4.45);
    const ball = new Vector3(-4.9, 3.2, 4.9);
    fitMatchCamera(camera, player, ball);
    const points = [-1, 1].flatMap((x) => [-1, 1].map((z) =>
      new Vector3(x * COURT_HALF_SIZE, 0.24, z * COURT_HALF_SIZE)
    ));
    points.push(player, player.clone().add(new Vector3(0, 2.45, 0)), ball);
    for (const point of points) {
      const screen = point.project(camera);
      assert.ok(Math.abs(screen.x) <= 0.911 && Math.abs(screen.y) <= 0.771);
    }
  }
});

test('low and high returns use different reach limits, and a dive extends low-ball reach', () => {
  const standing = { x: 2.6, z: -2.6, reaching: false };
  const diving = { ...standing, reaching: true };
  const lowBall = { x: 2.6, y: 0.22, z: -4.18 };
  assert.equal(returnReach(lowBall, standing), 'extend');
  assert.equal(returnReach(lowBall, diving), 'ready');
  assert.equal(returnReach({ ...lowBall, z: -4.9 }, diving), 'far');
  assert.equal(returnReach({ ...lowBall, y: 1.96 }, diving), 'high');
  assert.equal(returnReach({ ...lowBall, z: -3.4, y: 1.42 }, standing), 'ready');
});

function playerAt(state: GameEngineState, rank: SquareId) {
  const player = state.players.find((candidate) => candidate.rank === rank);
  assert.ok(player);
  return player;
}

function hit(state: GameEngineState, from: SquareId, to: SquareId) {
  const [x, z] = SQUARE_CONFIGS[to].center;
  return executeHit(state, playerAt(state, from).id, to, 'normal', { x, z });
}

function nextBounce(state: GameEngineState, step = 1 / 60) {
  for (let elapsed = 0; elapsed < 3; elapsed += step) {
    const next = advanceBall(state, step);
    if (!next.ballState.isLive || next.ballState.hasBouncedThisPlay !== state.ballState.hasBouncedThisPlay) {
      return next;
    }
    state = next;
  }
  assert.fail('The ball did not reach the court');
}

test('court positions make the serve diagonal and classify the painted lines by ruleset', () => {
  const [serverX, serverZ] = SQUARE_CONFIGS[1].center;
  const [receiverX, receiverZ] = SQUARE_CONFIGS[4].center;
  assert.deepEqual([receiverX, receiverZ], [-serverX, -serverZ]);
  for (const ruleSet of ['league', 'school', 'championship'] as const) {
    assert.equal(evaluateBallLanding(COURT_HALF_SIZE, 2, ruleSet).isOutOfBounds, ruleSet === 'school');
    assert.equal(evaluateBallLanding(COURT_HALF_SIZE, 0, ruleSet).isInsideLine, true);
    assert.equal(evaluateBallLanding(COURT_HALF_SIZE + 0.3, 2, ruleSet).isOutOfBounds, true);
  }
});

test('Play Now assigns the home character to the human and the away character to the opponent', () => {
  const match = createInitialState('league', 'char-arcade-bot', 'char-king-rex');
  assert.equal(playerAt(match, 3).id, match.humanPlayerId);
  assert.equal(playerAt(match, 3).characterId, 'char-arcade-bot');
  assert.equal(playerAt(match, 2).characterId, 'char-king-rex');
  assert.equal(new Set(match.players.map((player) => player.characterId)).size, 4);
});

test('Local Pass & Play fills only unclaimed squares with bots for two, three, or four people', () => {
  for (const count of [2, 3, 4]) {
    const state = createLocalMatch('league', DEFAULT_LOCAL_PICKS.slice(0, count));
    assert.equal(state.players.filter(({ isHuman }) => isHuman).length, count);
    assert.equal(state.servingPlayerId, 'local-p1');
    LOCAL_SEATS.slice(0, count).forEach((seat, index) => {
      const player = playerAt(state, seat.startSquare);
      assert.equal(player.id, seat.id);
      assert.equal(player.characterId, DEFAULT_LOCAL_PICKS[index]);
    });
  }
});

test('only the local player whose turn it is can hit, even after court rotation', () => {
  const state = createLocalMatch('league', DEFAULT_LOCAL_PICKS);
  assert.equal(localShotTarget(state, 'Space'), 4);
  assert.equal(localShotTarget(state, 'KeyW'), undefined);
  assert.equal(localShotTarget(state, 'Enter'), undefined);
  const serve = hit(state, 1, 4);
  assert.equal(localShotTarget(serve, 'Enter'), undefined);
  const bounced = nextBounce(serve);
  assert.equal(localShotTarget(bounced, 'ArrowUp'), 1);
  assert.equal(localShotTarget(bounced, 'ArrowRight'), undefined);
  assert.equal(localShotTarget(bounced, 'Space'), undefined);
  const rally = nextBounce(hit(bounced, 4, 2));
  assert.equal(localShotTarget(rally, 'KeyU'), 4);
  const nextRally = nextBounce(hit(rally, 2, 3));
  assert.equal(localShotTarget(nextRally, 'KeyY'), 4);

  const rotated = eliminatePlayer(nextRally, 'local-p1', 'Test out', 'inside_line_out');
  assert.equal(playerAt(rotated, 1).id, 'local-p3');
  assert.equal(localShotTarget(rotated, 'Space'), undefined);
  assert.equal(localShotTarget(rotated, 'KeyU'), 4);
  assert.equal(rotated.coins, state.coins);
});

test('the server retries a misplaced serve and the receiver waits for a legal bounce', () => {
  const initial = createInitialState();
  const serverId = playerAt(initial, 1).id;
  const receiverId = playerAt(initial, 4).id;
  assert.equal(hit(initial, 4, 1), initial);

  const badServe = executeHit(initial, serverId, 4, 'normal', { x: -2.5, z: -2.5 });
  const retry = nextBounce(badServe);
  assert.equal(retry.ballState.isServing, true);
  assert.equal(retry.activeTurnPlayerId, serverId);
  assert.equal(retry.receiverFaultCount, 0);

  const serve = hit(retry, 1, 4);
  assert.equal(serve.activeTurnPlayerId, null);
  assert.equal(hit(serve, 4, 1), serve);
  const bounced = nextBounce(serve);
  assert.equal(bounced.activeTurnPlayerId, receiverId);
  assert.equal(bounced.ballState.currentSquareOwner, 4);
  assert.equal(hit(bounced, 3, 2), bounced);
});

test('the return prompt predicts the legal receiver and a fast shot launches from the live ball', () => {
  const start = createInitialState();
  const served = hit(start, 1, 4);
  assert.equal(incomingReturn(served)?.player.id, playerAt(start, 4).id);
  assert.ok(Math.abs((incomingReturn(served)?.seconds ?? 0) - 0.85) < 0.001);
  const missedServe = executeHit(start, playerAt(start, 1).id, 4, 'normal', { x: 0, z: -2.5 });
  assert.equal(incomingReturn(missedServe), undefined);
  const playable = nextBounce(served);
  const fast = executeHit(playable, playerAt(playable, 4).id, 2, 'fast', { x: -2.5, z: -2.5 });
  assert.equal(fast.ballState.y, playable.ballState.y);
  const contact = { x: playable.ballState.x, y: playable.ballState.y, z: playable.ballState.z };
  assert.deepEqual(fast.ballState.lastContact, contact);
  const inFlight = advanceBall(fast, 0.1);
  assert.notEqual(inFlight.ballState.x, contact.x);
  assert.deepEqual(inFlight.ballState.lastContact, contact);
  assert.ok(Math.abs((incomingReturn(fast)?.seconds ?? 0) - 0.55) < 0.001);
});

test('winning a Campaign venue unlocks only the next city and survives a save and reload', () => {
  const [first, second, third] = LADDER_VENUES;
  const firstVenue = VENUES.find(({ id }) => id === first)!;
  const secondVenue = VENUES.find(({ id }) => id === second)!;
  const initial = createCampaignProgress();
  assert.equal(initial.currentVenueId, first);
  assert.equal(recordCampaignWin(initial, firstVenue, 4, 180, '2026-11-20'), initial);
  assert.equal(recordCampaignWin(initial, secondVenue, 5, 180, '2026-11-20'), initial);
  const progress = recordCampaignWin(initial, firstVenue, 5, 180, '2026-11-20');
  assert.deepEqual(progress.unlockedVenues, [first, second]);
  assert.ok(!progress.unlockedVenues.includes(third));
  assert.equal(progress.matchesWon, 1);
  assert.equal(progress.venueRecords[first]?.bestStreak, 5);
  assert.equal(progress.coins, 180);

  const values = new Map([['foursquare_campaign_progress_v1', JSON.stringify(initial)]]);
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  assert.deepEqual(loadCampaignProgress(storage), initial);
  saveCampaignProgress({ ...progress, currentVenueId: second }, storage);
  assert.deepEqual(loadCampaignProgress(storage), { ...progress, currentVenueId: second });
});

test('the last Campaign stop records a championship win without unlocking another city', () => {
  const finalId = LADDER_VENUES.at(-1)!;
  const venue = VENUES.find(({ id }) => id === finalId)!;
  const initial = { ...createCampaignProgress(), unlockedVenues: [...LADDER_VENUES], currentVenueId: finalId };
  const result = recordCampaignWin(initial, venue, 5, 250, '2026-11-20');
  assert.deepEqual(result.unlockedVenues, LADDER_VENUES);
  assert.ok(result.completedVenues.includes(finalId));
  assert.equal(result.matchesWon, 1);
});

test('League gives the receiver one retry while Schoolyard recycles on the first fault', () => {
  for (const ruleSet of ['league', 'school'] as const) {
    const initial = createInitialState(ruleSet);
    const served = nextBounce(hit(initial, 1, 4));
    const badReturn = nextBounce(hit(served, 4, 4));
    if (ruleSet === 'school') {
      assert.equal(badReturn.refereeCall.type, 'serve_fault_out');
      assert.equal(badReturn.totalRounds, 1);
    } else {
      assert.equal(badReturn.refereeCall.type, 'serve_fault_one');
      assert.equal(badReturn.totalRounds, 0);
      const missedReturn = nextBounce(nextBounce(hit(badReturn, 1, 4)));
      assert.equal(missedReturn.refereeCall.type, 'serve_fault_out');
      assert.equal(missedReturn.totalRounds, 1);
    }
  }
});

test('a line shot gets the same call at two frame rates', () => {
  const served = nextBounce(hit(createInitialState(), 1, 4));
  const regularRally = nextBounce(hit(served, 4, 2));
  const lineShot = executeHit(regularRally, playerAt(regularRally, 2).id, 3, 'normal', { x: 0, z: 2 });
  for (const step of [1 / 30, 1 / 144]) {
    const result = nextBounce(lineShot, step);
    assert.equal(result.refereeCall.type, 'inside_line_out');
    assert.equal(playerAt(result, 4).id, playerAt(regularRally, 2).id);
  }
});

test('knocking out a player promotes the waiting player and queues the offender once', () => {
  const state = createInitialState();
  const benchPlayer = { ...playerAt(state, 4), id: 'bench', rank: null };
  const offender = playerAt(state, 2);
  const next = eliminatePlayer({ ...state, waitingQueue: [benchPlayer] }, offender.id, 'Test out', 'inside_line_out');
  assert.equal(playerAt(next, 2).id, playerAt(state, 3).id);
  assert.equal(playerAt(next, 4).id, benchPlayer.id);
  assert.deepEqual(next.waitingQueue.map((player) => player.id), [offender.id]);
  assert.equal(new Set([...next.players, ...next.waitingQueue].map((player) => player.id)).size, 5);
});

test('a complete solo rules simulation rotates the human into Square 1 and awards a five-crown win', () => {
  let state = createInitialState();
  for (let round = 0; round < 2; round++) {
    state = nextBounce(hit(state, 1, 4));
    state = nextBounce(nextBounce(hit(state, 4, 1)));
    assert.equal(state.refereeCall.type, 'double_bounce_out');
  }
  assert.equal(playerAt(state, 1).id, state.humanPlayerId);
  assert.equal(playerAt(state, 1).crownHolds, 0);

  for (let hold = 0; hold < state.crownHoldsTarget; hold++) {
    state = nextBounce(nextBounce(hit(state, 1, 4)));
    assert.equal(state.refereeCall.type, 'serve_fault_one');
    state = nextBounce(nextBounce(hit(state, 1, 4)));
    assert.equal(playerAt(state, 1).crownHolds, hold + 1);
  }

  assert.equal(state.isGameOver, true);
  assert.equal(state.gameWinner?.id, state.humanPlayerId);
  assert.equal(state.totalRounds, 7);
  assert.equal(hit(state, 1, 4), state);
});

test('solo match starts with distinct selected characters and exactly one controlled player', () => {
  const ids = ['char-blocky', 'char-maya', 'char-skater-roxy', 'char-patch'];
  for (const player of ids) {
    const state = createInitialState('league', player, undefined, ids);
    assert.deepEqual(new Set(state.players.map(({ characterId }) => characterId)), new Set(ids));
    assert.equal(state.players.filter(({ isHuman }) => isHuman).length, 1);
    assert.equal(state.players.find(({ id }) => id === state.humanPlayerId)?.characterId, player);
  }
  const fallback = createInitialState('league', 'char-patch', 'char-patch', ['char-blocky', 'char-blocky']);
  assert.equal(new Set(fallback.players.map(({ characterId }) => characterId)).size, 4);
});

test('solo lineup keeps each character in the chosen square and starts the selected seat under the profile name', () => {
  const choices = ['char-blocky', 'char-maya', 'char-cyber-ronin', 'char-patch'];
  for (const seat of [1, 2, 3, 4] as const) {
    const match = createSoloLineup('league', choices, 'Court captain', seat);
    assert.deepEqual(match.players.map(({ characterId }) => characterId), choices);
    assert.equal(playerAt(match, seat).name, 'Court captain');
    assert.equal(playerAt(match, seat).id, match.humanPlayerId);
    assert.equal(match.servingPlayerId, playerAt(match, 1).id);
    assert.equal(match.activeTurnPlayerId, match.servingPlayerId);
    assert.equal(match.players.filter(({ isHuman }) => isHuman).length, 1);
  }
});
