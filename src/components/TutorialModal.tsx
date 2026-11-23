import { useEffect, useRef, useState } from 'react';
import { useGamepad } from '../services/useGamepad';
import { readGamepad } from '../services/gamepad';
import { advanceBall, createSoloLineup, executeHit, incomingReturn } from '../services/foursquareEngine';
import { returnReach } from '../services/returnReach';
import { DRILL_DPAD, TRAINING_DRILLS, type DrillId } from '../services/training';
import { CHARACTERS } from '../utils/characters';
import { VENUES } from '../utils/venueData';
import type { SquareId } from '../types/foursquare';
import { ThreeCourtScene } from './ThreeCourtScene';

const roster=CHARACTERS.slice(0,4).map(({id})=>id);
const receiveRoster=[roster[3],roster[1],roster[2],roster[0]];
const footwork=[{x:-.8,z:3.65},{x:-3.95,z:1.18}];
const reachMark={x:-.67,z:1.1};
const cornerMark={x:4.12,z:4.1};
type Turn = 'ready'|'incoming'|'outgoing'|'passed'|'retry';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  completed: readonly string[];
  onComplete: (id: DrillId) => void;
}

export function TutorialModal(props: Props) {
  return props.isOpen ? <TrainingCourt {...props}/> : null;
}

function TrainingCourt({onClose,completed,onComplete}:Props) {
  const [selected,setSelected]=useState(0);
  const [attempt,setAttempt]=useState(0);
  const [finished,setFinished]=useState(false);
  const drill=TRAINING_DRILLS[selected];
  const next=()=>{
    if(selected === TRAINING_DRILLS.length-1) setFinished(true);
    else setSelected(selected+1);
  };
  return <section className="training-court" role="dialog" aria-modal="true" aria-label="Tutorial training drills">
    {finished ? <header><div><span>Tutorial</span><h2>Drills complete</h2><p>{completed.length} of {TRAINING_DRILLS.length} drills cleared.</p></div><button className="league-primary" onClick={onClose}>Finish</button></header> :
      <Drill key={drill.id+':'+attempt} drill={drill} alreadyEarned={completed.includes(drill.id)} onComplete={()=>onComplete(drill.id)}
        next={next} retry={()=>setAttempt(attempt+1)} onClose={onClose} selected={selected} select={setSelected}/>}
  </section>;
}

function Drill({drill,alreadyEarned,onComplete,next,retry,onClose,selected,select}:{
  drill: typeof TRAINING_DRILLS[number]; alreadyEarned:boolean; onComplete:()=>void;
  next:()=>void; retry:()=>void; onClose:()=>void; selected:number; select:(index:number)=>void;
}) {
  const movement=drill.id==='footwork'||drill.id==='reach';
  const diving = drill.id === 'dive-return';
  const playerPose = useRef({ x: 2.6, z: -2.6, reaching: false });
  const queuedDive = useRef(false);
  const receiving=!movement&&drill.id!=='serve';
  const [shot,setShot]=useState(0);
  const [waypoint,setWaypoint]=useState(0);
  const [game,setGame]=useState(()=>{
    if(!receiving)return createSoloLineup('league',roster,'You',1);
    const ready=createSoloLineup('league',receiveRoster,'You',4);
    return executeHit(ready,ready.servingPlayerId,4,'normal',diving ? { x: 2.6, z: -4.18 } : undefined);
  });
  const [turn,setTurn]=useState<Turn>(receiving?'incoming':'ready');
  const [cue,setCue]=useState(receiving?'Wait for the bounce.':'');
  const [earnedAtStart]=useState(alreadyEarned);
  const target:SquareId=drill.id==='serve'?4:drill.id==='cross'||(drill.id==='rally'&&shot===1)?1:drill.id==='placement'?3:2;
  const marker=turn==='passed'?undefined:drill.id==='footwork'?footwork[waypoint]:drill.id==='reach'?reachMark:drill.id==='placement'?cornerMark:undefined;
  const pass=()=>{
    setTurn('passed');
    setCue('Drill passed');
    onComplete();
  };
  const strike=(square:SquareId, point?:{x:number;z:number}, power=false)=>{
    if (movement || turn==='outgoing' || turn==='passed' || turn==='retry') return;
    if (square!==target) {setCue('Aim for Square '+target+'.');return;}
    if (turn==='incoming') {
      const arrival = diving ? incomingReturn(game) : undefined;
      if (arrival && arrival.seconds <= 0.23 && playerPose.current.reaching) {
        queuedDive.current = true;
        setCue('Dive queued. Keep holding reach.');
      } else setCue('Wait for the first bounce.');
      return;
    }
    if (diving) {
      if (!playerPose.current.reaching) {setCue('Hold F or RB / R1 as you return.');return;}
      if (returnReach(game.ballState, playerPose.current) !== 'ready') {setCue('Move toward the bounce, then reach.');return;}
    }
    if (drill.id==='power'&&!power) {setCue('Hold Shift or RT / R2 as you hit.');return;}
    const aim=drill.id==='placement'?point??cornerMark:undefined;
    if(aim&&Math.hypot(aim.x-cornerMark.x,aim.z-cornerMark.z)>.6){setCue('Aim inside the gold circle.');return;}
    const hit=executeHit(game,game.humanPlayerId,target,drill.id==='power'?'fast':'normal',aim);
    if(hit!==game){setGame(hit);setTurn('outgoing');setCue('Watch where it lands.');}
  };
  useEffect(()=>{
    if(turn!=='incoming'&&turn!=='outgoing')return;
    if(game.ballState.hasBouncedThisPlay){
      if(turn==='incoming'){
        if(game.activeTurnPlayerId===game.humanPlayerId){setTurn('ready');setCue('Bounce! Aim for Square '+target+'.');}
        else {setTurn('retry');setCue('The feed missed your square.');}
      } else if(game.ballState.currentSquareOwner!==target){
        setTurn('retry');setCue('The return missed the target.');
      } else if(drill.id==='rally'&&shot===0){
        const feeder=game.activeTurnPlayerId;
        if(!feeder){setTurn('retry');return;}
        setShot(1);setGame(executeHit(game,feeder,4));setTurn('incoming');setCue('Watch the feed back to Square 4.');
      } else pass();
      return;
    }
    if(!game.ballState.isLive){setTurn('retry');setCue('The ball missed the court.');}
  },[turn,game,drill.id,shot,target]);
  useEffect(()=>{
    if(turn==='ready' && diving && queuedDive.current && game.ballState.isLive &&
        playerPose.current.reaching && returnReach(game.ballState, playerPose.current) === 'ready') {
      queuedDive.current = false;
      strike(target);
    }
    if (turn==='ready' && diving && !game.ballState.isLive) {
      setTurn('retry');
      setCue('Too late. Aim as the ball bounces.');
    }
  },[turn,game,diving,target]);
  useEffect(()=>{
    const trackingDive = diving && turn==='ready';
    if(turn!=='incoming'&&turn!=='outgoing'&&!trackingDive)return;
    let frame=0,last=performance.now();
    const tick=(now:number)=>{
      const dt=Math.min(.1,(now-last)/1000);
      last=now;
      const speed = trackingDive ? 0.2 : diving && turn==='incoming' ? 0.52 : 1;
      setGame((previous)=>previous.ballState.isLive&&(!previous.ballState.hasBouncedThisPlay || trackingDive)
        ? advanceBall(previous,dt * speed) : previous);
      frame=requestAnimationFrame(tick);
    };
    frame=requestAnimationFrame(tick);
    return()=>cancelAnimationFrame(frame);
  },[turn,diving]);
  useGamepad((pressed)=>{
    if(pressed.includes(1)||pressed.includes(9)){onClose();return;}
    if(pressed.includes(0)&&turn==='passed'){next();return;}
    if(pressed.includes(0)&&turn==='retry'){retry();return;}
    const chosen=DRILL_DPAD.find(([key])=>pressed.includes(key));
    if(chosen || pressed.includes(0))strike(chosen?.[1]??target,undefined,(readGamepad()?.buttons[7]?.value??0)>.35);
  });
  useEffect(()=>{
    const keys=(event:KeyboardEvent)=>{
      if(event.code==='Escape'){event.stopImmediatePropagation();onClose();return;}
      if ((event.target as HTMLElement)?.closest('input,textarea,select,button') || event.repeat) return;
      if (event.code==='Space'&&turn==='passed'){event.preventDefault();next();return;}
      if (event.code==='Space'&&turn==='retry'){event.preventDefault();retry();return;}
      if(event.code==='Space'||/^(Digit|Numpad)[1-4]$/.test(event.code)){
        event.preventDefault();
        strike(event.code==='Space'?target:Number(event.code.slice(-1)) as SquareId,undefined,event.shiftKey);
      }
    };
    window.addEventListener('keydown',keys,true);
    return()=>window.removeEventListener('keydown',keys,true);
  });
  return <>
    <ThreeCourtScene skipMatchIntro manualFootwork assistFootwork={!diving} mode="match" venue={VENUES[0]} cameraView="action"
      players={game.players} waitingQueue={[]} ballState={game.ballState} refereeCall={game.refereeCall} humanPlayerId={game.humanPlayerId}
      activeTurnPlayerId={game.activeTurnPlayerId} servingPlayerId={game.servingPlayerId}
      drillMarker={marker} clickDrillMarkerToMove={movement}
      isHumanTurn={!movement && (turn==='ready' || (diving && turn==='incoming'))} highlightedSquares={!movement&&turn!=='passed'?[target]:[]}
      onSelectTargetSquare={strike}
      onControlledPose={({x,z,reaching})=>{
        playerPose.current = { x, z, reaching };
        if(!movement||turn!=='ready'||!marker||Math.hypot(x-marker.x,z-marker.z)>=.63)return;
        if(drill.id==='footwork'&&waypoint===0){setWaypoint(1);setCue('Now reach the second ring.');}
        else if(drill.id==='reach'&&!reaching){setCue('Hold F or RB / R1 at the ring.');}
        else pass();
      }}
    />
    <header><div><span>Drill {selected+1} of {TRAINING_DRILLS.length}</span><h2>{drill.title}</h2><p>{drill.instructions}</p></div>
      <div className="flex flex-wrap justify-end gap-2">
        <select className="league-button" aria-label="Choose drill" value={selected} onChange={(event)=>select(Number(event.target.value))}>
          {TRAINING_DRILLS.map(({id,title},index)=><option key={id} value={index}>{title}</option>)}
        </select><button className="league-button" onClick={onClose}>Exit</button>
      </div>
    </header>
    <footer><span role="status">{turn==='passed'&&!earnedAtStart ? 'Drill passed · +'+drill.xp+' XP · +'+drill.coins+' coins' : cue||'First clear · '+drill.xp+' XP · '+drill.coins+' coins'}</span>
      {turn==='passed' && <button className="league-primary" onClick={next}>{selected===TRAINING_DRILLS.length-1?'Finish':'Next drill'}</button>}
      {turn==='retry' && <button className="league-primary" onClick={retry}>Try again</button>}
    </footer>
  </>;
}
