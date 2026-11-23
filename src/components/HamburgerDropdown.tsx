import { useEffect, useRef, useState } from 'react';
import { Menu, Coins } from 'lucide-react';
export type CameraViewMode = 'first_person' | 'third_person' | 'isometric' | 'top_down' | 'action';
interface Props {
  cameraView: CameraViewMode;
  coins: number;
  onPlayCourt?: () => void;
  onOpenCameras: () => void;
  onOpenMusic: () => void;
  onOpenSettings: () => void;
  onOpenTutorial?: () => void;
  onOpenRulebook?: () => void;
  onSaveAndExit: () => void;
  onExitMatch?: () => void;
  isMatchMode?: boolean;
  isRecording?: boolean;
  recordingSeconds?: number;
  onToggleRecordGame?: () => void;
}
export function HamburgerDropdown(props: Props) {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => { if (!panel.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', escape);
    return () => { window.removeEventListener('pointerdown', close); window.removeEventListener('keydown', escape); };
  }, [open]);
  const actions = [
    ['Play match', props.onPlayCourt], ['Camera', props.onOpenCameras], ['Music', props.onOpenMusic],
    ['Settings', props.onOpenSettings], ['Tutorial', props.onOpenTutorial], ['Rules', props.onOpenRulebook],
    [props.isRecording ? 'Stop recording' : 'Record', props.onToggleRecordGame],
    ['Leave match', props.isMatchMode ? props.onExitMatch : undefined], ['Main menu', props.onSaveAndExit],
  ] as const;
  return <div ref={panel} className="relative">
    <button className="field-icon" aria-label="Game menu" aria-expanded={open} onClick={() => setOpen(!open)}>
      <Menu size={21} />{props.isRecording && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-400" />}
    </button>
    {open && <div className="field-panel absolute right-0 top-14 w-56 p-2" aria-label="Game options">
      <div className="mb-1 flex items-center gap-2 border-b border-white/10 px-3 py-3 text-amber-200"><Coins size={17} /> {props.coins} career coins</div>
      {actions.map(([label, action]) => action && <button key={label} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-white/10" onClick={() => { setOpen(false); action(); }}>{label}</button>)}
    </div>}
  </div>;
}
