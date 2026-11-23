import { useEffect, useRef, useState } from 'react';
import { MessageSquare, Send, X } from 'lucide-react';
import type { ChatMessage, VenueId } from '../types/campaign';
interface Props {
  venueId: VenueId;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
}
const nameColors = ['#f3ce80', '#8fdfb8', '#91ccea', '#e3ace6', '#f7ac9c', '#b5bffe'];
export function LiveChat({ messages, onSendMessage }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const feed = useRef<HTMLDivElement>(null);
  useEffect(() => { if (open && feed.current) feed.current.scrollTop = feed.current.scrollHeight; }, [messages, open]);
  return <div className="absolute bottom-4 left-4 z-30">
    {open ? <section aria-label="Live chat" className="field-panel field-module flex flex-col p-3">
      <header className="flex items-center justify-between border-b border-white/10 pb-2 font-semibold">Live chat <button onClick={() => setOpen(false)} aria-label="Close chat"><X size={18} /></button></header>
      <div ref={feed} className="flex-1 space-y-2 overflow-auto py-2 text-xs" aria-live="polite">{messages.map((message) => {
        const colorIndex = [...message.sender].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) % nameColors.length, 0);
        return <p key={message.id}><strong style={{ color: nameColors[colorIndex] }}>{message.sender}</strong> {message.text}</p>;
      })}</div>
      <form className="flex gap-1" onSubmit={(event) => { event.preventDefault(); if (draft.trim()) { onSendMessage(draft.trim()); setDraft(''); } }}>
        <input className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-sm" aria-label="Message" placeholder="Message" value={draft} maxLength={240} onChange={(event) => setDraft(event.target.value)} />
        <button className="rounded-lg bg-amber-200 px-2 text-neutral-950" aria-label="Send message"><Send size={16} /></button>
      </form>
    </section> : <button className="field-icon" aria-label="Open live chat" onClick={() => setOpen(true)}><MessageSquare size={20} /></button>}
  </div>;
}
