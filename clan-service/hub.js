const $=(id)=>document.getElementById(id);
const ranks=['Recruit','Member','Veteran','Captain','Officer','Co-Leader','Founder'];
let me,active='Discover',selected,channel='general',view=0;

function node(tag,text='',className=''){
  const element=document.createElement(tag);element.textContent=text;element.className=className;return element;
}
function button(text,action,style=''){
  const element=node('button',text,style);element.type='button';
  element.onclick=()=>Promise.resolve().then(action).catch(showError);
  return element;
}
function card(...elements){const panel=node('article','','panel');panel.append(...elements);return panel;}
function row(...elements){const panel=node('div','','row');panel.append(...elements);return panel;}
function showError(error){const status=$('status');status.textContent=error.message;status.hidden=false;}
async function api(path,body){
  const request=body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)};
  const response=await fetch(path,request),data=await response.json();
  if(!response.ok)throw Error(data.error);
  return data;
}
const action=(id,name,body={})=>api('/api/clans/'+id+'/'+name,body);
const rank=()=>ranks.indexOf(me.member?.role);
function input(name,title,type='text',value='',settings={}){
  const label=node('label',title),control=node('input');control.name=name;control.type=type;control.value=value;
  Object.assign(control,settings);label.append(control);return label;
}
function pick(name,title,values,value){
  const label=node('label',title),control=node('select');control.name=name;
  for(const item of values){const [id,label]=Array.isArray(item)?item:[item,item];control.add(new Option(label,id));}
  if(value!==undefined)control.value=value;label.append(control);return label;
}
function form(items,submit,title){
  const box=node('form','','form-grid'),save=node('button',title,'primary');
  box.append(...items,save);
  box.onsubmit=async(event)=>{
    event.preventDefault();save.disabled=true;
    try{await submit(Object.fromEntries(new FormData(box)),box);}catch(error){showError(error);}
    finally{save.disabled=false;}
  };
  return box;
}
async function refresh(section=active){
  me=await api('/api/me');
  const account=$('account');
  account.replaceChildren();
  if(me.player)account.append(node('span',me.player.name),button('Sign out',async()=>{await api('/api/logout',{});await refresh('Discover');}));
  else{
    const steam=node('a','Sign in with Steam','action primary');steam.href='/auth/steam';account.append(steam);
  }
  $('game').textContent=me.sport.name;
  $('clanBrand').textContent=me.sport.name;
  document.title=me.sport.name+' | Clans';
  const tabs=['Discover',...(me.player?(me.member?['My clan','Inbox']:['Create clan','Inbox']):[])];
  if(!tabs.includes(section))section='Discover';
  $('tabs').replaceChildren(...tabs.map(tab=>button(tab,()=>refresh(tab),tab===section?'primary':'')));
  active=section;const key=++view,main=$('content');
  $('status').hidden=true;main.replaceChildren(node('p','Loading…','muted'));
  const panel=await (section==='My clan'?details(me.member.clan):section==='Inbox'?inbox():section==='Create clan'?clanForm():directory());
  if(view===key)main.replaceChildren(panel);
}
function emblem(clan){
  const badge=node('span','','emblem');badge.style.setProperty('--team-color',clan.color);
  if(clan.emblem.startsWith('data:image/png;')){const image=node('img');image.src=clan.emblem;image.alt='';badge.append(image);}
  else badge.textContent=clan.emblem;
  return badge;
}
async function directory(){
  const panel=node('div','','stack');
  if(!me.player&&me.development){
    panel.append(card(node('h2','Local test account'),form([input('name','Player name','text','',{required:true,maxLength:32})],async(data)=>{
      const res=await fetch('/auth/dev',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
      if(!res.ok)throw Error((await res.json()).error);
      await refresh();
    },'Enter local test')));
  }
  const search=node('input','','directory-search');search.placeholder='Find a clan by name or tag';search.setAttribute('aria-label','Search clans');
  const results=node('div','','cards');
  let lookup=0;
  const update=async()=>{
    const key=++lookup;
    const clans=await api('/api/directory?'+new URLSearchParams({q:search.value}));
    if(key!==lookup)return;
    results.replaceChildren(...clans.map(clan=>{
      const controls=row();
      if(me.player)controls.append(button('View clan',async()=>$('content').replaceChildren(await details(clan.id))));
      return card(row(emblem(clan),node('h2',clan.name+' ['+clan.tag+']')),node('p',clan.slogan),node('small',clan.count+' / '+clan.capacity+' members · '+clan.region+' · '+clan.language),
        node('p',clan.classification+' · '+clan.privacy,'muted'),controls);
    }));
    if(!clans.length)results.append(node('p','No clans found.'));
  };
  search.oninput=()=>update().catch(showError);
  panel.append(search,results);await update();return panel;
}
function clanForm(existing){
  const clan=existing||{};
  const upload=input('emblemFile','Upload PNG','file','',{accept:'image/png'});
  const fields=[
    input('name','Clan name','text',clan.name,{required:true,maxLength:40}),input('tag','Tag','text',clan.tag,{required:true,minLength:2,maxLength:5}),
    input('emblem','Emblem symbol','text',clan.emblem?.startsWith('data:')?'':clan.emblem||'◆',{maxLength:8}),upload,
    input('color','Clan color','color',clan.color||'#e5bc70'),input('slogan','Slogan','text',clan.slogan,{maxLength:80}),
    input('description','Description','text',clan.description,{maxLength:500}),input('region','Region','text',clan.region,{required:true,maxLength:30}),
    input('language','Language','text',clan.language||'English',{required:true,maxLength:30}),
    pick('classification','Focus',['Casual','Competitive','Professional'],clan.classification),
    pick('privacy','Membership',['Public','Private','Invite only'],clan.privacy),
    input('requirements','Recruitment requirements','text',clan.requirements,{maxLength:240}),
  ];
  return card(node('h2',existing?'Clan settings':'Create a clan'),form(fields,async(data)=>{
    const file=data.emblemFile;delete data.emblemFile;
    if(file.size){
      if(file.type!=='image/png'||file.size>85_000)throw Error('Choose a PNG under 85 KB.');
      const reader=new FileReader();
      data.emblem=await new Promise((resolve,reject)=>{reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});
    } else if(!data.emblem&&existing)data.emblem=clan.emblem;
    if(existing)await action(clan.id,'settings',data);else await api('/api/clans',data);
    await refresh('My clan');
  },existing?'Save changes':'Create clan'));
}
async function details(id){
  const panel=node('div','','stack'),{clan,divisions,members,events}=await api('/api/clans/'+id),joined=me.member?.clan===id;
  const controls=row();
  if(!me.member&&clan.privacy==='Public'){
    const apply=Boolean(clan.requirements);
    controls.append(button(apply?'Apply to join':'Join clan',async()=>{
      await action(id,apply?'apply':'join');await refresh(apply?'Inbox':'My clan');
    },'primary'));
  }
  if(joined)controls.append(button('Leave clan',async()=>{if(confirm('Leave '+clan.name+'?')){await action(id,'leave');await refresh('Discover');}}));
  panel.append(card(row(emblem(clan),node('h2',clan.name+' ['+clan.tag+']')),node('p',clan.slogan),node('p',clan.description),
    node('small',clan.region+' · '+clan.language+' · '+clan.classification+' · '+clan.privacy),node('p',clan.requirements),controls));
  const divisionCards=divisions.map(division=>{
    const roster=division.roster||[];
    const rows=[node('h3',division.name),
      node('small',joined?'Captain: '+(members.find(person=>person.player===division.captain)?.name||'Vacant')+' · '+roster.length+' members':'')];
    if(joined)rows.push(row(button(roster.includes(me.player.id)?'Leave division':'Join division',async()=>{
      await action(id,'division-member',{division:division.id,leave:roster.includes(me.player.id)});await refresh('My clan');
    })));
    return card(...rows);
  });
  const divisionsList=node('div','','cards');
  divisionsList.append(...(divisionCards.length?divisionCards:[node('p','No divisions yet.')]));
  panel.append(card(node('h2','Divisions'),divisionsList));
  if(!joined)return panel;
  if(rank()>=3)panel.append(card(node('h2','Create division'),form([input('name','Division name','text','',{required:true})],
    async(data)=>{await action(id,'division',data);await refresh('My clan');},'Create division')));
  const roster=card(node('h2','Members'));
  for(const person of members){
    const controls=row(node('span',person.name),node('small',person.role));controls.classList.add('person');
    if(person.player!==me.player.id&&rank()>=4&&rank()>ranks.indexOf(person.role)){
      const select=pick('role','',ranks.slice(0,rank()),person.role).querySelector('select');
      controls.append(select,button('Set role',async()=>{await action(id,'rank',{player:person.player,role:select.value});await refresh('My clan');}));
      controls.append(button('Remove',async()=>{if(confirm('Remove '+person.name+'?')){await action(id,'remove',{player:person.player});await refresh('My clan');}}));
      if(rank()===6)controls.append(button('Transfer ownership',async()=>{if(confirm('Transfer ownership to '+person.name+'?')){await action(id,'transfer',{player:person.player});await refresh('My clan');}}));
    }
    roster.append(controls);
  }
  if(rank()>=4)roster.append(form([input('player','SteamID (player must have signed in)','text','',{required:true,pattern:'[0-9]{17}'})],async(data)=>{
    await action(id,'invite',{player:'steam:'+data.player});showError(new Error('Invitation sent.'));
  },'Invite player'));
  panel.append(roster);
  const eventsBox=card(node('h2','Schedule'));
  eventsBox.append(...(events.length?events.map(event=>node('p',new Date(event.starts).toLocaleString()+' · '+event.kind+' · '+event.title)):[node('p','No scheduled events.')]));
  if(rank()>=3)eventsBox.append(form([input('title','Event name','text','',{required:true,maxLength:70}),
    input('starts','Starts','datetime-local','',{required:true}),pick('kind','Type',['Training','Competition']),
    pick('division','Division',[['','Whole clan'],...divisions.map(item=>[item.id,item.name])])],async(data)=>{
      await action(id,'event',{...data,starts:new Date(data.starts).getTime()});await refresh('My clan');
    },'Schedule event'));
  panel.append(eventsBox,await chat(id,divisions));
  if(rank()>=5)panel.append(clanForm(clan));
  return panel;
}
async function chat(id,divisions){
  const choices=[['general','Clan chat'],['announcements','Announcements']];
  if(rank()>=4)choices.push(['officers','Officer chat']);
  for(const entry of divisions)if(entry.roster?.includes(me.player.id))choices.push([entry.id,entry.name]);
  if(!choices.some(([name])=>name===channel))channel='general';
  const selector=pick('channel','Channel',choices,channel),log=node('div','','chat-log'),panel=card(node('h2','Chat'),selector,log);
  const load=async()=>{
    const data=await api('/api/clans/'+id+'/chat?channel='+encodeURIComponent(channel));
    log.replaceChildren(...data.map(line=>{
      const message=node('p');
      message.append(node('strong',line.name+' '),node('span',line.text));
      if(line.player!==me.player.id)message.append(row(button('Block',async()=>{await action(id,'block',{player:line.player});await load();}),
        button('Report',async()=>{const reason=prompt('Reason for report');if(reason)await action(id,'report',{message:line.id,reason});})));
      if(rank()>=4)message.append(button('Delete message',async()=>{if(confirm('Delete this message?')){await action(id,'delete-message',{message:line.id});await load();}}));
      return message;
    }));
    if(!data.length)log.append(node('p','No messages yet.','muted'));
    log.scrollTop=log.scrollHeight;
  };
  selector.querySelector('select').onchange=(event)=>{channel=event.target.value;load().catch(showError);};
  panel.append(form([input('text','Message','text','',{required:true,maxLength:500})],async(data,box)=>{
    await action(id,'chat',{...data,channel});box.reset();await load();
  },'Send'),button('Refresh chat',load));
  await load();return panel;
}
async function inbox(){
  const panel=node('div','','stack'),requests=await api('/api/inbox');
  for(const request of requests){
    const controls=row();
    if(request.kind==='Invite'||request.player!==me.player.id){
      for(const accept of [true,false])controls.append(button(accept?'Accept':'Decline',async()=>{
        await action(request.clan,'resolve',{kind:request.kind,player:request.player,accept});await refresh('Inbox');
      }));
    }
    panel.append(card(node('h2',request.kind+' · '+request.name),node('p',new Date(request.created).toLocaleDateString()),controls));
  }
  if(!requests.length)panel.append(node('p','No invitations or applications.'));
  return panel;
}
refresh().catch(showError);
