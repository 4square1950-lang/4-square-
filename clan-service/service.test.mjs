import assert from 'node:assert/strict';
import {once} from 'node:events';
import {test} from 'node:test';
import {createClanServer} from './service.mjs';

const origin = 'http://localhost:4110';
const clan = {
  name: 'North Court', tag: 'NC', color: '#335e73', region: 'Canada',
  language: 'English', classification: 'Competitive', privacy: 'Public'
};

test('a clan spans games and enforces membership and moderation permissions', async (t) => {
  const server = createClanServer({origin, development: true});
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
  assert.equal(me.games.length, 6);
  assert.equal(me.member.clan, id);
  const {id: division} = await expect(group + '/division', founder, {game: 'tetherball', name: 'Court crew'});
  await expect(group + '/division', founder, {game: 'ringette', name: 'Ice crew'});
  for (const game of ['tetherball', 'ringette']) {
    const results = await expect('/api/directory?game=' + game, null);
    assert.equal(results[0].id, id);
  }

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
