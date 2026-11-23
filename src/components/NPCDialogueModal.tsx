import { useCallback, useEffect, useState } from 'react';
import { Volume2, VolumeX, X } from 'lucide-react';
import type { CampaignNPC } from '../types/campaign';
interface Props { npc: CampaignNPC | null; onClose: () => void; onChallengePractice?: () => void; }
export function NPCDialogueModal({ npc, onClose, onChallengePractice }: Props) {
  const [line, setLine] = useState(0);
  const [muted, setMuted] = useState(() => localStorage.getItem('foursquare_npc_muted') === 'true');
  const canSpeak = 'speechSynthesis' in window;
  useEffect(() => setLine(0), [npc?.id]);
  const speak = useCallback(() => {
    const subtitle = npc?.dialogueLines[line];
    if (!subtitle || muted || !canSpeak) return;
    window.speechSynthesis.cancel();
    const voiceLine = new SpeechSynthesisUtterance(subtitle.trim().replace(/^[“"]|[”"]$/g, ''));
    const adult = /coach|teacher|instructor|referee/i.test(npc.role);
    const variation = [...npc.id].reduce((sum, letter) => sum + letter.charCodeAt(0), 0);
    const accents = window.speechSynthesis.getVoices().filter(({lang}) => lang.toLowerCase().startsWith('en'));
    const preferred = accents.filter(({name}) => /natural|enhanced|premium|neural/i.test(name));
    const voices = preferred.length ? preferred : accents.filter(({localService})=>localService);
    const choices = [...(voices.length ? voices : accents)].sort((a, b) => a.name.localeCompare(b.name));
    if (choices.length) voiceLine.voice = choices[variation % choices.length];
    else voiceLine.lang='en-US';
    voiceLine.pitch = adult ? .96 : 1 + (variation % 5) * .02;
    voiceLine.rate = adult ? .91 : .94 + (variation % 5) * .022;
    window.speechSynthesis.speak(voiceLine);
  }, [canSpeak, npc, line, muted]);
  useEffect(() => {
    speak();
    return () => { if (canSpeak) window.speechSynthesis.cancel(); };
  }, [canSpeak, speak]);
  if (!npc) return null;
  const hasNext = line + 1 < npc.dialogueLines.length;
  return <div className="fixed inset-0 z-50 grid items-end justify-items-center bg-black/50 p-4 sm:p-8">
    <section className="field-panel w-full max-w-xl p-5 sm:p-6" role="dialog" aria-modal="true" aria-label={npc.name}>
      <header className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold text-amber-200">{npc.role}</p><h2 className="text-xl font-bold">{npc.name}</h2></div><button onClick={onClose} aria-label="Close dialogue"><X size={20} /></button></header>
      <p className="py-5 text-sm leading-relaxed text-stone-200">{npc.dialogueLines[line] ?? npc.dialogueLines[0]}</p>
      <footer className="flex flex-wrap justify-end gap-2">
        {canSpeak && <div className="mr-auto flex gap-2">
          <button className="league-button" disabled={muted} onClick={speak} aria-label="Replay voice"><Volume2 size={16}/></button>
          <button className="league-button" aria-pressed={muted} onClick={() => {
            localStorage.setItem('foursquare_npc_muted', String(!muted));
            setMuted(!muted);
          }} aria-label={muted ? 'Unmute characters' : 'Mute characters'}>{muted ? <VolumeX size={16}/> : 'Mute'}</button>
        </div>}
        {npc.isOpponent && onChallengePractice && <button onClick={onChallengePractice} className="rounded-lg bg-amber-200 px-4 py-2 text-sm font-bold text-neutral-950">Challenge</button>}
        <button onClick={() => hasNext ? setLine(line + 1) : onClose()} className="rounded-lg border border-white/15 px-4 py-2 text-sm">{hasNext ? 'Next' : 'Close'}</button>
      </footer>
    </section>
  </div>;
}
