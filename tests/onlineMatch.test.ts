import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { setTimeout as sleep } from 'node:timers/promises';
import { test } from 'node:test';
import WebSocket from 'ws';
import { attachOnlineRooms } from '../server/onlineRooms';
import { createMarket } from '../server/market';
import { incomingReturn } from '../src/services/foursquareEngine';
import type { MatchSnapshot, RoomCommand, RoomEvent } from '../src/services/onlineProtocol';

async function waitFor<T>(read: () => T | undefined, description: string): Promise<T> {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const value = read();
    if (value !== undefined) return value;
    await sleep(10);
  }
  assert.fail(`Timed out waiting for ${description}`);
}

function connect(url: string, profile: string) {
  const socket = new WebSocket(url, { headers: { Cookie: profile } });
  const messages: RoomEvent[] = [];
  socket.on('message', (data) => messages.push(JSON.parse(data.toString()) as RoomEvent));
  return { socket, messages, send: (command: RoomCommand) => socket.send(JSON.stringify(command)) };
}

test('two WebSocket clients receive the same rally, five-crown winner and rematch', { timeout: 35_000 }, async (t) => {
  const server = createServer();
  const market = createMarket(':memory:');
  const hostProfile = market.createProfile();
  const guestProfile = market.createProfile();
  market.league.setClub(hostProfile, 'oakridge');
  market.league.setClub(guestProfile, 'metro');
  const rooms = attachOnlineRooms(server, {
    getProfile: (cookie) => cookie && market.hasProfile(cookie) ? cookie : undefined,
    recordResults: market.recordResults,
    clubForProfile: market.league.getClub,
  });
  t.after(() => { rooms.close(); server.close(); market.close(); });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const url = `ws://127.0.0.1:${address.port}/ws`;
  const host = connect(url, hostProfile);
  const guest = connect(url, guestProfile);
  await Promise.all([once(host.socket, 'open'), once(guest.socket, 'open')]);

  const snapshots = (client: typeof host) => client.messages.flatMap((message) =>
    message.event === 'match_started' || message.event === 'match_state' ? [message.payload] : []);

  async function sameState(afterTurn: number, condition: (snapshot: MatchSnapshot) => boolean, label: string) {
    const state = await waitFor(() => snapshots(host).find((item) => item.turnId > afterTurn && condition(item)), label);
    const guestState = await waitFor(() => snapshots(guest).find((item) => item.turnId === state.turnId), `${label} on guest`);
    assert.deepEqual(guestState, state);
    return state;
  }

  host.send({ type: 'join_room', payload: { roomId: 'TEST-COURT', userName: 'Host', characterId: 'char-patch', venueId: 'bridgton_maine' } });
  const hostRoom = await waitFor(() => host.messages.find((item) => item.event === 'room_joined'), 'host lobby');
  guest.send({ type: 'join_room', payload: { roomId: 'TEST-COURT', userName: 'Guest', characterId: 'char-arcade-bot', venueId: 'boston_mass' } });
  const guestRoom = await waitFor(() => guest.messages.find((item) => item.event === 'room_joined'), 'guest lobby');

  host.send({ type: 'ready' });
  await waitFor(() => host.messages.find((item) => item.event === 'room_members' && item.payload.some((member) => member.ready)), 'host ready');
  assert.equal(snapshots(host).length, 0);
  guest.send({ type: 'ready' });
  let match = await sameState(0, (item) => item.state.ballState.isServing, 'opening serve');
  const hostId = hostRoom.payload.playerId;
  const guestId = guestRoom.payload.playerId;
  market.league.setClub(hostProfile, 'kanata');
  assert.equal(match.venueId, 'bridgton_maine');
  assert.equal(match.state.servingPlayerId, hostId);
  assert.equal(match.state.players.find(({ id }) => id === guestId)?.rank, 4);
  assert.equal(match.state.players.find(({ id }) => id === guestId)?.characterId, 'char-arcade-bot');
  assert.equal(match.state.players.filter((player) => !player.isHuman).length, 2);

  for (let round = 1; round <= 5; round++) {
    for (let attempt = 0; attempt < 2; attempt++) {
      if (round === 1 && attempt === 0) guest.send({ type: 'hit_ball', payload: { targetSquare: 1, turnId: match.turnId } });
      host.send({ type: 'hit_ball', payload: { targetSquare: 4, turnId: match.turnId } });
      const flight = await sameState(match.turnId, (item) => item.state.ballState.isLive, 'serve in flight');
      assert.equal(flight.state.ballState.lastHitterId, hostId);
      assert.equal(flight.state.activeTurnPlayerId, null);
      match = await sameState(flight.turnId, (item) => item.state.activeTurnPlayerId === guestId, 'guest receives the bounce');
      guest.send({ type: 'hit_ball', payload: { targetSquare: 2, turnId: match.turnId, point: { x: -0.05, z: -2.5 } } });
      match = await sameState(match.turnId, (item) => item.state.ballState.isServing, 'receiver fault');
      assert.equal(match.state.refereeCall.type, attempt === 0 ? 'serve_fault_one' : 'serve_fault_out');
    }
    assert.equal(match.state.totalRounds, round);
    assert.equal(match.state.players.find(({ id }) => id === hostId)?.crownHolds, round);
  }

  assert.equal(match.state.isGameOver, true);
  assert.equal(match.state.gameWinner?.id, hostId);
  assert.deepEqual(market.rankings().map(({ name, played, wins }) => ({ name, played, wins })), [
    { name: 'Host', played: 1, wins: 1 }, { name: 'Guest', played: 1, wins: 0 },
  ]);
  assert.equal(market.view(hostProfile, false).coins, 30);
  assert.equal(market.view(guestProfile, false).coins, 10);
  assert.equal(market.league.profile(hostProfile).xp, 100);
  assert.equal(market.league.profile(guestProfile).xp, 25);
  assert.equal(market.league.query('', 'regular', 'oakridge').players[0]?.name, 'Host');
  assert.equal(market.league.query('', 'regular', 'kanata').players.length, 0);
  const hostBall = host.messages.find((item) => item.event === 'match_ball');
  const guestBall = guest.messages.find((item) => item.event === 'match_ball');
  assert.ok(hostBall && guestBall);
  assert.deepEqual(hostBall, guestBall);

  host.send({ type: 'rematch' });
  guest.send({ type: 'rematch' });
  const rematch = await sameState(match.turnId, (item) => !item.state.isGameOver, 'shared rematch');
  assert.equal(rematch.state.totalRounds, 0);

  guest.socket.close();
  const replacement = await waitFor(() => snapshots(host).find((item) =>
    item.turnId > rematch.turnId && item.state.players.some((player) => player.id === guestId && !player.isHuman)),
  'bot takes over for a disconnected guest');
  assert.equal(replacement.state.players.length, 4);
});

test('a community cup court restricts access and keeps four players and a spectator in sync under input delay', { timeout: 15_000 }, async (t) => {
  const server = createServer();
  const market = createMarket(':memory:');
  const profiles = Array.from({ length: 9 }, () => market.createProfile());
  market.tournaments.create(profiles[0], 'Community Test', 'Player 1',
    {venueId:'boston_mass',starts:Date.now(),rules:{mode:'timed',target:3}});
  const cup = market.tournaments.list(profiles[0]).find((event) => !event.official)!;
  profiles.slice(1, 8).forEach((profile, index) => market.tournaments.join(cup.id, profile, 'Player ' + (index + 2)));
  const room = market.tournaments.list(profiles[0]).find(({ id }) => id === cup.id)!.heats[0].room!;
  assert.ok(room);
  const rooms = attachOnlineRooms(server, {
    getProfile: (cookie) => cookie && market.hasProfile(cookie) ? cookie : undefined,
    recordResults: market.recordResults,
    tournaments: market.tournaments,
  });
  t.after(() => { rooms.close(); server.close(); market.close(); });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const url = `ws://127.0.0.1:${address.port}/ws`;
  const clients = [...profiles.slice(0,4), profiles[8]].map((profile) => connect(url, profile));
  await Promise.all(clients.map(({ socket }) => once(socket, 'open')));
  for (const [index, client] of clients.entries()) {
    client.send({ type: 'join_room', payload: { roomId: room, userName: 'Player ' + index, characterId: 'char-patch', venueId: 'bridgton_maine' } });
  }
  await waitFor(() => clients[4].messages.find(({ event }) => event === 'room_error'), 'outsider rejected');
  const seeded = clients.slice(0,4);
  await Promise.all(seeded.map((client) => waitFor(() => client.messages.find(({ event }) => event === 'room_joined'), 'bracket member joined')));
  seeded.slice(0,3).forEach((client) => client.send({ type: 'ready' }));
  await waitFor(() => clients[0].messages.find((message) => message.event === 'room_members' &&
    message.payload.filter(({ ready }) => ready).length === 3), 'three players ready');
  assert.equal(clients[0].messages.some(({ event }) => event === 'match_started'), false);
  seeded[3].send({ type: 'ready' });
  const matches = await Promise.all(seeded.map((client) =>
    waitFor(() => client.messages.flatMap((message) => message.event === 'match_started' ? [message.payload] : [])[0], 'four-player heat starts')));
  assert.equal(matches[0].state.players.filter(({ isHuman }) => isHuman).length, 4);
  assert.deepEqual(matches[0], matches[3]);
  assert.equal(matches[0].venueId,'boston_mass');
  assert.ok(matches[0].endsAt && matches[0].endsAt > Date.now());
  assert.equal(market.tournaments.list(profiles[8]).find(({id})=>id===cup.id)?.heats[0].watchRoom,room);
  clients[4].send({type:'watch_room',payload:{roomId:room}});
  const stream=await waitFor(()=>clients[4].messages.flatMap((message)=>message.event==='match_started'?[message.payload]:[])[0],'read-only spectator stream');
  assert.equal(stream.turnId,matches[0].turnId);
  assert.equal(clients[4].messages.some(({event})=>event==='room_joined'),false);

  const clientIds = seeded.map((client) => {
    const joined = client.messages.find((message) => message.event === 'room_joined');
    assert.ok(joined);
    return joined.payload.playerId;
  });
  const participants = [...seeded, clients[4]];
  const snapshots = (client: typeof seeded[number]) => client.messages.flatMap((message) =>
    message.event === 'match_started' || message.event === 'match_state' ? [message.payload] : []);
  async function sharedTurn(after: number, predicate: (snapshot: MatchSnapshot) => boolean, label: string) {
    const match = await waitFor(() => snapshots(seeded[0]).find((item) => item.turnId > after && predicate(item)), label);
    for (const client of participants) {
      assert.deepEqual(await waitFor(() => snapshots(client).find((item) => item.turnId === match.turnId), label), match);
    }
    return match;
  }
  function striker(id: string | null) {
    const client = seeded[clientIds.indexOf(id ?? '')];
    assert.ok(client);
    return client;
  }

  const opening = matches[0];
  striker(opening.state.servingPlayerId).send({ type: 'hit_ball', payload: {
    targetSquare: 4, turnId: opening.turnId, point: { x: 2.5, z: -2.5 },
  } });
  let flight = await sharedTurn(opening.turnId, (item) => item.state.ballState.isLive, 'four-player serve');
  const returns = [
    { from: 4, to: 2, x: -2.5, z: -2.5, delay: 0 },
    { from: 2, to: 3, x: 2.5, z: 2.5, delay: 220 },
    { from: 3, to: 1, x: -2.5, z: 2.5, delay: 300 },
  ] as const;
  for (const { from, to, x, z, delay } of returns) {
    const hitter = flight.state.players.find(({ rank }) => rank === from);
    assert.ok(hitter);
    const receiver = striker(hitter.id);
    const payload = { targetSquare: to, point: { x, z } };
    receiver.send({ type: 'hit_ball', payload: { ...payload, turnId: flight.turnId } });
    if (delay === 0) {
      await waitFor(() => {
        const update = receiver.messages.at(-1);
        if (update?.event !== 'match_ball') return;
        const arriving = incomingReturn({ ...flight.state, ballState: update.payload });
        return arriving && arriving.seconds <= 0.22 && arriving.player.id === hitter.id ? arriving : undefined;
      }, 'server queue window');
      receiver.send({ type: 'queue_return', payload: { ...payload, turnId: flight.turnId } });
    }
    const bounce = await sharedTurn(flight.turnId, (item) => item.state.activeTurnPlayerId === hitter.id, `bounce in square ${from}`);
    assert.equal(bounce.state.ballState.hitCount, flight.state.ballState.hitCount);
    if (delay > 0) {
      await sleep(delay);
      receiver.send({ type: 'hit_ball', payload: { ...payload, point: { x: x * 0.6, z: z * 0.6 }, turnId: flight.turnId } });
      receiver.send({ type: 'hit_ball', payload: { ...payload, turnId: bounce.turnId } });
    }
    flight = await sharedTurn(bounce.turnId, (item) => item.state.ballState.lastHitterId === hitter.id, `return from square ${from}`);
    const { x: contactX, y: contactY, z: contactZ, vx, vz, lastContact } = flight.state.ballState;
    assert.deepEqual(lastContact, { x: contactX, y: contactY, z: contactZ });
    assert.ok(Math.abs(contactX + vx * 0.85 - x) < 0.001);
    assert.ok(Math.abs(contactZ + vz * 0.85 - z) < 0.001);
  }
  const lastBounce = await sharedTurn(flight.turnId, (item) => item.state.activeTurnPlayerId === opening.state.servingPlayerId, 'rally back in square one');
  const nextBounceMs = (2 * lastBounce.state.ballState.vy / 9.8) * 1000;
  await sleep(nextBounceMs + 20);
  striker(lastBounce.state.activeTurnPlayerId).send({ type: 'hit_ball', payload: {
    targetSquare: 4, turnId: lastBounce.turnId, point: { x: 2.5, z: -2.5 },
  } });
  await sharedTurn(lastBounce.turnId, (item) => item.state.ballState.lastHitterId === lastBounce.state.activeTurnPlayerId,
    'the delayed return reaches all players before the fault is confirmed');
});
