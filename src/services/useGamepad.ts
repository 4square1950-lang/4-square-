import { useEffect, useRef } from 'react';
import { readGamepad } from './gamepad';

export function useGamepad(onPress: (pressed: number[]) => void) {
  const callback=useRef(onPress);
  callback.current=onPress;
  useEffect(()=>{
    let frame=0;
    let previous: boolean[]=[];
    const loop=()=>{
      frame=requestAnimationFrame(loop);
      const next=(document.hasFocus()?readGamepad():undefined)?.buttons.map(({pressed})=>pressed)??[];
      const pressed=next.flatMap((down,index)=>down && previous.length && !previous[index]?[index]:[]);
      if(pressed.length)callback.current(pressed);
      previous=next;
    };
    frame=requestAnimationFrame(loop);
    return()=>cancelAnimationFrame(frame);
  },[]);
}
