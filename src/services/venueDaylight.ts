import { getVenueArt } from '../utils/venueArt';
import type { VenueId } from '../types/campaign';

export function daylightAt(venue: VenueId, now = new Date()) {
  const { latitude, longitude } = getVenueArt(venue);
  const rad = Math.PI / 180;
  const day = (Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - Date.UTC(now.getUTCFullYear(), 0, 0)) / 86_400_000;
  const angle = (360 / 365) * (day - 81) * rad;
  const declination = 23.44 * Math.sin(angle) * rad;
  const equationMinutes = 9.87 * Math.sin(2 * angle) - 7.53 * Math.cos(angle) - 1.5 * Math.sin(angle);
  const solarHour = now.getUTCHours() + now.getUTCMinutes() / 60 + longitude / 15 + equationMinutes / 60;
  const height = Math.asin(Math.sin(latitude * rad) * Math.sin(declination) +
    Math.cos(latitude * rad) * Math.cos(declination) * Math.cos((solarHour - 12) * 15 * rad)) / rad;
  return height > 7 ? 'sunny' : height > -7 ? 'sunset' : 'night';
}
