import assert from 'node:assert/strict';
import {once} from 'node:events';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {test} from 'node:test';
import {createClanServer} from './service.mjs';

const origin = 'http://localhost:4110';
const clan = {
  name: 'North Court', tag: 'NC', color: '#335e73', region: 'Canada',
  language: 'English', classification: 'Competitive', privacy: 'Public'
};

test('a game enforces membership and moderation permissions', async (t) => {
  const server = createClanServer({game: 'four-square', origin, development: true});
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = 'http://127.0.0.1:' + server.address().port;

  function request(path, session, body, from = origin) {
    const headers = session ? {cookie: session} : {};
    const init = {redirect: 'manual', headers};
    if (body) {
      init.method = 'POST';
      init.body = JSON.stringify(body);
      Object.assign(headers, {origin: from, 'content-type': 'application/json'});
    }
    return fetch(base + path, init);
  }
  async function signIn(name) {
    const response = await request('/auth/dev', null, {name});
    assert.equal(response.status, 303);
    return response.headers.getSetCookie()[0].split(';')[0];
  }
  async function expect(path, session, body, status = 200) {
    const response = await request(path, session, body);
    const result = await response.json();
    assert.equal(response.status, status, JSON.stringify(result));
    return result;
  }

  await expect('/api/clans', null, clan, 401);
  assert.equal((await request('/auth/dev', null, {name: 'Bad origin'}, 'https://elsewhere.test')).status, 403);
  const founder = await signIn('Founder');
  const recruit = await signIn('Recruit');
  const {id} = await expect('/api/clans', founder, clan, 201);
  const group = '/api/clans/' + id;
  await expect('/api/clans', founder, clan, 409);
  await expect(group + '/join', recruit, {});

  const me = await expect('/api/me', recruit);
  assert.equal(me.sport.id, 'four-square');
  assert.equal(me.member.clan, id);
  const {id: division} = await expect(group + '/division', founder, {name: 'Court crew'});
  await expect(group + '/division', founder, {game: 'ringette', name: 'Ice crew'}, 400);
  assert.equal((await expect('/api/directory', null))[0].id, id);

  await expect(group + '/rank', recruit, {player: me.player.id, role: 'Officer'}, 403);
  await expect(group + '/chat?channel=officers', recruit, null, 403);
  await expect(group + '/chat', recruit, {channel: 'announcements', text: 'Unauthorized'}, 403);
  await expect(group + '/chat?channel=' + division, recruit, null, 403);
  await expect(group + '/division-member', recruit, {division});
  await expect(group + '/chat', founder, {channel: division, text: 'Practice at six'});
  assert.equal((await expect(group + '/chat?channel=' + division, recruit))[0].text, 'Practice at six');
  const founderId = (await expect('/api/me', founder)).player.id;
  await expect(group + '/block', recruit, {player: founderId});
  assert.deepEqual(await expect(group + '/chat?channel=' + division, recruit), []);
});

test('games isolate directories, sessions, clan IDs, and memberships', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'sport-clans-'));
  const running = [];
  t.after(async () => {
    await Promise.all(running.map(server => new Promise(resolve => server.close(resolve))));
    await rm(dir, {recursive: true, force: true});
  });
  async function gameApi(game, sportOrigin) {
    const database = join(dir, game + '.sqlite');
    const server = createClanServer({game, database, origin: sportOrigin, development: true});
    running.push(server);
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const base = 'http://127.0.0.1:' + server.address().port;
    return (path, body, cookie) => fetch(base + path, {
      redirect: 'manual', method: body ? 'POST' : 'GET',
      headers: {origin: sportOrigin, 'content-type': 'application/json', ...(cookie && {cookie})},
      body: body && JSON.stringify(body)
    });
  }

  const four = await gameApi('four-square', origin);
  const tether = await gameApi('tetherball', 'http://localhost:4111');
  async function signIn(api) {
    const response = await api('/auth/dev', {name: 'Same player'});
    assert.equal(response.status, 303);
    return response.headers.getSetCookie()[0].split(';')[0];
  }
  const fourCookie = await signIn(four);
  const first = await four('/api/clans', clan, fourCookie);
  assert.equal(first.status, 201);
  const {id: firstId} = await first.json();
  assert.deepEqual(await (await tether('/api/directory?game=four-square')).json(), []);
  assert.equal((await (await tether('/api/me', null, fourCookie)).json()).player, undefined);
  const tetherCookie = await signIn(tether);
  assert.equal((await tether('/api/clans/' + firstId, null, tetherCookie)).status, 404);
  const second = await tether('/api/clans', clan, tetherCookie);
  assert.equal(second.status, 201, 'the same tag and player can exist independently in both games');
  const {id: secondId} = await second.json();
  assert.notEqual(firstId, secondId);
  assert.equal((await (await four('/api/me', null, fourCookie)).json()).member.clan, firstId);
  assert.equal((await (await tether('/api/me', null, tetherCookie)).json()).member.clan, secondId);
  assert.throws(() => createClanServer({game:'ringette', database:join(dir, 'tetherball.sqlite')}), /belongs to tetherball/);
});
