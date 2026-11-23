import type { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import type { ProfileEdit, ConnectionView } from '../src/services/profileProgress';

export const playerPublicKey = (profile: string) => createHash('sha256').update(profile).digest('hex').slice(0,24);
const week = 7 * 24 * 60 * 60 * 1000;
const blocked = /(^|[^a-z])(?:bitch(?:es|y)?|fuck(?:er|ers|ed|ing|s)?|fuk(?:er|ing)?|nigg(?:er|ers|a|as)|shit(?:ty|head)?|cunt(?:s)?|asshole(?:s)?|whore(?:s)?)(?![a-z])/i;
const blockedToken = /^(?:bitch|fuck|fuk|nigger|nigga|shit|cunt|asshole|whore)(?:es|s|er|ers|ed|ing|y)?$/i;
const disguised = new RegExp('(^|[^a-z])(?:'+['bitch','fuck','fuk','nigger','nigga','shit','cunt','asshole','whore']
  .map((word)=>[...word].map((letter)=>letter+'+').join('[^a-z]*')).join('|')+')(?:ers?|es|ed|ing|s|y)?(?![a-z])','i');

export function acceptableProfileText(value: string) {
  const folded = value.normalize('NFKD').toLowerCase().replace(/\p{M}|\p{Cf}/gu,'')
    .replace(/[013457@$]/g,(character) => ({'0':'o','1':'i','3':'e','4':'a','5':'s','7':'t','@':'a','$':'s'})[character]!)
    .replace(/[аорсеіх]/g,(character) => ({'а':'a','о':'o','р':'p','с':'c','е':'e','і':'i','х':'x'})[character]!);
  const compact = folded.replace(/[^a-z]+/g, '');
  const collapse = (input:string) => input.replace(/([a-z])\1{2,}/g,'$1$1');
  if (blocked.test(collapse(folded)) || disguised.test(folded) || blockedToken.test(collapse(compact))) return false;
  return !folded.split(/\s+/).some((word) => blockedToken.test(collapse(word.replace(/[^a-z]+/g,''))));
}

export function createSocial(db: DatabaseSync, now: () => number) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS profile_details (profile TEXT PRIMARY KEY, username TEXT NOT NULL,
      username_key TEXT UNIQUE NOT NULL, bio TEXT NOT NULL, username_changed INTEGER NOT NULL, npc INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS profile_extras (profile TEXT PRIMARY KEY, mascot INTEGER, youtube TEXT NOT NULL DEFAULT '');
    CREATE TABLE IF NOT EXISTS npc_connection_seeds (profile TEXT PRIMARY KEY);
    CREATE TABLE IF NOT EXISTS direct_messages (id INTEGER PRIMARY KEY, sender TEXT NOT NULL, recipient TEXT NOT NULL, body TEXT NOT NULL, sent_at INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS direct_messages_pair ON direct_messages(sender,recipient,sent_at,id);
    CREATE INDEX IF NOT EXISTS reverse_follows ON player_follows(followed,follower);
  `);
  const details = (profile: string) => db.prepare('SELECT d.*, e.mascot, e.youtube FROM profile_details d LEFT JOIN profile_extras e USING(profile) WHERE d.profile=?').get(profile);
  const byKey = (key: string, viewer: string) => db.prepare(`SELECT n.profile FROM player_names n LEFT JOIN rankings_privacy p ON n.profile=p.profile
    WHERE n.public_key=? AND (n.profile=? OR COALESCE(p.visible,1)=1)`).get(key,viewer)?.profile;
  return {
    details,
    byKey,
    usernameAvailableAt(profile: string) { return Number(details(profile)?.username_changed ?? 0) + week; },
    edit(profile: string, input: ProfileEdit) {
      const { username, displayName, bio } = input;
      const key = username.normalize('NFKC').toLowerCase();
      const previous = details(profile);
      if (previous && previous.username !== username && now() < Number(previous.username_changed)+week) return 'You can change your username once every seven days.';
      const duplicate = db.prepare('SELECT profile FROM profile_details WHERE username_key=? AND profile<>?').get(key,profile);
      if (duplicate) return 'That username is already taken.';
      db.exec('BEGIN IMMEDIATE');
      try {
        db.prepare(`INSERT INTO profile_details VALUES (?,?,?,?,?,0)
          ON CONFLICT(profile) DO UPDATE SET username=excluded.username,username_key=excluded.username_key,bio=excluded.bio,username_changed=excluded.username_changed`)
          .run(profile,username,key,bio,previous && previous.username === username ? Number(previous.username_changed) : now());
        db.prepare('INSERT INTO player_names VALUES (?,?,?) ON CONFLICT(profile) DO UPDATE SET name=excluded.name')
          .run(profile,playerPublicKey(profile),displayName);
        if (input.mascot !== undefined || input.youtube !== undefined) {
          db.prepare('INSERT INTO profile_extras VALUES (?,?,?) ON CONFLICT(profile) DO UPDATE SET mascot=excluded.mascot,youtube=excluded.youtube')
            .run(profile,input.mascot ?? previous?.mascot ?? null,input.youtube ?? previous?.youtube ?? '');
        }
        db.exec('COMMIT');
      } catch(error) { db.exec('ROLLBACK');throw error; }
    },
    seed() {
      if (db.prepare("SELECT 1 FROM profile_details WHERE profile='social-npc-240'").get()) return;
      const first = ['Avery','Emery','Jordan','Taylor','Kai','Alex','Rowan','Emerson','Morgan','Dana','Ash','Sky'];
      const last = ['Vale','Sato','Park','Reyes','Brooks','Rivera','Reed','Hart','Cole','Bell','Ellis','Patel','Ng','Kim','Snow','Grant','Hill','Lin','Wells','Lee'];
      const put = db.prepare('INSERT OR IGNORE INTO profile_details VALUES (?,?,?,?,?,1)');
      const name = db.prepare('INSERT OR IGNORE INTO player_names VALUES (?,?,?)');
      for (let i=0; i<240; i++) {
        const number = String(i+1).padStart(3,'0'), id = 'social-npc-'+number;
        const display = first[i%first.length]+' '+last[Math.floor(i/first.length)];
        put.run(id,'court-bot-'+number,'court-bot-'+number,'Four Square practice partner.',0);
        name.run(id,playerPublicKey(id),display);
      }
    },
    seedConnections(profile: string) {
      if (db.prepare('SELECT 1 FROM npc_connection_seeds WHERE profile=?').get(profile)) return;
      this.seed();
      const offset = parseInt(playerPublicKey(profile).slice(0,6),16) % 240;
      const put = db.prepare('INSERT OR IGNORE INTO player_follows VALUES (?,?)');
      db.exec('BEGIN IMMEDIATE');
      try {
        for (let index=0; index<12; index++) {
          const npc='social-npc-'+String((offset+index)%240+1).padStart(3,'0');
          if(index<8)put.run(profile,npc);
          if(index<4 || index>=8)put.run(npc,profile);
        }
        db.prepare('INSERT INTO npc_connection_seeds VALUES (?)').run(profile);
        db.exec('COMMIT');
      } catch (error) { db.exec('ROLLBACK'); throw error; }
    },
    directory(viewer:string, view:ConnectionView, search:string) {
      return db.prepare(`SELECT n.profile FROM player_names n
        LEFT JOIN profile_details d ON d.profile=n.profile LEFT JOIN rankings_privacy p ON p.profile=n.profile
        WHERE n.profile<>? AND COALESCE(p.visible,1)=1 AND (
          (?='search' AND (instr(lower(n.name),lower(?))>0 OR instr(lower(d.username),lower(?))>0))
          OR (? IN ('following','friends') AND EXISTS(SELECT 1 FROM player_follows WHERE follower=? AND followed=n.profile)
            AND (?='following' OR EXISTS(SELECT 1 FROM player_follows WHERE followed=? AND follower=n.profile)))
          OR (?='followers' AND EXISTS(SELECT 1 FROM player_follows WHERE followed=? AND follower=n.profile))
        ) ORDER BY COALESCE(d.npc,0),n.name,n.public_key LIMIT 250`).all(viewer,view,search,search,view,viewer,view,viewer,view,viewer)
        .map(({profile}) => String(profile));
    },
    contacts(viewer:string) {
      return db.prepare(`
        WITH visible_messages AS (
          SELECT id, sender, body, sent_at, CASE WHEN sender=? THEN recipient ELSE sender END AS profile
          FROM direct_messages WHERE (sender=? OR recipient=?) AND sent_at<=?
        ), ranked AS (
          SELECT *, ROW_NUMBER() OVER (PARTITION BY profile ORDER BY sent_at DESC,id DESC) AS recent FROM visible_messages
        )
        SELECT id, sender, body, sent_at, profile FROM ranked WHERE recent=1
        ORDER BY sent_at DESC,id DESC LIMIT 100
      `).all(viewer,viewer,viewer,now()).map(({profile,id,sender,body,sent_at}) => ({
        profile:String(profile), latest:{id:Number(id),mine:sender===viewer,body:String(body),time:Number(sent_at)}
      }));
    },
    messages(viewer:string,target:string) {
      return db.prepare(`SELECT id,sender,body,sent_at FROM direct_messages
        WHERE ((sender=? AND recipient=?) OR (sender=? AND recipient=?)) AND sent_at<=?
        ORDER BY id DESC LIMIT 100`).all(viewer,target,target,viewer,now()).reverse()
        .map(({id,sender,body,sent_at}) => ({id:Number(id),mine:sender===viewer,body:String(body),time:Number(sent_at)}));
    },
    send(viewer:string,target:string,body:string) {
      const time = now();
      const changed = db.prepare(`INSERT INTO direct_messages(sender,recipient,body,sent_at) SELECT ?,?,?,?
        WHERE ?=? OR EXISTS(SELECT 1 FROM direct_messages WHERE sender=? AND recipient=? AND sent_at<=?)
        OR 2>(SELECT COUNT(*) FROM direct_messages WHERE sender=? AND recipient=?)`)
        .run(viewer,target,body,time,viewer,target,target,viewer,time,viewer,target);
      if (!changed.changes) return false;
      if (details(target)?.npc && !db.prepare('SELECT 1 FROM direct_messages WHERE sender=? AND recipient=? AND sent_at>?').get(target,viewer,time)) {
        const responses = ['Thanks for stopping by my court!','Good to hear from you. See you on the blacktop.','Hey! What court have you been playing on?'];
        db.prepare('INSERT INTO direct_messages(sender,recipient,body,sent_at) VALUES (?,?,?,?)')
          .run(target,viewer,responses[Number(changed.lastInsertRowid)%responses.length],time+3000);
      }
      return true;
    },
  };
}
