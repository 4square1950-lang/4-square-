import { useState } from 'react';
import { RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import type { RuleSet } from '../types/foursquare';

export interface GameSettingsState {
  // Notifications
  enableSystemNotifications: boolean;
  notificationSounds: boolean;
  showNotificationPreviews: boolean;
  alertFriendRequests: boolean;
  alertGameInvites: boolean;
  alertMatchReady: boolean;
  alertTurnNotifications: boolean;

  // Audio
  masterVolume: number;
  sfxVolume: number;
  musicEnabled: boolean;
  musicVolume: number;
  whistleVolume: number;
  crowdVolume: number;
  enableVoiceCommentary: boolean;

  // Visual
  cameraView: 'first_person' | 'third_person' | 'isometric' | 'top_down' | 'action';
  graphicsQuality: 'high' | 'medium' | 'low';
  dustParticles: boolean;
  contactShadows: boolean;
  antiAliasing: boolean;

  // Privacy
  showInStandings: boolean;
  allowSpectators: boolean;
  onlinePresence: 'online' | 'busy' | 'offline';

  // Accessibility
  highContrastLines: boolean;
  largeCourtNumbers: boolean;
  screenShake: boolean;
  colorblindFriendly: boolean;

  // Language
  language: 'en' | 'fr' | 'es';

  // Gameplay
  defaultRuleSet: RuleSet;
  receiverGraceFault: boolean;
  volleysAllowed: boolean;
  autoServeTimer: boolean;

  // Safety
  chatFilter: boolean;
  refereeStrictness: 'lenient' | 'standard' | 'strict';

  // Account
  playerName: string;
  playerNickname: string;
}

const DEFAULT_SETTINGS: GameSettingsState = {
  enableSystemNotifications: true,
  notificationSounds: true,
  showNotificationPreviews: true,
  alertFriendRequests: true,
  alertGameInvites: true,
  alertMatchReady: true,
  alertTurnNotifications: true,

  masterVolume: 75,
  sfxVolume: 80,
  musicEnabled: false,
  musicVolume: 65,
  whistleVolume: 85,
  crowdVolume: 70,
  enableVoiceCommentary: false,

  cameraView: 'third_person',
  graphicsQuality: 'high',
  dustParticles: true,
  contactShadows: true,
  antiAliasing: true,

  showInStandings: true,
  allowSpectators: true,
  onlinePresence: 'online',

  highContrastLines: false,
  largeCourtNumbers: true,
  screenShake: true,
  colorblindFriendly: false,

  language: 'en',

  defaultRuleSet: 'league',
  receiverGraceFault: true,
  volleysAllowed: true,
  autoServeTimer: true,

  chatFilter: true,
  refereeStrictness: 'standard',

  playerName: 'Patch Contender',
  playerNickname: 'King of Kanata',
};

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GameSettingsState;
  onUpdateSettings: (newSettings: GameSettingsState) => void;
  onResetCampaign?: () => void;
}


const groups: { name: string; rows: { key: keyof GameSettingsState; label: string; help: string; options?: string[][] }[] }[] = [
  { name: 'Gameplay', rows: [
    { key: 'defaultRuleSet', label: 'Ruleset', help: 'Choose the default rules for a new match.', options: [['league', 'League'], ['school', 'Schoolyard'], ['championship', 'Championship']] },
    { key: 'receiverGraceFault', label: 'Receiver retry', help: 'Allow a retry for eligible receiver faults.' },
    { key: 'volleysAllowed', label: 'Allow volleys', help: 'Allow volley returns where the ruleset supports them.' },
    { key: 'autoServeTimer', label: 'Serve timer', help: 'Show the serve clock.' },
  ] },
  { name: 'Camera & display', rows: [
    { key: 'cameraView', label: 'Camera', help: 'Choose the default view of the court.', options: [['third_person', 'Third person'], ['first_person', 'First person'], ['isometric', 'Isometric'], ['top_down', 'Overhead'], ['action', 'Action']] },
    { key: 'graphicsQuality', label: 'Graphics quality', help: 'Choose the level of visual detail.', options: [['high','High'],['medium','Medium'],['low','Low']] },
    { key: 'dustParticles', label: 'Dust effects', help: 'Show dust during play.' },
    { key: 'contactShadows', label: 'Shadows', help: 'Show contact shadows on the court.' },
    { key: 'antiAliasing', label: 'Anti-aliasing', help: 'Smooth the edges of 3D objects.' },
  ] },
  { name: 'Audio', rows: [
    { key: 'masterVolume', label: 'Master volume', help: 'Adjust the overall volume.' },
    { key: 'sfxVolume', label: 'Effects volume', help: 'Adjust ball, menu, and other sound effects.' },
    { key: 'musicEnabled', label: 'Music', help: 'Play the game soundtrack.' },
    { key: 'musicVolume', label: 'Music volume', help: 'Adjust the soundtrack volume.' },
    { key: 'whistleVolume', label: 'Whistle volume', help: 'Adjust the referee whistle.' },
    { key: 'crowdVolume', label: 'Crowd volume', help: 'Adjust ambient crowd sound.' },
    { key: 'enableVoiceCommentary', label: 'Commentary', help: 'Play voice commentary.' },
  ] },
  { name: 'Accessibility', rows: [
    { key: 'highContrastLines', label: 'High-contrast lines', help: 'Emphasize the court boundaries.' },
    { key: 'largeCourtNumbers', label: 'Large court numbers', help: 'Make the square numbers easier to see.' },
    { key: 'screenShake', label: 'Screen shake', help: 'Allow camera shake during play.' },
    { key: 'colorblindFriendly', label: 'Color assistance', help: 'Use the alternate court palette.' },
    { key: 'language', label: 'Language', help: 'Save your preferred language.', options: [['en','English'],['fr','Français'],['es','Español']] },
  ] },
  { name: 'Online', rows: [
    { key: 'playerName', label: 'Player name', help: 'Set your display name.' },
    { key: 'playerNickname', label: 'Nickname', help: 'Set your player nickname.' },
    { key: 'showInStandings', label: 'Show in standings', help: 'Include your online results in the public rankings.' },
    { key: 'allowSpectators', label: 'Allow spectators', help: 'Set your preference for spectators.' },
    { key: 'onlinePresence', label: 'Presence', help: 'Set your online status.', options: [['online','Online'],['busy','Busy'],['offline','Offline']] },
    { key: 'chatFilter', label: 'Chat filter', help: 'Save your chat filter preference.' },
    { key: 'refereeStrictness', label: 'Referee strictness', help: 'Set your referee preference.', options: [['lenient','Lenient'],['standard','Standard'],['strict','Strict']] },
  ] },
  { name: 'Notifications', rows: [
    { key: 'enableSystemNotifications', label: 'Notifications', help: 'Set your notification preference.' },
    { key: 'notificationSounds', label: 'Notification sounds', help: 'Play a sound for notifications.' },
    { key: 'showNotificationPreviews', label: 'Show previews', help: 'Include a preview in notifications.' },
    { key: 'alertFriendRequests', label: 'Friend requests', help: 'Show alerts for friend requests.' },
    { key: 'alertGameInvites', label: 'Game invites', help: 'Show alerts when invited to play.' },
    { key: 'alertMatchReady', label: 'Match ready', help: 'Show an alert when the match is ready.' },
    { key: 'alertTurnNotifications', label: 'Turn alerts', help: 'Show an alert when it is your turn.' },
  ] },
  { name: 'Data', rows: [] },
];

export function SettingsModal({ isOpen, onClose, settings, onUpdateSettings, onResetCampaign }: SettingsModalProps) {
  const [active, setActive] = useState(0);
  const [focused, setFocused] = useState<keyof GameSettingsState>('defaultRuleSet');
  const [confirmReset, setConfirmReset] = useState(false);
  const group = groups[active];
  const current = group.rows.find((row) => row.key === focused) ?? group.rows[0];
  if (!isOpen) return null;

  function update(key: keyof GameSettingsState, value: GameSettingsState[keyof GameSettingsState]) {
    onUpdateSettings({ ...settings, [key]: value });
  }

  return (
    <section role="dialog" aria-modal="true" aria-label="Settings" className="fixed inset-0 z-50 overflow-auto bg-neutral-950 text-neutral-100"
      onKeyDown={(event) => { if (event.key === 'Escape') onClose(); }}>
      <header className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-10">
        <h2 className="flex items-center gap-3 text-3xl font-black tracking-tight"><SlidersHorizontal size={22} className="text-amber-200" /> Settings</h2>
        <button onClick={onClose} aria-label="Close settings" className="rounded-lg p-2 hover:bg-white/10"><X /></button>
      </header>
      <nav className="flex overflow-auto border-b border-white/10 px-4 sm:px-8" aria-label="Settings categories">
        {groups.map(({ name }, index) => <button key={name} onClick={() => { setActive(index); setConfirmReset(false); }} aria-pressed={active === index}
          className={`relative shrink-0 whitespace-nowrap px-4 py-4 text-sm font-bold ${active === index ? 'text-amber-200 after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-amber-200' : 'text-neutral-400 hover:text-white'}`}>{name}</button>)}
      </nav>
      <div className="mx-auto grid max-w-6xl gap-6 p-5 md:grid-cols-[1fr_280px] sm:p-9">
        <div>
          {group.rows.map(({ key, label, options }) => {
            const value = settings[key];
            const className = 'max-w-[180px] rounded-md border border-white/15 bg-neutral-950 px-2 py-1.5 text-sm font-bold';
            return <label key={key} onFocus={() => setFocused(key)} onPointerEnter={() => setFocused(key)}
              className={`flex min-h-14 items-center justify-between gap-4 border-b border-white/10 px-3 text-sm focus-within:bg-neutral-800 ${current?.key === key ? 'bg-neutral-900 text-amber-100' : ''}`}>
              <span>{label}</span>
              {options ? <select className={className} value={String(value)} onChange={(event) => update(key, event.target.value)}>
                {options.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select> : typeof value === 'boolean' ? <input type="checkbox" className="h-5 w-5 accent-amber-200" checked={value} onChange={(event) => update(key, event.target.checked)} />
                : typeof value === 'number' ? <span className="flex items-center gap-2"><input type="range" min="0" max="100" value={value} className="w-24 accent-amber-200 sm:w-36" onChange={(event) => update(key, Number(event.target.value))} /><span className="w-8 text-right tabular-nums">{value}</span></span>
                : <input value={value} maxLength={32} className={className} onChange={(event) => update(key, event.target.value)} />}
            </label>;
          })}
          {group.name === 'Data' && onResetCampaign && (
            <div className="rounded-lg border border-white/15 p-4">
              <button onClick={() => setConfirmReset(true)} className="font-bold text-amber-200">Reset campaign</button>
              {confirmReset && <div className="mt-3 flex flex-wrap gap-3 text-sm"><p className="w-full text-neutral-300">Reset your tour progress and return to the first stop?</p><button onClick={() => setConfirmReset(false)}>Cancel</button><button onClick={() => { setConfirmReset(false); onResetCampaign(); }} className="font-bold text-amber-200">Reset campaign</button></div>}
            </div>
          )}
          <button onClick={() => onUpdateSettings({ ...DEFAULT_SETTINGS })} className="mt-6 inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold"><RotateCcw size={15} /> Restore defaults</button>
        </div>
        {current && <aside className="self-start rounded-xl border border-white/10 bg-neutral-900 p-5">
          <h3 className="font-black">{current.label}</h3><p className="mt-2 text-sm leading-relaxed text-neutral-400">{current.help}</p>
        </aside>}
      </div>
    </section>
  );
}
