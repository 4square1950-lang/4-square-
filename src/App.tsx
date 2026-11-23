import { TRAINING_DRILLS, trainingTotals } from './services/training';
import { IMAGE_LIMIT, VIDEO_SECONDS_LIMIT } from './services/profileMedia';
import { readGamepad } from './services/gamepad';
import { returnReach } from './services/returnReach';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  SquareId,
  RuleSet,
  ShotType,
  Player,
} from './types/foursquare';
import {
  GameEngineState,
  createInitialState,
  createSoloLineup,
  executeHit,
  eliminatePlayer,
  advanceBall,
  BOT_RETURN_DELAY_MS,
  incomingReturn,
  resetServe,
} from './services/foursquareEngine';
import { getAIDecision } from './services/aiPlayer';
import { createLocalMatch, LOCAL_SEATS, localShotTarget } from './services/localMultiplayer';
import type { MatchSnapshot } from './services/onlineProtocol';
import { useOnlineMatch } from './services/useOnlineMatch';
import { soundFX } from './services/soundEffects';
import { recordMatchResult } from './services/matchHistory';
import { preparePlayerSession } from './services/marketClient';
import { CAMPUS_ARRIVAL, CAMPUS_LIMITS } from './utils/campusLayout';
import { LADDER_VENUES, VENUES, createCampaignProgress, loadCampaignProgress, saveCampaignProgress, getNextLadderVenueId, recordCampaignWin } from './utils/venueData';
import { profileLevel } from './services/profileProgress';
import { VenueDef, CampaignProgress, CampaignNPC, ChatMessage, TournamentStage, VictoryEdition } from './types/campaign';
import {
  CHARACTERS,
  CharacterDef,
  CharacterCustomization,
  DEFAULT_CUSTOMIZATION,
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
import { RulebookModal, ControlGuide } from './components/RulebookModal';
import { KingHouseRuleModal } from './components/KingHouseRuleModal';
import { MarketModal } from './components/MarketModal';
import { CharacterShopModal } from './components/CharacterShopModal';
import { WorldMapModal } from './components/WorldMapModal';
import { CarRideCinematic } from './components/CarRideCinematic';
import { LiveChat } from './components/LiveChat';
import { MiniMap } from './components/MiniMap';
import { SignInBoardModal } from './components/SignInBoardModal';
import { NPCDialogueModal } from './components/NPCDialogueModal';
import { ArenasModal } from './components/ArenasModal';
import { SettingsModal, GameSettingsState } from './components/SettingsModal';
import { CreditsCredibilityModal } from './components/CreditsCredibilityModal';
import { StandingsModal } from './components/StandingsModal';
import { OnlineMultiplayerModal } from './components/OnlineMultiplayerModal';
import { PlayNowClassicMatch } from './components/PlayNowClassicMatch';
import { MeetPlayersModal } from './components/MeetPlayersModal';
import { CharacterCustomizerModal } from './components/CharacterCustomizerModal';
import { CameraAnglesModal } from './components/CameraAnglesModal';
import { TournamentBracketModal, TOURNAMENT_ROUNDS } from './components/TournamentBracketModal';
import { EndGameStatsModal } from './components/EndGameStatsModal';
import { VenueSelectModal } from './components/VenueSelectModal';
import { ProfileModal, SavedReplay } from './components/ProfileModal';
import type { CourtWeather, SoloSetup } from './services/soloSetup';
import { compareCupPlayers } from './services/tournamentBracket';
import { deleteReplayVideo, saveReplayVideo } from './services/replayVideo';
import { FourSquareCoin } from './components/FourSquareCoin';
import { MapPin, Navigation, Globe, Zap, LogOut, Pause, Play, Camera, Music2, Settings2, Gamepad2, BookOpen, CircleHelp, Video, Coins, RotateCcw, Home } from 'lucide-react';


const SETTINGS_STORAGE_KEY = 'foursquare_game_settings_v2';
const RETURN_BUFFER_SECONDS = 0.26;

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

export default function App() {
  // Application Mode: 'main_menu' | 'campaign_exploration' | 'match' | 'local_multiplayer' | 'online_multiplayer' | 'car_ride'
  const [appMode, setAppMode] = useState<
    'main_menu' | 'campaign_exploration' | 'match' | 'local_multiplayer' | 'online_multiplayer' | 'car_ride'
  >('main_menu');

  // Settings State (loaded from localStorage with fallbacks)
  const [settings, setSettings] = useState<GameSettingsState>(() => {
    try {
      const savedV2 = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (savedV2) return { ...INITIAL_SETTINGS, ...JSON.parse(savedV2) };
      const savedV1 = localStorage.getItem('foursquare_game_settings_v1');
      if (savedV1) {
        const parsed = JSON.parse(savedV1);
        return {
          ...INITIAL_SETTINGS,
          ...parsed,
          cameraView: parsed.cameraView === 'first_person' ? 'third_person' : (parsed.cameraView || 'third_person'),
        };
      }
    } catch {
      // fallback
    }
    return INITIAL_SETTINGS;
  });

  // Campaign Progress
  const [campaignProgress, setCampaignProgress] = useState<CampaignProgress>(() => {
    return loadCampaignProgress();
  });

  useEffect(() => {
    void preparePlayerSession(settings.showInStandings).catch(() => {});
  }, [settings.showInStandings]);

  const [verifiedXp,setVerifiedXp] = useState(0);
  const campaignLevel = profileLevel(verifiedXp + campaignProgress.completedVenues.length*750 +
    new Set(campaignProgress.lessonsCompleted ?? []).size*250 + trainingTotals(campaignProgress.completedDrills).xp).level;
  const playtestVenues = import.meta.env.DEV ? VENUES.map(({id})=>id) : [...new Set([campaignProgress.currentVenueId,...campaignProgress.unlockedVenues.filter((id) =>
    Math.floor(LADDER_VENUES.indexOf(id)/3) <= campaignLevel)])];

  // Save campaign progress whenever updated
  useEffect(() => {
    saveCampaignProgress(campaignProgress);
  }, [campaignProgress]);

  // Main Menu Video / Animation toggle (Always enabled by default for live 3D match action)
  const [disableMenuVideo, setDisableMenuVideo] = useState<boolean>(false);

  const handleToggleDisableMenuVideo = () => {
    setDisableMenuVideo((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('foursquare_disable_menu_video', String(next));
      } catch {}
      return next;
    });
  };

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

  // Helper to get stored exploration spawn position (defaults to backyard court behind school)
  const getInitialExplorationPos = (): [number, number, number] => {
    try {
      const saved = localStorage.getItem('foursquare_last_exploration_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 3 && Number.isFinite(parsed[0]) && Number.isFinite(parsed[2]) &&
          parsed[0] > CAMPUS_LIMITS.left && parsed[0] < CAMPUS_LIMITS.right &&
          parsed[2] > CAMPUS_LIMITS.front && parsed[2] < CAMPUS_LIMITS.rear) {
          return parsed as [number, number, number];
        }
      }
    } catch {}
    return [...CAMPUS_ARRIVAL];
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
  const [shopPage, setShopPage] = useState<'shop' | 'auctions'>('shop');
  const [isArenasOpen, setIsArenasOpen] = useState(false);
  const [isStandingsOpen, setIsStandingsOpen] = useState(false);
  const [leagueView, setLeagueView] = useState<'Stats' | 'Standings' | 'Clans'>('Standings');
  const openLeague = (view: typeof leagueView) => { setLeagueView(view); setIsStandingsOpen(true); };
  const [isMultiplayerOpen, setIsMultiplayerOpen] = useState(false);
  const [onlineCup, setOnlineCup] = useState<{ room: string; final: boolean }>();
  const [isKingModalOpen, setIsKingModalOpen] = useState(false);
  const [isPlayNowOpen, setIsPlayNowOpen] = useState(false);
  const [isMeetPlayersOpen, setIsMeetPlayersOpen] = useState(false);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [isLockerOpen, setIsLockerOpen] = useState(false);
  const [isTournamentBracketOpen, setIsTournamentBracketOpen] = useState(false);
  const tournamentMatch = useRef<{ id: string; stage: TournamentStage } | null>(null);
  const soloLineup = useRef<{ controlled?: string; opponent?: string; ids?: string[]; randomSeat?: boolean } | null>(null);
  const [weather, setWeather] = useState<CourtWeather>('Clear');
  const [matchBall, setMatchBall] = useState<SoloSetup['ball']>();
  const [pauseOpen, setPauseOpen] = useState(false);
  const seenTournamentResult = useRef<string | null>(null);
  const [victoryEdition, setVictoryEdition] = useState<VictoryEdition>();

  // Match Venue Setup: Outdoor Blacktop vs Indoor Gymnasium
  const [matchVenueType, setMatchVenueType] = useState<'outdoor' | 'indoor'>('outdoor');
  const [isVenueSelectOpen, setIsVenueSelectOpen] = useState(false);
  const [pendingMatchStart, setPendingMatchStart] = useState<(() => void) | null>(null);

  const [isProfileOpen, setIsProfileOpen] = useState(() => new URLSearchParams(window.location.search).get('screen')==='profile');
  const openProfile = () => {
    const address = new URL(window.location.href);
    address.searchParams.set('screen','profile');
    if (address.href !== window.location.href) window.history.pushState(null, '', address);
    setIsProfileOpen(true);
  };
  const leaveProfile = () => {
    setIsProfileOpen(false);
    const address = new URL(window.location.href);
    address.searchParams.delete('screen');
    window.history.replaceState(null,'',address);
  };
  useEffect(() => {
    const syncProfile = () => setIsProfileOpen(new URLSearchParams(window.location.search).get('screen') === 'profile');
    window.addEventListener('popstate', syncProfile);
    return () => window.removeEventListener('popstate', syncProfile);
  }, []);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const captureFrame = useRef<(() => Promise<Blob | null>) | null>(null);
  const recordingMarker = useRef<number | undefined>(undefined)
  const captureScreenshot = async () => {
    if (savedReplays.filter((item)=>item.image).length >= IMAGE_LIMIT) {setPaAnnouncement('Image library is full.');return;}
    try {
      const data = await captureFrame.current?.();
      if (!data) throw Error();
      const id = crypto.randomUUID();
      await saveReplayVideo(id, data);
      setSavedReplays((before)=>[{id,title:'Screenshot',venueName:sceneVenue.name,durationSeconds:0,timestamp:Date.now(),image:true},...before]);
      setPaAnnouncement('Screenshot saved to your profile.');
    } catch { setPaAnnouncement('Screenshot could not be saved.'); }
  };
  const [savedReplays, setSavedReplays] = useState<SavedReplay[]>(() => {
    try {
      const list: SavedReplay[] = JSON.parse(localStorage.getItem('foursquare_saved_replays_v1') ?? '[]');
      return list.filter(({ id }) => !id.startsWith('replay-init-'));
    } catch { return []; }
  });

  useEffect(() => {
    try { localStorage.setItem('foursquare_saved_replays_v1', JSON.stringify(savedReplays)); } catch {}
  }, [savedReplays]);
  useEffect(() => {
    if ((appMode === 'main_menu' || appMode === 'car_ride') && recorder.current?.state === 'recording') {
      recorder.current.stop();
    }
  }, [appMode]);

  useEffect(() => {
    if (!isRecording) return;
    const start = Date.now();
    const interval = window.setInterval(() => {
      const seconds = Math.floor((Date.now() - start) / 1000);
      setRecordingSeconds(seconds);
      if (seconds >= VIDEO_SECONDS_LIMIT && recorder.current?.state === 'recording') recorder.current.stop();
    }, 1000);
    return () => clearInterval(interval);
  }, [isRecording]);

  const handleToggleRecordGame = () => {
    if (recorder.current) { if (recorder.current.state === 'recording') recorder.current.stop(); return; }
    const canvas = document.querySelector<HTMLCanvasElement>('[data-game-canvas] canvas');
    const quota = VIDEO_SECONDS_LIMIT - savedReplays.reduce((total, item) => total + (item.video ? item.durationSeconds : 0), 0);
    if (!canvas?.captureStream || typeof MediaRecorder === 'undefined' || quota <= 0) {
      setPaAnnouncement(quota <= 0 ? 'Replay storage is full. Delete a replay to record again.' : 'Recording is unavailable.');
      return;
    }
    const stream = canvas.captureStream(24);
    try {
      const capture = new MediaRecorder(stream, { videoBitsPerSecond: 2_000_000 });
      const chunks: Blob[] = [];
      const timestamp = Date.now();
      recordingMarker.current = undefined;
      const title = appMode === 'match' ? 'Match replay' : 'Campus replay';
      const venueName = sceneVenue.name;
      capture.ondataavailable = ({ data }) => { if (data.size) chunks.push(data); };
      const limit = window.setTimeout(() => { if (capture.state === 'recording') capture.stop(); }, quota * 1000);
      capture.onstop = async () => {
        window.clearTimeout(limit);
        stream.getTracks().forEach((track) => track.stop());
        const id = `replay-${timestamp}`;
        const durationSeconds = Math.min(quota, Math.max(1, Math.round((Date.now() - timestamp) / 1000)));
        try {
          if (!chunks.length) throw new Error();
          await saveReplayVideo(id, new Blob(chunks, { type: capture.mimeType }));
          setSavedReplays((previous) => [{ id, title, timestamp, durationSeconds, venueName, video: true, highlight:recordingMarker.current }, ...previous]);
          setPaAnnouncement('Replay saved.');
          soundFX.playCheer();
        } catch { setPaAnnouncement('Recording could not be saved.'); }
        finally {
          recorder.current = null;
          setIsRecording(false);
          setRecordingSeconds(0);
        }
      };
      capture.start(1000);
      recorder.current = capture;
      setIsRecording(true);
    } catch {
      stream.getTracks().forEach((track) => track.stop());
      setPaAnnouncement('Recording is unavailable.');
    }
  };

  const handleDeleteReplay = (id: string) => {
    void deleteReplayVideo(id).then(() => setSavedReplays((previous) => previous.filter((item) => item.id !== id)))
      .catch(() => setPaAnnouncement('Replay could not be deleted.'));
  };
  // High School PA Loudspeaker Announcement State
  const [paAnnouncement, setPaAnnouncement] = useState<string | null>(null);

  // Orbit mode toggle for city & school maps exploration
  const [isOrbitMode, setIsOrbitMode] = useState(false);


  // Character customization state
  const [customization, setCustomization] = useState<CharacterCustomization>(() =>
    getStoredCustomization()
  );
  const playerName = customization.playerNickname?.trim() || 'Player';
  const saveAppearance = (next: CharacterCustomization) => {
    saveStoredCustomization(next);
    setCustomization(next);
  };
  useEffect(() => {
    const sync = (event:StorageEvent) => {
      if (event.key==='foursquare_customization_v1') setCustomization(getStoredCustomization());
    };
    window.addEventListener('storage',sync);
    return () => window.removeEventListener('storage',sync);
  },[]);

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
  const [soloMatchVenue, setSoloMatchVenue] = useState<VenueDef | null>(null);
  const [campaignMatch, setCampaignMatch] = useState<{ venue: VenueDef; opponentId?: string } | null>(null);
  const recordedCampaignResult = useRef<string | null>(null);
  const gameStateRef = useRef<GameEngineState>(gameState);
  gameStateRef.current = gameState;
  const bufferedShot = useRef<{
    incomingCall: GameEngineState['refereeCall'];
    playerId: string;
    targetSquare: SquareId;
    shotType: ShotType;
    point?: { x: number; z: number };
    expiresAt: number;
  } | null>(null);
  const aiTimeoutRef = useRef<number | null>(null);
  const [onlineNotice, setOnlineNotice] = useState('');
  const { court: onlineCourt, connect: connectOnlineMatch, hit: sendOnlineHit, rematch: requestOnlineRematch, leave: leaveOnlineMatch } =
    useOnlineMatch(setGameState, () => {
      setOnlineNotice('Lost connection to the online court.');
      setAppMode('main_menu');
      setGameState(createInitialState(settings.defaultRuleSet));
    });
  const isOnlineMatch = appMode === 'online_multiplayer';
  const [cupSeconds,setCupSeconds] = useState(0);
  useEffect(()=>{
    const end=onlineCourt?.endsAt;
    if (!isOnlineMatch || !end) return;
    const update=()=>setCupSeconds(Math.max(0,Math.ceil((end-Date.now())/1000)));
    update();
    const timer=window.setInterval(update,250);
    return ()=>window.clearInterval(timer);
  },[isOnlineMatch,onlineCourt?.endsAt]);
  useEffect(() => {
    let active = true;
    void preparePlayerSession().then(()=>fetch('/api/player/profile',{cache:'no-store'})).then((response)=>response.ok?response.json():null)
      .then((profile)=>{if(active&&profile)setVerifiedXp(profile.xp);}).catch(()=>{});
    return ()=>{active=false;};
  },[isOnlineMatch]);
  const isLocalMatch = appMode === 'local_multiplayer';
  const localPicks = useRef<string[]>([]);
  const sceneVenue = isOnlineMatch
    ? (VENUES.find(({ id }) => id === onlineCourt?.venueId) ?? currentVenue)
    : (appMode === 'match' ? soloMatchVenue ?? currentVenue : currentVenue);
  const recordedOnlineCup = useRef<string | null>(null);
  useEffect(() => {
    const winner = gameState.gameWinner;
    if (!isOnlineMatch || !onlineCup?.final || !gameState.isGameOver || winner?.id !== gameState.humanPlayerId ||
      recordedOnlineCup.current === onlineCup.room) return;
    recordedOnlineCup.current = onlineCup.room;
    const edition: VictoryEdition = { winner: winner.name, event: 'Tournament', venue: sceneVenue.name, date: new Date().toISOString() };
    setCampaignProgress((previous) => ({ ...previous, victoryEdition: edition, tournamentTitles: (previous.tournamentTitles ?? 0) + 1 }));
    setVictoryEdition(edition);
    setIsCreditsOpen(true);
  }, [isOnlineMatch, onlineCup, gameState, sceneVenue.name]);
  useEffect(() => {
    if (!gameState.isGameOver || (appMode !== 'match' && !isLocalMatch)) return;
    recordMatchResult(gameState, isLocalMatch ? 'Local' : campaignMatch ? 'Campaign' : 'Solo', sceneVenue.name);
  }, [gameState, appMode, isLocalMatch, campaignMatch, sceneVenue.name]);
  useEffect(() => {
    if (!isOnlineMatch) leaveOnlineMatch();
  }, [isOnlineMatch, leaveOnlineMatch]);

  // Unlock next city on ladder when human wins match
  useEffect(() => {
    const winner = gameState.gameWinner;
    if (appMode !== 'match' || !campaignMatch || !gameState.isGameOver ||
      !winner || winner.id !== gameState.humanPlayerId || recordedCampaignResult.current === gameState.matchId) return;
    recordedCampaignResult.current = gameState.matchId;
    const completedAt = new Date().toISOString();
    const edition: VictoryEdition | undefined = getNextLadderVenueId(campaignMatch.venue.id) ? undefined
      : { winner: winner.name, event: 'Circuit', venue: campaignMatch.venue.name, date: completedAt };
    if (edition) {
      setVictoryEdition(edition);
      setIsCreditsOpen(true);
    }
    setCampaignProgress((previous) => ({
      ...recordCampaignWin(previous, campaignMatch.venue, winner.crownHolds, gameState.coins, completedAt),
      victoryEdition: edition ?? previous.victoryEdition,
    }));
  }, [appMode, campaignMatch, gameState.isGameOver, gameState.gameWinner, gameState.humanPlayerId, gameState.matchId, gameState.coins]);

  useEffect(() => {
    const entry = tournamentMatch.current;
    const winner = gameState.gameWinner;
    if (!entry || !gameState.isGameOver || entry.id !== gameState.matchId ||
      !winner || seenTournamentResult.current === entry.id) return;
    seenTournamentResult.current = entry.id;
    const round = TOURNAMENT_ROUNDS.indexOf(entry.stage);
    const stage = TOURNAMENT_ROUNDS[round + 1];
    if (!stage) return;
    const qualifiers = [...gameState.players, ...gameState.waitingQueue]
      .sort((a, b) => compareCupPlayers(a, b, winner.id))
      .slice(0, stage === 'champion' ? 1 : 2);
    if (!qualifiers.some(({ id }) => id === gameState.humanPlayerId)) {
      setCampaignProgress((previous) => ({ ...previous, tournamentEliminated: true }));
      return;
    }
    const edition: VictoryEdition | undefined = stage === 'champion'
      ? { winner: winner.name, event: 'Tournament', venue: sceneVenue.name, date: new Date().toISOString() } : undefined;
    setCampaignProgress((previous) => ({
      ...previous, tournamentStage: stage, victoryEdition: edition ?? previous.victoryEdition,
      tournamentQualifiers: [...(previous.tournamentQualifiers ?? []).slice(0, round), qualifiers.map(({ characterId }) => characterId)],
      coins: previous.coins + (edition ? 150 : 0),
      tournamentTitles: (previous.tournamentTitles ?? 0) + (edition ? 1 : 0),
    }));
    if (edition) {
      setVictoryEdition(edition);
      setIsCreditsOpen(true);
    }
  }, [gameState, sceneVenue.name]);

  const humanPlayer = gameState.players.find((p) => p.id === gameState.humanPlayerId);
  const currentKing = gameState.players.find((p) => p.rank === 1);
  const localTurn = isLocalMatch ? LOCAL_SEATS.find(({ id }) => id === gameState.activeTurnPlayerId) : undefined;
  const controlledPlayer = localTurn ? gameState.players.find(({ id }) => id === localTurn.id) : humanPlayer;
  const scenePlayers = useMemo(() => isLocalMatch
    ? gameState.players.map((player) => ({ ...player, isHuman: false }))
    : gameState.players, [isLocalMatch, gameState.players]);
  const [isMatchIntroActive, setIsMatchIntroActive] = useState(false);
  const isMatchMode = appMode === 'match' || appMode === 'local_multiplayer' || appMode === 'online_multiplayer';
  const canPause = isMatchMode || appMode === 'campaign_exploration';
  const [pauseControls, setPauseControls] = useState(false);
  const pauseSubmenu = isSettingsOpen || isCameraModalOpen || isTutorialOpen || isRulebookOpen || isWorldMapOpen || isSignInBoardOpen;
  const isMatchPlaying = !pauseOpen && !isMatchIntroActive && isMatchMode;
  useEffect(() => {
    if (!canPause) { setPauseOpen(false); return; }
    if (pauseSubmenu || isProfileOpen || activeNPC) return;
    const toggle = (event: KeyboardEvent) => {
      if (event.code === 'Escape' && !event.repeat && !(event.target as HTMLElement)?.closest('input,textarea,select')) {
        setPauseControls(false);
        setPauseOpen((value) => !value);
      }
    };
    window.addEventListener('keydown', toggle);
    return () => window.removeEventListener('keydown', toggle);
  }, [canPause, pauseSubmenu, isProfileOpen, activeNPC]);
  const isHumanTurn =
    !gameState.isGameOver && isMatchPlaying && (isLocalMatch
      ? Boolean(localTurn)
      : gameState.activeTurnPlayerId === gameState.humanPlayerId && (appMode === 'match' || isOnlineMatch));
  const incoming = (appMode === 'match' || isOnlineMatch) && isMatchPlaying ? incomingReturn(gameState) : undefined;
  const canQueueReturn = incoming?.player.id === gameState.humanPlayerId && incoming.seconds <= RETURN_BUFFER_SECONDS;
  const receivingSoon = incoming?.player.id === gameState.humanPlayerId;
  const [returnCue, setReturnCue] = useState<{ text: string; call: GameEngineState['refereeCall']; afterBounce: boolean }>();
  const feet = useRef<{ id: string; x: number; z: number; reaching: boolean }>(null);
  const trackFootwork = useCallback((pose: NonNullable<typeof feet.current>) => { feet.current = pose; }, []);
  const canReach = useCallback((state: GameEngineState) => {
    const pose = feet.current;
    const ball = state.ballState;
    if (!pose || pose.id !== state.humanPlayerId || !ball.isLive || !ball.hasBouncedThisPlay) return true;
    return returnReach(ball, pose) === 'ready';
  }, []);

  useEffect(() => {
    const shot = bufferedShot.current;
    if (!shot) return;
    if (appMode !== 'match' || gameState.refereeCall !== shot.incomingCall || performance.now() > shot.expiresAt) {
      bufferedShot.current = null;
      return;
    }
    if (gameState.activeTurnPlayerId !== shot.playerId || !gameState.ballState.hasBouncedThisPlay || !canReach(gameState)) return;
    bufferedShot.current = null;
    if (!isMatchPlaying) return;
    setGameState((state) => state.refereeCall === shot.incomingCall && state.activeTurnPlayerId === shot.playerId
      ? executeHit(state, shot.playerId, shot.targetSquare, shot.shotType, shot.point)
      : state);
  }, [appMode, gameState, canReach, isMatchPlaying]);

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
    setIsWorldMapOpen(true);
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
    if (current.isGameOver || !current.ballState.isServing || !current.activeTurnPlayerId) return;
    soundFX.playShotClockBuzzer();
    const offenderId = current.activeTurnPlayerId;
    setGameState((prev) =>
      prev.ballState.isServing && prev.activeTurnPlayerId === offenderId ? eliminatePlayer(
        prev,
        offenderId,
        'Serve clock expired',
        'delay_of_game_out'
      ) : prev
    );
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
    if (!isMatchMode) return;

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
        speakOutLoud(gameState.refereeCall.message);
      }
    }
  }, [gameState.refereeCall, isMatchMode, settings.enableVoiceCommentary, speakOutLoud]);

  const handlePlayNow = () => {
    soundFX.playClick();
    setIsPlayNowOpen(true);
  };

  const handleStartClassicMatch = (homeCharId: string, awayCharId: string, venueId: string, lineup?: string[], stage?: TournamentStage) => {
    setIsPlayNowOpen(false);
    const targetVenue = VENUES.find((v) => v.id === venueId) || currentVenue;

    const launch = () => {
      setCampaignMatch(null);
      setSoloMatchVenue(targetVenue);
      const newGameState = lineup ? createSoloLineup(targetVenue.defaultRuleSet, lineup, playerName, 3) : createInitialState(
        targetVenue.defaultRuleSet || settings.defaultRuleSet,
        homeCharId,
        awayCharId,
      );

      soloLineup.current = { controlled: homeCharId, opponent: awayCharId, ids: lineup };
      tournamentMatch.current = stage ? { id: newGameState.matchId, stage } : null;
      if (stage) setCampaignProgress((previous) => ({ ...previous, tournamentCharacterId: homeCharId }));
      setGameState(newGameState);
      setAppMode('match');
      setPaAnnouncement(`Match underway at ${targetVenue.name}! First to 5 crown holds wins!`);
      soundFX.playSchoolPAChime();
      setTimeout(() => setPaAnnouncement(null), 4000);
    };

    setPendingMatchStart(() => launch);
    setIsVenueSelectOpen(true);
  };

  const startSoloLineup = (setup: SoloSetup) => {
    const venue = VENUES.find(({ id }) => id === setup.venueId) ?? currentVenue;
    setIsPlayNowOpen(false);
    setCampaignMatch(null);
    tournamentMatch.current = null;
    soloLineup.current = { ids: setup.lineup, randomSeat: true };
    setSoloMatchVenue(venue);
    setMatchVenueType(setup.surface);
    setWeather(setup.weather);
    setMatchBall(setup.ball);
    feet.current = null;
    setGameState(createSoloLineup(venue.defaultRuleSet, setup.lineup, playerName,
      (Math.floor(Math.random() * 4) + 1) as SquareId));
    setAppMode('match');
  };

  const startCampaignMatch = (venue: VenueDef, opponentId?: string) => {
    const target = venue.campaignObjective.requiredCrownHolds;
    const initial = createInitialState(venue.defaultRuleSet, campaignProgress.equippedCharacterId, opponentId);
    setCampaignMatch({ venue, opponentId });
    setSoloMatchVenue(venue);
    setGameState({ ...initial, crownHoldsTarget: target, coins: campaignProgress.coins, activeHouseRule: venue.houseRule ?? null });
    setAppMode('match');
    setPaAnnouncement(`${venue.name} · ${venue.campaignObjective.title} · First to ${target} crown holds`);
    soundFX.playSchoolPAChime();
    setTimeout(() => setPaAnnouncement(null), 4000);
  };

  const handleStartCampaignCourtMatch = () => {
    soundFX.playClick();
    const launch = () => startCampaignMatch(currentVenue);
    setPendingMatchStart(() => launch);
    setIsVenueSelectOpen(true);
  };

  const handleStartClassmateMatch = (opponentChar?: CharacterDef) => {
    soundFX.playClick();
    startCampaignMatch(currentVenue, opponentChar?.id);
  };

  const handleRematch = () => {
    if (campaignMatch && appMode === 'match') {
      startCampaignMatch(campaignMatch.venue, campaignMatch.opponentId);
      return;
    }
    const ruleSet = sceneVenue.defaultRuleSet || settings.defaultRuleSet;
    const newGame = isLocalMatch
      ? createLocalMatch(ruleSet, localPicks.current)
      : soloLineup.current?.ids && soloLineup.current.randomSeat ? createSoloLineup(ruleSet, soloLineup.current.ids, playerName,
        (Math.floor(Math.random() * 4) + 1) as SquareId)
      : createInitialState(ruleSet, soloLineup.current?.controlled ?? campaignProgress.equippedCharacterId,
        soloLineup.current?.opponent, soloLineup.current?.ids);
    if (tournamentMatch.current?.id === gameState.matchId && gameState.gameWinner?.id !== gameState.humanPlayerId) {
      tournamentMatch.current = { ...tournamentMatch.current, id: newGame.matchId };
    }
    setGameState(newGame);
    if (!isLocalMatch) setAppMode('match');
    setPaAnnouncement('Rematch initiated! First to 5 crown holds wins!');
    soundFX.playSchoolPAChime();
    setTimeout(() => setPaAnnouncement(null), 3500);
  };

  // Travel to Venue via Road Trip Car Ride
  const handleTravelToVenue = (targetVenue: VenueDef) => {
    if (!playtestVenues.includes(targetVenue.id)) return;
    setCampaignMatch(null);
    setTransitFromVenue(currentVenue);
    setTransitToVenue(targetVenue);
    setAppMode('car_ride');
  };

  const handleArrivalAtDestination = useCallback(() => {
    setCampaignProgress((prev) => ({
      ...prev,
      currentVenueId: transitToVenue.id,
    }));
    // Arrive right at the front schoolyard entrance gateway so player can enter the school & head out back!
    setAppMode('campaign_exploration');
    setExplorationPos([...CAMPUS_ARRIVAL]);
  }, [transitToVenue]);

  const nextCampaignVenue = campaignMatch && gameState.gameWinner?.id === gameState.humanPlayerId
    ? VENUES.find(({ id }) => id === getNextLadderVenueId(campaignMatch.venue.id))
    : undefined;
  const handleContinueCampaign = () => {
    setGameState(createInitialState(settings.defaultRuleSet));
    setCampaignMatch(null);
    if (nextCampaignVenue && playtestVenues.includes(nextCampaignVenue.id)) {
      handleTravelToVenue(nextCampaignVenue);
    } else {
      setAppMode('campaign_exploration');
    }
  };

  const handleEnterTournamentMatch = (opponents: string[]) => {
    soundFX.playClick();
    setIsTournamentBracketOpen(false);
    const equipped = campaignProgress.tournamentCharacterId ?? (campaignProgress.equippedCharacterId || 'char-patch');
    handleStartClassicMatch(equipped, opponents[0], currentVenue.id,
      [opponents[0], opponents[1], equipped, opponents[2]], campaignProgress.tournamentStage ?? 'quarterfinals');
  };

  // Sign-in Board Options
  const handleSignInOption = (option: 'campaign_match' | 'free_play' | 'practice' | 'spectate') => {
    if (option === 'campaign_match') {
      handleStartCampaignCourtMatch();
    } else {
      soloLineup.current = null;
      setCampaignMatch(null);
      setSoloMatchVenue(currentVenue);
      setAppMode('match');
      const match = createInitialState(currentVenue.defaultRuleSet, campaignProgress.equippedCharacterId);
      setGameState(option === 'spectate'
        ? { ...match, humanPlayerId: '', players: match.players.map((player) => ({ ...player, isHuman: false })) }
        : match);
    }
  };

  // Start Local Multiplayer Match
  const handleStartLocalMatch = (characterIds: string[]) => {
    setCampaignMatch(null);
    localPicks.current = characterIds;
    setAppMode('local_multiplayer');
    setGameState(createLocalMatch(currentVenue.defaultRuleSet || settings.defaultRuleSet, characterIds));
  };

  // Start Online Multiplayer Match
  const handleStartOnlineMatch = (socket: WebSocket, playerId: string, snapshot: MatchSnapshot) => {
    connectOnlineMatch(socket, playerId, snapshot);
    setIsMultiplayerOpen(false);
    setOnlineNotice('');
    setPaAnnouncement(null);
    setIsMatchIntroActive(false);
    setAppMode('online_multiplayer');
  };
  const watchTournament = (room:string) => {
    const socket = new WebSocket(`${location.protocol==='https:'?'wss':'ws'}://${location.host}/ws`);
    socket.onopen = ()=>socket.send(JSON.stringify({type:'watch_room',payload:{roomId:room}}));
    socket.onerror = ()=>setOnlineNotice('Could not connect to the live court.');
    socket.onmessage = ({data})=>{
      const message = JSON.parse(data);
      if (message.event==='room_error') { setOnlineNotice(message.payload); socket.close(); return; }
      if (message.event!=='match_started') return;
      setOnlineCup({room,final:false});
      setIsTournamentBracketOpen(false);
      handleStartOnlineMatch(socket,'',message.payload);
    };
  };

  const handleReturnToMenu = () => {
    if (isOnlineMatch) leaveOnlineMatch();
    setOnlineCup(undefined);
    setAppMode('main_menu');
    setCampaignMatch(null);
    setGameState(createInitialState(settings.defaultRuleSet));
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
      if (current.isGameOver || !isMatchPlaying) return;
      const hitterId = isLocalMatch ? current.activeTurnPlayerId : current.humanPlayerId;
      const hitter = current.players.find(({ id, isHuman }) => id === hitterId && isHuman);
      if (!hitter || targetSquare === hitter.rank || (current.ballState.isServing && targetSquare !== 4)) return;
      const chosenShot = current.ballState.isServing ? 'normal' : shotType;
      if (current.activeTurnPlayerId !== hitter.id) {
        const approaching = appMode === 'match' || isOnlineMatch ? incomingReturn(current) : undefined;
        if (approaching?.player.id === hitter.id && approaching.seconds <= RETURN_BUFFER_SECONDS) {
          setReturnCue(undefined);
          if (isOnlineMatch) {
            sendOnlineHit(targetSquare, clickPoint, true);
            return;
          }
          bufferedShot.current = {
            incomingCall: current.refereeCall, playerId: hitter.id, targetSquare,
            shotType: chosenShot, point: clickPoint, expiresAt: performance.now() + 500,
          };
        } else if (approaching?.player.id === hitter.id) {
          setReturnCue({ text: 'Too early. Wait for the bounce.', call: current.refereeCall, afterBounce: false });
        }
        return;
      }
      if (isOnlineMatch) {
        sendOnlineHit(targetSquare, clickPoint);
        return;
      }
      if (appMode === 'match' && !canReach(current)) {
        const pose = feet.current;
        const reach = pose && returnReach(current.ballState, pose);
        setReturnCue({ text: reach === 'high' ? 'Let the ball drop.' : reach === 'extend' ? 'Hold F or RB / R1 to reach.' : 'Move closer to the ball.', call: current.refereeCall, afterBounce: true });
        bufferedShot.current = {
          incomingCall: current.refereeCall, playerId: hitter.id, targetSquare,
          shotType: chosenShot, point: clickPoint, expiresAt: performance.now() + 430,
        };
        return;
      }

      if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);

      setGameState((prev) => prev.activeTurnPlayerId === hitter.id
        ? executeHit(prev, hitter.id, targetSquare, chosenShot, clickPoint)
        : prev);
    },
    [appMode, canReach, isOnlineMatch, isLocalMatch, isMatchPlaying, sendOnlineHit]
  );

  // Ball Flight & Physics Engine Loop
  useEffect(() => {
    if (!isMatchPlaying || isOnlineMatch) return;
    let animFrame: number;
    let lastTime = performance.now();

    const updatePhysics = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.05);
      lastTime = currentTime;

      setGameState((prev) => advanceBall(prev, dt));

      animFrame = requestAnimationFrame(updatePhysics);
    };

    animFrame = requestAnimationFrame(updatePhysics);
    return () => cancelAnimationFrame(animFrame);
  }, [isMatchPlaying, isOnlineMatch]);

  // AI Turn Decision (handles both live rallies and AI serves)
  useEffect(() => {
    if (!isMatchPlaying || isOnlineMatch || gameState.isGameOver) return;
    const activePlayer = gameState.players.find((p) => p.id === gameState.activeTurnPlayerId);

    const isAiTurn = activePlayer && !activePlayer.isHuman && (gameState.ballState.isLive || gameState.ballState.isServing);

    if (isAiTurn && activePlayer) {
      if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);

      aiTimeoutRef.current = window.setTimeout(() => {
        const decision = getAIDecision(
          activePlayer,
          gameState.players,
          gameState.ruleSet,
          gameState.ballState.isServing
        );
        setGameState((prev) =>
          executeHit(prev, activePlayer.id, decision.targetSquare, decision.shotType, decision.customCoords)
        );
      }, gameState.ballState.isServing ? 550 : BOT_RETURN_DELAY_MS);
    }

    return () => {
      if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    };
  }, [gameState.activeTurnPlayerId, gameState.ballState.isLive, gameState.ballState.isServing, gameState.isGameOver, isMatchPlaying, isOnlineMatch]);

  useEffect(() => {
    if (isRecording && (gameState.ballState.hitCount ?? 0) > 2 && gameState.ballState.lastHitterId === gameState.humanPlayerId)
      recordingMarker.current = recordingSeconds;
  }, [isRecording, gameState.ballState.hitCount, gameState.ballState.lastHitterId, gameState.humanPlayerId]);

  // Spacebar or number keys (1-4) hotkey to serve or strike during human turn
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((!isHumanTurn && !receivingSoon) || e.repeat || (e.target instanceof HTMLElement &&
        e.target.closest('input, select, textarea, [contenteditable="true"]'))) return;
      const shotType = e.shiftKey && !isOnlineMatch ? 'fast' : 'normal';

      if (isLocalMatch) {
        const target = localShotTarget(gameStateRef.current, e.code);
        if (target) {
          e.preventDefault();
          handleHitBall(target, shotType);
        }
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        const isServingNow = gameState.ballState.isServing;
        const targetSquare: SquareId = isServingNow
          ? 4
          : (humanPlayer?.rank === 4 ? 1 : 4);
        handleHitBall(targetSquare, shotType);
      } else if (/^(Digit|Numpad)[1-4]$/.test(e.code)) {
        const sq = Number(e.code.slice(-1)) as SquareId;
        if (sq !== humanPlayer?.rank) {
          e.preventDefault();
          handleHitBall(sq, shotType);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isHumanTurn, receivingSoon, isLocalMatch, isOnlineMatch, gameState.ballState.isServing, humanPlayer?.rank, handleHitBall]);

  const gamepadActions = useRef<(pressed: number[], pad: Gamepad) => void>(() => {});
  gamepadActions.current = (pressed, pad) => {
    if (!canPause || pauseSubmenu || isProfileOpen || activeNPC) return;
    if (pressed.includes(9)) {
      setPauseControls(false);
      setPauseOpen((value) => !value);
      return;
    }
    if (pauseOpen) {
      if (pressed.includes(1)) { if (pauseControls) setPauseControls(false); else setPauseOpen(false); return; }
      const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('.pause-panel button'));
      const current = Math.max(0, buttons.indexOf(document.activeElement as HTMLButtonElement));
      const columns = window.matchMedia('(max-width: 640px)').matches ? 2 : 3;
      const step = pressed.includes(12) ? -columns : pressed.includes(13) ? columns : pressed.includes(14) ? -1 : pressed.includes(15) ? 1 : 0;
      if (step) buttons[Math.max(0, Math.min(buttons.length - 1, current + step))]?.focus();
      else if (pressed.includes(0)) buttons[current]?.click();
      return;
    }
    if (!isHumanTurn && !receivingSoon) return;
    const aim = [[12, 2], [15, 4], [13, 3], [14, 1]] as const;
    const direction = aim.find(([button]) => pressed.includes(button));
    const hitter = isLocalMatch ? controlledPlayer : humanPlayer;
    const target = gameState.ballState.isServing ? 4 : direction?.[1] ?? (hitter?.rank === 4 ? 1 : 4);
    if ((direction || pressed.includes(0)) && (target !== hitter?.rank || gameState.ballState.isServing))
      handleHitBall(target, !isOnlineMatch && pad.buttons[7]?.value > .35 ? 'fast' : 'normal');
  };
  useEffect(() => {
    let previous: boolean[] = [];
    let frame = 0;
    let activeIndex = -1;
    const poll = () => {
      frame = requestAnimationFrame(poll);
      const pad = document.hasFocus() ? readGamepad() : undefined;
      if (!pad) { previous = []; activeIndex = -1; return; }
      const next = pad.buttons.map(({pressed}) => pressed);
      if (activeIndex === pad.index) {
        const pressed = next.flatMap((down, index) => down && !previous[index] ? [index] : []);
        if (pressed.length) gamepadActions.current(pressed, pad);
      }
      previous = next;
      activeIndex = pad.index;
    };
    frame = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="relative w-screen h-screen bg-slate-950 overflow-hidden font-sans select-none">
      {/* 3D WebGL Canvas Layer */}
      {appMode !== 'car_ride' && !isProfileOpen && !isTutorialOpen && <ThreeCourtScene
        key={`${appMode}-${sceneVenue.id}-${matchVenueType}`}
        mode={
          appMode === 'main_menu'
            ? 'preview'
            : appMode === 'campaign_exploration'
            ? 'exploration'
            : 'match'
        }
        manualFootwork={appMode === 'match'}
        paused={pauseOpen && !isOnlineMatch}
        weather={appMode === 'match' && soloLineup.current?.randomSeat ? weather : 'Clear'}
        ballLook={appMode === 'match' && soloLineup.current?.randomSeat ? matchBall : undefined}
        onControlledPose={trackFootwork}
        captureFrameRef={captureFrame}
        venue={sceneVenue}
        venueType={
          appMode === 'campaign_exploration' || isOnlineMatch
            ? 'outdoor'
            : sceneVenue.id === 'winter_rec_room' ? 'indoor' : matchVenueType
        }
        players={scenePlayers}
        waitingQueue={gameState.waitingQueue}
        ballState={gameState.ballState}
        refereeCall={gameState.refereeCall}
        matchFinished={gameState.isGameOver}
        humanPlayerId={gameState.humanPlayerId}
        activeTurnPlayerId={gameState.isGameOver ? null : gameState.activeTurnPlayerId}
        servingPlayerId={gameState.servingPlayerId}
        isHumanTurn={isHumanTurn || canQueueReturn}
        highlightedSquares={
          isHumanTurn || canQueueReturn
            ? (gameState.ballState.isServing ? [4] : [1, 2, 3, 4].filter((s) => s !== controlledPlayer?.rank) as SquareId[])
            : []
        }
        onSelectTargetSquare={(sqId, pt, fast) => handleHitBall(sqId, fast && !isOnlineMatch ? 'fast' : 'normal', pt)}
        onMatchIntroChange={setIsMatchIntroActive}
        skipMatchIntro={isOnlineMatch}
        cameraView={settings.cameraView}
        explorationPlayerPos={explorationPos}
        onExplorationMove={(pos) => {
          setExplorationPos(pos);
          try {
            localStorage.setItem('foursquare_last_exploration_pos', JSON.stringify(pos));
          } catch {}
        }}
        onInteractNPC={(npc) => setActiveNPC(npc)}
        onInteractCourt={() => setIsSignInBoardOpen(true)}
        onInteractFunnelBall={handleFunnelBallShot}
        onInteractSchoolDoor={() => setIsWorldMapOpen(true)}
        onRewardCoins={(coins) => {
          setCampaignProgress((prev) => ({
            ...prev,
            coins: prev.coins + coins,
          }));
        }}
        collectedItems={campaignProgress.collectibles}
        onCollectItem={(id, name) => {
          setCampaignProgress((previous) => previous.collectibles?.includes(id) ? previous : {...previous,collectibles:[...(previous.collectibles??[]),id]});
          setPaAnnouncement('Collected '+name);
        }}
        completedLessons={campaignProgress.lessonsCompleted}
        onPassLesson={(id,coins)=>setCampaignProgress((previous)=>{
          const lessons = previous.lessonsCompleted ?? [];
          if (lessons.includes(id)) return previous;
          return {...previous,lessonsCompleted:[...lessons,id],coins:previous.coins+coins};
        })}
        customization={isOnlineMatch || customization === DEFAULT_CUSTOMIZATION ||
          (appMode === 'match' && soloLineup.current?.randomSeat && humanPlayer?.characterId !== campaignProgress.equippedCharacterId)
          ? undefined : customization}
        isOrbitMode={isOrbitMode}
        onToggleOrbitMode={() => setIsOrbitMode((prev) => !prev)}
        onShotClockExpired={isOnlineMatch ? undefined : handleShotClockExpired}
        serveDeadline={isOnlineMatch ? onlineCourt?.serveDeadline : undefined}
        paAnnouncement={paAnnouncement}
        disableBackgroundVideo={disableMenuVideo}
        covered={isProfileOpen || isWorldMapOpen || isArenasOpen || isCreditsOpen || isSettingsOpen || isShopOpen ||
          isStandingsOpen || isMeetPlayersOpen || isCustomizerOpen}
      />}

      {/* Main Menu Overlay matching FC27 format (with live 3D court preview running in background) */}
      {appMode === 'main_menu' && !isProfileOpen && (
        <MainMenu
          coins={campaignProgress.coins}
          activeVenue={currentVenue}
          onCampaignMode={handleLaunchCampaignMode}
          onPlayNow={handlePlayNow}
          onArenas={() => setIsArenasOpen(true)}
          onOnlineMatch={() => {
            setOnlineNotice('');
            setOnlineCup(undefined);
            setIsMultiplayerOpen(true);
          }}
          onTournament={() => {
            soundFX.playClick();
            setIsTournamentBracketOpen(true);
          }}
          onStandings={() => openLeague('Standings')}
          onStats={() => openLeague('Stats')}
          onClans={() => openLeague('Clans')}
          onMeetPlayers={() => setIsMeetPlayersOpen(true)}
          onTutorial={() => setIsTutorialOpen(true)}
          onRules={() => setIsRulebookOpen(true)}
          onShop={() => { setShopPage('shop'); setIsShopOpen(true); }}
          onAuctions={() => { setShopPage('auctions'); setIsShopOpen(true); }}
          onCustomizer={() => setIsCustomizerOpen(true)}
          onSettings={() => setIsSettingsOpen(true)}
          creditsUnlocked={Boolean(campaignProgress.victoryEdition)}
          onCreditsCredibility={() => {
            setVictoryEdition(campaignProgress.victoryEdition);
            setIsCreditsOpen(true);
          }}
          onOpenProfile={openProfile}
          isPlayingMusic={isPlayingMusic}
          onToggleMusic={handleToggleMusic}
          onNextTrack={handleNextTrack}
          currentTrackName={currentTrack}
          isCommentaryEnabled={settings.enableVoiceCommentary}
          onToggleCommentary={() => handleUpdateSettings({ ...settings, enableVoiceCommentary: !settings.enableVoiceCommentary })}
          isMenuVideoDisabled={disableMenuVideo}
          onToggleDisableMenuVideo={handleToggleDisableMenuVideo}
        />
      )}

      {/* Campaign Exploration & Match Overlay HUD */}
      {appMode !== 'main_menu' && appMode !== 'car_ride' && (
        <>
          {/* Top Bar Header */}
          <div className="absolute top-4 inset-x-4 z-20 pointer-events-none flex items-center justify-between">
            {/* Top Left: World Map & Current Venue (Clear World Globe Button for campaign mode) */}
            <div className="pointer-events-auto flex items-center gap-2">
              {!isOnlineMatch && <button
                onClick={() => setIsWorldMapOpen(true)}
                title="Open Campaign World Map"
                aria-label="Open Campaign World Map"
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-slate-900/95 hover:bg-slate-800 border-2 border-amber-400 text-amber-300 flex items-center justify-center shadow-xl transition-all cursor-pointer hover:scale-105 active:scale-95 group"
              >
                <Globe className="w-6 h-6 text-amber-400 transition-transform group-hover:rotate-12" />
              </button>}

              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs font-bold text-slate-200">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                <span>{sceneVenue.name}</span>
              </div>

            </div>

            {/* Top Right: Clean Unobtrusive Header Controls */}
            <div className="pointer-events-auto flex items-center gap-2">
              {appMode==='campaign_exploration' && <button className="field-icon" aria-label="Switch first or third person" title="Switch first or third person" onClick={()=>handleUpdateSettings({...settings,cameraView:settings.cameraView==='first_person'?'third_person':'first_person'})}><Camera size={19}/></button>}
              <button className="field-icon relative" aria-label="Pause menu" onClick={() => { setPauseControls(false); setPauseOpen(true); }}>
                <Pause size={20}/>{isRecording && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-400"/>}
              </button>
            </div>
          </div>

          {(isOnlineMatch || isLocalMatch || appMode === 'match') && (
            <div className="absolute top-16 left-1/2 z-20 w-max max-w-[90vw] -translate-x-1/2 rounded-xl bg-slate-950/90 px-4 py-2 text-center text-xs text-white pointer-events-none">
              <p role="status" className="font-bold">{returnCue?.call === gameState.refereeCall && returnCue.afterBounce === gameState.ballState.hasBouncedThisPlay
                ? returnCue.text
                : gameState.ballState.hasBouncedThisPlay
                  ? (isHumanTurn ? 'Bounce. Return now.' : `Square ${gameState.ballState.currentSquareOwner} to return`)
                  : gameState.refereeCall.message}</p>
              <p className="text-amber-300">{currentKing?.name} · {currentKing?.crownHolds ?? 0}{onlineCourt?.endsAt?'':`/${gameState.crownHoldsTarget}`} crown holds
                {onlineCourt?.endsAt?` · ${Math.floor(cupSeconds/60)}:${String(cupSeconds%60).padStart(2,'0')}`:''}</p>
            </div>
          )}

          {/* Minimalist In-Game Turn Pill (clean and unobtrusive at bottom center) */}
          {(isHumanTurn || canQueueReturn) && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
              <div className="px-5 py-2 rounded-full bg-slate-950/85 backdrop-blur-md border border-amber-400/50 text-xs font-black text-amber-300 flex items-center gap-2.5 shadow-2xl">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>
                  {canQueueReturn ? 'GET READY · Aim a return to queue it for the bounce' : localTurn ? (gameState.ballState.isServing
                    ? `${localTurn.name} serves · ${localTurn.quickLabel} or click Square 4`
                    : `${localTurn.name}'s turn · ${localTurn.keysLabel} for Squares 1–4 · ${localTurn.quickLabel} for a quick shot`)
                  : gameState.ballState.isServing
                    ? 'YOUR SERVE • Click Square 4 or Press SPACE / [4]'
                    : isOnlineMatch ? 'YOUR TURN • Click Target Square or Press SPACE / [1-4]'
                      : 'Aim 1–4 · WASD to move · F to reach'}
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
          canSkip
          onArrival={handleArrivalAtDestination}
          currentTrackName={currentTrack}
          onNextTrack={handleNextTrack}
          characterId={campaignProgress.equippedCharacterId}
          customization={customization === DEFAULT_CUSTOMIZATION ? undefined : customization}
        />
      )}

      {/* World Map Modal */}
      <WorldMapModal
        isOpen={isWorldMapOpen}
        onClose={() => setIsWorldMapOpen(false)}
        progress={{ ...campaignProgress, unlockedVenues: playtestVenues }}
        level={campaignLevel}
        onSelectVenue={handleTravelToVenue}
        onResumeExploration={() => {
          setIsWorldMapOpen(false);
          if (appMode==='main_menu') handleTravelToVenue(currentVenue);
          else setAppMode('campaign_exploration');
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
      <MarketModal
        page={shopPage}
        isOpen={isShopOpen}
        onClose={() => setIsShopOpen(false)}
      />

      {/* Arenas Modal */}
      <ArenasModal
        isOpen={isArenasOpen}
        onClose={() => setIsArenasOpen(false)}
        unlockedVenueIds={playtestVenues}
        activeVenueId={currentVenue.id}
        onSelectVenue={(v) => {
          setCampaignProgress((p) => ({ ...p, currentVenueId: v.id }));
          setExplorationPos([...CAMPUS_ARRIVAL]);
          setIsArenasOpen(false);
          setAppMode('campaign_exploration');
        }}
      />

      {/* Standings & Tour Notebook Modal */}
      <StandingsModal
        key={isStandingsOpen ? leagueView : 'closed'}
        initialView={leagueView}
        isOpen={isStandingsOpen}
        onClose={() => setIsStandingsOpen(false)}
      />

      {/* Settings Modal matching Image 2 */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onResetCampaign={() => {
          setCampaignMatch(null);
          setCampaignProgress(createCampaignProgress());
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
        edition={victoryEdition}
        onClose={() => setIsCreditsOpen(false)}
      />

      {/* Interactive Step-by-Step Tutorial Modal */}
      <TutorialModal
        isOpen={isTutorialOpen}
        completed={campaignProgress.completedDrills ?? []}
        onComplete={(id) => {
          const drill=TRAINING_DRILLS.find((entry)=>entry.id===id);
          if (drill) setCampaignProgress((previous)=>previous.completedDrills?.includes(id)?previous:{...previous,completedDrills:[...(previous.completedDrills??[]),id],coins:previous.coins+drill.coins});
        }}
        onClose={() => setIsTutorialOpen(false)}
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

      {/* Online Multiplayer Lobby Modal (includes Local Pass & Play) */}
      {onlineNotice && appMode === 'main_menu' && (
        <div role="alert" className="absolute bottom-16 left-1/2 z-40 -translate-x-1/2 rounded-xl bg-slate-950 px-4 py-2 text-sm text-amber-200">
          {onlineNotice}
        </div>
      )}
      <OnlineMultiplayerModal
        key={onlineCup?.room ?? 'casual'}
        isOpen={isMultiplayerOpen}
        tournamentRoom={onlineCup?.room}
        profileName={customization.playerNickname}
        onClose={() => {
          setIsMultiplayerOpen(false);
          if (onlineCup) { setOnlineCup(undefined); setIsTournamentBracketOpen(true); }
        }}
        onStartOnlineMatch={handleStartOnlineMatch}
        onStartLocalMatch={onlineCup ? undefined : handleStartLocalMatch}
      />


      {/* Play Now: KO Classic Match Menu (Matching second pasted image) */}
      <PlayNowClassicMatch
        isOpen={isPlayNowOpen}
        onClose={() => setIsPlayNowOpen(false)}
        onStartMatch={startSoloLineup}
        activeVenueId={currentVenue.id}
        playerName={playerName}
      />
      {pauseOpen && canPause && !pauseSubmenu && <div className="league-overlay" role="dialog" aria-modal="true" aria-label="Pause menu">
        <section className="league-panel pause-panel">
          <header className="league-header">
            <h2>{isOnlineMatch ? 'Match menu' : 'Paused'}</h2>
            <span className="flex items-center gap-2 text-amber-200"><Coins size={17}/>{campaignProgress.coins} career coins</span>
          </header>
          {pauseControls ? <div className="grid gap-3 p-5 text-sm">
            <button className="league-button justify-self-start" onClick={() => setPauseControls(false)}>Back</button>
            <h3 className="text-xl font-semibold">Controls</h3>
            {isOnlineMatch && <p>The online match continues while this menu is open.</p>}
            <ControlGuide/>
          </div> : <div className="pause-grid">
            {[
              {label:'Resume', Icon:Play, action:() => setPauseOpen(false)},
              {label:'Controls', Icon:Gamepad2, action:() => setPauseControls(true)},
              {label:'Camera', Icon:Camera, action:() => setIsCameraModalOpen(true)},
              {label:'Settings', Icon:Settings2, action:() => setIsSettingsOpen(true)},
              {label:isPlayingMusic?'Mute music':'Play music', Icon:Music2, action:handleToggleMusic},
              {label:'Tutorial', Icon:CircleHelp, action:() => setIsTutorialOpen(true)},
              {label:'Rules & controls', Icon:BookOpen, action:() => setIsRulebookOpen(true)},
              {label:'Screenshot', Icon:Camera, action:() => void captureScreenshot()},
              {label:isRecording?'Stop recording':'Record', Icon:Video, action:handleToggleRecordGame},
              ...(appMode==='campaign_exploration' ? [{label:'Play match', Icon:Play, action:() => { setPauseOpen(false);handleStartCampaignCourtMatch(); }}] : []),
              ...(isMatchMode && !isOnlineMatch && tournamentMatch.current?.id !== gameState.matchId ? [{label:'Restart match', Icon:RotateCcw, action:() => {setPauseOpen(false);handleRematch();}}] : []),
              ...(isMatchMode ? [{label:'Leave match', Icon:LogOut, action:() => {setPauseOpen(false);if(campaignMatch)setAppMode('campaign_exploration');else handleReturnToMenu();}}] : []),
              {label:'Main menu', Icon:Home, action:() => {setPauseOpen(false);handleReturnToMenu();}},
            ].map(({label,Icon,action}, index) => <button autoFocus={index===0} key={label} onClick={action}><Icon size={23}/>{label}</button>)}
          </div>}
        </section>
      </div>}

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
        onOpenLocker={() => setIsLockerOpen(true)}
        currentCustomization={customization}
        onSave={(newCust: CharacterCustomization) => {
          saveAppearance(newCust);
          const name = newCust.playerNickname?.trim();
          if (name && name !== customization.playerNickname) {
            void preparePlayerSession().then(() => fetch('/api/player/name', {
              method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }),
            })).catch(() => {});
          }
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
      <CharacterShopModal isOpen={isLockerOpen} coins={campaignProgress.coins} equipped={campaignProgress.equippedCharacterId}
        onClose={() => setIsLockerOpen(false)} onEquipCharacter={handleEquipCharacter}
        onUpdateCoins={(coins) => setCampaignProgress((previous) => ({ ...previous, coins }))}/>

      {/* Tournament Bracket Modal */}
      <TournamentBracketModal
        isOpen={isTournamentBracketOpen}
        onClose={() => setIsTournamentBracketOpen(false)}
        onEnterMatch={handleEnterTournamentMatch}
        onWatch={watchTournament}
        onEnterOnline={(room, final) => {
          setOnlineCup({ room, final });
          setIsTournamentBracketOpen(false);
          setIsMultiplayerOpen(true);
        }}
        playerName={playerName}
        equippedCharId={campaignProgress.tournamentCharacterId ?? (campaignProgress.equippedCharacterId || 'char-patch')}
        tournamentStage={campaignProgress.tournamentStage ?? 'quarterfinals'}
        eliminated={Boolean(campaignProgress.tournamentEliminated)}
        qualifiers={campaignProgress.tournamentQualifiers ?? []}
        onReset={() => setCampaignProgress((previous) => ({ ...previous, tournamentStage: 'quarterfinals',
          tournamentEliminated: false, tournamentQualifiers: [], tournamentCharacterId: undefined }))}
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
        isOpen={gameState.isGameOver && isMatchPlaying && !isWorldMapOpen}
        winner={gameState.gameWinner}
        players={gameState.players}
        humanPlayerId={gameState.humanPlayerId}
        totalRounds={gameState.totalRounds}
        onRematch={isOnlineMatch ? requestOnlineRematch : handleRematch}
        rematchDisabled={tournamentMatch.current?.id === gameState.matchId ||
          (isOnlineMatch && (Boolean(onlineCup) || !onlineCourt || onlineCourt.playerCount < 2 || onlineCourt.rematchReady))}
        rematchLabel={isOnlineMatch && onlineCourt?.rematchReady ? 'Waiting for Rematch' : undefined}
        onSwitchVenue={isOnlineMatch || tournamentMatch.current?.id === gameState.matchId ? undefined : () => {
          setIsVenueSelectOpen(true);
          setPendingMatchStart(() => () => handleRematch());
        }}
        onReturnToMenu={handleReturnToMenu}
        campaignAction={appMode === 'match' && campaignMatch ? {
          label: nextCampaignVenue ? `Travel to ${nextCampaignVenue.location.split(',')[0]}` : 'Return to Campus',
          onClick: handleContinueCampaign,
        } : tournamentMatch.current?.id === gameState.matchId || (isOnlineMatch && onlineCup) ? {
          label: 'Tournament bracket',
          onClick: () => { handleReturnToMenu(); setOnlineCup(undefined); setIsTournamentBracketOpen(true); },
        } : undefined}
      />

      {/* Athlete Profile & Replay Theater Modal (1-hour limit) */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={leaveProfile}
        equippedCharacter={
          CHARACTERS.find((c) => c.id === campaignProgress.equippedCharacterId) || CHARACTERS[0]
        }
        customization={customization}
        campaignProgress={campaignProgress}
        savedReplays={savedReplays}
        onDeleteReplay={handleDeleteReplay}
        onRenameReplay={(id,title)=>setSavedReplays((before)=>before.map((item)=>item.id===id?{...item,title}:item))}
        onSaveAppearance={saveAppearance}
        onCampaign={() => { leaveProfile(); handleLaunchCampaignMode(); }}
        onMarket={() => { leaveProfile(); setShopPage('auctions'); setIsShopOpen(true); }}
        onCredits={() => {
          leaveProfile();
          setVictoryEdition(campaignProgress.victoryEdition);
          setIsCreditsOpen(true);
        }}
        onOpenCustomizer={() => {
          leaveProfile();
          setIsCustomizerOpen(true);
        }}
      />
    </div>
  );
}
