/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  SquareId,
  RuleSet,
  ShotType,
  Player,
} from './types/foursquare';
import {
  GameEngineState,
  createInitialState,
  executeHit,
  eliminatePlayer,
  handleReceiverFault,
  resetServe,
} from './services/foursquareEngine';
import { getAIDecision } from './services/aiPlayer';
import { soundFX } from './services/soundEffects';
import { evaluateBallLanding, SQUARE_CONFIGS } from './utils/courtGeometry';
import { VENUES, loadCampaignProgress, getNextLadderVenueId } from './utils/venueData';
import { VenueDef, CampaignProgress, CampaignNPC, ChatMessage } from './types/campaign';
import {
  CHARACTERS,
  CharacterDef,
  CharacterCustomization,
  getStoredCustomization,
  saveStoredCustomization,
} from './utils/characters';

// 3D Scene & UI Modals
import { ThreeCourtScene } from './components/ThreeCourtScene';
import { MainMenu } from './components/MainMenu';
import { CourtHUD } from './components/CourtHUD';
import { RefereeCallBanner } from './components/RefereeCallBanner';
import { PlayerControls } from './components/PlayerControls';
import { WaitingQueueBar } from './components/WaitingQueueBar';
import { TutorialModal } from './components/TutorialModal';
import { RulebookModal } from './components/RulebookModal';
import { KingHouseRuleModal } from './components/KingHouseRuleModal';
import { CharacterShopModal } from './components/CharacterShopModal';
import { WorldMapModal } from './components/WorldMapModal';
import { CarRideCinematic } from './components/CarRideCinematic';
import { HamburgerDropdown } from './components/HamburgerDropdown';
import { LiveChat } from './components/LiveChat';
import { MiniMap } from './components/MiniMap';
import { SignInBoardModal } from './components/SignInBoardModal';
import { NPCDialogueModal } from './components/NPCDialogueModal';
import { ArenasModal } from './components/ArenasModal';
import { SettingsModal, GameSettingsState } from './components/SettingsModal';
import { CreditsCredibilityModal } from './components/CreditsCredibilityModal';
import { StandingsModal } from './components/StandingsModal';
import { LocalMultiplayerModal } from './components/LocalMultiplayerModal';
import { OnlineMultiplayerModal } from './components/OnlineMultiplayerModal';
import { PlayNowClassicMatch } from './components/PlayNowClassicMatch';
import { MeetPlayersModal } from './components/MeetPlayersModal';
import { CharacterCustomizerModal } from './components/CharacterCustomizerModal';
import { CameraAnglesModal } from './components/CameraAnglesModal';
import { TournamentBracketModal } from './components/TournamentBracketModal';
import { EndGameStatsModal } from './components/EndGameStatsModal';
import { VenueSelectModal } from './components/VenueSelectModal';
import { ProfileModal, SavedReplay } from './components/ProfileModal';
import { FourSquareCoin } from './components/FourSquareCoin';
import { MapPin, Navigation, Footprints, Globe, Zap, LogOut } from 'lucide-react';


const SETTINGS_STORAGE_KEY = 'foursquare_game_settings_v1';

const INITIAL_SETTINGS: GameSettingsState = {
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

  cameraView: 'first_person',
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

export default function App() {
  // Application Mode: 'main_menu' | 'campaign_exploration' | 'match' | 'local_multiplayer' | 'online_multiplayer' | 'car_ride'
  const [appMode, setAppMode] = useState<
    'main_menu' | 'campaign_exploration' | 'match' | 'local_multiplayer' | 'online_multiplayer' | 'car_ride'
  >('main_menu');

  // Settings State (loaded from localStorage with fallbacks)
  const [settings, setSettings] = useState<GameSettingsState>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) return { ...INITIAL_SETTINGS, ...JSON.parse(saved) };
    } catch {
      // fallback
    }
    return INITIAL_SETTINGS;
  });

  // Campaign Progress
  const [campaignProgress, setCampaignProgress] = useState<CampaignProgress>(() => {
    return loadCampaignProgress();
  });

  // Save campaign progress whenever updated
  useEffect(() => {
    try {
      localStorage.setItem('foursquare_campaign_progress_v1', JSON.stringify(campaignProgress));
    } catch {}
  }, [campaignProgress]);

  // Save settings whenever updated and apply audio effects
  const handleUpdateSettings = (newSettings: GameSettingsState) => {
    setSettings(newSettings);
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
    } catch {}
    // Functional audio updates
    soundFX.volume = (newSettings.masterVolume / 100) * (newSettings.sfxVolume / 100);
    if (newSettings.musicEnabled && !isPlayingMusic) {
      soundFX.startMusic();
      setIsPlayingMusic(true);
    } else if (!newSettings.musicEnabled && isPlayingMusic) {
      soundFX.stopMusic();
      setIsPlayingMusic(false);
    }
  };

  // Current Venue
  const currentVenue =
    VENUES.find((v) => v.id === campaignProgress.currentVenueId) || VENUES[0];

  // Car travel state
  const [transitFromVenue, setTransitFromVenue] = useState<VenueDef>(currentVenue);
  const [transitToVenue, setTransitToVenue] = useState<VenueDef>(currentVenue);

  // Helper to get stored exploration spawn position
  const getInitialExplorationPos = (): [number, number, number] => {
    try {
      const saved = localStorage.getItem('foursquare_last_exploration_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 3) {
          return parsed as [number, number, number];
        }
      }
    } catch {}
    return [0, 0, -16.0]; // Open schoolyard gateway walking onto the blacktop!
  };

  // Player exploration position in 3D
  const [explorationPos, setExplorationPos] = useState<[number, number, number]>(() =>
    getInitialExplorationPos()
  );

  // Modals state
  const [isWorldMapOpen, setIsWorldMapOpen] = useState(false);
  const [isSignInBoardOpen, setIsSignInBoardOpen] = useState(false);
  const [activeNPC, setActiveNPC] = useState<CampaignNPC | null>(null);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isRulebookOpen, setIsRulebookOpen] = useState(false);
  const [isCreditsOpen, setIsCreditsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [isArenasOpen, setIsArenasOpen] = useState(false);
  const [isStandingsOpen, setIsStandingsOpen] = useState(false);
  const [isLocalMultiplayerOpen, setIsLocalMultiplayerOpen] = useState(false);
  const [isOnlineMultiplayerOpen, setIsOnlineMultiplayerOpen] = useState(false);
  const [isKingModalOpen, setIsKingModalOpen] = useState(false);
  const [isPlayNowOpen, setIsPlayNowOpen] = useState(false);
  const [isMeetPlayersOpen, setIsMeetPlayersOpen] = useState(false);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [isTournamentBracketOpen, setIsTournamentBracketOpen] = useState(false);
  const [tournamentStage, setTournamentStage] = useState<'quarterfinals' | 'semifinals' | 'finals' | 'champion'>('quarterfinals');

  // Match Venue Setup: Outdoor Blacktop vs Indoor Gymnasium
  const [matchVenueType, setMatchVenueType] = useState<'outdoor' | 'indoor'>('outdoor');
  const [isVenueSelectOpen, setIsVenueSelectOpen] = useState(false);
  const [pendingMatchStart, setPendingMatchStart] = useState<(() => void) | null>(null);

  // Profile & Saved Gameplay Recordings State (1-hour total storage limit)
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [savedReplays, setSavedReplays] = useState<SavedReplay[]>(() => {
    try {
      const raw = localStorage.getItem('foursquare_saved_replays_v1');
      if (raw) return JSON.parse(raw);
    } catch {}
    return [
      {
        id: 'replay-init-1',
        title: 'Quarterfinals vs Frostfang Wolf',
        timestamp: Date.now() - 3600000 * 2,
        durationSeconds: 142,
        venueName: 'Oakridge Schoolyard Outdoor Blacktop',
        opponentName: 'Frostfang Glacier Wolf',
      },
      {
        id: 'replay-init-2',
        title: 'King Hold Rally vs Gloop Slime',
        timestamp: Date.now() - 3600000 * 18,
        durationSeconds: 215,
        venueName: 'Downtown Skydeck Rooftop',
        opponentName: 'Gloop the Slime King',
      },
    ];
  });

  // Save replays to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('foursquare_saved_replays_v1', JSON.stringify(savedReplays));
    } catch {}
  }, [savedReplays]);

  // Active recording timer (enforcing max 1 hour = 3600s)
  useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => {
      setRecordingSeconds((prev) => {
        if (prev >= 3600) {
          setIsRecording(false);
          return 3600;
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRecording]);

  const handleToggleRecordGame = () => {
    if (isRecording) {
      soundFX.playCheer();
      const duration = Math.max(5, recordingSeconds);
      const newReplay: SavedReplay = {
        id: `replay-${Date.now()}`,
        title: `${appMode === 'match' ? 'Match Gameplay' : 'Campus Exploration'} Recording`,
        timestamp: Date.now(),
        durationSeconds: duration,
        venueName: currentVenue.name,
        opponentName: gameState.players.find((p) => p.id !== gameState.humanPlayerId)?.name || 'Schoolyard Challengers',
      };
      setSavedReplays((prev) => {
        const totalDuration = prev.reduce((acc, r) => acc + r.durationSeconds, 0);
        if (totalDuration + duration > 3600) {
          let remainingQuota = 3600 - duration;
          const kept = [];
          for (const item of prev) {
            if (remainingQuota >= item.durationSeconds) {
              kept.push(item);
              remainingQuota -= item.durationSeconds;
            }
          }
          return [newReplay, ...kept];
        }
        return [newReplay, ...prev];
      });
      setIsRecording(false);
      setRecordingSeconds(0);
    } else {
      soundFX.playClick();
      setRecordingSeconds(0);
      setIsRecording(true);
    }
  };

  const handleDeleteReplay = (id: string) => {
    setSavedReplays((prev) => prev.filter((r) => r.id !== id));
  };

  // High School PA Loudspeaker Announcement State
  const [paAnnouncement, setPaAnnouncement] = useState<string | null>(null);

  // Orbit mode toggle for city & school maps exploration
  const [isOrbitMode, setIsOrbitMode] = useState(false);


  // Character customization state
  const [customization, setCustomization] = useState<CharacterCustomization>(() =>
    getStoredCustomization()
  );

  // Music state
  const [currentTrack, setCurrentTrack] = useState('Serve It Straight');
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);

  // Live Spectator Chat Feed
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      sender: 'Marcus',
      text: 'Welcome to the Court Circuit! Grab the red ball and hold Square 1!',
      timestamp: Date.now() - 40000,
      avatarColor: '#38bdf8',
    },
    {
      id: 'm2',
      sender: 'Ref Miller',
      text: 'Remember: inside lines are out, receiver gets one grace fault on serve.',
      timestamp: Date.now() - 25000,
      avatarColor: '#facc15',
    },
    {
      id: 'm3',
      sender: 'Fan in Bleachers',
      text: 'Great bounce off the asphalt! Let’s see that tea kettle drop!',
      timestamp: Date.now() - 10000,
      avatarColor: '#f43f5e',
    },
  ]);

  // Four Square Match Game Engine State
  const [gameState, setGameState] = useState<GameEngineState>(() =>
    createInitialState(settings.defaultRuleSet)
  );
  const gameStateRef = useRef<GameEngineState>(gameState);
  gameStateRef.current = gameState;
  const aiTimeoutRef = useRef<number | null>(null);

  // Unlock next city on ladder when human wins match
  useEffect(() => {
    if (gameState.isGameOver && gameState.gameWinner?.id === gameState.humanPlayerId) {
      const nextId = getNextLadderVenueId(currentVenue.id);
      if (nextId) {
        setCampaignProgress((prev) => {
          const unlocked = prev.unlockedVenues.includes(nextId)
            ? prev.unlockedVenues
            : [...prev.unlockedVenues, nextId];
          const completed = prev.completedVenues.includes(currentVenue.id)
            ? prev.completedVenues
            : [...prev.completedVenues, currentVenue.id];
          return {
            ...prev,
            unlockedVenues: unlocked,
            completedVenues: completed,
          };
        });
      }
    }
  }, [gameState.isGameOver, gameState.gameWinner, gameState.humanPlayerId, currentVenue.id]);

  const humanPlayer = gameState.players.find((p) => p.id === gameState.humanPlayerId);
  const isHumanTurn =
    gameState.activeTurnPlayerId === gameState.humanPlayerId && !gameState.isGameOver && appMode === 'match';

  // Music handling
  const handleToggleMusic = () => {
    if (isPlayingMusic) {
      soundFX.stopMusic();
      setIsPlayingMusic(false);
      handleUpdateSettings({ ...settings, musicEnabled: false });
    } else {
      soundFX.startMusic();
      setIsPlayingMusic(true);
      handleUpdateSettings({ ...settings, musicEnabled: true });
    }
  };

  const handleNextTrack = () => {
    const next = soundFX.nextTrack();
    setCurrentTrack(next);
  };

  // Add Chat Message
  const handleSendChat = (text: string) => {
    const newMsg: ChatMessage = {
      id: `chat-${Date.now()}`,
      sender: humanPlayer?.name || settings.playerName || 'Player',
      text,
      timestamp: Date.now(),
      avatarColor: '#4ade80',
    };
    setChatMessages((prev) => [...prev, newMsg]);

    // Crowd reaction response after short delay
    setTimeout(() => {
      const crowdResponses = [
        'Huge rally incoming!',
        'Watch the corners!',
        'Clean line call right there!',
        'No double-bounces allowed!',
        'Ottawa is watching this showdown!',
      ];
      const reply: ChatMessage = {
        id: `crowd-${Date.now()}`,
        sender: 'Court Sideline',
        text: crowdResponses[Math.floor(Math.random() * crowdResponses.length)],
        timestamp: Date.now(),
        avatarColor: '#fbbf24',
      };
      setChatMessages((prev) => [...prev, reply]);
    }, 1800);
  };

  // Campaign Mode Exploration Launch (Plays car ride arrival dropoff animation at front school gates!)
  const handleLaunchCampaignMode = () => {
    soundFX.playClick();
    setTransitFromVenue(currentVenue);
    setTransitToVenue(currentVenue);
    setAppMode('car_ride');
  };

  const handleFunnelBallShot = () => {
    soundFX.playBallBounce(1.5);
    setCampaignProgress((prev) => ({
      ...prev,
      coins: prev.coins + 5,
    }));
    const newMsg: ChatMessage = {
      id: `funnel-${Date.now()}`,
      sender: 'Red Funnel Ball',
      text: 'BASKET! The ball swirled down Chute #1! +5 4-Square Coins awarded!',
      timestamp: Date.now(),
      avatarColor: '#dc2626',
    };
    setChatMessages((prev) => [...prev, newMsg]);
  };

  // Shot clock violation (5 seconds elapsed without striking ball)
  const handleShotClockExpired = useCallback(() => {
    const current = gameStateRef.current;
    if (current.isGameOver) return;
    soundFX.playShotClockBuzzer();
    soundFX.playRefereeWhistle();
    const offenderId = current.activeTurnPlayerId || current.players[0].id;
    const offender = current.players.find((p) => p.id === offenderId);
    const offenderName = offender?.name || 'Player';
    setGameState((prev) =>
      eliminatePlayer(
        prev,
        offenderId,
        `Shot clock violation! ${offenderName} exceeded 5s limit!`,
        'delay_of_game_out'
      )
    );
    setPaAnnouncement(`SHOT CLOCK VIOLATION! 5-second delay of game on ${offenderName}!`);
    soundFX.playSchoolPAChime();
    setTimeout(() => setPaAnnouncement(null), 5000);
  }, []);
  // Helper to speak referee calls and PA announcements out loud via Web Speech API
  const speakOutLoud = useCallback((text: string) => {
    if (!text || typeof window === 'undefined') return;
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.05;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      } catch {}
    }
  }, []);

  // Referee call trigger: speak call out loud & play PA whistle sound without visible text banner overlay
  useEffect(() => {
    // 1. NEVER play voice commentary on homepage (main menu)
    if (appMode === 'main_menu') return;

    // 2. Commentary disabled by default; user must turn commentary ON in settings
    if (!settings.enableVoiceCommentary) return;

    if (gameState.refereeCall?.message) {
      const type = gameState.refereeCall.type;
      // 3. Way less commentary: ONLY state points scored, eliminations, and crown holds!
      const isScoringEvent =
        type === 'double_bounce_out' ||
        type === 'outside_court_out' ||
        type === 'inside_line_out' ||
        type === 'delay_of_game_out' ||
        type === 'serve_fault_out' ||
        type === 'own_square_out' ||
        type === 'poaching_out' ||
        type === 'missed_return_out';

      if (isScoringEvent) {
        soundFX.playSchoolPAChime();
        soundFX.playRefereeWhistle();
        speakOutLoud(gameState.refereeCall.message);
      }
    }
  }, [gameState.refereeCall, appMode, settings.enableVoiceCommentary, speakOutLoud]);

  const handlePlayNow = () => {
    soundFX.playClick();
    setIsPlayNowOpen(true);
  };

  const handleStartClassicMatch = (homeCharId: string, awayCharId: string, venueId: string) => {
    setIsPlayNowOpen(false);
    const targetVenue = VENUES.find((v) => v.id === venueId) || currentVenue;
    setCampaignProgress((prev) => ({
      ...prev,
      currentVenueId: targetVenue.id,
      equippedCharacterId: homeCharId,
    }));

    const launch = () => {
      const newGameState = createInitialState(targetVenue.defaultRuleSet || settings.defaultRuleSet);
      // Set home character
      newGameState.players[0].characterId = homeCharId;
      const homeChar = CHARACTERS.find((c) => c.id === homeCharId);
      if (homeChar) newGameState.players[0].name = homeChar.name;

      // Set away opponent in Square 2
      newGameState.players[1].characterId = awayCharId;
      const awayChar = CHARACTERS.find((c) => c.id === awayCharId);
      if (awayChar) newGameState.players[1].name = awayChar.name;

      setGameState(newGameState);
      setAppMode('match');
      setPaAnnouncement(`Match underway at ${targetVenue.name}! First to 5 crown holds wins!`);
      soundFX.playSchoolPAChime();
      setTimeout(() => setPaAnnouncement(null), 4000);
    };

    setPendingMatchStart(() => launch);
    setIsVenueSelectOpen(true);
  };

  const handleQuickMatch = () => {
    soundFX.playClick();
    const launch = () => {
      setGameState(createInitialState(settings.defaultRuleSet));
      setAppMode('match');
      setPaAnnouncement('Quick Match underway! First to 5 crown holds on Square 1 wins!');
      soundFX.playSchoolPAChime();
      setTimeout(() => setPaAnnouncement(null), 4000);
    };
    setPendingMatchStart(() => launch);
    setIsVenueSelectOpen(true);
  };

  const handleStartCampaignCourtMatch = () => {
    soundFX.playClick();
    const launch = () => {
      setGameState(createInitialState(currentVenue.defaultRuleSet || settings.defaultRuleSet));
      setAppMode('match');
      setPaAnnouncement(`Lincoln High Showdown! First to 5 crown holds takes the title!`);
      soundFX.playSchoolPAChime();
      setTimeout(() => setPaAnnouncement(null), 4000);
    };
    setPendingMatchStart(() => launch);
    setIsVenueSelectOpen(true);
  };

  const handleStartClassmateMatch = (opponentChar?: CharacterDef) => {
    soundFX.playClick();
    const newGame = createInitialState(currentVenue.defaultRuleSet || settings.defaultRuleSet);
    if (opponentChar) {
      newGame.players[1].characterId = opponentChar.id;
      newGame.players[1].name = opponentChar.name;
    }
    setGameState(newGame);
    setAppMode('match');
    setPaAnnouncement(`Four Square Showdown vs ${opponentChar?.name || 'Classmates'}! First to 5 crown holds wins!`);
    soundFX.playSchoolPAChime();
    setTimeout(() => setPaAnnouncement(null), 4000);
  };

  const handleRematch = () => {
    const newGame = createInitialState(currentVenue.defaultRuleSet || settings.defaultRuleSet);
    if (campaignProgress.equippedCharacterId) {
      newGame.players[0].characterId = campaignProgress.equippedCharacterId;
      const c = CHARACTERS.find((ch) => ch.id === campaignProgress.equippedCharacterId);
      if (c) newGame.players[0].name = c.name;
    }
    setGameState(newGame);
    setAppMode('match');
    setPaAnnouncement('Rematch initiated! First to 5 crown holds wins!');
    soundFX.playSchoolPAChime();
    setTimeout(() => setPaAnnouncement(null), 3500);
  };

  // Travel to Venue via Road Trip Car Ride
  const handleTravelToVenue = (targetVenue: VenueDef) => {
    setTransitFromVenue(currentVenue);
    setTransitToVenue(targetVenue);
    setAppMode('car_ride');
  };

  const handleArrivalAtDestination = () => {
    setCampaignProgress((prev) => ({
      ...prev,
      currentVenueId: transitToVenue.id,
      unlockedVenues: Array.from(new Set([...prev.unlockedVenues, transitToVenue.id])),
    }));
    // Arrive right at the school entrance gateway so player walks onto the scene!
    setAppMode('campaign_exploration');
    setExplorationPos([0, 0, -16.0]);
  };

  const handleEnterTournamentMatch = (opponentCharId: string, _opponentName: string, _roundLabel: string) => {
    soundFX.playClick();
    setIsTournamentBracketOpen(false);
    handleStartClassicMatch(campaignProgress.equippedCharacterId || 'char-patch', opponentCharId, currentVenue.id);
  };

  const handleClaimTournamentReward = (coins: number) => {
    soundFX.playCheer();
    setCampaignProgress((prev) => ({
      ...prev,
      coins: prev.coins + coins,
    }));
  };

  // Sign-in Board Options
  const handleSignInOption = (option: 'campaign_match' | 'free_play' | 'practice' | 'spectate') => {
    if (option === 'campaign_match' || option === 'free_play') {
      handleStartCampaignCourtMatch();
    } else if (option === 'practice') {
      setAppMode('match');
      setGameState(createInitialState(currentVenue.defaultRuleSet || settings.defaultRuleSet));
      setGameState((prev) => ({ ...prev, activeTurnPlayerId: prev.humanPlayerId }));
    } else {
      setAppMode('match');
      setGameState(createInitialState(currentVenue.defaultRuleSet || settings.defaultRuleSet));
    }
  };

  // Start Local Multiplayer Match
  const handleStartLocalMatch = (
    configs: Array<{ id: string; name: string; characterId: string; controlsLabel: string }>
  ) => {
    setAppMode('local_multiplayer');
    const base = createInitialState(currentVenue.defaultRuleSet || settings.defaultRuleSet);
    const updatedPlayers = base.players.map((p, idx) => {
      if (idx < configs.length) {
        return {
          ...p,
          id: configs[idx].id,
          name: configs[idx].name,
          characterId: configs[idx].characterId,
          isHuman: true,
        };
      }
      return p;
    });
    setGameState({ ...base, players: updatedPlayers });
  };

  // Start Online Multiplayer Match
  const handleStartOnlineMatch = () => {
    setAppMode('online_multiplayer');
    setGameState(createInitialState('league'));
  };

  // Equip character
  const handleEquipCharacter = useCallback((charId: string) => {
    const charDef = CHARACTERS.find((c) => c.id === charId);
    if (!charDef) return;
    setCampaignProgress((prev) => ({ ...prev, equippedCharacterId: charId }));
    setGameState((prev) => ({
      ...prev,
      players: prev.players.map((p) =>
        p.id === prev.humanPlayerId
          ? { ...p, characterId: charId, archetype: charDef.archetype, name: charDef.name }
          : p
      ),
    }));
  }, []);

  // Reset Point
  const handleResetPoint = useCallback(() => {
    if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    setGameState((prev) => resetServe(prev, 'Point manually reset'));
  }, []);

  // Four Square Ball Strike action
  const handleHitBall = useCallback(
    (targetSquare: SquareId, shotType: ShotType, clickPoint?: { x: number; z: number }) => {
      const current = gameStateRef.current;
      if (current.isGameOver) return;
      if (current.activeTurnPlayerId !== current.humanPlayerId && appMode === 'match') return;

      if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);

      soundFX.playHandStrike(shotType === 'volley');

      setGameState((prev) => {
        const next = executeHit(prev, prev.humanPlayerId, targetSquare, shotType, clickPoint);
        return next;
      });
    },
    [appMode]
  );

  // Ball Flight & Physics Engine Loop
  useEffect(() => {
    let animFrame: number;
    let lastTime = performance.now();

    const updatePhysics = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.05);
      lastTime = currentTime;

      setGameState((prev) => {
        if (!prev.ballState.isLive) return prev;

        const b = { ...prev.ballState };
        b.x += b.vx * dt;
        b.z += b.vz * dt;
        b.vy -= 9.8 * dt; // Gravity
        b.y += b.vy * dt;

        // Ground collision (ball radius 0.22m, zero floating / falling through floor)
        if (b.y <= 0.22) {
          b.y = 0.22;
          b.bounceCountInCurrentSquare += 1;
          soundFX.playBallBounce();

          const landingResult = evaluateBallLanding(b.x, b.z, prev.ruleSet);

          // If bounce is inside legal square
          if (!landingResult.isOutOfBounds && landingResult.square) {
            const landingSquare = landingResult.square;
            const targetPlayer = prev.players.find((p) => p.rank === landingSquare);

            // Playworks receiver fault grace check
            if (
              prev.ruleSet === 'school' &&
              prev.ballState.isServing &&
              landingSquare === 4 &&
              landingResult.isOutsideLine &&
              targetPlayer
            ) {
              return handleReceiverFault(prev, targetPlayer, 'Serve landed on outside line in school mode');
            }

            // Check if second bounce happened in same square
            if (b.bounceCountInCurrentSquare >= 2 && targetPlayer) {
              soundFX.playAww();
              const elim = eliminatePlayer(
                prev,
                targetPlayer.id,
                `Ball double-bounced in Square ${landingSquare}!`,
                'double_bounce_out'
              );
              return elim;
            }

            // Bounce back up
            b.vy = Math.abs(b.vy) * 0.76;
            if (targetPlayer) {
              return {
                ...prev,
                ballState: b,
                activeTurnPlayerId: targetPlayer.id,
              };
            }
          } else {
            // Fault: ball touched inside line or out of bounds
            soundFX.playAww();
            const faultPlayerId = prev.ballState.lastHitterId || prev.activeTurnPlayerId || prev.players[0].id;
            const elim = eliminatePlayer(
              prev,
              faultPlayerId,
              landingResult.isInsideLine
                ? `Fault: Ball hit dividing inside line!`
                : 'Ball landed out of bounds!',
              landingResult.isInsideLine ? 'inside_line_out' : 'outside_court_out'
            );
            return elim;
          }
        }

        return { ...prev, ballState: b };
      });

      animFrame = requestAnimationFrame(updatePhysics);
    };

    animFrame = requestAnimationFrame(updatePhysics);
    return () => cancelAnimationFrame(animFrame);
  }, []);

  // AI Turn Decision (handles both live rallies and AI serves)
  useEffect(() => {
    if (gameState.isGameOver) return;
    const activePlayer = gameState.players.find((p) => p.id === gameState.activeTurnPlayerId);

    const isAiTurn =
      (appMode === 'main_menu' && activePlayer) ||
      (activePlayer && !activePlayer.isHuman && (gameState.ballState.isLive || gameState.ballState.isServing));

    if (isAiTurn && activePlayer) {
      if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);

      aiTimeoutRef.current = window.setTimeout(() => {
        const decision = getAIDecision(
          activePlayer,
          gameState.players,
          gameState.ruleSet,
          gameState.ballState.isServing
        );
        soundFX.playHandStrike();
        setGameState((prev) =>
          executeHit(prev, activePlayer.id, decision.targetSquare, decision.shotType, decision.customCoords)
        );
      }, 550);
    }

    return () => {
      if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    };
  }, [gameState.activeTurnPlayerId, gameState.ballState.isLive, gameState.ballState.isServing, appMode]);

  // Spacebar or number keys (1-4) hotkey to serve or strike during human turn
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isHumanTurn || appMode !== 'match') return;

      if (e.code === 'Space') {
        e.preventDefault();
        const isServingNow = gameState.ballState.isServing;
        const targetSquare: SquareId = isServingNow
          ? 4
          : (humanPlayer?.rank === 4 ? 1 : 4);
        handleHitBall(targetSquare, 'normal');
      } else if (['1', '2', '3', '4'].includes(e.key)) {
        const sq = Number(e.key) as SquareId;
        if (sq !== humanPlayer?.rank) {
          e.preventDefault();
          handleHitBall(sq, 'normal');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isHumanTurn, appMode, gameState.ballState.isServing, humanPlayer?.rank, handleHitBall]);

  return (
    <div className="relative w-screen h-screen bg-slate-950 overflow-hidden font-sans select-none">
      {/* 3D WebGL Canvas Layer */}
      <ThreeCourtScene
        key={`${appMode}-${matchVenueType}`}
        mode={
          appMode === 'main_menu'
            ? 'preview'
            : appMode === 'campaign_exploration'
            ? 'exploration'
            : 'match'
        }
        venue={currentVenue}
        venueType={matchVenueType}
        players={gameState.players}
        waitingQueue={gameState.waitingQueue}
        ballState={gameState.ballState}
        humanPlayerId={gameState.humanPlayerId}
        activeTurnPlayerId={gameState.activeTurnPlayerId}
        servingPlayerId={gameState.servingPlayerId}
        isHumanTurn={isHumanTurn}
        highlightedSquares={
          isHumanTurn
            ? ([1, 2, 3, 4].filter((s) => s !== humanPlayer?.rank) as SquareId[])
            : []
        }
        onSelectTargetSquare={(sqId, pt) => handleHitBall(sqId, 'normal', pt)}
        cameraView={settings.cameraView}
        explorationPlayerPos={explorationPos}
        onExplorationMove={(pos) => {
          setExplorationPos(pos);
          try {
            localStorage.setItem('foursquare_last_exploration_pos', JSON.stringify(pos));
          } catch {}
        }}
        onInteractNPC={(npc) => setActiveNPC(npc)}
        onInteractCourt={handleStartCampaignCourtMatch}
        onInteractFunnelBall={handleFunnelBallShot}
        onInteractSchoolDoor={() => setIsWorldMapOpen(true)}
        onRewardCoins={(coins) => {
          setCampaignProgress((prev) => ({
            ...prev,
            coins: prev.coins + coins,
          }));
        }}
        onStartMatchWithClassmate={handleStartClassmateMatch}
        customization={customization}
        isOrbitMode={isOrbitMode}
        onToggleOrbitMode={() => setIsOrbitMode((prev) => !prev)}
        onShotClockExpired={handleShotClockExpired}
        paAnnouncement={paAnnouncement}
      />

      {/* Main Menu Overlay matching image.png (with live 3D court preview running in background) */}
      {appMode === 'main_menu' && (
        <MainMenu
          coins={campaignProgress.coins}
          activeVenue={currentVenue}
          onCampaignMode={handleLaunchCampaignMode}
          onPlayNow={handlePlayNow}
          onQuickMatch={handleQuickMatch}
          onArenas={() => setIsArenasOpen(true)}
          onOnlineMatch={() => setIsOnlineMultiplayerOpen(true)}
          onTournament={() => {
            soundFX.playClick();
            setIsTournamentBracketOpen(true);
          }}
          onStandings={() => setIsStandingsOpen(true)}
          onMeetPlayers={() => setIsMeetPlayersOpen(true)}
          onTutorial={() => setIsTutorialOpen(true)}
          onLocker={() => setIsShopOpen(true)}
          onCustomizer={() => setIsCustomizerOpen(true)}
          onSettings={() => setIsSettingsOpen(true)}
          onCreditsCredibility={() => setIsCreditsOpen(true)}
          onOpenProfile={() => setIsProfileOpen(true)}
          isPlayingMusic={isPlayingMusic}
          onToggleMusic={handleToggleMusic}
          onNextTrack={handleNextTrack}
          currentTrackName={currentTrack}
          isCommentaryEnabled={settings.enableVoiceCommentary}
          onToggleCommentary={() => handleUpdateSettings({ ...settings, enableVoiceCommentary: !settings.enableVoiceCommentary })}
        />
      )}

      {/* Campaign Exploration & Match Overlay HUD */}
      {appMode !== 'main_menu' && appMode !== 'car_ride' && (
        <>
          {/* Top Bar Header */}
          <div className="absolute top-4 inset-x-4 z-20 pointer-events-none flex items-center justify-between">
            {/* Top Left: World Map & Current Venue (Clear World Globe Button for campaign mode) */}
            <div className="pointer-events-auto flex items-center gap-2">
              <button
                onClick={() => setIsWorldMapOpen(true)}
                title="Open Campaign World Map"
                aria-label="Open Campaign World Map"
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-slate-900/95 hover:bg-slate-800 border-2 border-amber-400 text-amber-300 flex items-center justify-center shadow-xl transition-all cursor-pointer hover:scale-105 active:scale-95 group"
              >
                <Globe className="w-6 h-6 text-amber-400 transition-transform group-hover:rotate-12" />
              </button>

              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs font-bold text-slate-200">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                <span>{currentVenue.name}</span>
              </div>

              {/* 4-Square Coin Wallet Badge */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 border border-amber-500/50 text-amber-300 font-mono text-xs font-bold shadow-lg">
                <FourSquareCoin size={16} />
                <span>{campaignProgress.coins}</span>
              </div>
            </div>

            {/* Top Center: Clean Exploration HUD only when walking around */}
            {appMode === 'campaign_exploration' && (
              <div className="pointer-events-auto flex items-center gap-3 bg-slate-900/95 border-2 border-amber-400 px-4 py-2 rounded-2xl shadow-2xl backdrop-blur-md">
                <div className="p-2 rounded-xl bg-amber-400 text-slate-950 font-black">
                  <Footprints className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-black text-amber-300 uppercase tracking-wide flex items-center gap-2">
                    <span>{currentVenue.name}</span>
                  </div>
                  <div className="text-[11px] text-slate-300 hidden sm:block font-medium">
                    WASD / Arrows to Walk • Click to Interact
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <button
                    onClick={() => setIsOrbitMode((prev) => !prev)}
                    className={`px-3 py-1.5 rounded-xl font-black text-xs uppercase shadow cursor-pointer transition-all active:scale-95 flex items-center gap-1.5 ${
                      isOrbitMode
                        ? 'bg-cyan-400 text-slate-950 border border-cyan-200 shadow-cyan-500/50'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                    }`}
                    title="Toggle Free 360 Orbit Camera (Drag to rotate, scroll to zoom)"
                  >
                    <span>🔄</span>
                    <span>Orbit: {isOrbitMode ? 'ON' : 'OFF'}</span>
                  </button>
                  <button
                    onClick={handleStartCampaignCourtMatch}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase shadow cursor-pointer transition-all active:scale-95"
                  >
                    Play Match
                  </button>
                  <button
                    onClick={() => setAppMode('main_menu')}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase shadow border border-slate-700 cursor-pointer transition-all active:scale-95"
                  >
                    Menu
                  </button>
                </div>
              </div>
            )}

            {/* Top Right: Clean Unobtrusive Header Controls */}
            <div className="pointer-events-auto flex items-center gap-2">
              <HamburgerDropdown
                cameraView={settings.cameraView}
                isMatchMode={appMode === 'match'}
                isRecording={isRecording}
                recordingSeconds={recordingSeconds}
                onToggleRecordGame={handleToggleRecordGame}
                onExitMatch={() => setAppMode('campaign_exploration')}
                onOpenCameras={() => setIsCameraModalOpen(true)}
                onOpenMusic={() => handleToggleMusic()}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onOpenTutorial={() => setIsTutorialOpen(true)}
                onOpenRulebook={() => setIsRulebookOpen(true)}
                onSaveAndExit={() => setAppMode('main_menu')}
              />
            </div>
          </div>

          {/* Minimalist In-Game Turn Pill (clean and unobtrusive at bottom center) */}
          {appMode === 'match' && isHumanTurn && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
              <div className="px-5 py-2 rounded-full bg-slate-950/85 backdrop-blur-md border border-amber-400/50 text-xs font-black text-amber-300 flex items-center gap-2.5 shadow-2xl">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>
                  {gameState.ballState.isServing
                    ? 'YOUR SERVE • Click Square 4 or Press SPACE / [4]'
                    : 'YOUR TURN • Click Target Square or Press SPACE / [1-4]'}
                </span>
              </div>
            </div>
          )}

          {/* Exploration Mode Overlays (Only shown when exploring the city/school, NEVER during matches) */}
          {appMode === 'campaign_exploration' && (
            <>
              {/* Bottom Left: Live-Style Spectator Chat */}
              <LiveChat
                venueId={currentVenue.id}
                messages={chatMessages}
                onSendMessage={handleSendChat}
              />

              {/* Bottom Right: Mini-Map */}
              <MiniMap
                mode="exploration"
                venue={currentVenue}
                playerPosition={explorationPos}
                players={gameState.players}
                activeTurnPlayerId={gameState.activeTurnPlayerId || undefined}
              />
            </>
          )}
        </>
      )}

      {/* Car Ride Cinematic Screen */}
      {appMode === 'car_ride' && (
        <CarRideCinematic
          fromVenue={transitFromVenue}
          toVenue={transitToVenue}
          canSkip={campaignProgress.completedVenues.includes(transitToVenue.id)}
          onArrival={handleArrivalAtDestination}
          currentTrackName={currentTrack}
          onNextTrack={handleNextTrack}
          customization={customization}
        />
      )}

      {/* World Map Modal */}
      <WorldMapModal
        isOpen={isWorldMapOpen}
        onClose={() => setIsWorldMapOpen(false)}
        progress={campaignProgress}
        onSelectVenue={handleTravelToVenue}
        onResumeExploration={() => {
          setIsWorldMapOpen(false);
          setAppMode('campaign_exploration');
        }}
      />

      {/* Sign-In Board Corkboard Modal */}
      <SignInBoardModal
        isOpen={isSignInBoardOpen}
        onClose={() => setIsSignInBoardOpen(false)}
        venue={currentVenue}
        onSelectOption={handleSignInOption}
      />

      {/* NPC Dialogue Interaction Modal */}
      <NPCDialogueModal
        npc={activeNPC}
        onClose={() => setActiveNPC(null)}
        onChallengePractice={() => {
          const char = activeNPC ? CHARACTERS.find((c) => c.id === activeNPC.characterId) : undefined;
          setActiveNPC(null);
          handleStartClassmateMatch(char);
        }}
      />

      {/* Character Locker & Shop Modal */}
      <CharacterShopModal
        isOpen={isShopOpen}
        coins={campaignProgress.coins}
        onUpdateCoins={(newCoins) =>
          setCampaignProgress((prev) => ({ ...prev, coins: newCoins }))
        }
        onEquipCharacter={handleEquipCharacter}
        onClose={() => setIsShopOpen(false)}
      />

      {/* Arenas Modal */}
      <ArenasModal
        isOpen={isArenasOpen}
        onClose={() => setIsArenasOpen(false)}
        unlockedVenueIds={campaignProgress.unlockedVenues}
        activeVenueId={currentVenue.id}
        onSelectVenue={(v) => {
          setCampaignProgress((p) => ({ ...p, currentVenueId: v.id }));
          setIsArenasOpen(false);
          setAppMode('campaign_exploration');
        }}
      />

      {/* Standings & Tour Notebook Modal */}
      <StandingsModal
        isOpen={isStandingsOpen}
        onClose={() => setIsStandingsOpen(false)}
        progress={campaignProgress}
      />

      {/* Settings Modal matching Image 2 */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onResetCampaign={() => {
          const resetProg: CampaignProgress = {
            currentVenueId: 'driveway',
            unlockedVenues: ['driveway'],
            completedVenues: [],
            coins: 70,
            venueRecords: {},
            equippedCharacterId: 'char-patch',
          };
          setCampaignProgress(resetProg);
          setAppMode('main_menu');
          setIsSettingsOpen(false);
        }}
      />

      {/* Camera Angles View Modal */}
      <CameraAnglesModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        cameraView={settings.cameraView}
        onSelectCameraView={(view) => handleUpdateSettings({ ...settings, cameraView: view })}
      />

      {/* Credits & Credibility Modal matching Image 1 */}
      <CreditsCredibilityModal
        isOpen={isCreditsOpen}
        onClose={() => setIsCreditsOpen(false)}
      />

      {/* Interactive Step-by-Step Tutorial Modal */}
      <TutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        onStartPracticeMatch={() => {
          handleSignInOption('practice');
        }}
      />

      {/* Official 10-Page Rulebook Modal */}
      <RulebookModal
        isOpen={isRulebookOpen}
        onClose={() => setIsRulebookOpen(false)}
      />

      {/* King House Rule Customization Modal */}
      <KingHouseRuleModal
        isOpen={isKingModalOpen}
        activeRule={gameState.activeHouseRule}
        onSelectRule={(r) => {
          setGameState((p) => ({ ...p, activeHouseRule: r }));
          setIsKingModalOpen(false);
        }}
        onClose={() => setIsKingModalOpen(false)}
      />

      {/* Online Multiplayer Lobby Modal */}
      <OnlineMultiplayerModal
        isOpen={isOnlineMultiplayerOpen}
        onClose={() => setIsOnlineMultiplayerOpen(false)}
        onStartOnlineMatch={() => {
          setIsOnlineMultiplayerOpen(false);
          setAppMode('match');
          setGameState(createInitialState(settings.defaultRuleSet));
        }}
      />

      {/* Local Pass & Play Multiplayer Modal */}
      <LocalMultiplayerModal
        isOpen={isLocalMultiplayerOpen}
        onClose={() => setIsLocalMultiplayerOpen(false)}
        onStartLocalMatch={() => {
          setIsLocalMultiplayerOpen(false);
          setAppMode('match');
          setGameState(createInitialState(settings.defaultRuleSet));
        }}
      />

      {/* Play Now: KO Classic Match Menu (Matching second pasted image) */}
      <PlayNowClassicMatch
        isOpen={isPlayNowOpen}
        onClose={() => setIsPlayNowOpen(false)}
        onStartMatch={handleStartClassicMatch}
        activeVenueId={currentVenue.id}
      />

      {/* Meet the Players 3D Renders with Stats & Qualities (Matching first pasted image) */}
      <MeetPlayersModal
        isOpen={isMeetPlayersOpen}
        onClose={() => setIsMeetPlayersOpen(false)}
        onEquipPlayer={handleEquipCharacter}
      />

      {/* Character Customizer Modal */}
      <CharacterCustomizerModal
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        currentCustomization={customization}
        onSave={(newCust: CharacterCustomization) => {
          setCustomization(newCust);
          saveStoredCustomization(newCust);
          setGameState((prev) => ({
            ...prev,
            players: prev.players.map((p) =>
              p.id === prev.humanPlayerId
                ? { ...p, name: newCust.playerNickname || p.name }
                : p
            ),
          }));
        }}
      />

      {/* Tournament Bracket Modal */}
      <TournamentBracketModal
        isOpen={isTournamentBracketOpen}
        onClose={() => setIsTournamentBracketOpen(false)}
        onEnterMatch={handleEnterTournamentMatch}
        playerCustomization={customization}
        equippedCharId={campaignProgress.equippedCharacterId || 'char-patch'}
        tournamentStage={tournamentStage}
        onTournamentStageChange={(stage) => setTournamentStage(stage)}
        onClaimReward={handleClaimTournamentReward}
      />

      {/* Pre-Match Venue Select Modal (Outdoor Blacktop vs Indoor Gymnasium) */}
      <VenueSelectModal
        isOpen={isVenueSelectOpen}
        selectedVenueType={matchVenueType}
        onSelectVenueType={(v: 'outdoor' | 'indoor') => setMatchVenueType(v)}
        onConfirm={() => {
          setIsVenueSelectOpen(false);
          if (pendingMatchStart) {
            pendingMatchStart();
            setPendingMatchStart(null);
          }
        }}
        onCancel={() => {
          setIsVenueSelectOpen(false);
          setPendingMatchStart(null);
        }}
      />

      {/* Post-Game Victory & Complete Stats Modal */}
      <EndGameStatsModal
        isOpen={gameState.isGameOver}
        winner={gameState.gameWinner}
        players={gameState.players}
        humanPlayerId={gameState.humanPlayerId}
        totalRounds={gameState.totalRounds}
        onRematch={handleRematch}
        onSwitchVenue={() => {
          setIsVenueSelectOpen(true);
          setPendingMatchStart(() => () => handleRematch());
        }}
        onReturnToMenu={() => {
          setAppMode('main_menu');
          setGameState(createInitialState(settings.defaultRuleSet));
        }}
      />

      {/* Athlete Profile & Replay Theater Modal (1-hour limit) */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        equippedCharacter={
          CHARACTERS.find((c) => c.id === campaignProgress.equippedCharacterId) || CHARACTERS[0]
        }
        customization={customization}
        campaignProgress={campaignProgress}
        savedReplays={savedReplays}
        onDeleteReplay={handleDeleteReplay}
        onOpenCustomizer={() => {
          setIsProfileOpen(false);
          setIsCustomizerOpen(true);
        }}
        onChallengeFriend={(charId: string) => {
          const charDef = CHARACTERS.find((c) => c.id === charId);
          setIsProfileOpen(false);
          handleStartClassmateMatch(charDef);
        }}
      />
    </div>
  );
}
