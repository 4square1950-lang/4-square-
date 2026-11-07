import React, { useState, useEffect } from 'react';
import {
  X,
  Bell,
  Volume2,
  Tv,
  Lock,
  Accessibility,
  Globe,
  Gamepad2,
  Shield,
  Database,
  User,
  Check,
  Search,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { soundFX } from '../services/soundEffects';
import { RuleSet } from '../types/foursquare';

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

  cameraView: 'isometric',
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

type SettingCategory =
  | 'notifications'
  | 'audio'
  | 'visual'
  | 'privacy'
  | 'accessibility'
  | 'language'
  | 'gameplay'
  | 'safety'
  | 'data'
  | 'account';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onResetCampaign,
}) => {
  const [activeCategory, setActiveCategory] = useState<SettingCategory>('notifications');
  const [searchQuery, setSearchQuery] = useState('');
  const [localSettings, setLocalSettings] = useState<GameSettingsState>(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  if (!isOpen) return null;

  const updateField = <K extends keyof GameSettingsState>(key: K, value: GameSettingsState[K]) => {
    soundFX.playClick();
    const updated = { ...localSettings, [key]: value };
    setLocalSettings(updated);
    onUpdateSettings(updated);

    // Apply immediate functional effects
    if (key === 'masterVolume' || key === 'sfxVolume') {
      soundFX.volume = (Number(value) / 100) * (updated.masterVolume / 100);
    }
    if (key === 'musicEnabled') {
      if (value) soundFX.startMusic();
      else soundFX.stopMusic();
    }
  };

  const navCategories = [
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'audio', label: 'Audio', icon: Volume2 },
    { id: 'visual', label: 'Visual', icon: Tv },
    { id: 'privacy', label: 'Privacy', icon: Lock },
    { id: 'accessibility', label: 'Accessibility', icon: Accessibility },
    { id: 'language', label: 'Language', icon: Globe },
    { id: 'gameplay', label: 'Gameplay', icon: Gamepad2 },
    { id: 'safety', label: 'Safety', icon: Shield },
    { id: 'data', label: 'Data & Storage', icon: Database },
    { id: 'account', label: 'Account & Security', icon: User },
  ];

  const filteredCategories = searchQuery.trim()
    ? navCategories.filter((c) => c.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : navCategories;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-2 sm:p-6 animate-in fade-in duration-150">
      {/* Settings Dialog Container matching site theme */}
      <div className="relative w-full max-w-5xl h-[88vh] max-h-[800px] rounded-3xl bg-slate-900 border-2 border-amber-400/80 shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-400/20">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-wide text-white font-sans">SETTINGS</h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 uppercase font-bold">
                  Preferences
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Manage your game, audio, visuals, and account preferences.</p>
            </div>
          </div>

          {/* Clean Close Button */}
          <button
            onClick={() => {
              soundFX.playClick();
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
            title="Close Settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content Body: Left Navigation & Right Settings Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Navigation Column */}
          <div className="w-64 sm:w-72 border-r border-slate-800/80 bg-slate-950/70 p-4 flex flex-col gap-3 overflow-y-auto">
            {/* Search Input */}
            <div className="relative mb-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search settings..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-amber-400/80 transition-colors"
              />
            </div>

            {/* Categories List */}
            <div className="space-y-1">
              {filteredCategories.map((cat) => {
                const Icon = cat.icon;
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      soundFX.playClick();
                      setActiveCategory(cat.id as SettingCategory);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all text-left cursor-pointer relative ${
                      isActive
                        ? 'bg-amber-400/15 text-amber-300 border border-amber-400/40 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Glowing Amber Left Pill for Active Item */}
                    {isActive && (
                      <div className="absolute left-0 inset-y-1.5 w-1 rounded-r-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.9)]" />
                    )}
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Settings Configuration Area */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 scrollbar-thin scrollbar-thumb-slate-700 bg-slate-900">
            {/* 1. NOTIFICATIONS CATEGORY */}
            {activeCategory === 'notifications' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div>
                  <h2 className="text-2xl font-black text-white">Notifications</h2>
                  <p className="text-xs text-slate-400 pt-0.5">Manage game, social, marketplace, and system alerts.</p>
                </div>

                {/* Section: General Notifications */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black tracking-wider text-amber-400 uppercase">GENERAL NOTIFICATIONS</h3>
                  <div className="rounded-2xl border border-slate-800/90 bg-slate-950/60 p-4 space-y-4">
                    <SettingCheckboxRow
                      title="Enable System Notifications"
                      desc="Allow the game platform to send push and pop-up notifications"
                      checked={localSettings.enableSystemNotifications}
                      onChange={(v) => updateField('enableSystemNotifications', v)}
                    />
                    <div className="border-t border-slate-800/60" />
                    <SettingCheckboxRow
                      title="Notification Sounds"
                      desc="Play audio chimes when a new notification arrives"
                      checked={localSettings.notificationSounds}
                      onChange={(v) => updateField('notificationSounds', v)}
                    />
                    <div className="border-t border-slate-800/60" />
                    <SettingCheckboxRow
                      title="Show Notification Previews"
                      desc="Display message text and caller details inside notification popups"
                      checked={localSettings.showNotificationPreviews}
                      onChange={(v) => updateField('showNotificationPreviews', v)}
                    />
                  </div>
                </div>

                {/* Section: Game Alerts */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black tracking-wider text-amber-400 uppercase">GAME ALERTS</h3>
                  <div className="rounded-2xl border border-slate-800/90 bg-slate-950/60 p-4 space-y-4">
                    <SettingCheckboxRow
                      title="Friend Requests"
                      desc="Alert when someone sends you a friend invitation"
                      checked={localSettings.alertFriendRequests}
                      onChange={(v) => updateField('alertFriendRequests', v)}
                    />
                    <div className="border-t border-slate-800/60" />
                    <SettingCheckboxRow
                      title="Game Invites"
                      desc="Alert when invited to join a multiplayer saloon table"
                      checked={localSettings.alertGameInvites}
                      onChange={(v) => updateField('alertGameInvites', v)}
                    />
                    <div className="border-t border-slate-800/60" />
                    <SettingCheckboxRow
                      title="Match Ready"
                      desc="Alert when your queued match is ready to start"
                      checked={localSettings.alertMatchReady}
                      onChange={(v) => updateField('alertMatchReady', v)}
                    />
                    <div className="border-t border-slate-800/60" />
                    <SettingCheckboxRow
                      title="Turn Notifications"
                      desc="Alert when it is your turn to make a move"
                      checked={localSettings.alertTurnNotifications}
                      onChange={(v) => updateField('alertTurnNotifications', v)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 2. AUDIO CATEGORY */}
            {activeCategory === 'audio' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div>
                  <h2 className="text-2xl font-black text-white">Audio & Atmosphere</h2>
                  <p className="text-xs text-slate-400 pt-0.5">Control volume levels, synthesized music tracks, and court Foley sound effects.</p>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-black tracking-wider text-amber-400 uppercase">SOUND LEVELS</h3>
                  <div className="rounded-2xl border border-slate-800/90 bg-slate-950/60 p-5 space-y-5">
                    <SettingSliderRow
                      title="Master Volume"
                      desc="Controls overall game audio level"
                      value={localSettings.masterVolume}
                      onChange={(v) => updateField('masterVolume', v)}
                    />
                    <div className="border-t border-slate-800/60" />
                    <SettingSliderRow
                      title="Sound Effects (SFX)"
                      desc="Rubber ball bounce thump, hand strikes, and shoe squeaks"
                      value={localSettings.sfxVolume}
                      onChange={(v) => updateField('sfxVolume', v)}
                    />
                    <div className="border-t border-slate-800/60" />
                    <SettingCheckboxRow
                      title="Enable Background Music"
                      desc="Upbeat playground chiptune synth radio melodies"
                      checked={localSettings.musicEnabled}
                      onChange={(v) => updateField('musicEnabled', v)}
                    />
                    {localSettings.musicEnabled && (
                      <SettingSliderRow
                        title="Music Volume"
                        desc="Radio station broadcast level"
                        value={localSettings.musicVolume}
                        onChange={(v) => updateField('musicVolume', v)}
                      />
                    )}
                    <div className="border-t border-slate-800/60" />
                    <SettingSliderRow
                      title="Referee Whistle"
                      desc="Pitch and sharpness of official call whistles"
                      value={localSettings.whistleVolume}
                      onChange={(v) => updateField('whistleVolume', v)}
                    />
                    <div className="border-t border-slate-800/60" />
                    <SettingCheckboxRow
                      title="Enable Voice Commentary"
                      desc="Spoken referee calls stating points scored and crown holds (Disabled by default)"
                      checked={localSettings.enableVoiceCommentary}
                      onChange={(v) => updateField('enableVoiceCommentary', v)}
                    />
                    <div className="border-t border-slate-800/60" />
                    <SettingSliderRow
                      title="Crowd & Spectator Foley"
                      desc="Sideline cheers, gasps, and applause"
                      value={localSettings.crowdVolume}
                      onChange={(v) => updateField('crowdVolume', v)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 3. VISUAL CATEGORY */}
            {activeCategory === 'visual' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div>
                  <h2 className="text-2xl font-black text-white">Visual & Camera</h2>
                  <p className="text-xs text-slate-400 pt-0.5">Customize camera angles, 3D rendering fidelity, and particle effects.</p>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-black tracking-wider text-amber-400 uppercase">CAMERA PERSPECTIVE</h3>
                  <div className="rounded-2xl border border-slate-800/90 bg-slate-950/60 p-5 space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {(['first_person', 'third_person', 'top_down', 'action'] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => updateField('cameraView', mode)}
                          className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                            localSettings.cameraView === mode
                              ? 'border-amber-400 bg-amber-400/15 text-amber-300 shadow-sm'
                              : 'border-slate-800 bg-slate-950/70 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <div className="font-bold text-xs capitalize">{mode.replace('_', ' ')}</div>
                          <div className="text-[10px] text-slate-400 mt-1">
                            {mode === 'first_person'
                              ? 'Direct player eye view'
                              : mode === 'third_person'
                              ? 'Behind-player over shoulder'
                              : mode === 'top_down'
                              ? 'Direct overhead court'
                              : 'Dynamic action cam'}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-black tracking-wider text-amber-400 uppercase">GRAPHICS QUALITY & EFFECTS</h3>
                  <div className="rounded-2xl border border-slate-800/90 bg-slate-950/60 p-5 space-y-4">
                    <SettingCheckboxRow
                      title="Dust & Asphalt Puff Particles"
                      desc="Show puffs when ball impacts court asphalt or lines"
                      checked={localSettings.dustParticles}
                      onChange={(v) => updateField('dustParticles', v)}
                    />
                    <div className="border-t border-slate-800/60" />
                    <SettingCheckboxRow
                      title="Dynamic Ball Contact Shadows"
                      desc="Real-time soft shadows beneath players and ball"
                      checked={localSettings.contactShadows}
                      onChange={(v) => updateField('contactShadows', v)}
                    />
                    <div className="border-t border-slate-800/60" />
                    <SettingCheckboxRow
                      title="Anti-Aliasing (Smooth Edges)"
                      desc="Sharper edges on court lines, fence, and player sneakers"
                      checked={localSettings.antiAliasing}
                      onChange={(v) => updateField('antiAliasing', v)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 4. PRIVACY */}
            {activeCategory === 'privacy' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div>
                  <h2 className="text-2xl font-black text-white">Privacy & Visibility</h2>
                  <p className="text-xs text-slate-400 pt-0.5">Control how your stats and presence appear across the Court Circuit.</p>
                </div>
                <div className="rounded-2xl border border-slate-800/90 bg-slate-950/60 p-5 space-y-4">
                  <SettingCheckboxRow
                    title="Show Profile in Circuit Standings"
                    desc="Allow your player name and high streaks on the leaderboard"
                    checked={localSettings.showInStandings}
                    onChange={(v) => updateField('showInStandings', v)}
                  />
                  <div className="border-t border-slate-800/60" />
                  <SettingCheckboxRow
                    title="Allow Public Spectators"
                    desc="Permit players in waiting line to watch live matches"
                    checked={localSettings.allowSpectators}
                    onChange={(v) => updateField('allowSpectators', v)}
                  />
                </div>
              </div>
            )}

            {/* 5. ACCESSIBILITY */}
            {activeCategory === 'accessibility' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div>
                  <h2 className="text-2xl font-black text-white">Accessibility</h2>
                  <p className="text-xs text-slate-400 pt-0.5">Visual clarity and motion accessibility options.</p>
                </div>
                <div className="rounded-2xl border border-slate-800/90 bg-slate-950/60 p-5 space-y-4">
                  <SettingCheckboxRow
                    title="High-Contrast Court Lines"
                    desc="Boost court line brightness for improved line-call visibility"
                    checked={localSettings.highContrastLines}
                    onChange={(v) => updateField('highContrastLines', v)}
                  />
                  <div className="border-t border-slate-800/60" />
                  <SettingCheckboxRow
                    title="Large Court Number Overlays"
                    desc="Display bold high-contrast 1, 2, 3, 4 numerals in each square"
                    checked={localSettings.largeCourtNumbers}
                    onChange={(v) => updateField('largeCourtNumbers', v)}
                  />
                  <div className="border-t border-slate-800/60" />
                  <SettingCheckboxRow
                    title="Screen Shake on Hard Smashes"
                    desc="Subtle camera vibration when an overhand smash occurs"
                    checked={localSettings.screenShake}
                    onChange={(v) => updateField('screenShake', v)}
                  />
                </div>
              </div>
            )}

            {/* 6. LANGUAGE */}
            {activeCategory === 'language' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div>
                  <h2 className="text-2xl font-black text-white">Language / Langue</h2>
                  <p className="text-xs text-slate-400 pt-0.5">Select your preferred display language for menus and commentary.</p>
                </div>
                <div className="rounded-2xl border border-slate-800/90 bg-slate-950/60 p-5 space-y-3">
                  {[
                    { id: 'en', label: 'English (Canada / US)', desc: 'Official League rules & terminology' },
                    { id: 'fr', label: 'Français (Canada)', desc: 'Règles officielles et commentaires en français' },
                    { id: 'es', label: 'Español', desc: 'Reglas oficiales de cuatro esquinas' },
                  ].map((lang) => (
                    <button
                      key={lang.id}
                      onClick={() => updateField('language', lang.id as any)}
                      className={`w-full p-3.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                        localSettings.language === lang.id
                          ? 'border-amber-400 bg-amber-400/15 text-amber-300'
                          : 'border-slate-800 bg-slate-950/70 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="text-left">
                        <div className="font-bold text-xs sm:text-sm text-white">{lang.label}</div>
                        <div className="text-xs text-slate-400">{lang.desc}</div>
                      </div>
                      {localSettings.language === lang.id && (
                        <div className="w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center text-slate-950">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 7. GAMEPLAY */}
            {activeCategory === 'gameplay' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div>
                  <h2 className="text-2xl font-black text-white">Gameplay & Rulebook Baseline</h2>
                  <p className="text-xs text-slate-400 pt-0.5">Select standard Four Square rule interpretations.</p>
                </div>
                <div className="space-y-3">
                  <h3 className="text-xs font-black tracking-wider text-amber-400 uppercase">RULE SET INTERPRETATION</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => updateField('defaultRuleSet', 'league')}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                        localSettings.defaultRuleSet === 'league'
                          ? 'border-amber-400 bg-amber-400/15 text-amber-300 shadow-md'
                          : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="font-black text-sm text-white">Play Four Square League</div>
                      <div className="text-xs text-slate-400 mt-1">
                        16-foot court, outside lines IN, inside lines OUT, volleys legal, 1-fault receiver allowance.
                      </div>
                    </button>
                    <button
                      onClick={() => updateField('defaultRuleSet', 'school')}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                        localSettings.defaultRuleSet === 'school'
                          ? 'border-amber-400 bg-amber-400/15 text-amber-300 shadow-md'
                          : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="font-black text-sm text-white">Playworks Schoolyard</div>
                      <div className="text-xs text-slate-400 mt-1">
                        10-foot court, all lines OUT, return required after one bounce (no aerial volleys).
                      </div>
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800/90 bg-slate-950/60 p-5 space-y-4">
                  <SettingCheckboxRow
                    title="Receiver 1-Fault Grace Allowance"
                    desc="Under Rule 03, receiving player gets 1 free fault on unplayable serves"
                    checked={localSettings.receiverGraceFault}
                    onChange={(v) => updateField('receiverGraceFault', v)}
                  />
                  <div className="border-t border-slate-800/60" />
                  <SettingCheckboxRow
                    title="Volleys Permitted in Ordinary Rallies"
                    desc="Allow striking incoming ball before it bounces (League baseline)"
                    checked={localSettings.volleysAllowed}
                    onChange={(v) => updateField('volleysAllowed', v)}
                  />
                  <div className="border-t border-slate-800/60" />
                  <SettingCheckboxRow
                    title="Auto-Serve Timer"
                    desc="Start countdown prompt when King steps into Square 1"
                    checked={localSettings.autoServeTimer}
                    onChange={(v) => updateField('autoServeTimer', v)}
                  />
                </div>
              </div>
            )}

            {/* 8. SAFETY */}
            {activeCategory === 'safety' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div>
                  <h2 className="text-2xl font-black text-white">Court Safety & Conduct</h2>
                  <p className="text-xs text-slate-400 pt-0.5">Referee strictness and sideline chat etiquette.</p>
                </div>
                <div className="rounded-2xl border border-slate-800/90 bg-slate-950/60 p-5 space-y-4">
                  <SettingCheckboxRow
                    title="Sideline Word Filter"
                    desc="Filter hostile or inappropriate spectator chat"
                    checked={localSettings.chatFilter}
                    onChange={(v) => updateField('chatFilter', v)}
                  />
                </div>
              </div>
            )}

            {/* 9. DATA & STORAGE */}
            {activeCategory === 'data' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div>
                  <h2 className="text-2xl font-black text-white">Data & Save State</h2>
                  <p className="text-xs text-slate-400 pt-0.5">Manage your local saves, campaign road trip progress, and coin cache.</p>
                </div>
                <div className="rounded-2xl border border-slate-800/90 bg-slate-950/60 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs sm:text-sm text-white">Reset Campaign Progress</div>
                      <div className="text-xs text-slate-400">Return to Stop #1 (Ottawa Driveway) and reset unlocked destinations</div>
                    </div>
                    <button
                      onClick={() => {
                        soundFX.playWhistle();
                        if (confirm('Reset campaign road tour progress back to Ottawa Driveway?')) {
                          if (onResetCampaign) onResetCampaign();
                        }
                      }}
                      className="px-4 py-2 rounded-xl bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/50 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Reset Campaign
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 10. ACCOUNT & SECURITY */}
            {activeCategory === 'account' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div>
                  <h2 className="text-2xl font-black text-white">Player Identity & Profile</h2>
                  <p className="text-xs text-slate-400 pt-0.5">Customize your displayed name and tour nickname on the scoreboard.</p>
                </div>
                <div className="rounded-2xl border border-slate-800/90 bg-slate-950/60 p-5 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">Player Display Name</label>
                    <input
                      type="text"
                      value={localSettings.playerName}
                      onChange={(e) => updateField('playerName', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">Street Tour Nickname</label>
                    <input
                      type="text"
                      value={localSettings.playerNickname}
                      onChange={(e) => updateField('playerNickname', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// Checkbox Row Component matching site theme
// ----------------------------------------------------------------------
function SettingCheckboxRow({
  title,
  desc,
  checked,
  onChange,
}: {
  title: string;
  desc: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between gap-4 cursor-pointer select-none group"
    >
      <div className="space-y-0.5">
        <div className="text-xs sm:text-sm font-bold text-slate-200 group-hover:text-white transition-colors">
          {title}
        </div>
        <div className="text-[11px] sm:text-xs text-slate-400 leading-relaxed">{desc}</div>
      </div>

      {/* Amber Box with Checkmark matching site theme */}
      <div
        className={`w-6 h-6 rounded-md shrink-0 flex items-center justify-center transition-all ${
          checked
            ? 'bg-amber-400 text-slate-950 shadow-[0_0_10px_rgba(251,191,36,0.5)]'
            : 'border-2 border-slate-700 bg-slate-900/60'
        }`}
      >
        {checked && <Check className="w-4 h-4 stroke-[3]" />}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// Slider Row Component
// ----------------------------------------------------------------------
function SettingSliderRow({
  title,
  desc,
  value,
  onChange,
}: {
  title: string;
  desc: string;
  value: number;
  onChange: (val: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="text-xs sm:text-sm font-bold text-slate-200">{title}</div>
        <span className="text-xs font-mono font-black text-amber-400">{value}%</span>
      </div>
      <div className="text-[11px] text-slate-400">{desc}</div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
      />
    </div>
  );
}
