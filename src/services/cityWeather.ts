import {useEffect,useState} from 'react';
import type {CourtWeather} from './soloSetup';
import type {VenueId} from '../types/campaign';
import {getVenueArt} from '../utils/venueArt';

interface CityWeather { condition:CourtWeather; temperature:number; time:string }
const cache=new Map<VenueId,{expires:number;value:CityWeather}>();
export function conditionFromCode(code:number):CourtWeather {
  if([71,73,75,77,85,86].includes(code))return 'Snow';
  if([45,48].includes(code))return 'Fog';
  if(code>=51)return 'Rain';
  return code===0?'Clear':'Overcast';
}
export function useCityWeather(venue:VenueId,active:boolean) {
  const [state,setState]=useState<{id:VenueId;value?:CityWeather;failed?:boolean}>();
  useEffect(()=>{
    if(!active)return;
    const {latitude,longitude}=getVenueArt(venue);
    const known=cache.get(venue);
    if(known&&known.expires>Date.now()){setState({id:venue,value:known.value});return;}
    const controller=new AbortController();
    const timeout=window.setTimeout(()=>{setState({id:venue,failed:true});controller.abort();},6000);
    const query=new URLSearchParams({latitude:String(latitude),longitude:String(longitude),current:'temperature_2m,weather_code'});
    fetch('https://api.open-meteo.com/v1/forecast?'+query,{signal:controller.signal}).then((response)=>{
      if(!response.ok)throw Error();return response.json();
    }).then(({current})=>{
      if(controller.signal.aborted)return;
      if(!Number.isFinite(current?.weather_code)||!Number.isFinite(current?.temperature_2m))throw Error();
      const value={condition:conditionFromCode(current.weather_code),temperature:current.temperature_2m,time:String(current.time)};
      cache.set(venue,{expires:Date.now()+600000,value});setState({id:venue,value});
    }).catch(()=>{if(!controller.signal.aborted)setState({id:venue,failed:true});}).finally(()=>window.clearTimeout(timeout));
    return()=>{window.clearTimeout(timeout);controller.abort();};
  },[venue,active]);
  return state?.id===venue?state:undefined;
}
