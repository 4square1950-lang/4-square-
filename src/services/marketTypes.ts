export interface Card {
  id: string;
  characterId: string;
  listed: boolean;
}

export interface Listing {
  id: string;
  characterId: string;
  mine: boolean;
  leading: boolean;
  placedBid: boolean;
  npc: boolean;
  price: number;
  bid: number;
  expires: number;
  status: 'open' | 'sold' | 'expired';
}

export interface MarketView {
  coins: number;
  test: boolean;
  cards: Card[];
  listings: Listing[];
  balls: { id: string; color: string }[];
  ledger: { ref: string; delta: number }[];
}

export interface Ranking {
  name: string;
  played: number;
  wins: number;
  holds: number;
  hits: number;
  faults: number;
}

export const COIN_BUNDLES = [
  { id: 'warmup', amount: 120 },
  { id: 'rally', amount: 300 },
  { id: 'court', amount: 700 },
  { id: 'tour', amount: 1500 },
];

export const CARD_PACKS = [
  { id: 'schoolyard', name: 'Schoolyard', count: 2, cost: 40 },
  { id: 'world-tour', name: 'World Tour', count: 4, cost: 70 },
];
