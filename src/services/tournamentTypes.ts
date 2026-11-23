export interface CupPlayer { key: string; name: string }
export interface CupHeat {
  id: string;
  players: CupPlayer[];
  advanced: CupPlayer[];
  room?: string;
  watchRoom?:string;
}
export interface CupView {
  id: string;
  name: string;
  official: boolean;
  starts: number;
  venueId:string;
  rules:CupRules;
  players: CupPlayer[];
  joined: boolean;
  registrationOpen: boolean;
  heats: CupHeat[];
}
export interface CupRules { mode:'points'|'timed'; target:number }
