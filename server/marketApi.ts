import { MASCOTS, youtubeChannel } from '../src/services/profileExtras';
import type { Express, Request } from 'express';
import { MarketError, createMarket } from './market';
import { CLUBS } from '../src/services/leagueTypes';
import { acceptableProfileText } from './social';
import type { ConnectionView, MessageContact } from '../src/services/profileProgress';
import { VENUES } from '../src/utils/venueData';

function session(cookie: string | undefined) {
  return cookie?.match(/(?:^|;\s*)fs_session=([a-f0-9-]{36})(?:;|$)/)?.[1];
}

export function installMarketApi(app: Express, market: ReturnType<typeof createMarket>, test: boolean) {
  const getProfile = (cookie: string | undefined) => {
    const profile = session(cookie);
    return profile && market.hasProfile(profile) ? profile : undefined;
  };

  function sameOrigin(req: Request) {
    const origin = req.get('origin');
    if (!origin) return req.get('sec-fetch-site') !== 'cross-site';
    try {
      return new URL(origin).host === req.get('host') && req.get('sec-fetch-site') !== 'cross-site';
    } catch {
      return false;
    }
  }

  app.post('/api/player/session', (req, res) => {
    if (!sameOrigin(req)) return res.status(403).json({ error: 'Invalid origin.' });
    let profile = getProfile(req.headers.cookie);
    if (!profile) {
      profile = market.createProfile();
      res.cookie('fs_session', profile, { httpOnly: true, sameSite: 'strict', secure: req.secure, maxAge: 31_536_000_000 });
    }
    if (typeof req.body?.visible === 'boolean') market.setRankingVisibility(profile, req.body.visible);
    res.json({ ready: true });
  });
  app.get('/api/standings', (_req, res) => res.json({ rankings: market.rankings() }));
  app.get('/api/league', (req, res) => {
    const { season, stage, club } = req.query;
    res.json(market.league.query(typeof season === 'string' ? season : '', typeof stage === 'string' ? stage : '',
      typeof club === 'string' && CLUBS.some(({ id }) => id === club) ? club : ''));
  });
  app.get('/api/league/clans', (req, res) => {
    const profile = getProfile(req.headers.cookie);
    res.set('Cache-Control', 'no-store').json({
      memberOf: profile ? market.league.getClub(profile) : null,
      clans: market.league.clanDirectory(),
    });
  });
  app.get('/api/player/profile', (req, res) => {
    const profile = getProfile(req.headers.cookie);
    if (!profile) return res.status(401).json({ error: 'Reconnect to your profile.' });
    if (test) market.league.network.seedConnections(profile);
    res.set('Cache-Control', 'no-store').json(market.league.profile(profile));
  });
  app.put('/api/player/name', (req, res) => {
    if (!sameOrigin(req)) return res.status(403).json({ error: 'Invalid origin.' });
    const profile = getProfile(req.headers.cookie);
    const name = typeof req.body?.name === 'string' ? req.body.name.trim().replace(/\s+/g, ' ') : '';
    if (!profile || !name || [...name].length > 64 || /[\p{Cc}\p{Cf}]/u.test(name) || !acceptableProfileText(name)) {
      return res.status(400).json({ error: 'Enter an appropriate display name of up to 64 characters.' });
    }
    market.league.setName(profile, name);
    res.json(market.league.profile(profile));
  });
  app.put('/api/player/profile', (req,res) => {
    if (!sameOrigin(req)) return res.status(403).json({error:'Invalid origin.'});
    const profile = getProfile(req.headers.cookie);
    if (!profile) return res.status(401).json({error:'Reconnect to your profile.'});
    const { username:rawUser,displayName:rawName,bio:rawBio } = req.body ?? {};
    if (![rawUser,rawName,rawBio].every((value) => typeof value === 'string')) return res.status(400).json({error:'Enter all profile fields.'});
    const username = rawUser.trim().normalize('NFKC'), displayName = rawName.trim().replace(/\s+/g,' '), bio = rawBio.trim();
    if (!/^[\p{L}\p{N}_.-]{1,64}$/u.test(username) || !acceptableProfileText(username)) return res.status(400).json({error:'Choose an appropriate username using up to 64 letters, numbers, dots, dashes, or underscores.'});
    if (!displayName || [...displayName].length>64 || /[\p{Cc}\p{Cf}]/u.test(displayName) || !acceptableProfileText(displayName)) return res.status(400).json({error:'Choose an appropriate display name up to 64 characters.'});
    if ([...bio].length>1000 || /[\p{Cc}\p{Cf}]/u.test(bio.replace(/[\n\r\t]/g,'')) || !acceptableProfileText(bio)) return res.status(400).json({error:'Choose an appropriate bio up to 1,000 characters.'});
    const mascot = req.body?.mascot;
    const rawYoutube = req.body?.youtube;
    const youtube = typeof rawYoutube === 'string' && rawYoutube.length <= 256 ? youtubeChannel(rawYoutube) : undefined;
    if (mascot !== undefined && (!Number.isInteger(mascot) || mascot < 0 || mascot >= MASCOTS.length)) return res.status(400).json({error:'Choose a mascot from the grid.'});
    if (rawYoutube !== undefined && youtube === undefined) return res.status(400).json({error:'Enter a YouTube channel URL.'});
    const error = market.league.network.edit(profile,{username,displayName,bio,mascot,youtube});
    if (error) return res.status(409).json({error});
    res.json(market.league.profile(profile));
  });
  app.get('/api/player/directory', (req, res) => {
    const profile = getProfile(req.headers.cookie);
    if (!profile) return res.status(401).json({ error: 'Reconnect to your profile.' });
    const term = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 64) : '';
    const view = (['friends','followers','following','search'] as const).find((entry) => entry === req.query.view) ?? (term ? 'search' : 'following');
    if (test) market.league.network.seedConnections(profile);
    res.set('Cache-Control', 'no-store').json(market.league.network.directory(profile,view as ConnectionView,term)
      .map((id) => market.league.social(id,profile)));
  });
  app.get('/api/player/messages',(req,res) => {
    const profile = getProfile(req.headers.cookie);
    if (!profile) return res.status(401).json({error:'Reconnect to your profile.'});
    const key = req.query.key;
    res.set('Cache-Control','no-store');
    if (typeof key !== 'string') {
      const contacts = market.league.network.contacts(profile);
      const inbox: MessageContact[] = contacts.map(({profile:contact,latest}) => ({...market.league.social(contact,profile),latest}));
      if (!contacts.some((contact)=>contact.profile===profile)) inbox.push(market.league.social(profile,profile));
      return res.json(inbox);
    }
    const target = market.league.network.byKey(key,profile) ?? (market.league.social(profile,profile).key === key ? profile : undefined);
    if (typeof target !== 'string') return res.status(404).json({error:'Player unavailable.'});
    res.json(market.league.network.messages(profile,target));
  });
  app.post('/api/player/messages',(req,res) => {
    if (!sameOrigin(req)) return res.status(403).json({error:'Invalid origin.'});
    const profile = getProfile(req.headers.cookie);
    const { key,body } = req.body ?? {};
    if (!profile || typeof key!=='string' || typeof body!=='string' || !body.trim() || body.length>500) return res.status(400).json({error:'Enter a message of up to 500 characters.'});
    const target = market.league.network.byKey(key,profile) ?? (market.league.social(profile,profile).key === key ? profile : undefined);
    if (typeof target !== 'string') return res.status(404).json({error:'Player unavailable.'});
    if (!market.league.network.send(profile,target,body.trim())) return res.status(409).json({error:'Wait for a reply before sending another message.'});
    res.json(market.league.network.messages(profile,target));
  });
  app.put('/api/player/follow', (req, res) => {
    if (!sameOrigin(req)) return res.status(403).json({ error: 'Invalid origin.' });
    const profile = getProfile(req.headers.cookie);
    const { key, follow } = req.body ?? {};
    if (!profile || typeof key !== 'string' || !/^[a-f0-9]{24}$/.test(key) || typeof follow !== 'boolean') {
      return res.status(400).json({ error: 'Choose an available profile.' });
    }
    const target = market.league.follow(profile, key, follow);
    if (!target) return res.status(404).json({ error: 'Profile unavailable.' });
    res.json({ target, self: market.league.profile(profile).social });
  });
  app.get('/api/player/friend-requests',(req,res)=>{
    const profile=getProfile(req.headers.cookie);
    if (!profile) return res.status(401).json({error:'Reconnect to your profile.'});
    res.set('Cache-Control','no-store').json(market.league.incomingFriendRequests(profile));
  });
  app.put('/api/player/friend-requests',(req,res)=>{
    if (!sameOrigin(req)) return res.status(403).json({error:'Invalid origin.'});
    const profile=getProfile(req.headers.cookie);
    const {key,action}=req.body??{};
    if (!profile || typeof key!=='string' || !/^[a-f0-9]{24}$/.test(key) ||
      (action!=='request' && action!=='accept' && action!=='decline' && action!=='cancel'))
      return res.status(400).json({error:'Choose a valid friend request action.'});
    const target=market.league.friendRequest(profile,key,action);
    if(!target)return res.status(409).json({error:'This friend request is no longer available.'});
    res.json({target,self:market.league.profile(profile).social});
  });
  app.put('/api/player/club', (req, res) => {
    if (!sameOrigin(req)) return res.status(403).json({ error: 'Invalid origin.' });
    const profile = getProfile(req.headers.cookie);
    const club = CLUBS.find(({ id }) => id === req.body?.club);
    if (!profile || (!club && req.body?.club !== null)) return res.status(400).json({ error: 'Choose an available club.' });
    market.league.setClub(profile, club?.id ?? null);
    res.json(market.league.profile(profile));
  });
  app.get('/api/tournaments', (req, res) => {
    const profile = getProfile(req.headers.cookie);
    if (!profile) return res.status(401).json({ error: 'Reconnect to your profile.' });
    res.set('Cache-Control', 'no-store').json(market.tournaments.list(profile));
  });
  app.post('/api/tournaments', (req, res) => {
    if (!sameOrigin(req)) return res.status(403).json({ error: 'Invalid origin.' });
    const profile = getProfile(req.headers.cookie);
    const name = profile && market.league.name(profile);
    if (!profile || !name) return res.status(400).json({ error: 'Save your display name in Profile first.' });
    const { action, id, title, venueId, starts, mode, target } = req.body ?? {};
    if (action === 'create' && typeof title === 'string' && title.trim() && title.trim().length <= 36) {
      if (!acceptableProfileText(title)) return res.status(400).json({error:'Choose an appropriate tournament name.'});
      if (venueId !== undefined && (!VENUES.some((venue)=>venue.id===venueId) || !Number.isSafeInteger(starts) || !Number.isFinite(new Date(starts).getTime()) ||
        (mode!=='points' && mode!=='timed') || !Number.isSafeInteger(target) || target<1 || target>20)) {
        return res.status(400).json({error:'Choose a venue, start time and match rules.'});
      }
      market.tournaments.create(profile, title.trim(), name, venueId ? {venueId,starts:Math.max(Date.now(),starts),rules:{mode,target}} : undefined);
    } else if (action === 'join' && typeof id === 'string') {
      if (!market.tournaments.join(id, profile, name)) return res.status(409).json({ error: 'This bracket is already full or underway.' });
    } else return res.status(400).json({ error: 'Choose an event or enter a tournament name.' });
    res.json(market.tournaments.list(profile));
  });
  app.get('/api/market', (req, res) => {
    const profile = getProfile(req.headers.cookie);
    if (!profile) return res.status(401).json({ error: 'Reconnect to the shop.' });
    res.set('Cache-Control', 'no-store').json(market.view(profile, test));
  });
  app.put('/api/market/ball-color', (req,res) => {
    if (!sameOrigin(req)) return res.status(403).json({ error:'Invalid origin.' });
    const profile = getProfile(req.headers.cookie);
    const { id, color } = req.body ?? {};
    if (!profile || !market.colorBall(profile,id,color)) return res.status(400).json({ error:'Choose an owned ball and a valid color.' });
    res.json(market.view(profile,test));
  });
  app.post('/api/market', (req, res) => {
    if (!sameOrigin(req)) return res.status(403).json({ error: 'Invalid origin.' });
    const profile = getProfile(req.headers.cookie);
    if (!profile) return res.status(401).json({ error: 'Reconnect to the shop.' });
    const { action, id, request, amount = 1 } = req.body ?? {};
    if (typeof action !== 'string' || typeof id !== 'string' || !/^[\w-]{1,64}$/.test(id) ||
        typeof request !== 'string' || !/^[a-f0-9-]{36}$/.test(request) ||
        !Number.isSafeInteger(amount) || amount < 1 || amount > 1_000_000) {
      return res.status(400).json({ error: 'Invalid order.' });
    }
    try {
      const revealed = market.command(profile, test, request, action, id, amount);
      res.json({ market: market.view(profile, test), revealed });
    } catch (error) {
      if (!(error instanceof MarketError)) throw error;
      res.status(409).json({ error: error.message });
    }
  });
  return getProfile;
}
