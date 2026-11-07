import React, { useState, useEffect, useRef } from 'react';
import { X, Globe, Users, Play, Send, CheckCircle2, ShieldCheck, Sparkles, Copy, Check } from 'lucide-react';
import { CHARACTERS } from '../utils/characters';

interface OnlineMultiplayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartOnlineMatch: (roomData: { roomId: string; socket: WebSocket; mySquareId: number | null; myUserId: string }) => void;
}

export const OnlineMultiplayerModal: React.FC<OnlineMultiplayerModalProps> = ({
  isOpen,
  onClose,
  onStartOnlineMatch,
}) => {
  const [roomId, setRoomId] = useState('COURT-402');
  const [userName, setUserName] = useState('AceStriker');
  const [selectedCharId, setSelectedCharId] = useState('char-patch');
  const [isConnected, setIsConnected] = useState(false);
  const [playersList, setPlayersList] = useState<Array<{ id: string; name: string; characterId: string; squareId: number | null; isHost: boolean }>>([]);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; text: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [mySquareId, setMySquareId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const myUserIdRef = useRef<string>(`usr-${Math.random().toString(36).slice(2, 8)}`);

  useEffect(() => {
    if (!isOpen) {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      setIsConnected(false);
      setPlayersList([]);
      return;
    }

    // Connect to WebSocket on server
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        // Join initial room
        ws.send(
          JSON.stringify({
            type: 'join_room',
            payload: {
              roomId: roomId.trim().toUpperCase(),
              userId: myUserIdRef.current,
              userName,
              characterId: selectedCharId,
              venueId: 'bridgton_maine',
            },
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event === 'room_joined') {
            setPlayersList(data.payload.snapshot.players || []);
            setMySquareId(data.payload.yourSquareId);
            if (data.payload.snapshot.chatMessages) {
              setChatMessages(data.payload.snapshot.chatMessages);
            }
          } else if (data.event === 'player_joined') {
            setPlayersList((prev) => [...prev.filter((p) => p.id !== data.payload.player.id), data.payload.player]);
          } else if (data.event === 'player_left') {
            setPlayersList((prev) => prev.filter((p) => p.id !== data.payload.userId));
          } else if (data.event === 'chat_received') {
            setChatMessages((prev) => [...prev, data.payload]);
          }
        } catch (err) {
          console.error('WS parse error:', err);
        }
      };

      ws.onerror = (e) => {
        console.warn('WebSocket warning:', e);
        setIsConnected(false);
      };

      ws.onclose = () => {
        setIsConnected(false);
      };
    } catch (err) {
      console.warn('Failed to establish WS:', err);
    }

    return () => {
      if (socketRef.current) {
        try {
          socketRef.current.close();
        } catch {}
        socketRef.current = null;
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !socketRef.current) return;

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

  const handleCopyRoomCode = () => {
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(roomId).catch(() => {});
      }
    } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLaunch = () => {
    if (socketRef.current && isConnected) {
      onStartOnlineMatch({
        roomId,
        socket: socketRef.current,
        mySquareId,
        myUserId: myUserIdRef.current,
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md select-none animate-in zoom-in-95 duration-200">
      <div className="bg-slate-900 border-2 border-sky-400 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-sky-600 via-blue-600 to-sky-600 text-slate-950 flex items-center justify-between border-b-2 border-sky-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-950 text-sky-400 flex items-center justify-center shadow-lg font-black">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono tracking-widest uppercase text-slate-900 font-extrabold">
                CROSS-PLATFORM ONLINE ARENA
              </span>
              <h2 className="text-2xl font-black text-slate-950">Online Match Lobby</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-950/20 hover:bg-slate-950/40 text-slate-950 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lobby info & settings */}
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-slate-800">
          {/* Left: Player Profile & Room Code */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                Your Player Tag
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-400"
              />
            </div>

            <div>
              <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                Equipped Character
              </label>
              <select
                value={selectedCharId}
                onChange={(e) => setSelectedCharId(e.target.value)}
                className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-400 cursor-pointer"
              >
                {CHARACTERS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.archetype})
                  </option>
                ))}
              </select>
            </div>

            {/* Room Code with Copy */}
            <div>
              <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                Court Room Code
              </label>
              <div className="flex gap-2 mt-1">
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono font-bold text-amber-400 uppercase focus:outline-none focus:border-sky-400"
                />
                <button
                  onClick={handleCopyRoomCode}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-xs"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied' : 'Share'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right: Connected Players List */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-300 pb-2 border-b border-slate-800">
                <span>PLAYERS IN ROOM ({playersList.length}/4)</span>
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  ONLINE
                </span>
              </div>

              <div className="space-y-1.5 mt-2">
                {[1, 2, 3, 4].map((sqNum) => {
                  const p = playersList.find((item) => item.squareId === sqNum);
                  return (
                    <div
                      key={sqNum}
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-900/90 border border-slate-800/80 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-slate-800 flex items-center justify-center font-mono font-bold text-[10px] text-amber-400">
                          {sqNum}
                        </span>
                        <span className="font-bold text-white">
                          {p ? p.name : 'Waiting for player...'}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {p ? (p.isHost ? '👑 Host' : 'Ready') : 'AI Bot'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/60 mt-2">
              Your Slot: <strong className="text-amber-400">{mySquareId ? `Square ${mySquareId}` : 'Queue'}</strong>
            </div>
          </div>
        </div>

        {/* Live Room Chat & Launch Action */}
        <div className="p-4 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Quick Chat bar */}
          <form onSubmit={handleSendChat} className="flex-1 flex gap-2 w-full">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Chat with room..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-400"
            />
            <button
              type="submit"
              className="p-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          {/* Launch Button */}
          <button
            onClick={handleLaunch}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-300 hover:to-blue-400 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-sky-500/20 cursor-pointer transition-all active:scale-95 shrink-0"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>Enter Court Arena</span>
          </button>
        </div>
      </div>
    </div>
  );
};
