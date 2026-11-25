import http from 'node:http';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {readFileSync,mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {pathToFileURL} from 'node:url';

const roles=['Recruit','Member','Veteran','Captain','Officer','Co-Leader','Founder'];
const steam='https://steamcommunity.com/openid/login';
const day=86400000;
const token=()=>randomBytes(32).toString('hex');
const hash=(value)=>createHash('sha256').update(value).digest('hex');
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
function clean(value,max,min=0){
  if(typeof value!=='string')fail(400,'Enter valid text.');
  const text=value.trim().normalize('NFKC');
  if(text.length<min||text.length>max||/[\u0000-\u001F\u007F]/.test(text))fail(400,'Check the text length and characters.');
  return text;
}
function option(value,options){if(!options.includes(value))fail(400,'Choose a valid option.');return value;}
async function json(req){
  if(!req.headers['content-type']?.startsWith('application/json'))fail(415,'Expected JSON.');
  let size=0;const chunks=[];
  for await(const chunk of req){
    size+=chunk.length;
    if(size>150000) fail(413,'Request too large.');
    chunks.push(chunk);
  }
  let data;
  try{data=JSON.parse(Buffer.concat(chunks));}catch{fail(400,'Invalid JSON.');}
  if(!data||typeof data!=='object'||Array.isArray(data))fail(400,'Invalid request.');
  return data;
}
function clanFields(body){
  const name=clean(body.name,40,3),tag=clean(body.tag,5,2).toUpperCase();
  if(!/^[A-Z0-9]{2,5}$/.test(tag))fail(400,'Use 2–5 letters or digits for the tag.');
  if(!/^#[0-9a-f]{6}$/i.test(body.color??''))fail(400,'Choose a clan color.');
  const emblem=body.emblem||'◆';
  if(typeof emblem!=='string'||!(emblem.length<=8||/^data:image\/png;base64,[A-Za-z0-9+/=]{4,120000}$/.test(emblem)))fail(400,'Use a symbol or a PNG emblem.');
  return [name,tag,emblem,body.color,clean(body.description??'',500),clean(body.slogan??'',80),
    clean(body.region??'',30,1),clean(body.language??'',30,1),
    option(body.classification,['Casual','Competitive','Professional']),option(body.privacy,['Public','Private','Invite only']),clean(body.requirements??'',240)];
}

export function createClanServer({database=':memory:',origin='http://localhost:4110',development=false,fetchSteam=fetch}={}){
  const location=new URL(origin);
  const local=['localhost','127.0.0.1','[::1]'].includes(location.hostname);
  if(location.pathname!=='/'||location.search||location.hash||(!local&&location.protocol!=='https:'))throw new Error('Use a localhost or HTTPS clan origin.');
  if(development&&!local)throw new Error('Development sign-in requires localhost.');
  if(database!==':memory:')mkdirSync(dirname(resolve(database)),{recursive:true});
  const db=new DatabaseSync(database);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
  db.exec(readFileSync(new URL('001-core.sql',import.meta.url),'utf8'));
  const get=(sql,...args)=>db.prepare(sql).get(...args);
  const all=(sql,...args)=>db.prepare(sql).all(...args);
  const run=(sql,...args)=>db.prepare(sql).run(...args);
  const tx=(task)=>{
    db.exec('BEGIN IMMEDIATE');
    try{const value=task();db.exec('COMMIT');return value;}catch(error){db.exec('ROLLBACK');throw error;}
  };
  function reply(res,status,value){
    res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
    res.end(JSON.stringify(value));
  }
  function cookie(req,name){
    return req.headers.cookie?.split(';').map(item=>item.trim()).find(item=>item.startsWith(name+'='))?.slice(name.length+1)||'';
  }
  function setCookie(name,value,max,extra=''){
    return name+'='+value+'; HttpOnly; SameSite=Lax; Path=/; Max-Age='+max+(location.protocol==='https:'?'; Secure':'')+extra;
  }
  function session(res,id,name,game){
    run('INSERT OR IGNORE INTO players(id,name) VALUES(?,?)',id,name);
    run('DELETE FROM sessions WHERE expires<?',Date.now());
    const sessionId=token();
    run('INSERT INTO sessions VALUES(?,?,?)',hash(sessionId),id,Date.now()+14*day);
    res.setHeader('Set-Cookie',setCookie('clan_session',sessionId,1209600));
    res.writeHead(303,{Location:'/?game='+encodeURIComponent(game||'')}).end();
  }
  const membership=(player)=>get('SELECT m.*,c.suspended FROM members m JOIN clans c ON c.id=m.clan WHERE m.player=?',player);
  function member(player,clan,rank='Recruit'){
    const entry=membership(player);
    if(!entry||entry.clan!==clan||entry.suspended||roles.indexOf(entry.role)<roles.indexOf(rank))fail(403,'Your clan role cannot do that.');
    return entry;
  }
  const audit=(clan,player,action,subject=null)=>run('INSERT INTO audit(clan,player,action,subject,created) VALUES(?,?,?,?,?)',clan,player,action,subject,Date.now());
  function clan(id){
    const row=get('SELECT * FROM clans WHERE id=? AND suspended=0',id);
    if(!row)fail(404,'Clan unavailable.');
    return row;
  }
  function addMember(id,player,role='Recruit'){
    if(membership(player))fail(409,'This player already belongs to a clan.');
    const entry=clan(id), count=get('SELECT count(*) AS total FROM members WHERE clan=?',id).total;
    if(count>=entry.capacity)fail(409,'This clan is full.');
    run('INSERT INTO members VALUES(?,?,?,?)',player,id,role,Date.now());
    run('DELETE FROM requests WHERE player=?',player);
  }
  const rate=new Map();
  const assets={
    '/':['hub.html','text/html; charset=utf-8'],
    '/hub.js':['hub.js','text/javascript; charset=utf-8'],
    '/hub.css':['hub.css','text/css; charset=utf-8'],
  };
  const server=http.createServer(async (req,res)=>{
    res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','no-referrer');
    try{
      const url=new URL(req.url,location.origin), parts=url.pathname.split('/').filter(Boolean);
      const method=req.method, query=url.searchParams;
      if(method==='GET'&&Object.hasOwn(assets,url.pathname)){
        const [asset,type]=assets[url.pathname];
        res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});
        return res.end(readFileSync(new URL(asset,import.meta.url)));
      }
      const ip=req.socket.remoteAddress||'unknown', now=Date.now();
      const recent=rate.get(ip)||{count:0,until:now+60000};
      if(now>recent.until){recent.count=0;recent.until=now+60000;}
      if(++recent.count>360)fail(429,'Try again in a minute.');
      rate.set(ip,recent);
      if(rate.size>4000)for(const [key,val] of rate)if(now>val.until)rate.delete(key);
      if(method==='POST'&&req.headers.origin!==location.origin)fail(403,'Request origin denied.');
      if(method==='GET'&&url.pathname==='/auth/steam'){
        run('DELETE FROM login_challenges WHERE expires<?',now);
        const challenge=token();
        run('INSERT INTO login_challenges VALUES(?,?)',hash(challenge),now+600000);
        const callback=new URL('/auth/steam/return',location);
        callback.searchParams.set('challenge',challenge);
        callback.searchParams.set('game',query.get('game')||'');
        const redirect=new URL(steam), target=redirect.searchParams;
        target.set('openid.ns','http://specs.openid.net/auth/2.0');
        target.set('openid.mode','checkid_setup');
        target.set('openid.return_to',callback.href);
        target.set('openid.realm',location.origin+'/');
        for(const key of ['claimed_id','identity'])target.set('openid.'+key,'http://specs.openid.net/auth/2.0/identifier_select');
        res.setHeader('Set-Cookie',setCookie('clan_challenge',challenge,600));
        return res.writeHead(302,{Location:redirect.href}).end();
      }
      if(method==='GET'&&url.pathname==='/auth/steam/return'){
        const state=query.get('challenge')||'';
        if(!/^[a-f0-9]{64}$/.test(state)||cookie(req,'clan_challenge')!==state||
          !run('DELETE FROM login_challenges WHERE id=? AND expires>=?',hash(state),now).changes)fail(403,'Steam sign-in expired.');
        const identity=query.get('openid.claimed_id')||'';
        const id=/^https?:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/.exec(identity)?.[1];
        const returnTo=new URL('/auth/steam/return',location);
        returnTo.searchParams.set('challenge',state);returnTo.searchParams.set('game',query.get('game')||'');
        if(!id||query.get('openid.mode')!=='id_res'||query.get('openid.identity')!==identity||
          query.get('openid.op_endpoint')!==steam||query.get('openid.return_to')!==returnTo.href)fail(403,'Invalid Steam identity response.');
        const signed=(query.get('openid.signed')||'').split(',');
        if(!['identity','claimed_id','return_to','response_nonce','op_endpoint'].every(key=>signed.includes(key)))fail(403,'Incomplete Steam signature.');
        const form=new URLSearchParams([...query].filter(([key])=>key.startsWith('openid.')));
        form.set('openid.mode','check_authentication');
        const verification=await fetchSteam(steam,{method:'POST',body:form,redirect:'error',signal:AbortSignal.timeout(8000)});
        if(!verification.ok||!(await verification.text()).split(/\r?\n/).includes('is_valid:true'))fail(403,'Steam could not verify this sign-in.');
        return session(res,'steam:'+id,'Steam player '+id.slice(-5),query.get('game'));
      }
      if(method==='POST'&&url.pathname==='/auth/dev'){
        if(!development||!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(ip))fail(404,'Development sign-in is disabled.');
        const body=await json(req), name=clean(body.name,32,3);
        return session(res,'dev:'+hash(name.toLowerCase()),name,'');
      }
      if(parts[0]!=='api')fail(404,'Page not found.');
      const player=get('SELECT p.* FROM sessions s JOIN players p ON p.id=s.player WHERE s.id=? AND s.expires>=?',hash(cookie(req,'clan_session')),now);
      const current=player?membership(player.id):null;
      if(method==='GET'&&parts[1]==='me')return reply(res,200,{player,member:current,development,games:all('SELECT * FROM games ORDER BY name')});
      if(method==='GET'&&parts[1]==='directory'){
        const filter=(query.get('q')||'').slice(0,40);
        const game=(query.get('game')||'').slice(0,30);
        return reply(res,200,all(`SELECT c.*, (SELECT count(*) FROM members WHERE clan=c.id) AS count,
          (SELECT group_concat(DISTINCT game) FROM divisions WHERE clan=c.id) AS games FROM clans c
          WHERE c.suspended=0 AND c.privacy<>'Private' AND (instr(lower(c.name),lower(?)) OR instr(lower(c.tag),lower(?)))
          AND (?='' OR EXISTS (SELECT 1 FROM divisions WHERE clan=c.id AND game=?))
          ORDER BY count DESC,c.name LIMIT 100`,filter,filter,game,game));
      }
      if(method==='POST'&&parts[1]==='logout'){
        run('DELETE FROM sessions WHERE id=?',hash(cookie(req,'clan_session')));
        res.setHeader('Set-Cookie',setCookie('clan_session','',0));return reply(res,200,{});
      }
      if(!player)fail(401,'Sign in to manage clans.');
      const uid=player.id;
      if(method==='GET'&&parts[1]==='inbox')return reply(res,200,all(`SELECT r.*,c.name FROM requests r JOIN clans c ON c.id=r.clan
        WHERE (r.player=? OR (r.clan=? AND r.kind='Application' AND ?)) AND c.suspended=0 ORDER BY created DESC LIMIT 100`,
        uid,current?.clan??'',Number(roles.indexOf(current?.role)>=roles.indexOf('Officer'))));
      if(method==='POST'&&parts[1]==='clans'&&parts.length===2){
        const fields=clanFields(await json(req)), id=randomUUID();
        tx(()=>{
          if(membership(uid))fail(409,'Leave your current clan first.');
          run('INSERT INTO clans(id,name,tag,emblem,color,description,slogan,region,language,classification,privacy,requirements,created) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)',id,...fields,now);
          addMember(id,uid,'Founder');audit(id,uid,'Create clan');
        });
        return reply(res,201,{id});
      }
      if(parts[1]!=='clans'||parts.length<3)fail(404,'Unknown clan route.');
      const id=parts[2], entry=clan(id), action=parts[3];
      if(method==='GET'&&!action){
        const joined=current?.clan===id, invited=get("SELECT 1 FROM requests WHERE clan=? AND player=? AND kind='Invite'",id,uid);
        if(entry.privacy==='Private'&&!joined&&!invited)fail(404,'Clan unavailable.');
        const divisions=all('SELECT * FROM divisions WHERE clan=? ORDER BY game,name',id);
        if(joined)for(const division of divisions)division.roster=all('SELECT player FROM division_members WHERE division=?',division.id).map(item=>item.player);
        return reply(res,200,{clan:entry,divisions,members:joined?all('SELECT m.player,p.name,m.role,m.joined FROM members m JOIN players p ON p.id=m.player WHERE m.clan=? ORDER BY m.joined',id):[],
          events:joined?all('SELECT * FROM clan_events WHERE clan=? AND starts>? ORDER BY starts LIMIT 50',id,now-day):[]});
      }
      if(method==='GET'&&action==='chat'){
        const channel=query.get('channel')||'general';
        checkChannel(id,uid,channel);
        return reply(res,200,all(`SELECT m.id,m.text,m.created,p.name,m.player FROM messages m JOIN players p ON p.id=m.player
          WHERE m.clan=? AND m.channel=? AND NOT EXISTS(SELECT 1 FROM blocks WHERE player=? AND blocked=m.player)
          ORDER BY m.id DESC LIMIT 50`,id,channel,uid).reverse());
      }
      if(method!=='POST')fail(405,'Method unavailable.');
      const b=await json(req);
      const result=tx(()=>{
        if(action==='join'){
          if(entry.privacy!=='Public'||entry.requirements)fail(403,'This clan requires recruitment approval.');
          addMember(id,uid);audit(id,uid,'Join clan');
        } else if(action==='apply'){
          if(membership(uid)||entry.privacy!=='Public')fail(403,'Applications are unavailable for this clan.');
          run("INSERT OR IGNORE INTO requests VALUES(?,?,'Application',?)",id,uid,now);
        } else if(action==='invite'){
          member(uid,id,'Officer');
          if(!get('SELECT 1 FROM players WHERE id=?',b.player)||membership(b.player))fail(404,'That player is unavailable.');
          run("INSERT OR IGNORE INTO requests VALUES(?,?,'Invite',?)",id,b.player,now);
          audit(id,uid,'Invite player',b.player);
        } else if(action==='resolve'){
          const kind=option(b.kind,['Application','Invite']), target=kind==='Invite'?uid:b.player;
          if(kind==='Application')member(uid,id,'Officer');
          if(!get('SELECT 1 FROM requests WHERE clan=? AND player=? AND kind=?',id,target,kind))fail(404,'Request expired.');
          if(b.accept===true)addMember(id,target);
          run('DELETE FROM requests WHERE clan=? AND player=? AND kind=?',id,target,kind);
          audit(id,uid,b.accept?'Accept '+kind:'Decline '+kind,target);
        } else if(action==='leave'){
          const me=member(uid,id);
          if(me.role==='Founder'){
            if(get('SELECT count(*) AS count FROM members WHERE clan=?',id).count>1)fail(409,'Transfer ownership before leaving.');
            run('DELETE FROM clans WHERE id=?',id);
          } else run('DELETE FROM members WHERE player=?',uid);
          audit(id,uid,'Leave clan');
        } else if(action==='settings'){
          member(uid,id,'Co-Leader');
          run('UPDATE clans SET name=?,tag=?,emblem=?,color=?,description=?,slogan=?,region=?,language=?,classification=?,privacy=?,requirements=? WHERE id=?',...clanFields(b),id);
          audit(id,uid,'Edit clan');
        } else if(action==='rank'||action==='remove'||action==='transfer'){
          const me=member(uid,id,action==='transfer'?'Founder':'Officer'), target=membership(b.player);
          if(!target||target.clan!==id||roles.indexOf(target.role)>=roles.indexOf(me.role))fail(403,'Cannot manage this member.');
          if(action==='remove')run('DELETE FROM members WHERE player=?',b.player);
          else if(action==='transfer'){
            run("UPDATE members SET role='Co-Leader' WHERE player=?",uid);
            run("UPDATE members SET role='Founder' WHERE player=?",b.player);
          } else {
            const rank=option(b.role,roles.slice(0,roles.indexOf(me.role)));
            run('UPDATE members SET role=? WHERE player=?',rank,b.player);
          }
          audit(id,uid,action,b.player);
        } else if(action==='division'){
          member(uid,id,'Captain');
          if(!get('SELECT 1 FROM games WHERE id=?',b.game))fail(400,'Unknown sport.');
          const division=randomUUID();
          run('INSERT INTO divisions VALUES(?,?,?,?,?)',division,id,b.game,clean(b.name,45,2),uid);
          run('INSERT INTO division_members VALUES(?,?)',division,uid);
          audit(id,uid,'Create division',division);
          return {id:division};
        } else if(action==='division-member'){
          const me=member(uid,id);
          const division=get('SELECT * FROM divisions WHERE id=? AND clan=?',b.division,id);
          if(!division)fail(404,'Division unavailable.');
          const target=b.player||uid;
          member(target,id);
          if(target!==uid&&division.captain!==uid&&roles.indexOf(me.role)<roles.indexOf('Officer'))fail(403,'Cannot manage this roster.');
          if(b.leave===true)run('DELETE FROM division_members WHERE division=? AND player=?',division.id,target);
          else run('INSERT OR IGNORE INTO division_members VALUES(?,?)',division.id,target);
          audit(id,uid,'Update division roster',division.id);
        } else if(action==='event'){
          member(uid,id,'Captain');
          if(!Number.isSafeInteger(b.starts)||b.starts<now||b.starts>now+365*day)fail(400,'Choose a future date within one year.');
          if(b.division&&!get('SELECT 1 FROM divisions WHERE id=? AND clan=?',b.division,id))fail(404,'Division unavailable.');
          run('INSERT INTO clan_events(clan,division,player,title,starts,kind) VALUES(?,?,?,?,?,?)',id,b.division||null,uid,clean(b.title,70,3),b.starts,option(b.kind,['Training','Competition']));
          audit(id,uid,'Schedule event');
        } else if(action==='chat'){
          const channel=b.channel||'general';
          checkChannel(id,uid,channel);
          if(channel==='announcements')member(uid,id,'Officer');
          if(get('SELECT count(*) AS count FROM messages WHERE player=? AND created>?',uid,now-10000).count>=5)fail(429,'Please slow down.');
          run('INSERT INTO messages(clan,channel,player,text,created) VALUES(?,?,?,?,?)',id,channel,uid,clean(b.text,500,1),now);
        } else if(action==='block'){
          member(uid,id);member(b.player,id);
          if(b.player===uid)fail(400,'Choose another member.');
          if(b.undo)run('DELETE FROM blocks WHERE player=? AND blocked=?',uid,b.player);
          else run('INSERT OR IGNORE INTO blocks VALUES(?,?)',uid,b.player);
        } else if(action==='report'||action==='delete-message'){
          member(uid,id,action==='delete-message'?'Officer':'Recruit');
          const message=get('SELECT channel FROM messages WHERE clan=? AND id=?',id,b.message);
          if(!message)fail(404,'Message unavailable.');
          checkChannel(id,uid,message.channel);
          if(action==='delete-message')run('DELETE FROM messages WHERE id=? AND clan=?',b.message,id);
          else run('INSERT INTO reports(clan,player,message,reason,created) VALUES(?,?,?,?,?)',id,uid,b.message,clean(b.reason,240,3),now);
          audit(id,uid,action,String(b.message));
        } else fail(404,'Unknown clan action.');
        return {};
      });
      return reply(res,200,result);
    }catch(error){
      if(res.headersSent){res.end();return;}
      if(error?.code?.includes('SQLITE')&&/UNIQUE/i.test(error.message))return reply(res,409,{error:'That name or tag is already taken.'});
      if(!error.status)console.error(error);
      reply(res,error.status||500,{error:error.status?error.message:'Clan service could not complete this request.'});
    }
  });
  function checkChannel(id,uid,channel){
    const me=member(uid,id,channel==='officers'?'Officer':'Recruit');
    if(['general','officers','announcements'].includes(channel))return me;
    const entry=get('SELECT d.id FROM divisions d JOIN division_members m ON m.division=d.id WHERE d.id=? AND d.clan=? AND m.player=?',channel,id,uid);
    if(!entry)fail(403,'Join this division to open its chat.');
    return me;
  }
  server.on('close',()=>db.close());
  return server;
}

if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
  const port=Number(process.env.CLAN_PORT||4110);
  const origin=process.env.CLAN_ORIGIN||'http://localhost:'+port;
  const server=createClanServer({database:process.env.CLAN_DB||'.game-data/clans.sqlite',origin,development:process.env.CLAN_DEV==='1'});
  server.listen(port,process.env.CLAN_HOST||'127.0.0.1',()=>console.log('Clan hub: '+origin));
}
