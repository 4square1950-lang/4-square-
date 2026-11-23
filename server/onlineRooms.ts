import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';
import { getAIDecision } from '../src/services/aiPlayer';
import {
  advanceBall,
  BOT_RETURN_DELAY_MS,
  createInitialState,
  eliminatePlayer,
  executeHit,
  incomingReturn,
  type GameEngineState,
} from '../src/services/foursquareEngine';
import type { RoomChatMessage, RoomCommand, RoomEvent, RoomMember } from '../src/services/onlineProtocol';
import type { SquareId } from '../src/types/foursquare';
import { CHARACTERS } from '../src/utils/characters';
import { COURT_HALF_SIZE, getQuadrantSquare } from '../src/utils/courtGeometry';
import { VENUES } from '../src/utils/venueData';
import type { OnlineResult } from './market';
import type { createTournaments } from './tournaments';
import { compareCupPlayers } from '../src/services/tournamentBracket';

interface Connection {
  member: RoomMember;
  socket: WebSocket;
  profile?: string;
}

interface Room {
  id: string;
  venueId: string;
  connections: Map<string, Connection>;
  chat: RoomChatMessage[];
  match: GameEngineState | null;
  matchId?: string;
  matchClubs?: Map<string, OnlineResult['club']>;
  turnId: number;
  turnStartedAt: number;
  nextBallUpdateAt: number;
  serveDeadline?: number;
  returnFlightTurnId?: number;
  queuedReturn?: { playerId: string; targetSquare: SquareId; point?: { x: number; z: number } };
  pendingFault?: { state: GameEngineState; expiresAt: number };
  endsAt?:number;
  viewers:Set<WebSocket>;
}

// Put the first two players across from each other for the opening serve.
const SEATS: SquareId[] = [1, 4, 2, 3];
const TICK_MS = 1000 / 60;
const BALL_UPDATE_MS = 1000 / 30;
const SERVE_CLOCK_MS = 5000;
const EARLY_RETURN_SECONDS = 0.30;
const LATE_RETURN_GRACE_MS = 100;

export function attachOnlineRooms(server: Server, stats?: {
  getProfile(cookie: string | undefined): string | undefined;
  recordResults(match: string, entries: OnlineResult[]): void;
  clubForProfile?(profile: string): OnlineResult['club'];
  nameForProfile?(profile: string): string;
  tournaments?: ReturnType<typeof createTournaments>;
}) {
  const sockets = new WebSocketServer({ server, path: '/ws', maxPayload: 8192 });
  const rooms = new Map<string, Room>();

  function send(socket: WebSocket, event: RoomEvent) {
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(event));
  }

  function broadcast(room: Room, event: RoomEvent) {
    const message = JSON.stringify(event);
    for (const { socket } of room.connections.values()) {
      if (socket.readyState !== WebSocket.OPEN) continue;
      if (event.event === 'match_ball' && socket.bufferedAmount > 32_768) continue;
      socket.send(message);
    }
    if (event.event==='match_started' || event.event==='match_state' || event.event==='match_ball') {
      for (const socket of room.viewers) {
        if (socket.readyState===WebSocket.OPEN && socket.bufferedAmount<32768) socket.send(message);
      }
    }
  }

  function members(room: Room) {
    return [...room.connections.values()].map(({ member }) => member);
  }

  function publishState(room: Room, state: GameEngineState, now: number, event: 'match_started' | 'match_state' = 'match_state') {
    if (stats && room.matchId && state.isGameOver && !room.match?.isGameOver) {
      stats.tournaments?.markLive(room.id,false);
      const profiles = new Map<string, OnlineResult>();
      const placements = [];
      for (const { member, profile } of room.connections.values()) {
        const player = [...state.players, ...state.waitingQueue].find(({ id }) => id === member.id);
        if (!profile || !player) continue;
        placements.push({ profile, player });
        const wins = Number(state.gameWinner?.id === player.id);
        if (profiles.has(profile) && !wins) continue;
        profiles.set(profile, { profile, name: member.name, played: 1, wins, holds: player.crownHolds, hits: player.totalHits, faults: player.faults ?? 0, club: room.matchClubs?.get(profile) });
      }
      if (profiles.size >= 2) {
        try { stats.recordResults(room.matchId, [...profiles.values()]); }
        catch (error) { console.error('Could not save online results:', error); }
      }
      if (room.id.startsWith('CUP-')) {
        try { stats.tournaments?.finish(room.id, placements, state.gameWinner?.id); }
        catch (error) { console.error('Could not finish tournament heat:', error); }
      }
    }
    const keepServeDeadline = state.ballState.isServing && room.match?.ballState.isServing &&
      state.refereeCall === room.match.refereeCall && state.servingPlayerId === room.match.servingPlayerId;
    const keepReturnTurn = state.ballState.hasBouncedThisPlay && room.match?.ballState.hasBouncedThisPlay &&
      state.refereeCall === room.match.refereeCall && state.activeTurnPlayerId === room.match.activeTurnPlayerId;
    room.match = state;
    room.pendingFault = undefined;
    room.queuedReturn = undefined;
    if (!keepReturnTurn) room.returnFlightTurnId = state.ballState.hasBouncedThisPlay ? room.turnId : undefined;
    room.turnId += 1;
    room.turnStartedAt = now;
    if (!keepServeDeadline || state.isGameOver) {
      room.serveDeadline = state.ballState.isServing && !state.isGameOver ? Date.now() + SERVE_CLOCK_MS : undefined;
    }
    broadcast(room, { event, payload: { state, turnId: room.turnId, venueId: room.venueId, endsAt:room.endsAt, serveDeadline: room.serveDeadline } });
  }

  function startIfReady(room: Room) {
    const players = members(room);
    if (players.length < (room.id.startsWith('CUP-') ? 4 : 2) || players.some((player) => !player.ready)) return;
    room.matchId = randomUUID();
    room.matchClubs = new Map();
    for (const { profile } of room.connections.values()) {
      if (profile) room.matchClubs.set(profile, stats?.clubForProfile?.(profile) ?? null);
    }
    for (const player of players) player.ready = false;

    const cup = stats?.tournaments?.settings(room.id);
    const venue = VENUES.find(({id})=>id===room.venueId);
    const initial = createInitialState(cup ? venue?.defaultRuleSet ?? 'league' : 'league', players[0].characterId);
    room.endsAt = cup?.rules.mode==='timed' ? Date.now()+cup.rules.target*60000 : undefined;
    if (cup) stats?.tournaments?.markLive(room.id,true);
    const roster = initial.players.map((player) => {
      const member = players.find(({ squareId }) => squareId === player.rank);
      if (!member) return { ...player, id: `bot-${player.rank}`, isHuman: false };
      const character = CHARACTERS.find(({ id }) => id === member.characterId) ?? CHARACTERS[0];
      return {
        ...player,
        id: member.id,
        name: member.name,
        characterId: character.id,
        archetype: character.archetype,
        avatarColor: character.avatarColor,
        capColor: character.capColor,
        skinColor: character.skinColor,
        isHuman: true,
      };
    });
    const host = roster[0];
    publishState(room, {
      ...initial,
      crownHoldsTarget:cup ? cup.rules.mode==='points' ? cup.rules.target : Number.MAX_SAFE_INTEGER : initial.crownHoldsTarget,
      players: roster,
      humanPlayerId: '',
      coins: 0,
      servingPlayerId: host.id,
      activeTurnPlayerId: host.id,
      refereeCall: { ...initial.refereeCall, message: `${host.name} serves to Square 4!` },
    }, performance.now(), 'match_started');
  }

  let lastTick = performance.now();
  const timer = setInterval(() => {
    const now = performance.now();
    const dt = Math.min((now - lastTick) / 1000, 0.05);
    lastTick = now;

    for (const room of rooms.values()) {
      const match = room.match;
      if (!match || match.isGameOver) continue;
      if (room.endsAt && Date.now()>=room.endsAt) {
        const winner = [...match.players,...match.waitingQueue].filter(({isHuman})=>isHuman)
          .sort((a,b)=>compareCupPlayers(a,b))[0];
        if (winner) publishState(room,{...match,isGameOver:true,gameWinner:winner,
          activeTurnPlayerId:null,ballState:{...match.ballState,isLive:false},
          refereeCall:{...match.refereeCall,message:`Time expired · ${winner.name} wins`}},now);
        continue;
      }
      if (room.pendingFault) {
        if (now >= room.pendingFault.expiresAt) publishState(room, room.pendingFault.state, now);
        continue;
      }
      const next = advanceBall(match, dt);
      if (next.refereeCall !== match.refereeCall || next.activeTurnPlayerId !== match.activeTurnPlayerId) {
        const receiver = match.players.find(({ id }) => id === match.activeTurnPlayerId);
        if (match.ballState.hasBouncedThisPlay && next.refereeCall !== match.refereeCall && receiver?.isHuman) {
          room.pendingFault = { state: next, expiresAt: now + LATE_RETURN_GRACE_MS };
          continue;
        }
        const queued = room.queuedReturn;
        publishState(room, next, now);
        if (queued && next.ballState.hasBouncedThisPlay && next.activeTurnPlayerId === queued.playerId) {
          const hit = executeHit(next, queued.playerId, queued.targetSquare, 'normal', queued.point);
          if (hit !== next) publishState(room, hit, now);
        }
        continue;
      }
      room.match = next;
      if (next.ballState.isLive && now >= room.nextBallUpdateAt) {
        room.nextBallUpdateAt = now + BALL_UPDATE_MS;
        broadcast(room, { event: 'match_ball', payload: next.ballState });
      }

      const player = next.players.find(({ id }) => id === next.activeTurnPlayerId);
      if (!player) continue;
      const elapsed = now - room.turnStartedAt;
      if (!player.isHuman && elapsed >= (next.ballState.isServing ? 450 : BOT_RETURN_DELAY_MS)) {
        const shot = getAIDecision(player, next.players, next.ruleSet, next.ballState.isServing);
        publishState(room, executeHit(next, player.id, shot.targetSquare, shot.shotType), now);
      } else if (next.ballState.isServing && room.serveDeadline && Date.now() >= room.serveDeadline) {
        publishState(room, eliminatePlayer(next, player.id, '5-second serve clock expired', 'delay_of_game_out'), now);
      }
    }
  }, TICK_MS);
  sockets.on('close', () => clearInterval(timer));

  sockets.on('connection', (socket, request) => {
    let room: Room | undefined;
    let member: RoomMember | undefined;
    let watching: Room | undefined;

    socket.on('error', () => socket.terminate());
    socket.on('message', (raw) => {
      let command: RoomCommand;
      try {
        command = JSON.parse(raw.toString());
      } catch {
        return;
      }
      if (!command || typeof command !== 'object') return;
      if (watching) return;
      if (command.type === 'watch_room' && !room) {
        const id = command.payload?.roomId;
        const target = typeof id==='string' && stats?.tournaments?.isLive(id) ? rooms.get(id) : undefined;
        if (!target?.match || target.match.isGameOver) {
          send(socket,{event:'room_error',payload:'That tournament court is no longer live.'});
          return;
        }
        watching=target;
        target.viewers.add(socket);
        send(socket,{event:'match_started',payload:{state:target.match,turnId:target.turnId,venueId:target.venueId,endsAt:target.endsAt,serveDeadline:target.serveDeadline}});
        return;
      }

      if (command.type === 'join_room' && !room) {
        const { roomId, userName, characterId, venueId } = command.payload ?? {};
        if (typeof roomId !== 'string' || !/^[A-Z0-9_-]{1,24}$/.test(roomId)) {
          send(socket, { event: 'room_error', payload: 'Use a room code with 1–24 letters, numbers, dashes, or underscores.' });
          return;
        }
        const existing = rooms.get(roomId);
        const profile = stats?.getProfile(request.headers.cookie);
        if (roomId.startsWith('CUP-') && (!profile || !stats?.tournaments?.seats(roomId)?.includes(profile) ||
          (existing && [...existing.connections.values()].some((connection) => connection.profile === profile)))) {
          send(socket, { event: 'room_error', payload: 'Join this tournament court from your bracket.' });
          return;
        }
        const usedSeats = new Set(existing ? members(existing).map(({ squareId }) => squareId) : []);
        const squareId = SEATS.find((seat) => !usedSeats.has(seat));
        if (existing?.match && !existing.match.isGameOver) {
          send(socket, { event: 'room_error', payload: 'This match is underway. Try a different room code or rejoin after it ends.' });
          return;
        }
        if (!squareId) {
          send(socket, { event: 'room_error', payload: 'This court is full. Try a different room code.' });
          return;
        }
        const designated = stats?.tournaments?.settings(roomId)?.venueId ?? venueId;
        const venue = VENUES.find(({ id }) => id === designated) ?? VENUES[0];
        room = existing ?? {
          id: roomId, venueId: venue.id, connections: new Map(), chat: [], match: null,
          turnId: 0, turnStartedAt: 0, nextBallUpdateAt: 0, viewers:new Set(),
        };
        rooms.set(roomId, room);
        member = {
          id: randomUUID(),
          name: (profile && stats?.nameForProfile?.(profile)) ||
            (typeof userName === 'string' ? userName.trim().slice(0, 32) || 'Player' : 'Player'),
          characterId: CHARACTERS.find(({ id }) => id === characterId)?.id ?? CHARACTERS[0].id,
          squareId,
          isHost: room.connections.size === 0,
          ready: false,
        };
        room.connections.set(member.id, { member, socket, profile });
        send(socket, { event: 'room_joined', payload: { playerId: member.id, players: members(room), chatMessages: room.chat } });
        broadcast(room, { event: 'room_members', payload: members(room) });
        return;
      }
      if (!room || !member) return;

      switch (command.type) {
        case 'ready':
        case 'rematch':
          if (room.id.startsWith('CUP-') && room.match?.isGameOver) return;
          if (room.match && !room.match.isGameOver) return;
          member.ready = true;
          broadcast(room, { event: 'room_members', payload: members(room) });
          startIfReady(room);
          break;
        case 'hit_ball':
        case 'queue_return': {
          const match = room.match;
          const playerId = member.id;
          const { targetSquare, turnId, point } = command.payload ?? {};
          if (!match || match.isGameOver || !Number.isInteger(turnId)) return;
          if (!SEATS.includes(targetSquare) || (match.ballState.isServing && targetSquare !== 4)) return;
          const player = match.players.find(({ id }) => id === playerId);
          if (player?.rank === targetSquare) return;
          if (point !== undefined && (
            !point || !Number.isFinite(point.x) || !Number.isFinite(point.z) ||
            Math.abs(point.x) > COURT_HALF_SIZE || Math.abs(point.z) > COURT_HALF_SIZE ||
            getQuadrantSquare(point.x, point.z) !== targetSquare
          )) return;
          if (command.type === 'queue_return' && !match.ballState.hasBouncedThisPlay) {
            if (turnId !== room.turnId) return;
            const returnWindow = incomingReturn(match);
            if (returnWindow?.player.id === playerId && returnWindow.seconds <= EARLY_RETURN_SECONDS) {
              room.queuedReturn = { playerId, targetSquare, point };
            }
            return;
          }
          const currentTurn = room.turnId === turnId;
          const crossedBounce = command.type === 'queue_return' && room.returnFlightTurnId === turnId;
          if (match.activeTurnPlayerId !== playerId || (!currentTurn && !crossedBounce)) return;
          if (room.pendingFault && performance.now() >= room.pendingFault.expiresAt) return;
          const next = executeHit(match, playerId, targetSquare, 'normal', point);
          if (next !== match) publishState(room, next, performance.now());
          break;
        }
        case 'send_chat': {
          const text = command.payload?.text;
          if (typeof text !== 'string' || !text.trim()) return;
          const item = { id: randomUUID(), sender: member.name, text: text.trim().slice(0, 240), timestamp: Date.now() };
          room.chat = [...room.chat.slice(-19), item];
          broadcast(room, { event: 'chat_received', payload: item });
          break;
        }
      }
    });

    socket.on('close', () => {
      watching?.viewers.delete(socket);
      if (!room || !member) return;
      const playerId = member.id;
      room.connections.delete(playerId);
      if (room.connections.size === 0) {
        stats?.tournaments?.markLive(room.id,false);
        for(const viewer of room.viewers) viewer.close();
        rooms.delete(room.id);
        return;
      }
      if (member.isHost) room.connections.values().next().value!.member.isHost = true;
      broadcast(room, { event: 'room_members', payload: members(room) });
      if (room.match && !room.match.isGameOver) {
        const players = room.match.players.map((player) => player.id === playerId
          ? { ...player, name: `${player.name} (Bot)`, isHuman: false }
          : player);
        publishState(room, { ...room.match, players }, performance.now());
      } else {
        startIfReady(room);
      }
    });
  });

  return {
    list: () => [...rooms.values()].map((room) => ({
      id: room.id, name: `Court ${room.id}`, venueId: room.venueId, playerCount: room.connections.size,
    })),
    close: () => { for (const socket of sockets.clients) socket.terminate(); sockets.close(); },
  };
}
