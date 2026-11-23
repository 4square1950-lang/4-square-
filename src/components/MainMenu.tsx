import { useEffect, useRef, useState } from 'react';
import { Play, Globe, Trophy, Shirt, User, Settings, CircleHelp, Pause, SkipForward, Volume2, Video, VideoOff } from 'lucide-react';
import type { VenueDef } from '../types/campaign';
import { venueStill } from '../utils/venueArt';
import { soundFX } from '../services/soundEffects';
import { readGamepad } from '../services/gamepad';

interface MainMenuProps {
  coins: number;
  activeVenue: VenueDef;
  onCampaignMode: () => void;
  onPlayNow: () => void;
  onArenas: () => void;
  onOnlineMatch: () => void;
  onTournament: () => void;
  onStandings: () => void;
  onStats: () => void;
  onClans: () => void;
  onMeetPlayers: () => void;
  onTutorial: () => void;
  onRules: () => void;
  onShop: () => void;
  onAuctions: () => void;
  onCustomizer: () => void;
  onSettings: () => void;
  creditsUnlocked: boolean;
  onCreditsCredibility: () => void;
  onOpenProfile?: () => void;
  isPlayingMusic: boolean;
  onToggleMusic: () => void;
  onNextTrack: () => void;
  currentTrackName: string;
  isCommentaryEnabled?: boolean;
  onToggleCommentary?: () => void;
  isMenuVideoDisabled?: boolean;
  onToggleDisableMenuVideo?: () => void;
}

type Destination = 'Play' | 'Campaign' | 'Compete' | 'Club' | 'Help';

export function MainMenu(props: MainMenuProps) {
  const [active, setActive] = useState<Destination>();
  const root = useRef<HTMLElement>(null);
  const groups = [
    { name:'Play', Icon:Play, actions:[['Single player',props.onPlayNow],['Multiplayer',props.onOnlineMatch]] },
    { name:'Campaign', Icon:Globe, actions:[['World map',props.onCampaignMode],['Venue tours',props.onArenas]] },
    { name:'Compete', Icon:Trophy, actions:[['Tournaments',props.onTournament],['Stats',props.onStats],['Standings',props.onStandings]] },
    { name:'Club', Icon:Shirt, actions:[['Clans',props.onClans],['Character Studio',props.onCustomizer],['Players',props.onMeetPlayers],['Shop',props.onShop],['Auctions',props.onAuctions]] },
  ] as const;
  const launch = (action:()=>void) => { soundFX.playClick(); setActive(undefined); action(); };
  useEffect(() => {
    let frame = 0, previous = new Set<number>();
    const poll = () => {
      frame = requestAnimationFrame(poll);
      const pad = document.hasFocus() ? readGamepad() : undefined;
      const now = new Set(pad?.buttons.flatMap((key,index) => key.pressed ? [index] : []));
      const hit = (button:number) => now.has(button) && !previous.has(button);
      if (!document.querySelector('[aria-modal="true"]') && root.current && [12,13,14,15,0,1].some(hit)) {
        const buttons = Array.from(root.current.querySelectorAll<HTMLButtonElement>('[data-home-control]'));
        const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
        if (hit(1)) setActive(undefined);
        else if (hit(0)) { if (current === -1) buttons[0]?.focus(); else buttons[current]?.click(); }
        else buttons[(current < 0 ? 0 : (current + (hit(12)||hit(14)?-1:1) + buttons.length)%buttons.length)]?.focus();
      }
      previous = now;
    };
    frame = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(frame);
  }, []);
  return <main ref={root} className="home-menu" aria-label="Four Square main menu" onKeyDown={(event)=>{if(event.key==='Escape')setActive(undefined);}}>
    {props.isMenuVideoDisabled && <div className="absolute inset-0 bg-cover bg-center" style={{backgroundImage:'url("'+venueStill(props.activeVenue.id)+'")'}}/>}
    <div className="home-shade"/>
    <header className="home-top">
      <strong className="home-wordmark">Four Square</strong>
      <nav aria-label="Account and help">
        <button data-home-control onClick={()=>props.onOpenProfile && launch(props.onOpenProfile)}><User size={18}/>Profile</button>
        <button data-home-control onClick={()=>launch(props.onSettings)}><Settings size={18}/>Settings</button>
        <button data-home-control aria-expanded={active==='Help'} onClick={()=>setActive(active==='Help'?undefined:'Help')}><CircleHelp size={18}/>Help</button>
      </nav>
    </header>
    <section className="home-footer">
      <p className="home-venue"><Globe size={15}/>{props.activeVenue.name}</p>
      {active==='Help' && <section className="home-actions" aria-label="Help options">
        <button data-home-control onClick={()=>launch(props.onTutorial)}>Tutorial · Training drills</button>
        <button data-home-control onClick={()=>launch(props.onRules)}>Rules &amp; controls</button>
        {props.creditsUnlocked && <button data-home-control onClick={()=>launch(props.onCreditsCredibility)}>Credits &amp; credibility</button>}
      </section>}
      <nav className="home-modes" aria-label="Game modes">{groups.map(({name,Icon,actions})=><div className="home-destination" key={name}>
        {active===name && <section className="home-actions home-tile-actions" aria-label={name+' options'}>
          {actions.map(([label,action])=><button key={label} data-home-control onClick={()=>launch(action)}>{label}</button>)}
        </section>}
        <button className="home-mode-tile" data-home-control aria-expanded={active===name} onClick={()=>{soundFX.playClick();setActive(active===name?undefined:name);}}><Icon size={25}/><strong>{name}</strong></button>
      </div>)}</nav>
      <div className="home-media">
        <button className="field-icon" aria-label={props.isPlayingMusic?'Pause music':'Play music'} title="Play or pause the soundtrack" onClick={props.onToggleMusic}>{props.isPlayingMusic?<Pause size={16}/>:<Play size={16}/>}</button>
        <button className="field-icon" aria-label="Next track" title="Skip to the next track" onClick={props.onNextTrack}><SkipForward size={16}/></button>
        <span>{props.currentTrackName}</span>
        {props.onToggleCommentary && <button className="field-icon" aria-label="Commentary" title="Turn commentary on or off" aria-pressed={props.isCommentaryEnabled} onClick={props.onToggleCommentary}><Volume2 size={16}/></button>}
        {props.onToggleDisableMenuVideo && <button className="field-icon" aria-label="Pause live background" title="Pause or resume the live menu background" aria-pressed={props.isMenuVideoDisabled} onClick={props.onToggleDisableMenuVideo}>{props.isMenuVideoDisabled?<VideoOff size={16}/>:<Video size={16}/>}</button>}
      </div>
    </section>
  </main>;
}
