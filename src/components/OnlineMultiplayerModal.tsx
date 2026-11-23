import React, { useState, useEffect, useRef } from 'react';
import { preparePlayerSession } from '../services/marketClient';
import { X, Globe, Users, Play, Send, Copy, Check, Gamepad2, Hash } from 'lucide-react';
import { CHARACTERS } from '../utils/characters';
import { DEFAULT_LOCAL_PICKS, LOCAL_SEATS } from '../services/localMultiplayer';
import type { MatchSnapshot, RoomChatMessage, RoomCommand, RoomEvent, RoomMember } from '../services/onlineProtocol';

interface OnlineMultiplayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartOnlineMatch: (socket: WebSocket, playerId: string, snapshot: MatchSnapshot) => void;
  onStartLocalMatch?: (characterIds: string[]) => void;
  defaultTab?: 'online' | 'local';
  tournamentRoom?: string;
  profileName?: string;
}

export const OnlineMultiplayerModal: React.FC<OnlineMultiplayerModalProps> = ({
  isOpen,
  onClose,
  onStartOnlineMatch,
  onStartLocalMatch,
  defaultTab = 'online',
  tournamentRoom,
  profileName,
}) => {
  const [selectedTab, setActiveTab] = useState<'online' | 'local'>(defaultTab);
  const activeTab = tournamentRoom ? 'online' : selectedTab;
  const roomInput = useRef<HTMLInputElement>(null);
  const chatLog = useRef<HTMLDivElement>(null);
  const [copyError, setCopyError] = useState(false);

  // Online Match State
  const [ordinaryRoom, setRoomId] = useState('COURT-402');
  const [guestName, setUserName] = useState('Player');
  const roomId = tournamentRoom ?? ordinaryRoom;
  const userName = profileName || guestName;
  const [selectedCharId, setSelectedCharId] = useState('char-patch');
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playersList, setPlayersList] = useState<RoomMember[]>([]);
  const [chatMessages, setChatMessages] = useState<RoomChatMessage[]>([]);
  const [connectionError, setConnectionError] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [copied, setCopied] = useState(false);

  // Local Pass & Play State
  const [playerCount, setPlayerCount] = useState<2 | 3 | 4>(2);
  const [selectedLocalChars, setSelectedLocalChars] = useState(() => [...DEFAULT_LOCAL_PICKS]);

  const socketRef = useRef<WebSocket | null>(null);
  const startMatchRef = useRef(onStartOnlineMatch);
  startMatchRef.current = onStartOnlineMatch;
  const me = playersList.find((player) => player.id === playerId);

  useEffect(() => {
    setPlayerId(null);
    setPlayersList([]);
    setChatMessages([]);
    setConnectionError('');
    if (!isOpen || activeTab !== 'online' || !roomId.trim()) return;

    let socket: WebSocket | undefined;
    let handedOff = false;
    let cancelled = false;
    const reconnect = window.setTimeout(async () => {
      await preparePlayerSession().catch(() => {});
      if (cancelled) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
      socket = ws;
      socketRef.current = ws;
      let joinedPlayerId: string | undefined;
      ws.onopen = () => {
        const join: RoomCommand = {
          type: 'join_room',
          payload: { roomId: roomId.trim(), userName, characterId: selectedCharId, venueId: 'bridgton_maine' },
        };
        ws.send(JSON.stringify(join));
      };
      ws.onmessage = ({ data }) => {
        const message = JSON.parse(data) as RoomEvent;
        switch (message.event) {
          case 'room_joined':
            joinedPlayerId = message.payload.playerId;
            setPlayerId(joinedPlayerId);
            setPlayersList(message.payload.players);
            setChatMessages(message.payload.chatMessages);
            break;
          case 'room_members':
            setPlayersList(message.payload);
            break;
          case 'room_error':
            setConnectionError(message.payload);
            break;
          case 'chat_received':
            setChatMessages((previous) => [...previous.slice(-19), message.payload]);
            break;
          case 'match_started':
            if (!joinedPlayerId) return;
            handedOff = true;
            socketRef.current = null;
            startMatchRef.current(ws, joinedPlayerId, message.payload);
            break;
        }
      };
      ws.onclose = () => {
        setPlayerId(null);
        setPlayersList([]);
        setConnectionError('Connection closed. Reopen Multiplayer to try again.');
      };
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(reconnect);
      if (socket && !handedOff) {
        socket.onmessage = null;
        socket.onclose = null;
        socket.close();
        socketRef.current = null;
      }
    };
  }, [isOpen, activeTab, roomId, userName, selectedCharId]);

  useEffect(() => {
    if (chatLog.current) chatLog.current.scrollTop=chatLog.current.scrollHeight;
  }, [chatMessages]);
  useEffect(() => {
    setCopied(false);
    setCopyError(false);
  }, [roomId, isOpen, activeTab]);

  if (!isOpen) return null;

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerId || !chatInput.trim() || socketRef.current?.readyState !== WebSocket.OPEN) return;

    try {
      socketRef.current.send(
        JSON.stringify({
          type: 'send_chat',
          payload: { text: chatInput.trim() },
        })
      );
    } catch {}
    setChatInput('');
  };

  const handleCopyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(roomId.trim());
      setCopied(true);
      setCopyError(false);
    } catch {
      roomInput.current?.focus();
      roomInput.current?.select();
      setCopyError(true);
    }
  };

  const handleLaunchOnline = () => {
    if (me && !me.ready && socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'ready' } satisfies RoomCommand));
    }
  };

  const handleLaunchLocal = () => {
    if (!onStartLocalMatch) return;
    onStartLocalMatch(selectedLocalChars.slice(0, playerCount));
    onClose();
  };

  const localCharacters = selectedLocalChars.slice(0,playerCount);

  return (
    <div className="league-overlay" role="dialog" aria-modal="true" aria-label="Multiplayer" onKeyDown={(event)=>{if(event.key==='Escape')onClose();}}>
      <section className="league-panel multiplayer-lobby">
        <header className="league-header multiplayer-header">
          <div><span className="multiplayer-heading-icon">{tournamentRoom?<Hash size={22}/>:<Users size={22}/>}</span>
            <h2>{tournamentRoom?'Tournament lobby':'Multiplayer'}</h2></div>
          <button autoFocus className="league-button multiplayer-close" aria-label="Close multiplayer" onClick={onClose}><X size={19}/></button>
        </header>
        {!tournamentRoom && onStartLocalMatch && <nav className="multiplayer-tabs" aria-label="Multiplayer modes">
          <button className="league-button" aria-pressed={activeTab==='online'} onClick={()=>setActiveTab('online')}><Globe size={17}/> Online</button>
          <button className="league-button" aria-pressed={activeTab==='local'} onClick={()=>setActiveTab('local')}><Gamepad2 size={17}/> Local pass &amp; play</button>
        </nav>}
        {activeTab==='online' ? <>
          <div className="multiplayer-columns">
            <section className="multiplayer-setup" aria-label="Online setup">
              <label>Player name
                <input value={userName} maxLength={32} disabled={Boolean(me?.ready || profileName)} onChange={(event)=>setUserName(event.target.value)}/>
              </label>
              <label>Character
                <select value={selectedCharId} disabled={me?.ready} onChange={(event)=>setSelectedCharId(event.target.value)}>
                  {CHARACTERS.map(({id,name})=><option key={id} value={id}>{name}</option>)}
                </select>
              </label>
              <label htmlFor="multiplayer-room-code">Room code</label>
              <div className="multiplayer-inline">
                <input id="multiplayer-room-code" ref={roomInput} className="multiplayer-code" value={roomId} maxLength={24} readOnly={Boolean(me?.ready || tournamentRoom)}
                  onChange={(event)=>setRoomId(event.target.value.toUpperCase())}/>
                <button className="league-button" disabled={!roomId.trim()} onClick={()=>void handleCopyRoomCode()}>{copied?<Check size={15}/>:<Copy size={15}/>} {copied?'Copied':'Copy'}</button>
              </div>
              {copyError && <p role="status">Copy the selected room code to share it.</p>}
            </section>
            <section className="multiplayer-lineup" aria-label="Court lineup">
              <header><h3>Court lineup</h3><span>{playersList.length}/4 players</span></header>
              <ol>{[1,2,3,4].map((square)=>{
                const player=playersList.find(({squareId})=>squareId===square);
                const character=CHARACTERS.find(({id})=>id===player?.characterId);
                return <li key={square} data-you={player?.id===playerId}>
                  <span className="multiplayer-seat" data-square={square}>{square}</span>
                  <div><strong>{player?.name ?? 'Open square'}</strong>{player && character && <small>{character.name}</small>}</div>
                  <span className="multiplayer-player-state">{player ? player.ready?'Ready':player.isHost?'Host':'In lobby' : tournamentRoom?'Pending':'Bot fill'}</span>
                </li>;
              })}</ol>
              {me && <p>Your seat · Square {me.squareId}</p>}
            </section>
          </div>
          <section className="multiplayer-chat" aria-label="Room chat">
            {chatMessages.length > 0 && <div className="multiplayer-chat-log" role="log" aria-label="Room messages" ref={chatLog}>{chatMessages.map(({id,sender,text})=><p key={id}><strong>{sender}</strong> {text}</p>)}</div>}
            <form className="multiplayer-inline" onSubmit={handleSendChat}>
              <input aria-label="Room message" value={chatInput} disabled={!playerId} maxLength={240} placeholder="Message the room" onChange={(event)=>setChatInput(event.target.value)}/>
              <button type="submit" className="league-button" aria-label="Send message" disabled={!playerId || !chatInput.trim()}><Send size={17}/></button>
            </form>
          </section>
          <footer className="league-footer multiplayer-footer">
            <p role="status">{connectionError || (me?.ready ? 'Waiting for the other players to ready up.' :
              !roomId.trim() ? 'Enter a room code.' : !me ? 'Connecting to the room…' :
              playersList.length < (tournamentRoom ? 4 : 2) ? tournamentRoom?'The match requires all four entrants.':'Share the room code to invite a player.' : 'The match starts when everyone is ready.')}</p>
            <button className="league-primary" disabled={!me || me.ready || playersList.length<(tournamentRoom?4:2)} onClick={handleLaunchOnline}><Play size={16}/> {me?.ready?'Ready':'Ready up'}</button>
          </footer>
        </> : <>
          <section className="multiplayer-local" aria-label="Local setup">
            <div className="multiplayer-local-count"><h3>Players</h3><div>{([2,3,4] as const).map((count)=><button className="league-button" key={count} aria-pressed={playerCount===count} onClick={()=>setPlayerCount(count)}>{count}</button>)}</div></div>
            <div className="multiplayer-local-seats">{LOCAL_SEATS.slice(0,playerCount).map((seat,index)=><article key={seat.id}>
              <header><span className="multiplayer-seat" data-square={seat.startSquare}>{seat.startSquare}</span><strong>{seat.name}</strong></header>
              <label>{seat.name} character<select value={localCharacters[index]} onChange={(event)=>{
                const next=event.target.value;
                setSelectedLocalChars((previous)=>previous.map((id,position)=>position===index?next:id===next?previous[index]:id));
              }}>{CHARACTERS.map(({id,name})=><option key={id} value={id}>{name}</option>)}</select></label>
              <p>{seat.keysLabel} aim · {seat.quickLabel} quick shot</p>
            </article>)}</div>
          </section>
          <footer className="league-footer multiplayer-footer"><p>{playerCount<4 ? (4-playerCount)+' open '+(playerCount===3?'square fills':'squares fill')+' with bots.' : 'All four squares have local players.'}</p>
            <button className="league-primary" onClick={handleLaunchLocal}><Play size={16}/> Start match</button>
          </footer>
        </>}
      </section>
    </div>
  );
};
