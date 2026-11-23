import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { SquareId } from '../types/foursquare';
import type { GameEngineState } from './foursquareEngine';
import type { MatchSnapshot, RoomCommand, RoomEvent } from './onlineProtocol';
import { soundFX } from './soundEffects';

interface OnlineCourt {
  venueId: string;
  playerCount: number;
  rematchReady: boolean;
  endsAt?:number;
  serveDeadline?: number;
}

export function useOnlineMatch(
  setGameState: Dispatch<SetStateAction<GameEngineState>>,
  onDisconnect: () => void,
) {
  const connection = useRef<{ socket: WebSocket; turnId: number } | null>(null);
  const [court, setCourt] = useState<OnlineCourt | null>(null);
  const onDisconnectRef = useRef(onDisconnect);
  onDisconnectRef.current = onDisconnect;

  const closeSocket = useCallback(() => {
    const active = connection.current;
    connection.current = null;
    if (!active) return;
    active.socket.onclose = null;
    active.socket.onmessage = null;
    active.socket.close();
  }, []);

  useEffect(() => closeSocket, [closeSocket]);

  const leave = useCallback(() => {
    closeSocket();
    setCourt(null);
  }, [closeSocket]);

  const connect = (socket: WebSocket, playerId: string, snapshot: MatchSnapshot) => {
    closeSocket();
    const active = { socket, turnId: snapshot.turnId };
    connection.current = active;
    const receiveState = (incoming: MatchSnapshot, starting: boolean) => {
      active.turnId = incoming.turnId;
      const { state } = incoming;
      if (starting) {
        setCourt({
          venueId: incoming.venueId,
          playerCount: state.players.filter((player) => player.isHuman).length,
          rematchReady: false,
          endsAt:incoming.endsAt,
          serveDeadline: incoming.serveDeadline,
        });
      } else {
        setCourt((court) => court && { ...court, serveDeadline: incoming.serveDeadline });
      }
      if (!starting && state.refereeCall.type === 'clean_hit' && !state.ballState.hasBouncedThisPlay) {
        soundFX.playHandStrike();
      } else if (!starting && state.ballState.hasBouncedThisPlay) {
        soundFX.playBallBounce();
      } else if (!starting && incoming.serveDeadline) {
        soundFX.playWhistle();
      }

      // The server marks all connected players as human. The court camera and
      // player highlights need only this client's player marked as "you".
      setGameState({
        ...state,
        humanPlayerId: playerId,
        players: state.players.map((player) => ({ ...player, isHuman: player.id === playerId })),
      });
    };

    socket.onmessage = ({ data }) => {
      if (connection.current !== active) return;
      const message = JSON.parse(data) as RoomEvent;
      switch (message.event) {
        case 'match_started':
        case 'match_state':
          receiveState(message.payload, message.event === 'match_started');
          break;
        case 'match_ball':
          setGameState((previous) => ({ ...previous, ballState: message.payload }));
          break;
        case 'room_members':
          setCourt((previous) => previous && {
            ...previous,
            playerCount: message.payload.length,
            rematchReady: message.payload.some((member) => member.id === playerId && member.ready),
          });
          break;
      }
    };
    socket.onclose = () => {
      if (connection.current !== active) return;
      leave();
      onDisconnectRef.current();
    };
    receiveState(snapshot, true);
  };

  const hit = useCallback((targetSquare: SquareId, point?: { x: number; z: number }, queued = false) => {
    const active = connection.current;
    if (active?.socket.readyState !== WebSocket.OPEN) return;
    const command: RoomCommand = { type: queued ? 'queue_return' : 'hit_ball', payload: { targetSquare, point, turnId: active.turnId } };
    active.socket.send(JSON.stringify(command));
  }, []);

  const rematch = () => {
    if (connection.current?.socket.readyState === WebSocket.OPEN) {
      connection.current.socket.send(JSON.stringify({ type: 'rematch' } satisfies RoomCommand));
    }
  };

  return { court, connect, hit, rematch, leave };
}
