import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { createMarket } from '../server/market';
import { createInitialState } from '../src/services/foursquareEngine';
import { profileLevel } from '../src/services/profileProgress';
import { acceptableProfileText } from '../server/social';

test('test checkout, pack reveal, competing bids, and escrow survive restart', () => {
  const temp = mkdtempSync(join(tmpdir(), 'foursquare-market-'));
  const filename = join(temp, 'test.sqlite');
  let time = 1234;
  let market = createMarket(filename, undefined, () => time);
  try {
    const seller = market.createProfile();
    const bidder = market.createProfile();
    const rival = market.createProfile();
    const view = (profile: string) => market.view(profile, true);
    const order = (profile: string, action: string, id: string, amount = 1, request = randomUUID()) =>
      market.command(profile, true, request, action, id, amount);
    assert.throws(() => order(seller, 'pack', 'schoolyard'), /Not enough coins/);
    const checkout = randomUUID();
    order(seller, 'bundle', 'warmup', 1, checkout);
    order(seller, 'bundle', 'warmup', 1, checkout);
    assert.equal(view(seller).coins, 120);
    const packOrder = randomUUID();
    const cards = order(seller, 'pack', 'schoolyard', 1, packOrder);
    assert.equal(cards.length, 2);
    assert.deepEqual(order(seller, 'pack', 'schoolyard', 1, packOrder), cards);
    assert.equal(view(seller).coins, 80);
    order(seller, 'list', cards[0].id, 10);
    assert.throws(() => order(seller, 'list', cards[0].id, 10), /unavailable/);
    const lot = view(seller).listings.find(({ mine }) => mine)!;
    order(bidder, 'bundle', 'warmup');
    order(bidder, 'bid', lot.id, 10);
    assert.throws(() => order(rival, 'bid', lot.id, 11), /Not enough coins/);
    assert.equal(view(bidder).coins, 110);
    assert.equal(view(bidder).listings.find(({ id }) => id === lot.id)?.leading, true);
    order(rival, 'bundle', 'warmup');
    order(rival, 'bid', lot.id, 11);
    assert.equal(view(bidder).coins, 120);
    assert.equal(view(rival).coins, 109);
    market.close();
    time += 61_000;
    market = createMarket(filename, undefined, () => time);
    market.tick();
    market.tick();
    assert.ok(view(rival).cards.some(({ id, listed }) => id === cards[0].id && !listed));
    assert.equal(view(seller).coins, 91);
  } finally {
    market.close();
    for (const suffix of ['', '-wal', '-shm']) rmSync(filename + suffix, { force: true });
    rmdirSync(temp);
  }
});

test('NPCs let one profile test buying, outbids, selling, and an unsold card', () => {
  let time = 1234;
  const market = createMarket(':memory:', undefined, () => time);
  try {
    const profile = market.createProfile();
    const order = (action: string, id: string, amount = 1) => market.command(profile, true, randomUUID(), action, id, amount);
    const view = () => market.view(profile, true);
    const npc = view().listings.find(({ npc }) => npc)!;
    order('bundle', 'warmup');
    order('bid', npc.id, npc.price);
    order('npc-bid', npc.id);
    assert.equal(view().coins, 120);
    order('bid', npc.id, npc.price + 2);
    time += 121_000;
    const [card] = view().cards;
    assert.ok(card);
    order('list', card.id, 50);
    const first = view().listings.find(({ mine, status }) => mine && status === 'open')!;
    order('npc-bid', first.id);
    time += 61_000;
    assert.equal(view().cards.length, 0);
    assert.equal(view().coins, 120 - npc.price - 2 + 50);

    const [newCard] = order('pack', 'schoolyard');
    order('list', newCard.id, 90);
    time += 61_000;
    assert.equal(view().cards.find(({ id }) => id === newCard.id)?.listed, false);
    assert.throws(() => market.command(profile, false, randomUUID(), 'bundle', 'warmup', 1), /unavailable/);
  } finally {
    market.close();
  }
});

test('verified standings and rewards count a match once and respect visibility', () => {
  const market = createMarket(':memory:');
  try {
    const profile = market.createProfile();
    const result = { profile, name: 'Patch', played: 1, wins: 1, holds: 5, hits: 20, faults: 2 };
    market.recordResults('match-1', [result]);
    market.recordResults('match-1', [result]);
    const { profile: _profile, ...entry } = result;
    assert.deepEqual({ ...market.rankings()[0] }, entry);
    assert.equal(market.view(profile, false).coins, 30);
    market.setRankingVisibility(profile, false);
    assert.deepEqual(market.rankings(), []);
  } finally {
    market.close();
  }
});

test('league preserves club snapshots, privacy, verified history, and earned XP', () => {
  let time = Date.UTC(2026, 11, 31);
  const market = createMarket(':memory:', undefined, () => time);
  try {
    const first = market.createProfile();
    const second = market.createProfile();
    const entry = { name: 'Patch', played: 1, wins: 1, holds: 5, hits: 16, faults: 2 };
    market.league.setClub(first, 'oakridge');
    market.league.setClub(second, 'metro');
    const original = market.league.getClub(first);
    market.league.setClub(first, 'kanata');
    market.recordResults('match-2026', [{ ...entry, profile: first, club: original }]);
    market.recordResults('match-2026', [{ ...entry, profile: first, club: 'kanata' }]);

    time = Date.UTC(2027, 0, 1);
    market.recordResults('match-2027', [
      { ...entry, profile: first, wins: 0, holds: 1, club: market.league.getClub(first) },
      { ...entry, profile: second, name: 'Roxy', club: market.league.getClub(second) },
    ]);
    const league = market.league.query('', '', '');
    assert.deepEqual(league.seasons, ['2027', '2026']);
    const patch = league.players.find(({ name }) => name === 'Patch')!;
    assert.notEqual(patch.key, first);
    assert.equal(patch.streak, 'L1');
    assert.equal(patch.lastTenWins, 1);
    assert.equal(patch.lastTenPlayed, 2);
    assert.equal(league.divisions.find(({ key }) => key === 'North')?.played, 2);
    assert.equal(market.league.query('2026', 'regular', 'oakridge').clubs[0]?.wins, 1);
    assert.deepEqual(market.league.query('', 'playoffs', '').players, []);
    market.league.setClub(first, null);
    assert.equal(market.league.profile(first).club, null);
    assert.equal(market.league.query('', '', 'oakridge').players[0]?.played, 1);
    market.setRankingVisibility(first, false);
    assert.deepEqual(market.league.query('', '', '').players.map(({ name }) => name), ['Roxy']);
    const profile = market.league.profile(first);
    assert.equal(profile.xp, 125);
    assert.deepEqual(profile.history.map(({ won }) => won), [false, true]);
  } finally {
    market.close();
  }
});

test('verified matches update Elo once and named profiles follow with public identifiers', () => {
  const market = createMarket(':memory:');
  try {
    const host = market.createProfile(), guest = market.createProfile();
    market.league.setName(host, 'Court captain');
    market.league.setName(guest, 'Rally partner');
    const entry = { name: 'Guest name', played: 1, wins: 0, holds: 3, hits: 9, faults: 1 };
    const result = [{ ...entry, profile: host, wins: 1 }, { ...entry, profile: guest }];
    market.recordResults('verified-1', result);
    market.recordResults('verified-1', result);
    assert.equal(market.league.profile(host).elo, 1016);
    assert.equal(market.league.profile(guest).elo, 984);
    assert.equal(market.league.query('', '', '').players.find((row) => row.elo === 1016)?.name, 'Court captain');

    const partner = market.league.findProfiles(host, 'rally')[0];
    assert.notEqual(partner.key, guest);
    assert.equal(market.league.follow(host, partner.key, true)?.followers, 1);
    assert.equal(market.league.follow(host, partner.key, true)?.followers, 1);
    assert.equal(market.league.findProfiles(host, '')[0]?.name, 'Rally partner');
    market.setRankingVisibility(guest, false);
    assert.deepEqual(market.league.findProfiles(host, 'rally'), []);
    assert.equal(market.league.follow(host, partner.key, false)?.followers, 0);
  } finally { market.close(); }
});

test('online cups admit eight, restrict court access, and qualify real results into the final', () => {
  let time = Date.UTC(2026, 10, 1);
  const market = createMarket(':memory:', undefined, () => time);
  try {
    const ids = Array.from({ length: 9 }, () => market.createProfile());
    const official = market.tournaments.list(ids[0])[0];
    assert.equal(official.official, true);
    assert.equal(new Date(official.starts).getUTCDay(), 6);
    for (let i = 0; i < 8; i++) assert.equal(market.tournaments.join(official.id, ids[i], 'Player ' + i), true);
    assert.equal(market.tournaments.join(official.id, ids[8], 'Spare'), false);
    assert.equal(market.tournaments.list(ids[0])[0].heats.length, 0);
    time = official.starts + 1;
    const [a,b] = market.tournaments.list(ids[0])[0].heats;
    assert.ok(a.room);
    assert.equal(b.room, undefined);
    const roomB = market.tournaments.list(ids[4])[0].heats[1].room!;
    assert.deepEqual(market.tournaments.seats(a.room), ids.slice(0,4));
    const match = createInitialState();
    const standings = (group: string[]) => group.map((profile, i) => ({ profile,
      player: { ...match.players[i], crownHolds: i, points: i * 100 } }));
    assert.equal(market.tournaments.finish(a.room, standings(ids.slice(0,4)), match.players[0].id), true);
    assert.equal(market.tournaments.finish(a.room, standings(ids.slice(0,4)), match.players[1].id), false);
    assert.equal(market.tournaments.finish(roomB, standings(ids.slice(4,8)), match.players[0].id), true);
    const final = market.tournaments.list(ids[0])[0].heats[2];
    assert.ok(final.room);
    assert.deepEqual(final.players.map(({ name }) => name), ['Player 0','Player 3','Player 4','Player 7']);
    assert.equal(market.tournaments.finish(final.room, standings([ids[0],ids[3],ids[4],ids[7]]), match.players[3].id), true);
    assert.equal(market.tournaments.list(ids[0])[0].heats[2].advanced[0]?.name, 'Player 7');
  } finally { market.close(); }
});

test('ball purchases are atomic, free balls recolor, and unowned balls cannot be painted', () => {
  const market=createMarket(':memory:');
  try {
    const p=market.createProfile();
    assert.equal(market.view(p,true).balls.length,3);
    assert.equal(market.colorBall(p,'spectrum','#112233'),true);
    assert.equal(market.colorBall(p,'mikasa-p850','#112233'),false);
    assert.throws(()=>market.command(p,true,randomUUID(),'ball','champion-textured',1),/Not enough coins/);
    assert.equal(market.view(p,true).balls.length,3);
    market.command(p,true,randomUUID(),'bundle','warmup',1);
    market.command(p,true,randomUUID(),'ball','champion-textured',1);
    market.command(p,true,randomUUID(),'ball','champion-textured',1);
    assert.equal(market.view(p,true).coins,20);
    assert.equal(market.colorBall(p,'champion-textured','#ab3290'),true);
    assert.equal(market.view(p,true).balls.find(({id})=>id==='champion-textured')?.color,'#ab3290');
    assert.equal(market.view(p,true).ledger.filter(({ref})=>ref.startsWith('ball:')).length,1);
  } finally { market.close(); }
});

test('profile level thresholds, weekly names, follow lists, and unsolicited DMs use persistent records', () => {
  let now=Date.UTC(2026,10,20);
  const market=createMarket(':memory:',undefined,()=>now);
  try {
    const a=market.createProfile(),b=market.createProfile(), network=market.league.network;
    assert.deepEqual([0,999,1000,2999,3000,6000,10000,15000].map((xp)=>profileLevel(xp).level),[0,0,1,1,2,3,4,5]);
    assert.equal(acceptableProfileText('Ready for f u c k'),false);
    assert.equal(acceptableProfileText('Classic Court Captain'),true);
    assert.equal(network.edit(a,{username:'captain',displayName:'Captain',bio:'Ready to rally',mascot:31,youtube:'https://www.youtube.com/@circuit'}),undefined);
    assert.equal(network.edit(b,{username:'CAPTAIN',displayName:'Challenger',bio:''}),'That username is already taken.');
    assert.equal(network.edit(a,{username:'changed',displayName:'Captain',bio:'Changed'}),'You can change your username once every seven days.');
    assert.equal(network.edit(a,{username:'captain',displayName:'Captain of Court 4',bio:'Changed'}),undefined);
    now+=7*86400000;
    assert.equal(network.edit(a,{username:'changed',displayName:'Captain',bio:'Changed'}),undefined);
    assert.equal(market.league.social(a,a).mascot,31);
    assert.equal(market.league.social(a,a).youtube,'https://www.youtube.com/@circuit');
    network.edit(b,{username:'challenger',displayName:'Challenger',bio:''});
    market.league.follow(a,market.league.social(b,a).key,true);
    assert.deepEqual(network.directory(a,'following',''),[b]);
    assert.deepEqual(network.directory(b,'followers',''),[a]);
    assert.deepEqual(network.directory(a,'friends',''),[]);
    market.league.follow(b,market.league.social(a,b).key,true);
    assert.deepEqual(network.directory(a,'friends',''),[b]);
    assert.equal(network.send(a,b,'Hello'),true);
    assert.equal(network.send(a,b,'See you at the court'),true);
    assert.equal(network.send(a,b,'Blocked'),false);
    assert.equal(network.send(b,a,'See you there'),true);
    assert.equal(network.send(a,b,'Thanks'),true);
    assert.equal(network.messages(a,b).length,4);
    assert.equal(network.send(a,a,'Note to self'),true);
    assert.equal(network.messages(a,a)[0]?.body,'Note to self');
    assert.deepEqual(network.contacts(a).slice(0,2).map(({profile,latest})=>[profile,latest.body,latest.mine]),[[a,'Note to self',true],[b,'Thanks',true]]);
    network.seed();
    assert.ok(network.directory(a,'search','').length>=240);
    const bot=network.directory(a,'search','court-bot-001')[0];
    network.send(a,bot,'Hello');
    assert.equal(network.messages(a,bot).length,1);
    assert.equal(network.contacts(a).find(({profile})=>profile===bot)?.latest.body,'Hello');
    now+=3100;
    assert.equal(network.messages(a,bot).length,2);
    assert.equal(network.contacts(a).find(({profile})=>profile===bot)?.latest.mine,false);
  } finally { market.close(); }
});

test('test NPC connections seed one time and allow follow changes', () => {
  const market=createMarket(':memory:');
  try {
    const viewer=market.createProfile();
    const network=market.league.network;
    network.seedConnections(viewer);
    const friends=network.directory(viewer,'friends','');
    assert.equal(friends.length,4);
    assert.equal(network.directory(viewer,'followers','').length,8);
    assert.equal(network.directory(viewer,'following','').length,8);
    assert.ok(friends.every((id)=>network.details(id)?.npc));
    market.league.follow(viewer,market.league.social(friends[0],viewer).key,false);
    network.seedConnections(viewer);
    assert.equal(network.directory(viewer,'friends','').length,3);
    assert.equal(network.directory(viewer,'following','').length,7);
  } finally {market.close();}
});
test('friend requests distinguish follows, pending requests, and mutual friends', () => {
  const market=createMarket(':memory:');
  try {
    const {league}=market;
    const sender=market.createProfile(), recipient=market.createProfile(), stranger=market.createProfile();
    league.setName(sender,'Sender');
    league.setName(recipient,'Recipient');
    league.setName(stranger,'Stranger');
    const senderKey=league.social(sender,sender).key;
    const recipientKey=league.social(recipient,recipient).key;
    assert.equal(league.follow(sender,recipientKey,true)?.friendship,'none');
    assert.equal(league.friendRequest(sender,recipientKey,'request')?.friendship,'sent');
    assert.equal(league.friendRequest(sender,recipientKey,'request')?.friendship,'sent');
    assert.equal(league.incomingFriendRequests(recipient)[0]?.friendship,'received');
    assert.equal(league.friendRequest(stranger,senderKey,'accept'),undefined);
    assert.equal(league.friendRequest(recipient,senderKey,'decline')?.friendship,'none');
    assert.equal(league.incomingFriendRequests(recipient).length,0);
    assert.equal(league.friendRequest(sender,recipientKey,'request')?.friendship,'sent');
    assert.equal(league.friendRequest(sender,recipientKey,'cancel')?.friendship,'none');
    assert.equal(league.friendRequest(sender,recipientKey,'request')?.friendship,'sent');
    assert.equal(league.friendRequest(recipient,senderKey,'accept')?.friendship,'friends');
    assert.deepEqual(league.network.directory(sender,'friends',''),[recipient]);
    assert.equal(league.incomingFriendRequests(recipient).length,0);
    league.network.seed();
    const npc='social-npc-001';
    const npcKey=league.social(npc,sender).key;
    assert.equal(league.follow(sender,npcKey,true)?.friendship,'none');
    assert.equal(league.friendRequest(sender,npcKey,'request')?.friendship,'friends');
  } finally {market.close();}
});
