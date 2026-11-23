import { randomInt, randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { CARD_PACKS, COIN_BUNDLES, type Card, type Listing, type MarketView, type Ranking } from '../src/services/marketTypes';
import { CHARACTERS } from '../src/utils/characters';
import { createLeague } from './league';
import { createTournaments } from './tournaments';
import { BALLS, validBallColor } from '../src/services/ballCatalog';
import type { Club } from '../src/services/leagueTypes';

type Auction = {
  id: string; seller: string; card: string; character: string; price: number;
  bidder: string | null; bid: number; expires: number; status: Listing['status'];
  placed_bid?: string;
};
export type OnlineResult = Ranking & { profile: string; club?: Club | null };
export interface PaymentAdapter {
  purchaseBundle(bundleId: string): number;
}

export class MarketError extends Error {}

export function createMarket(filename: string, payment?: PaymentAdapter, now = Date.now) {
  const db = new DatabaseSync(filename);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 3000;
    CREATE TABLE IF NOT EXISTS profiles (id TEXT PRIMARY KEY, coins INTEGER NOT NULL DEFAULT 0 CHECK(coins >= 0));
    CREATE TABLE IF NOT EXISTS ledger (profile TEXT, ref TEXT, delta INTEGER, PRIMARY KEY(profile, ref));
    CREATE TABLE IF NOT EXISTS owned_balls (profile TEXT, ball TEXT, color TEXT NOT NULL, PRIMARY KEY(profile, ball));
    CREATE TABLE IF NOT EXISTS cards (id TEXT PRIMARY KEY, owner TEXT, character TEXT, locked INTEGER NOT NULL DEFAULT 0);
    CREATE INDEX IF NOT EXISTS cards_owner ON cards(owner);
    CREATE TABLE IF NOT EXISTS auctions (
      id TEXT PRIMARY KEY, seller TEXT, card TEXT, character TEXT, price INTEGER,
      bidder TEXT, bid INTEGER NOT NULL DEFAULT 0, expires INTEGER, status TEXT NOT NULL DEFAULT 'open'
    );
    CREATE INDEX IF NOT EXISTS auctions_expiry ON auctions(status, expires);
    CREATE TABLE IF NOT EXISTS auction_bidders (lot TEXT, profile TEXT, PRIMARY KEY(lot, profile));
    INSERT OR IGNORE INTO auction_bidders SELECT id, bidder FROM auctions WHERE bidder IS NOT NULL;
    CREATE TABLE IF NOT EXISTS requests (profile TEXT, ref TEXT, result TEXT, PRIMARY KEY(profile, ref));
    CREATE TABLE IF NOT EXISTS results (
      match TEXT, profile TEXT, time INTEGER, name TEXT, wins INTEGER, holds INTEGER, hits INTEGER, faults INTEGER,
      PRIMARY KEY (match, profile)
    );
    CREATE TABLE IF NOT EXISTS rankings_privacy (profile TEXT PRIMARY KEY, visible INTEGER NOT NULL);
  `);
  const league = createLeague(db,now);
  const tournaments = createTournaments(db, now);

  function transaction<T>(work: () => T): T {
    db.exec('BEGIN IMMEDIATE');
    try {
      const value = work();
      db.exec('COMMIT');
      return value;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }

  function adjust(profile: string, ref: string, delta: number) {
    const change = db.prepare('INSERT OR IGNORE INTO ledger VALUES (?, ?, ?)').run(profile, ref, delta);
    if (!change.changes) return;
    const balance = db.prepare('UPDATE profiles SET coins = coins + ? WHERE id = ? AND coins + ? >= 0')
      .run(delta, profile, delta);
    if (!balance.changes) throw new MarketError('Not enough coins.');
  }

  function issue(owner: string, characterId: string): Card {
    const id = randomUUID();
    db.prepare('INSERT INTO cards (id, owner, character) VALUES (?, ?, ?)').run(id, owner, characterId);
    return { id, characterId, listed: false };
  }

  function createListing(profile: string, cardId: string, price: number, ttl: number) {
    const card = db.prepare('SELECT character FROM cards WHERE id = ? AND owner = ? AND locked = 0')
      .get(cardId, profile) as { character: string } | undefined;
    if (!card) throw new MarketError('This card is unavailable.');
    const id = randomUUID();
    db.prepare('UPDATE cards SET locked = 1 WHERE id = ?').run(cardId);
    db.prepare('INSERT INTO auctions (id, seller, card, character, price, expires) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, profile, cardId, card.character, price, now() + ttl);
    return id;
  }

  function settle() {
    const due = db.prepare("SELECT * FROM auctions WHERE status = 'open' AND expires <= ?").all(now()) as unknown as Auction[];
    for (const lot of due) {
      if (lot.bidder) {
        adjust(lot.seller, `sold:${lot.id}`, lot.bid);
        db.prepare('UPDATE cards SET owner = ?, locked = 0 WHERE id = ?').run(lot.bidder, lot.card);
      } else {
        db.prepare('UPDATE cards SET locked = 0 WHERE id = ?').run(lot.card);
      }
      db.prepare('UPDATE auctions SET status = ? WHERE id = ?').run(lot.bidder ? 'sold' : 'expired', lot.id);
    }
  }

  function placeBid(profile: string, lot: Auction, amount: number) {
    if (lot.status !== 'open' || lot.expires <= now()) throw new MarketError('This auction has ended.');
    if (lot.seller === profile) throw new MarketError('You own this listing.');
    if (amount < Math.max(lot.price, lot.bid + 1)) throw new MarketError('Enter a higher bid.');
    if (lot.bidder) adjust(lot.bidder, `refund:${lot.id}:${lot.bid}`, lot.bid);
    adjust(profile, `bid:${lot.id}:${amount}`, -amount);
    db.prepare('UPDATE auctions SET bidder = ?, bid = ? WHERE id = ?').run(profile, amount, lot.id);
    db.prepare('INSERT OR IGNORE INTO auction_bidders VALUES (?, ?)').run(lot.id, profile);
  }

  function auction(id: string) {
    const lot = db.prepare('SELECT * FROM auctions WHERE id = ?').get(id) as Auction | undefined;
    if (!lot) throw new MarketError('Listing unavailable.');
    return lot;
  }

  function seed() {
    db.prepare("INSERT OR IGNORE INTO profiles (id) VALUES ('npc')").run();
    const count = db.prepare("SELECT COUNT(*) AS total FROM auctions WHERE seller = 'npc' AND status = 'open'").get();
    if (count?.total) return;
    for (const [index, character] of CHARACTERS.slice(0, 3).entries()) {
      const card = issue('npc', character.id);
      createListing('npc', card.id, 12 + index * 5, 120_000);
    }
  }

  function view(profile: string, test: boolean): MarketView {
    return transaction(() => {
      settle();
      if (test) seed();
      const balance = db.prepare('SELECT coins FROM profiles WHERE id = ?').get(profile);
      const cards = db.prepare('SELECT id, character AS characterId, locked FROM cards WHERE owner = ? ORDER BY rowid DESC')
        .all(profile).map(({ id, characterId, locked }) => ({ id: String(id), characterId: String(characterId), listed: Boolean(locked) }));
      const auctions = db.prepare(`
        SELECT auctions.*, previous.profile AS placed_bid FROM auctions
        LEFT JOIN auction_bidders previous ON previous.lot = auctions.id AND previous.profile = ?
        WHERE (status = 'open' OR seller = ? OR previous.profile IS NOT NULL)
        AND (? OR (seller <> 'npc' AND COALESCE(bidder, '') <> 'npc-buyer'))
        ORDER BY status = 'open' DESC, expires ASC LIMIT 150
      `).all(profile, profile, +test) as unknown as Auction[];
      return {
        coins: Number(balance?.coins ?? 0), test, cards,
        balls: BALLS.flatMap(({ id, color, price }) => {
          const owned = db.prepare('SELECT color FROM owned_balls WHERE profile=? AND ball=?').get(profile,id);
          return owned || !price ? [{ id, color: String(owned?.color ?? color) }] : [];
        }),
        ledger: db.prepare('SELECT ref,delta FROM ledger WHERE profile=? ORDER BY rowid DESC LIMIT 50').all(profile)
          .map(({ ref, delta }) => ({ ref: String(ref), delta: Number(delta) })),
        listings: auctions.map((lot) => ({
          id: lot.id, characterId: lot.character, mine: lot.seller === profile, leading: lot.bidder === profile, placedBid: Boolean(lot.placed_bid),
          npc: lot.seller === 'npc' || lot.bidder === 'npc-buyer', price: lot.price, bid: lot.bid, expires: lot.expires, status: lot.status,
        })),
      };
    });
  }

  function command(profile: string, test: boolean, request: string, action: string, id: string, amount: number) {
    return transaction(() => {
      settle();
      const key = `${action}:${request}`;
      const prior = db.prepare('SELECT result FROM requests WHERE profile = ? AND ref = ?').get(profile, key);
      if (prior) return JSON.parse(String(prior.result)) as Card[];
      let revealed: Card[] = [];
      switch (action) {
        case 'bundle': {
          const adapter = test ? testPayment : payment;
          if (!adapter) throw new MarketError('Coin checkout is unavailable.');
          adjust(profile, key, adapter.purchaseBundle(id));
          break;
        }
        case 'pack': {
          const pack = CARD_PACKS.find((item) => item.id === id);
          if (!pack) throw new MarketError('Pack unavailable.');
          adjust(profile, key, -pack.cost);
          revealed = Array.from({ length: pack.count }, () => issue(profile, CHARACTERS[randomInt(CHARACTERS.length)].id));
          break;
        }
        case 'ball': {
          const ball = BALLS.find((item) => item.id === id);
          if (!ball) throw new MarketError('Ball unavailable.');
          const change = db.prepare('INSERT OR IGNORE INTO owned_balls VALUES (?,?,?)').run(profile,id,ball.color);
          if (change.changes && ball.price) adjust(profile,key,-ball.price);
          break;
        }
        case 'list':
          createListing(profile, id, amount, test ? 60_000 : 3_600_000);
          break;
        case 'bid':
          placeBid(profile, auction(id), amount);
          break;
        case 'npc-bid': {
          if (!test) throw new MarketError('Test bidding is unavailable.');
          const lot = auction(id);
          if (lot.seller !== profile && lot.bidder !== profile) throw new MarketError('Choose one of your auctions or bids.');
          db.prepare("INSERT OR IGNORE INTO profiles (id) VALUES ('npc-buyer')").run();
          const price = Math.max(lot.price, lot.bid + 1);
          adjust('npc-buyer', `test-funds:${lot.id}:${price}`, price);
          placeBid('npc-buyer', lot, price);
          break;
        }
        default: throw new MarketError('Unknown action.');
      }
      db.prepare('INSERT INTO requests VALUES (?, ?, ?)').run(profile, key, JSON.stringify(revealed));
      return revealed;
    });
  }

  return {
    createProfile() {
      const id = randomUUID();
      db.prepare('INSERT INTO profiles (id) VALUES (?)').run(id);
      return id;
    },
    hasProfile: (id: string) => Boolean(db.prepare('SELECT 1 FROM profiles WHERE id = ?').get(id)),
    view, command, league, tournaments,
    colorBall(profile: string, id: string, color: unknown) {
      const ball = BALLS.find((item) => item.id === id);
      if (!ball || !validBallColor(color)) return false;
      if (!ball.price) db.prepare('INSERT OR IGNORE INTO owned_balls VALUES (?,?,?)').run(profile,id,ball.color);
      return Boolean(db.prepare('UPDATE owned_balls SET color=? WHERE profile=? AND ball=?').run(color,profile,id).changes);
    },
    recordResults(match: string, entries: OnlineResult[]) {
      transaction(() => {
        const recorded: OnlineResult[] = [];
        for (const { profile, name, wins, holds, hits, faults, club } of entries) {
          const inserted = db.prepare('INSERT OR IGNORE INTO results VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
            .run(match, profile, now(), name, wins, holds, hits, faults);
          if (inserted.changes) {
            league.recordClub(match, profile, club ?? null);
            recorded.push({ profile, name, wins, holds, hits, faults, played: 1, club });
          }
          adjust(profile, `match:${match}`, wins ? 30 : 10);
        }
        league.rateMatch(recorded);
      });
    },
    setRankingVisibility(profile: string, visible: boolean) {
      db.prepare('INSERT OR REPLACE INTO rankings_privacy VALUES (?, ?)').run(profile, +visible);
    },
    rankings: () => db.prepare(`
      SELECT (SELECT name FROM results latest WHERE latest.profile = r.profile ORDER BY time DESC LIMIT 1) AS name,
        COUNT(*) AS played, SUM(wins) AS wins, SUM(holds) AS holds, SUM(hits) AS hits, SUM(faults) AS faults
      FROM results r LEFT JOIN rankings_privacy p ON p.profile = r.profile
      WHERE COALESCE(p.visible, 1) = 1
      GROUP BY r.profile ORDER BY wins DESC, holds DESC, played ASC, r.profile LIMIT 100
    `).all() as unknown as Ranking[],
    tick: () => transaction(settle),
    close: () => db.close(),
  };
}

const testPayment: PaymentAdapter = {
  purchaseBundle(id) {
    const bundle = COIN_BUNDLES.find((item) => item.id === id);
    if (!bundle) throw new MarketError('Bundle unavailable.');
    return bundle.amount;
  },
};
