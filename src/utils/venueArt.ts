import type { VenueId } from '../types/campaign';

interface VenueArt {
  city: string;
  longitude: number;
  latitude: number;
  facade: number;
  trim: number;
  roof: number;
  terrain: 'lake' | 'park' | 'mill' | 'hills' | 'plaza' | 'prairie' | 'city';
  landmark: string;
}

const artByVenue: Partial<Record<VenueId, VenueArt>> = {
  bridgton_maine: { city: 'Bridgton–Naples', longitude: -70.67, latitude: 44.03, facade: 0xd7d6c7, trim: 0x576a56, roof: 0x394447, terrain: 'lake', landmark: 'Long Lake' },
  boston_mass: { city: 'Boston', longitude: -71.06, latitude: 42.36, facade: 0x995c4a, trim: 0xbba68f, roof: 0x595455, terrain: 'park', landmark: 'Boston Common' },
  burlington_vermont: { city: 'Burlington', longitude: -73.22, latitude: 44.48, facade: 0xb19673, trim: 0xd9d3bc, roof: 0x4e6363, terrain: 'lake', landmark: 'Lake Champlain' },
  needham_mass: { city: 'Needham', longitude: -71.23, latitude: 42.28, facade: 0x9b6654, trim: 0xeee3c9, roof: 0x374455, terrain: 'park', landmark: 'New England town green' },
  youngstown_ohio: { city: 'Youngstown', longitude: -80.65, latitude: 41.10, facade: 0x805643, trim: 0x929084, roof: 0x474b4c, terrain: 'mill', landmark: 'Mahoning Valley' },
  north_manchester_indiana: { city: 'North Manchester', longitude: -85.77, latitude: 41.00, facade: 0x906456, trim: 0xd5c1a3, roof: 0x574b49, terrain: 'park', landmark: 'Manchester campus quad' },
  melbourne_australia: { city: 'Melbourne', longitude: 144.96, latitude: -37.81, facade: 0xbbaa87, trim: 0xdbd5b1, roof: 0x4c6366, terrain: 'city', landmark: 'Melbourne tram streets' },
  montreal_quebec: { city: 'Montréal', longitude: -73.57, latitude: 45.50, facade: 0xa8aa9d, trim: 0xc6c2ac, roof: 0x454754, terrain: 'hills', landmark: 'Mount Royal' },
  calgary_alberta: { city: 'Calgary', longitude: -114.06, latitude: 51.04, facade: 0xa15e49, trim: 0xc9c0af, roof: 0x655e51, terrain: 'prairie', landmark: 'Stampede grounds' },
  buenos_aires_argentina: { city: 'Buenos Aires', longitude: -58.37, latitude: -34.61, facade: 0xc9807e, trim: 0xf0c7b7, roof: 0x615b56, terrain: 'plaza', landmark: 'Plaza de Mayo' },
};

export function venueStill(id: VenueId) {
  return `/assets/venues/${id}.jpg`;
}

export function getVenueArt(id: VenueId): VenueArt {
  return artByVenue[id] ?? artByVenue.bridgton_maine!;
}
