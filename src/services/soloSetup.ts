export const COURT_WEATHER = ['Clear', 'Overcast', 'Rain', 'Snow', 'Fog'] as const;
export type CourtWeather = typeof COURT_WEATHER[number];
export interface SoloSetup {
  lineup: string[];
  venueId: string;
  surface: 'outdoor' | 'indoor';
  weather: CourtWeather;
  ball: BallLook;
}
import type { BallLook } from './ballCatalog';
