import { LADDER_VENUES } from '../utils/venueData';
import { COURT_HALF_SIZE } from '../utils/courtGeometry';
import { CAMPUS_CAFE, CAMPUS_CAFETERIA, getCampusLayout } from '../utils/campusLayout';
import type { VenueId } from '../types/campaign';

export const ITEM_RARITIES = ['Common','Rare','Legendary','God tier'] as const;
export const RARITY_WEIGHTS = [80,15,4,1] as const;
export interface CampusCollectible { id: string; x: number; z: number; rarity: typeof ITEM_RARITIES[number]; name: string; icon: string; color: string }
const items = [
  { names:['Chalk stub','Court pennant','Rally patch','Gym wristband'], icon:'🧩', color:'#a9c2ae' },
  { names:['Referee whistle','Blue chalk tin','Captain’s band','Coach’s playbook'], icon:'🏷️', color:'#78c7ef' },
  { names:['Golden court key','Crown enamel pin','Champion’s seal','Schoolyard trophy'], icon:'🏆', color:'#ffcb7a' },
  { names:['The First Crown','Four Courts Relic','The Founder’s Ball','Skyline Medal'], icon:'👑', color:'#e0a7fb' },
];

function order(id:string) {
  let hash=2166136261;
  for(const char of id) hash=Math.imul(hash ^ char.charCodeAt(0),16777619);
  return hash>>>0;
}
const pickupIds=LADDER_VENUES.flatMap((venue)=>Array.from({length:8},(_,index)=>venue+':'+index))
  .sort((a,b)=>order(a)-order(b));
const totalWeight=RARITY_WEIGHTS.reduce((total:number,weight)=>total+weight,0);
const exact=RARITY_WEIGHTS.map((weight)=>weight/totalWeight*pickupIds.length);
const counts=exact.map(Math.floor);
const largestRemainders=exact.map((value,index)=>({index,remainder:value-counts[index]})).sort((a,b)=>b.remainder-a.remainder);
for(let missing=pickupIds.length-counts.reduce((sum,value)=>sum+value,0),i=0;i<missing;i++)counts[largestRemainders[i].index]++;
const tierOrder=counts.flatMap((count,tier)=>Array<number>(count).fill(tier));
const tiers=new Map(pickupIds.map((id,index)=>[id,tierOrder[index]]));

export function campusCollectibles(venue:VenueId): CampusCollectible[] {
  const { yard } = getCampusLayout(venue);
  const spots = [[-4, -26], [CAMPUS_CAFE.x-5.7,-30], [CAMPUS_CAFETERIA.x+6.8,-30],
    [0,COURT_HALF_SIZE+3.5], [yard.left+1.8, yard.back-8], [yard.right-1.8,yard.back-8], [0,-60], [8,-55]];
  return spots.map(([x,z],index)=>{
    const id=venue+':'+index;
    const tier=tiers.get(id) ?? 0;
    const item=items[tier];
    return {id,x,z,rarity:ITEM_RARITIES[tier],name:item.names[index%4],icon:item.icon,color:item.color};
  });
}
