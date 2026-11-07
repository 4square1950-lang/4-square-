import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(express.json());

// -------------------------------------------------------------
// Real-time Online Four Square Rooms
// -------------------------------------------------------------
interface RoomPlayer {
  id: string;
  name: string;
  characterId: string;
  squareId: number | null; // 1, 2, 3, 4, or null (queue)
  isHost: boolean;
  ws: WebSocket;
}

interface GameRoom {
  id: string;
  name: string;
  venueId: string;
  players: Map<string, RoomPlayer>;
  ballState: {
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    targetSquare: number | null;
    isLive: boolean;
    lastHitterId: string | null;
  };
  servingSquare: number;
  activeSquare: number | null;
  chatMessages: Array<{
    id: string;
    sender: string;
    text: string;
    timestamp: number;
  }>;
}

const rooms = new Map<string, GameRoom>();

function getOrCreateRoom(roomId: string, venueId: string = 'driveway'): GameRoom {
  let room = rooms.get(roomId);
  if (!room) {
    room = {
      id: roomId,
      name: `Court ${roomId.toUpperCase()}`,
      venueId,
      players: new Map(),
      ballState: {
        x: -2.4,
        y: 1.0,
        z: -2.4,
        vx: 0,
        vy: 0,
        vz: 0,
        targetSquare: 4,
        isLive: false,
        lastHitterId: null,
      },
      servingSquare: 1,
      activeSquare: 1,
      chatMessages: [
        {
          id: 'sys-1',
          sender: 'Ref',
          text: `Court room ${roomId.toUpperCase()} open! Welcome to online multiplayer four square.`,
          timestamp: Date.now(),
        },
      ],
    };
    rooms.set(roomId, room);
  }
  return room;
}

function broadcastToRoom(room: GameRoom, event: string, payload: unknown, excludeWs?: WebSocket) {
  const data = JSON.stringify({ event, payload });
  room.players.forEach((player) => {
    if (player.ws.readyState === WebSocket.OPEN && player.ws !== excludeWs) {
      player.ws.send(data);
    }
  });
}

function getRoomSnapshot(room: GameRoom) {
  const playersList = Array.from(room.players.values()).map((p) => ({
    id: p.id,
    name: p.name,
    characterId: p.characterId,
    squareId: p.squareId,
    isHost: p.isHost,
  }));

  return {
    id: room.id,
    name: room.name,
    venueId: room.venueId,
    players: playersList,
    ballState: room.ballState,
    servingSquare: room.servingSquare,
    activeSquare: room.activeSquare,
    chatMessages: room.chatMessages.slice(-20),
  };
}

wss.on('connection', (ws) => {
  let currentRoomId: string | null = null;
  let currentUserId: string | null = null;

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      const { type, payload } = msg;

      switch (type) {
        case 'join_room': {
          const { roomId, userId, userName, characterId, venueId } = payload;
          currentRoomId = roomId;
          currentUserId = userId;

          const room = getOrCreateRoom(roomId, venueId);

          // Assign available square 1..4, or queue
          const occupiedSquares = new Set(
            Array.from(room.players.values())
              .map((p) => p.squareId)
              .filter(Boolean)
          );

          let assignedSquare: number | null = null;
          for (let s = 1; s <= 4; s++) {
            if (!occupiedSquares.has(s)) {
              assignedSquare = s;
              break;
            }
          }

          const isHost = room.players.size === 0;
          const newPlayer: RoomPlayer = {
            id: userId,
            name: userName || 'Player',
            characterId: characterId || 'char-patch',
            squareId: assignedSquare,
            isHost,
            ws,
          };

          room.players.set(userId, newPlayer);

          // Reply with init snapshot
          ws.send(
            JSON.stringify({
              event: 'room_joined',
              payload: {
                snapshot: getRoomSnapshot(room),
                yourSquareId: assignedSquare,
              },
            })
          );

          // Notify other players
          broadcastToRoom(
            room,
            'player_joined',
            {
              player: {
                id: newPlayer.id,
                name: newPlayer.name,
                characterId: newPlayer.characterId,
                squareId: newPlayer.squareId,
                isHost: newPlayer.isHost,
              },
            },
            ws
          );
          break;
        }

        case 'hit_ball': {
          if (!currentRoomId || !currentUserId) return;
          const room = rooms.get(currentRoomId);
          if (!room) return;

          const player = room.players.get(currentUserId);
          if (!player) return;

          const { targetSquare, shotType, pos, velocity } = payload;
          room.ballState = {
            x: pos?.x ?? room.ballState.x,
            y: pos?.y ?? 1.2,
            z: pos?.z ?? room.ballState.z,
            vx: velocity?.vx ?? 0,
            vy: velocity?.vy ?? 3.5,
            vz: velocity?.vz ?? 0,
            targetSquare,
            isLive: true,
            lastHitterId: currentUserId,
          };

          broadcastToRoom(room, 'ball_hit', {
            hitterId: currentUserId,
            hitterSquare: player.squareId,
            targetSquare,
            shotType,
            ballState: room.ballState,
          });
          break;
        }

        case 'ball_bounce': {
          if (!currentRoomId) return;
          const room = rooms.get(currentRoomId);
          if (!room) return;

          broadcastToRoom(room, 'ball_bounce', payload);
          break;
        }

        case 'referee_decision': {
          if (!currentRoomId) return;
          const room = rooms.get(currentRoomId);
          if (!room) return;

          const { callType, message, eliminatedSquare, newRanks } = payload;

          // If rotation provided, reassign squares
          if (newRanks && typeof newRanks === 'object') {
            room.players.forEach((p) => {
              if (newRanks[p.id] !== undefined) {
                p.squareId = newRanks[p.id];
              }
            });
          }

          broadcastToRoom(room, 'referee_decision', {
            callType,
            message,
            eliminatedSquare,
            snapshot: getRoomSnapshot(room),
          });
          break;
        }

        case 'send_chat': {
          if (!currentRoomId || !currentUserId) return;
          const room = rooms.get(currentRoomId);
          if (!room) return;

          const player = room.players.get(currentUserId);
          const chatItem = {
            id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            sender: player?.name || 'Spectator',
            text: payload.text || '',
            timestamp: Date.now(),
          };

          room.chatMessages.push(chatItem);
          if (room.chatMessages.length > 50) room.chatMessages.shift();

          broadcastToRoom(room, 'chat_received', chatItem);
          break;
        }
      }
    } catch (err) {
      console.error('WS parse error:', err);
    }
  });

  ws.on('close', () => {
    if (currentRoomId && currentUserId) {
      const room = rooms.get(currentRoomId);
      if (room) {
        room.players.delete(currentUserId);
        broadcastToRoom(room, 'player_left', { userId: currentUserId });

        if (room.players.size === 0) {
          rooms.delete(currentRoomId);
        }
      }
    }
  });
});

// REST API for checking online rooms
app.get('/api/rooms', (req, res) => {
  const roomList = Array.from(rooms.values()).map((r) => ({
    id: r.id,
    name: r.name,
    venueId: r.venueId,
    playerCount: r.players.size,
  }));
  res.json({ rooms: roomList });
});

// Mount Vite or static dist
const port = process.env.PORT || 3000;

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(Number(port), '0.0.0.0', () => {
    console.log(`Four Square game server listening on port ${port}`);
  });
}

startServer();
