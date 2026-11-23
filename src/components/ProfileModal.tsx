import { trainingTotals, TRAINING_DRILLS } from '../services/training';
import { downloadMedia, exportClip, IMAGE_LIMIT, VIDEO_SECONDS_LIMIT } from '../services/profileMedia';
import { MASCOTS, MASCOT_NAMES } from '../services/profileExtras';
import { campusCollectibles, ITEM_RARITIES } from '../services/collectibles';
import { Trophy, Wallet, X, ChevronDown, ShoppingBag, ArrowLeft, Medal, GraduationCap, MapPin, Crown, Lock } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Pencil, Send, MoreHorizontal, User, UserPlus, UserMinus, Users, Check, XCircle, Clock } from 'lucide-react';
import { ProfileMessages } from './ProfileMessages';
import { CHARACTERS, type CharacterDef, type CharacterCustomization } from '../utils/characters';
import type { CampaignProgress } from '../types/campaign';
import { leagueTier, type LeagueProfile, type PublicProfile, type FriendRequestAction } from '../services/leagueTypes';
import { preparePlayerSession, loadMarket } from '../services/marketClient';
import type { MarketView } from '../services/marketTypes';
import { profileLevel, type ConnectionView, type ProfileEdit } from '../services/profileProgress';
import { getMatchHistory } from '../services/matchHistory';
import { loadReplayVideo } from '../services/replayVideo';
import { CharacterLineup } from './CharacterLineup';
import { renderCardPortrait } from '../utils/cardPortrait';
import { ThreeCourtScene } from './ThreeCourtScene';
import { createInitialState } from '../services/foursquareEngine';
import { VENUES } from '../utils/venueData';

export interface SavedReplay { id:string; title:string; durationSeconds:number; venueName:string; timestamp?:number|string; video?:boolean; image?:boolean; highlight?:number }
interface Props {
  isOpen:boolean; onClose:()=>void; equippedCharacter:CharacterDef; customization:CharacterCustomization;
  campaignProgress:CampaignProgress; savedReplays:SavedReplay[]; onDeleteReplay:(id:string)=>void; onRenameReplay:(id:string,title:string)=>void;
  onOpenCustomizer:()=>void; onSaveAppearance:(appearance:CharacterCustomization)=>void; onCampaign:()=>void;
  onCredits:()=>void; onMarket:()=>void;
}

const tabs = ['Stats','Items','Campaign','Marketplace','Recordings'] as const;
const levels = ['friends','followers','following'] as const;
const get = async <T,>(url:string, options?:RequestInit):Promise<T> => {
  const response = await fetch(url,{ cache:'no-store',...options });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw Error(data.error || 'The request could not be completed.');
  }
  return response.json();
};
const send = (method:string, body:object) => ({method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
const connectionNames = { friends:'Friends', followers:'Followers', following:'Following' };

function ProfileBase({person,customization}:{person:PublicProfile;customization:CharacterCustomization}) {
  const venue=VENUES[parseInt(person.key.slice(0,8),16)%VENUES.length];
  const [game]=useState(()=>createInitialState(venue.defaultRuleSet));
  const [position,setPosition]=useState<[number,number,number]>([0,0,9]);
  return <div className="relative h-[min(68vh,36rem)] overflow-hidden rounded-lg bg-[#242e2b]">
    <div className="pointer-events-none absolute left-3 top-3 z-40 rounded-lg bg-black/80 px-3 py-2 text-sm">WASD to explore · Drag to look</div>
    <ThreeCourtScene mode="exploration" venue={venue} cameraView="third_person" customization={customization}
      players={game.players} waitingQueue={game.waitingQueue} ballState={game.ballState} humanPlayerId={game.humanPlayerId}
      activeTurnPlayerId={null} servingPlayerId={null} isHumanTurn={false} highlightedSquares={[]} onSelectTargetSquare={()=>{}}
      explorationPlayerPos={position} onExplorationMove={setPosition}/>
  </div>;
}

function ProfileActionButtons({person,busy,follow,request,visit,message}:{
  person:PublicProfile; busy:boolean; follow:()=>void; request:(action:FriendRequestAction)=>void; visit:()=>void; message:()=>void;
}) {
  const friendship=person.friendship??'none';
  return <div className="profile-person-actions" role="group" aria-label={'Profile actions for '+person.name}>
    {friendship==='friends' ? <span><Users size={15}/> Friends</span>
      : friendship==='sent' ? <button disabled={busy} onClick={()=>request('cancel')}><Clock size={15}/> Cancel friend request</button>
      : friendship==='received' ? <>
        <button disabled={busy} onClick={()=>request('accept')}><Check size={15}/> Accept friend request</button>
        <button disabled={busy} onClick={()=>request('decline')}><XCircle size={15}/> Decline request</button>
      </> : <button disabled={busy} onClick={()=>request('request')}><UserPlus size={15}/> Send friend request</button>}
    <button disabled={busy} onClick={follow}>{person.followed?<UserMinus size={15}/>:<UserPlus size={15}/>} {person.followed?'Unfollow':'Follow'}</button>
    <button onClick={visit}><User size={15}/> Visit profile</button>
    <button onClick={message}><Send size={15}/> Send message</button>
  </div>;
}

export function ProfileModal(props:Props) {
  const [profile,setProfile] = useState<LeagueProfile>();
  const [tab,setTab] = useState<typeof tabs[number]>('Stats');
  const [editor,setEditor] = useState<ProfileEdit>();
  const [busy,setBusy] = useState(false);
  const [status,setStatus] = useState('');
  const [directory,setDirectory] = useState<PublicProfile[]>();
  const [requests,setRequests] = useState<PublicProfile[]>([]);
  const [view,setView] = useState<ConnectionView>();
  const [query,setQuery] = useState('');
  const [menu,setMenu] = useState<string>();
  const [visits,setVisits] = useState<{person:PublicProfile; base:boolean}[]>([]);
  const visit=visits.at(-1);
  const openVisit = (person:PublicProfile, base:boolean) => {
    setMenu(undefined);
    setVisits((history)=>history.at(-1)?.person.key===person.key && history.at(-1)?.base===base ? history : [...history,{person,base}]);
  };
  const closeProfile = () => {
    setVisits([]);setEditor(undefined);setDirectory(undefined);setView(undefined);setMenu(undefined);setInbox(undefined);
    props.onClose();
  };
  const back = () => {
    if (visits.length) { setMenu(undefined);setVisits((history)=>history.slice(0,-1)); }
    else closeProfile();
  };
  const [inbox,setInbox] = useState<{ recipient?: PublicProfile }>();
  const [market,setMarket] = useState<MarketView>();
  const [marketPortraits,setMarketPortraits] = useState<Record<string,string|undefined>>({});
  const [filterMedia,setFilterMedia] = useState('');
  const [mediaType,setMediaType] = useState('all');
  const [oldest,setOldest] = useState(false);
  const [activeMedia,setActiveMedia] = useState<SavedReplay>();
  const [rename,setRename] = useState('');
  const [clipStart,setClipStart] = useState(0);
  const [clipEnd,setClipEnd] = useState(0);
  const videoNode=useRef<HTMLVideoElement>(null);
  const [video,setVideo] = useState<Blob>();
  const [videoUrl,setVideoUrl] = useState('');
  const avatar = useMemo(() => [props.equippedCharacter],[props.equippedCharacter]);
  const [portrait,setPortrait]=useState<string>();
  useEffect(()=>{if(props.isOpen)setPortrait(renderCardPortrait(props.equippedCharacter));},[props.isOpen,props.equippedCharacter]);
  useEffect(() => {
    if (!props.isOpen) return;
    let active = true;
    void preparePlayerSession().then(() => Promise.all([get<LeagueProfile>('/api/player/profile'),get<PublicProfile[]>('/api/player/friend-requests')]))
      .then(([value,incoming]) => { if (active) {setProfile(value);setRequests(incoming);} })
      .catch((error) => { if (active) setStatus(error.message); });
    return () => { active=false; };
  },[props.isOpen]);
  useEffect(() => {
    if (!props.isOpen || tab!=='Marketplace') return;
    let active = true;
    void preparePlayerSession().then(loadMarket).then((value)=>{if(active)setMarket(value);})
      .catch((error)=>{if(active)setStatus(error.message);});
    return ()=>{active=false;};
  },[props.isOpen,tab]);
  useEffect(() => {
    if (!props.isOpen || tab !== 'Marketplace' || !market) return;
    const ids=new Set(market.cards.slice(0,4).map(({characterId})=>characterId));
    setMarketPortraits(Object.fromEntries(CHARACTERS.filter(({id})=>ids.has(id)).map((character)=>[character.id,renderCardPortrait(character)])));
  },[market,props.isOpen,tab]);
  useEffect(() => {
    if (!video || tab!=='Recordings') { setVideoUrl(''); return; }
    const source=URL.createObjectURL(video);setVideoUrl(source);
    return ()=>URL.revokeObjectURL(source);
  },[video,tab]);
  if (!props.isOpen) return null;

  const training = trainingTotals(props.campaignProgress.completedDrills);
  const xp = training.xp + (profile?.xp ?? 0) + props.campaignProgress.completedVenues.length*750 + new Set(props.campaignProgress.lessonsCompleted ?? []).size*250;
  const firstWin = (profile?.stats.wins ?? 0)>0 || getMatchHistory().some(({won})=>won) || props.campaignProgress.completedVenues.length>0;
  const awards = [
    {name:'First Win', Icon:Medal, earned:firstWin, summary:'Win a match.'},
    {name:'Training Graduate', Icon:GraduationCap, earned:training.drills===TRAINING_DRILLS.length, summary:training.drills+' of '+TRAINING_DRILLS.length+' drills cleared'},
    {name:'Road Win', Icon:MapPin, earned:props.campaignProgress.completedVenues.length>0, summary:'Win at a campaign venue.'},
    {name:'Tournament Champion', Icon:Trophy, earned:(props.campaignProgress.tournamentTitles??0)>0, summary:(props.campaignProgress.tournamentTitles??0)>0?(props.campaignProgress.tournamentTitles+' '+(props.campaignProgress.tournamentTitles===1?'title':'titles')):'Win a tournament.'},
    {name:'World Tour Champion', Icon:Crown, earned:props.campaignProgress.completedVenues.length===VENUES.length, summary:props.campaignProgress.completedVenues.length+' of '+VENUES.length+' venues won'},
  ];
  const level = profileLevel(xp);
  const social = profile?.social;
  const displayName = profile?.displayName || props.customization.playerNickname || 'Your profile';
  const run = async (work:()=>Promise<void>) => {
    setBusy(true);setStatus('');
    try { await work(); }
    catch(error) { setStatus(error instanceof Error ? error.message : 'The request could not be completed.'); }
    finally { setBusy(false); }
  };
  const loadDirectory = async (type: ConnectionView, value='')=>{
    const results = await Promise.all([
      get<PublicProfile[]>('/api/player/directory?'+new URLSearchParams({view:type,q:value})),
      type==='friends' ? get<PublicProfile[]>('/api/player/friend-requests') : Promise.resolve([]),
    ]);
    setDirectory(results[0]);if(type==='friends')setRequests(results[1]);
  };
  const fetchDirectory = (type:ConnectionView, value='') => {
    setView(type);setMenu(undefined);setDirectory(undefined);
    return run(()=>loadDirectory(type,value));
  };
  const saveProfile = (event:FormEvent) => {
    event.preventDefault();
    if (!editor) return;
    void run(async () => {
      const saved = await get<LeagueProfile>('/api/player/profile',send('PUT',editor));
      setProfile(saved);
      props.onSaveAppearance({...props.customization,playerNickname:saved.displayName});
      setEditor(undefined);setStatus('Profile saved.');
    });
  };
  const toInbox = (recipient?:PublicProfile) => {
    setMenu(undefined);
    setEditor(undefined);
    setInbox({recipient});
  };
  const changeConnection = (person:PublicProfile, action:FriendRequestAction|'follow') => run(async()=>{
    const isFollow=action==='follow';
    const change=await get<{target:PublicProfile;self:PublicProfile}>(
      isFollow?'/api/player/follow':'/api/player/friend-requests',
      send('PUT',isFollow?{key:person.key,follow:!person.followed}:{key:person.key,action})
    );
    setProfile((previous)=>previous&&{...previous,social:change.self});
    setVisits((previous)=>previous.map((entry)=>entry.person.key===person.key?{...entry,person:change.target}:entry));
    setDirectory((previous)=>previous?.map((entry)=>entry.key===person.key?change.target:entry)
      .filter((entry)=>entry.key!==person.key || view==='friends'&&entry.friendship==='friends' || view==='following'&&entry.followed || view==='followers'||view==='search'));
    if(view==='friends')await loadDirectory('friends');
    const result=isFollow?(change.target.followed?'Following ':'Unfollowed ')+change.target.name
      : action==='decline'?'Friend request declined.'
      : action==='cancel'?'Friend request canceled.'
      : change.target.friendship==='friends'?'You and '+change.target.name+' are friends.':'Friend request sent to '+change.target.name+'.';
    setStatus(result);
  });
  const actions=(person:PublicProfile, clearList=false)=><ProfileActionButtons person={person} busy={busy}
    follow={()=>void changeConnection(person,'follow')} request={(action)=>void changeConnection(person,action)}
    visit={()=>{openVisit(person,false);if(clearList)setDirectory(undefined);}}
    message={()=>{toInbox(person);if(clearList)setDirectory(undefined);}}/>;

  return <main className="profile-page" aria-label="Profile" onKeyDown={(event) => { if(event.key==='Escape') {if(editor)setEditor(undefined);else if(menu)setMenu(undefined);else if(inbox)setInbox(undefined);else back();} }}>
    <div className="profile-page-inner">
      <nav className="profile-history-nav" aria-label="Profile navigation">
        <button className="profile-nav-red" aria-label="Back" onClick={back}><ArrowLeft size={19}/></button>
        <button className="profile-nav-red profile-close-circle" aria-label="Close profile" onClick={closeProfile}><X size={19}/></button>
      </nav>
      {!visit && <header className="profile-cover field-panel">
        <div className="profile-identity">
          <div className="profile-avatar-wrap">
          {social?.mascot !== undefined ? <div className="profile-portrait profile-mascot" aria-label={MASCOT_NAMES[social.mascot]}>{MASCOTS[social.mascot]}</div> : portrait?<img className="profile-portrait" src={portrait} alt=""/>:<div className="profile-portrait"/>}
            <button className="profile-avatar-edit" aria-label="Edit profile" onClick={()=>setEditor({username:social?.username ?? '',displayName:displayName==='Your profile'?'':displayName,bio:social?.bio ?? '',mascot:social?.mascot,youtube:social?.youtube??''})}><Pencil size={17}/></button>
          </div>
          <div>
            <h1 className="text-3xl font-black sm:text-4xl">{social?.username || displayName}</h1>
            {social?.username && <p className="mt-1 text-base">{displayName}</p>}
            <div className="profile-counts">{levels.map((entry)=><div className="profile-connection" key={entry}>
              <button aria-expanded={view===entry && directory!==undefined} disabled={busy} onClick={()=>{
                if (view===entry && directory!==undefined) {setDirectory(undefined);setView(undefined);}
                else void fetchDirectory(entry);
              }}><strong>{(social?.[entry] ?? 0).toLocaleString()}</strong><span>{connectionNames[entry]} <ChevronDown size={12}/>{entry==='friends' && requests.length>0 && <small className="profile-request-count">{requests.length} {requests.length===1?'request':'requests'}</small>}</span></button>
              {view===entry && directory!==undefined && <div className="profile-connection-list field-panel">
                {entry==='friends' && requests.length>0 && <section className="profile-incoming" aria-label="Friend requests">
                  <h2>Friend requests</h2>
                  {requests.map((person)=><div className="profile-person" key={person.key}><strong>{person.name}</strong>
                    <button aria-label={'Actions for '+person.name} aria-expanded={menu===person.key} onClick={()=>setMenu(menu===person.key?undefined:person.key)}><MoreHorizontal size={16}/></button>
                    {menu===person.key && actions(person,true)}
                  </div>)}
                </section>}
                {!directory.length && <p className="p-2">No {connectionNames[entry].toLowerCase()} yet.</p>}
                {directory.map((person)=><div key={person.key} className="profile-person" onContextMenu={(event)=>{event.preventDefault();setMenu(person.key);}}>
                  <button onClick={()=>{openVisit(person,true);setDirectory(undefined);}}>{person.name}</button>
                  <button aria-label={'Actions for '+person.name} aria-expanded={menu===person.key} onClick={()=>setMenu(menu===person.key?undefined:person.key)}><MoreHorizontal size={16}/></button>
                  {menu===person.key && actions(person,true)}
                </div>)}
              </div>}
            </div>)}</div>
            {social?.youtube && <a className="inline-block text-sm text-amber-200" href={social.youtube} target="_blank" rel="noreferrer">YouTube channel ↗</a>}
            {social?.bio && <p className="max-w-prose whitespace-pre-wrap text-stone-300">{social.bio}</p>}
            <p className="mt-2 text-sm text-amber-200">Level {level.level} {profile ? ' · '+leagueTier(profile.elo)+' league' : ''}</p>
          </div>
          <div className="profile-actions flex gap-2">
            <button className="message-square" aria-label="Messages" title="Messages" onClick={()=>toInbox()}><Send size={20}/></button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {props.campaignProgress.victoryEdition && <button className="league-button" onClick={props.onCredits}>Credits & credibility</button>}
        </div>
      </header>}

      {editor && <div className="league-overlay profile-edit-overlay" role="dialog" aria-modal="true" aria-label="Edit profile">
        <form className="league-panel profile-editor theme-profile-editor" onSubmit={saveProfile}>
          <div className="league-header"><h2>Edit profile</h2><button className="profile-nav-red profile-close-circle" type="button" aria-label="Close editor" onClick={()=>setEditor(undefined)}><X size={18}/></button></div>
          <fieldset className="mascot-box"><legend>Profile mascot</legend>
            {MASCOTS.map((icon,index)=><button type="button" key={icon} aria-label={MASCOT_NAMES[index]} aria-pressed={editor.mascot===index} onClick={()=>setEditor({...editor,mascot:index})}>{icon}</button>)}
          </fieldset>
          <label>Username <small>Change once every seven days</small><input required maxLength={64} value={editor.username} onChange={(event)=>setEditor({...editor,username:event.target.value})}/></label>
          <label>Display name<input required maxLength={64} value={editor.displayName} onChange={(event)=>setEditor({...editor,displayName:event.target.value})}/></label>
          <label>Bio <small>{editor.bio.length}/1,000</small><textarea className="profile-field" maxLength={1000} rows={4} value={editor.bio} onChange={(event)=>setEditor({...editor,bio:event.target.value})}/></label>
          <label>YouTube channel<input placeholder="https://www.youtube.com/@channel" value={editor.youtube??''} maxLength={256} onChange={(event)=>setEditor({...editor,youtube:event.target.value})}/></label>
          {status && <p role="status">{status}</p>}
          <button className="league-primary" disabled={busy}>Save changes</button>
        </form></div>}
      {status && !editor && <p className="field-panel px-4 py-3" role="status">{status}</p>}

      <form className="profile-editor field-panel flex flex-wrap items-end gap-2" onSubmit={(e)=>{e.preventDefault();void fetchDirectory('search',query);}}>
        <label className="grid flex-1 gap-1">Search people<input placeholder="Display name or username" value={query} maxLength={64} onChange={(e)=>setQuery(e.target.value)}/></label>
        <button className="league-button" disabled={busy}>Search</button>
        <button type="button" className="league-button" onClick={()=>{setDirectory(undefined);setMenu(undefined);}}>Clear results</button>
      </form>
      {directory && view==='search' && <section className="field-panel profile-directory" aria-label="Player directory">
        {!directory.length && <p className="p-4">No players in this view.</p>}
        {directory.map((person)=><div className="profile-person" key={person.key}
          onContextMenu={(e)=>{e.preventDefault();setMenu(person.key);}}>
          <button className="grow text-left" onClick={()=>{setMenu(undefined);openVisit(person,true);}}><strong>{person.name}</strong>
            <span className="ml-2 text-sm text-stone-300">{person.username?'@'+person.username:''} {person.npc?'· Test NPC':''}</span></button>
          <button aria-label={'Actions for '+person.name} aria-expanded={menu===person.key} className="league-button" onClick={()=>setMenu(menu===person.key?undefined:person.key)}><MoreHorizontal size={17}/></button>
          {menu===person.key && actions(person)}
        </div>)}
      </section>}
      {visit && <section className="field-panel p-4">
        <header className="mb-3 flex justify-between gap-2"><h2 className="text-xl font-bold">{visit.person.name}{visit.base?'’s base':''}</h2>
          <div className="flex items-center gap-2"><button className="league-button" aria-label={'Actions for '+visit.person.name} aria-expanded={menu===visit.person.key} onClick={()=>setMenu(menu===visit.person.key?undefined:visit.person.key)}><MoreHorizontal size={17}/></button><button className="message-square" aria-label="Send a message" title="Send a message" onClick={()=>toInbox(visit.person)}><Send size={20}/></button></div>
        </header>
        {menu===visit.person.key && <div className="mb-3">{actions(visit.person)}</div>}
        {visit.base ? <ProfileBase key={visit.person.key} person={visit.person} customization={props.customization}/>
          : <><p>{visit.person.bio || 'Four Square player'}</p><p>{visit.person.elo} Elo · {visit.person.followers} followers</p><button className="league-button mt-2" onClick={()=>openVisit(visit.person,true)}>Visit base</button></>}
      </section>}
      {inbox && <ProfileMessages selfKey={social?.key} recipient={inbox.recipient} onClose={()=>setInbox(undefined)}/>}

      {!visit && <section className="field-panel overflow-hidden" aria-label="Character preview">
        <div className="profile-preview"><CharacterLineup characters={avatar} controlled={props.equippedCharacter.id} customization={props.customization} motion="idle"/></div>
        <div className="flex items-center justify-between p-3"><span>{props.equippedCharacter.name}</span><button className="league-button" onClick={props.onOpenCustomizer}>Open Character Studio</button></div>
      </section>}

      {!visit && <><section className="field-panel overflow-hidden">
        <nav className="league-tabs flex-wrap" aria-label="Profile views">{tabs.map((name)=><button key={name} className="league-button" aria-pressed={tab===name} onClick={()=>setTab(name)}>{name}</button>)}</nav>
        {tab==='Stats' && <div className="profile-content">
          <div className="profile-stats">{[['Elo',profile?.elo ?? '—'],['Online matches',profile?.stats.played ?? '—'],['Online wins',profile?.stats.wins ?? '—'],['Crown holds',profile?.stats.holds ?? '—'],['On this device',getMatchHistory().length],['Training drills',training.drills+'/'+TRAINING_DRILLS.length],['XP',xp]].map(([label,value])=><div key={label}><b>{value}</b><span>{label}</span></div>)}</div>
          <section className="profile-trophies" aria-label="Trophy case">
            <h3><Trophy size={19}/> Trophy case <small>{awards.filter(({earned})=>earned).length} / {awards.length} earned</small></h3>
            <div className="trophy-grid">
              {awards.map(({name,Icon,earned,summary})=><article key={name} data-earned={earned}>
                <div className="trophy-emblem"><Icon size={25}/>{!earned && <Lock size={12} className="trophy-lock"/>}</div>
                <div><h4>{name}</h4><p>{summary}</p><small>{earned?'Earned':'Locked'}</small></div>
              </article>)}
            </div>
          </section>
        </div>}
        {tab==='Items' && <div className="profile-content collectible-gallery">
          {ITEM_RARITIES.map((rarity,index)=>{
            const all=VENUES.flatMap(({id})=>campusCollectibles(id)).filter((item)=>item.rarity===rarity);
            const found=all.filter(({id})=>props.campaignProgress.collectibles?.includes(id));
            return <section key={rarity} data-rarity={index}>
              <h3>{rarity} <small>{found.length} collected</small></h3>
              <div>{Array.from({length:Math.max(4,found.length)},(_,slot)=>found[slot] ?
                <article key={found[slot].id}><span>{found[slot].icon}</span><strong>{found[slot].name}</strong></article> :
                <article key={slot} aria-label="Undiscovered item"><span>◇</span><small>Undiscovered</small></article>)}</div>
            </section>;
          })}
        </div>}
        {tab==='Recordings' && <div className="profile-content">
          <h3>Recordings and screenshots</h3>
          <p className="text-sm text-stone-300">{props.savedReplays.filter((item)=>item.image).length} / {IMAGE_LIMIT.toLocaleString()} images · {Math.ceil(props.savedReplays.reduce((total,item)=>total+(item.video?item.durationSeconds:0),0)/60)} / {VIDEO_SECONDS_LIMIT/60} min video</p>
          {social?.youtube && <a className="league-button" href="https://studio.youtube.com/" target="_blank" rel="noreferrer">Open YouTube Studio ↗</a>}
          <input className="profile-field mt-3" aria-label="Filter recordings" placeholder="Filter recordings" value={filterMedia} onChange={(event)=>setFilterMedia(event.target.value)}/>
          <div className="flex flex-wrap gap-2 py-2">
            <label>Show <select className="profile-field" value={mediaType} onChange={(event)=>setMediaType(event.target.value)}>
              <option value="all">All captures</option><option value="video">Videos</option><option value="image">Images</option>
            </select></label>
            <label>Order <select className="profile-field" value={oldest?'oldest':'newest'} onChange={(event)=>setOldest(event.target.value==='oldest')}>
              <option value="newest">Newest first</option><option value="oldest">Oldest first</option>
            </select></label>
          </div>
          {!props.savedReplays.length && <p>Use Screenshot or Record in the pause menu to save your first capture.</p>}
          {videoUrl && activeMedia && <section className="field-panel my-3 grid gap-3 p-3">
            {activeMedia.image ? <img className="profile-video" src={videoUrl} alt={activeMedia.title}/> : <>
              <video ref={videoNode} src={videoUrl} className="profile-video" controls playsInline/>
              <div className="flex flex-wrap items-end gap-2">
                <label>From (s) <input className="profile-field w-20" type="number" min={0} max={activeMedia.durationSeconds} value={clipStart} onChange={(event)=>setClipStart(event.target.valueAsNumber || 0)}/></label>
                <label>To (s) <input className="profile-field w-20" type="number" min={0} max={activeMedia.durationSeconds} value={clipEnd} onChange={(event)=>setClipEnd(event.target.valueAsNumber || 0)}/></label>
                <button className="league-button" disabled={busy} onClick={()=>{
                  const mark=activeMedia.highlight ?? Math.max(0,activeMedia.durationSeconds-6);
                  setClipStart(Math.max(0,mark-5));setClipEnd(Math.min(mark+7,activeMedia.durationSeconds));
                }}>Suggest highlight</button>
                <button className="league-button" disabled={busy || clipEnd<=clipStart} onClick={()=>void run(async()=>{
                  if(!videoNode.current) return;
                  const result=await exportClip(videoNode.current,Math.max(0,clipStart),Math.min(clipEnd,activeMedia.durationSeconds));
                  downloadMedia(result,activeMedia.title+'-clip.webm');
                })}>Export clip</button>
              </div>
            </>}
            <button className="league-button justify-self-start" onClick={()=>video && downloadMedia(video,activeMedia.title+(activeMedia.image?'.png':'.webm'))}>Download original</button>
          </section>}
          {(oldest?[...props.savedReplays].reverse():props.savedReplays).filter((item)=>(mediaType==='all'||(mediaType==='image'?item.image:item.video)) && (item.title+' '+item.venueName).toLowerCase().includes(filterMedia.toLowerCase())).map((item)=><div className="profile-replay" key={item.id}>
            <div><strong>{item.title}</strong><p>{item.venueName} · {item.image?'Image':item.durationSeconds+'s'}</p></div>
            {(item.video || item.image)&&<button className="league-button" onClick={()=>void run(async()=>{
              const data=await loadReplayVideo(item.id);if(!data)throw Error('Recording unavailable.');
              setActiveMedia(item);setVideo(data);setClipStart(0);setClipEnd(item.durationSeconds);setRename(item.title);
            })}>{item.image?'View':'Open'}</button>}
            {activeMedia?.id===item.id && <form className="flex gap-1" onSubmit={(event)=>{event.preventDefault();const title=rename.trim();if(title){props.onRenameReplay(item.id,title);setActiveMedia({...item,title});}}}>
              <input aria-label="Capture title" className="profile-field w-35" value={rename} maxLength={80} onChange={(event)=>setRename(event.target.value)}/>
              <button className="league-button">Rename</button>
            </form>}
            <button className="league-button" onClick={()=>{if(activeMedia?.id===item.id){setVideo(undefined);setActiveMedia(undefined);}props.onDeleteReplay(item.id);}}>Delete</button>
          </div>)}
        </div>}
        {tab==='Campaign' && <div className="profile-content"><p>{props.campaignProgress.completedVenues.length} venues won · {props.campaignProgress.lessonsCompleted?.length ?? 0} lessons passed</p><button className="league-primary mt-2" onClick={props.onCampaign}>Open 3D campaign</button></div>}
        {tab==='Marketplace' && <div className="profile-content">
          <div className="market-profile-hero"><Wallet size={38}/><div><h3>Club wallet</h3><p>Your balances, collection, and trading activity</p></div><button className="league-primary" onClick={props.onMarket}><ShoppingBag size={17}/>Open auctions</button></div>
          <div className="profile-stats"><div><b>{market?.coins ?? '—'}</b><span>{market?.test?'Test coins':'Online coins'}</span></div><div><b>{props.campaignProgress.coins}</b><span>Campaign coins</span></div><div><b>{market?.cards.length ?? '—'}</b><span>Cards</span></div></div>
          {market && market.cards.length>0 && <section className="market-profile-collection">
            <h3>Your cards</h3><div>{market.cards.slice(0,4).map((card)=>{
              const character=CHARACTERS.find(({id})=>id===card.characterId);
              return <article key={card.id}>
                {marketPortraits[card.characterId] ? <img src={marketPortraits[card.characterId]} alt=""/> : <Trophy size={36}/>}
                <strong>{character?.name ?? 'Player card'}</strong>{card.listed && <small>Listed</small>}
              </article>;
            })}</div>
          </section>}
          <h3 className="mt-4">Transactions</h3>
          {market && !market.ledger.length&&<p>No transactions yet.</p>}
          {market?.ledger.map(({ref,delta})=><p className="market-profile-transaction" key={ref}>{({ball:'Ball purchase',bundle:'Coin bundle',pack:'Pack purchase',match:'Match reward'} as Record<string,string>)[ref.split(':')[0]] ?? ref.split(':')[0].replace(/-/g,' ')} · {delta>0?'+':''}{delta} coins</p>)}
        </div>}
      </section>
      <footer className="profile-xp field-panel"><span>Level {level.level}</span><progress value={level.current} max={level.required} aria-label="Progress to the next level"/><span>{level.current.toLocaleString()} / {level.required.toLocaleString()} XP</span></footer></>}
    </div>
  </main>;
}
