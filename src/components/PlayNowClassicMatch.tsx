import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { ChevronLeft, ChevronRight, Cloud, CloudFog, CloudRain, Layers, MapPin, Snowflake, Sun } from 'lucide-react';
import * as THREE from 'three';
import { CHARACTERS } from '../utils/characters';
import { VENUES } from '../utils/venueData';
import { venueStill } from '../utils/venueArt';
import { courtBallMaterial } from '../utils/courtBall';
import { COURT_WEATHER, type SoloSetup } from '../services/soloSetup';
import { CharacterLineup } from './CharacterLineup';
import { BALLS, STARTER_BALL, type BallDef, type BallLook } from '../services/ballCatalog';
import { loadMarket, preparePlayerSession } from '../services/marketClient';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onStartMatch: (setup: SoloSetup) => void;
  activeVenueId: string;
  playerName: string;
}

const courts = [
  {id:'outdoor',name:'Outdoor blacktop',short:'Outdoor'},
  {id:'indoor',name:'Indoor gymnasium',short:'Indoor'},
] as const;
const weatherIcons = {Clear:Sun, Overcast:Cloud, Rain:CloudRain, Snow:Snowflake, Fog:CloudFog};
const previewOrder = [1,3,0,2] as const;

function BallPreview({ball,color}:{ball:BallDef;color:string}) {
  const host=useRef<HTMLDivElement>(null);
  const draw=useRef<((look:BallLook)=>void)|null>(null);
  const [webgl,setWebgl]=useState(false);
  useEffect(()=>{
    const node=host.current;
    if(!node)return;
    let renderer:THREE.WebGLRenderer;
    try { renderer=new THREE.WebGLRenderer({alpha:true,antialias:true}); } catch { return; }
    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(34,1,.1,20);
    camera.position.set(0,0,4.35);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    renderer.setSize(94,94,false);
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    const key=new THREE.DirectionalLight(0xffedcc,3.2);
    key.position.set(-3,4,5);
    const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,48,32),new THREE.MeshStandardMaterial());
    mesh.rotation.set(.18,-.48,-.18);
    scene.add(mesh,key,new THREE.HemisphereLight(0xd4e8f2,0x394037,1.5));
    node.appendChild(renderer.domElement);
    const disposeMaterial=()=>{
      mesh.material.map?.dispose();mesh.material.bumpMap?.dispose();
      mesh.material.dispose();
    };
    draw.current=(look)=>{
      disposeMaterial();
      mesh.material=courtBallMaterial(look);
      renderer.render(scene,camera);
    };
    setWebgl(true);
    return ()=>{
      draw.current=null;
      mesh.geometry.dispose();
      disposeMaterial();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  },[]);
  useEffect(()=>{ draw.current?.({id:ball.id,color}); },[ball.id,color]);
  return <div className="match-ball-preview" ref={host} aria-hidden="true">
    {!webgl && <div className={'catalog-ball ball-'+ball.pattern} style={{backgroundColor:color,'--trim':ball.trim} as CSSProperties}/>}
  </div>;
}

function CarouselArrows({label,onMove,disabled=false}:{label:string;onMove:(direction:number)=>void;disabled?:boolean}) {
  return <>
    <button disabled={disabled} className="match-picker-arrow" aria-label={'Previous '+label} onClick={()=>onMove(-1)}><ChevronLeft size={20}/></button>
    <button disabled={disabled} className="match-picker-arrow" aria-label={'Next '+label} onClick={()=>onMove(1)}><ChevronRight size={20}/></button>
  </>;
}

function keyScroll(event:KeyboardEvent,onMove:(direction:number)=>void) {
  if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
    event.preventDefault();
    onMove(event.key==='ArrowLeft'?-1:1);
  }
}

export function PlayNowClassicMatch({ isOpen, onClose, onStartMatch, activeVenueId, playerName }: Props) {
  const [slots, setSlots] = useState(() => CHARACTERS.slice(0, 4).map(({ id }) => id));
  const [venueId, setVenue] = useState('');
  const [surface, setSurface] = useState<SoloSetup['surface']>('outdoor');
  const [weather, setWeather] = useState<SoloSetup['weather']>('Clear');
  const [ballId, setBallId] = useState<BallLook['id']>(STARTER_BALL.id);
  const [inventory, setInventory] = useState<{ id:string; color:string }[]>([]);
  const [picker,setPicker] = useState<'court'|'weather'>();
  const swipeOrigin = useRef<{id:number;x:number;y:number}|undefined>(undefined);
  useEffect(() => {
    if (!isOpen) { setPicker(undefined); return; }
    let active = true;
    void preparePlayerSession().then(loadMarket).then((market) => { if (active) setInventory(market.balls); }).catch(() => {});
    return () => { active = false; };
  },[isOpen]);

  const available = BALLS.filter(({id,price})=>!price||inventory.some((item)=>item.id===id));
  const ball = available.find(({id})=>id===ballId) ?? STARTER_BALL;
  const venue = VENUES.find(({id})=>id===(venueId||activeVenueId)) ?? VENUES[0];
  const ballPosition = available.findIndex(({id})=>id===ball.id);
  const venuePosition = VENUES.indexOf(venue);
  const color = inventory.find(({id})=>id===ball.id)?.color ?? ball.color;
  const preview=useMemo<Omit<SoloSetup,'lineup'>>(()=>({venueId:venue.id,surface,weather:surface==='indoor'?'Clear':weather,ball:{id:ball.id,color}}),
    [venue.id,surface,weather,ball.id,color]);
  const characters = useMemo(()=>previewOrder.map((index)=>CHARACTERS.find(({id})=>id===slots[index])!),[slots]);
  const moveBall = (direction:number)=>setBallId(available[(ballPosition+direction+available.length)%available.length].id);
  const moveVenue = (direction:number)=>setVenue(VENUES[(venuePosition+direction+VENUES.length)%VENUES.length].id);
  const WeatherIcon = weatherIcons[weather];

  const startSwipe=(event:PointerEvent<HTMLDivElement>)=>{
    if(!event.isPrimary||event.button!==0)return;
    swipeOrigin.current={id:event.pointerId,x:event.clientX,y:event.clientY};
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const finishSwipe=(event:PointerEvent<HTMLDivElement>)=>{
    const origin=swipeOrigin.current;
    swipeOrigin.current=undefined;
    if(!origin||origin.id!==event.pointerId||event.type==='pointercancel')return;
    const dx=event.clientX-origin.x;
    if(Math.abs(dx)>28&&Math.abs(dx)>Math.abs(event.clientY-origin.y))moveBall(dx<0?1:-1);
  };

  if (!isOpen) return null;
  return <div className="league-overlay" role="dialog" aria-modal="true" aria-label="Single player" onKeyDown={(event)=>{
    if(event.key==='Escape'){if(picker)setPicker(undefined);else onClose();}
  }}>
    <section className="league-panel lineup-panel">
      <header className="league-header"><h2>Single player</h2><button className="league-button" onClick={onClose}>Close</button></header>
      <div className="lineup-court">
        <CharacterLineup characters={characters} motion="idle" court setup={preview}/>
      </div>
      <div className="lineup-squares lineup-picks">
        {slots.map((selectedId,index)=><div key={index}>
          <label>Square {index+1}<select value={selectedId} onChange={(event)=>{
            const id=event.target.value;
            setSlots((previous)=>previous.map((value,slot)=>slot===index?id:value));
          }}>{CHARACTERS.filter(({id})=>id===selectedId||!slots.includes(id)).map(({id,name})=><option key={id} value={id}>{name}</option>)}</select></label>
        </div>)}
      </div>
      <div className="match-selectors">
        <section className="match-picker match-picker-ball" aria-label="Match ball" onKeyDown={(event)=>keyScroll(event,moveBall)}>
          <CarouselArrows label="ball" onMove={moveBall} disabled={available.length<2}/>
          <div className="match-picker-detail" onPointerDown={startSwipe} onPointerUp={finishSwipe} onPointerCancel={finishSwipe}>
            <BallPreview ball={ball} color={color}/>
            <div><p className="match-picker-label">Match ball <small>{ballPosition+1} / {available.length}</small></p><strong aria-live="polite">{ball.name}</strong></div>
          </div>
        </section>
        <section className="match-picker match-picker-venue" aria-label="Venue" onKeyDown={(event)=>keyScroll(event,moveVenue)}>
          <img src={venueStill(venue.id)} alt="" aria-hidden="true"/>
          <CarouselArrows label="venue" onMove={moveVenue}/>
          <div className="match-picker-detail">
            <div><p className="match-picker-label"><MapPin size={13}/> Venue <small>{venuePosition+1} / {VENUES.length}</small></p><strong aria-live="polite">{venue.name}</strong></div>
          </div>
        </section>
      </div>
      {picker && <section className="match-choice-panel" aria-label={picker==='court'?'Court choices':'Weather choices'}>
        {picker==='court' ? courts.map((court)=><button key={court.id} className="league-button" aria-pressed={surface===court.id} onClick={()=>{setSurface(court.id);setPicker(undefined);}}>{court.name}</button>)
          : COURT_WEATHER.map((condition)=>{const Icon=weatherIcons[condition];return <button key={condition} className="league-button" aria-pressed={condition===weather} onClick={()=>{setWeather(condition);setPicker(undefined);}}><Icon size={16}/> {condition}</button>;})}
      </section>}
      <footer className="league-footer match-lineup-footer">
        <p>{playerName} starts in a random square.</p>
        <div>
          <button className="league-button" aria-label={'Court: '+(surface==='outdoor'?'Outdoor':'Indoor')} aria-expanded={picker==='court'} onClick={()=>setPicker(picker==='court'?undefined:'court')}><Layers size={16}/> {surface==='outdoor'?'Outdoor':'Indoor'}</button>
          <button className="league-button" aria-label={surface==='indoor'?'Weather is available on outdoor courts':'Weather: '+weather} aria-expanded={picker==='weather'} title={surface==='indoor'?'Weather is available on outdoor courts':'Change weather'} disabled={surface==='indoor'} onClick={()=>setPicker(picker==='weather'?undefined:'weather')}><WeatherIcon size={16}/> {surface==='indoor'?'Weather':weather}</button>
          <button className="league-primary" onClick={()=>onStartMatch({lineup:slots,...preview})}>Start match</button>
        </div>
      </footer>
    </section>
  </div>;
}
