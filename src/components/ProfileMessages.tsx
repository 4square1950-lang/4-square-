import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, ChevronRight, Pencil, Send, X } from 'lucide-react';
import type { PublicProfile } from '../services/leagueTypes';
import { preparePlayerSession } from '../services/marketClient';
import { MASCOTS } from '../services/profileExtras';
import type { DirectMessage, MessageContact } from '../services/profileProgress';

async function read<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {cache:'no-store',...options});
  if (!response.ok) {
    const result = await response.json().catch(()=>null);
    throw Error(result?.error ?? 'Messages are unavailable.');
  }
  return response.json();
}

function ContactAvatar({person}:{person:PublicProfile}) {
  const initials = person.name.trim().split(/\s+/).slice(0,2).map((word)=>[...word][0]).join('').toUpperCase();
  const color = (parseInt(person.key.slice(0,5),16) || 0) % 360;
  return <span className="inbox-avatar" aria-hidden="true" style={{backgroundColor:'hsl('+color+' 29% 30%)'}}>
    {person.mascot !== undefined ? MASCOTS[person.mascot] : initials || '•'}
  </span>;
}

export function ProfileMessages({recipient,selfKey,onClose}:{recipient?:PublicProfile;selfKey?:string;onClose:()=>void}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const [people,setPeople]=useState<MessageContact[]>();
  const [target,setTarget]=useState(recipient);
  const [composing,setComposing]=useState(false);
  const [query,setQuery]=useState('');
  const [results,setResults]=useState<PublicProfile[]>();
  const [error,setError]=useState('');
  const lookup=useRef<AbortController|null>(null);

  useEffect(()=>{
    const node=dialog.current;
    node?.showModal();
    return ()=>{ if(node?.open)node.close(); lookup.current?.abort(); };
  },[]);

  useEffect(()=>{
    let active=true;
    let next:number|undefined;
    let sessionReady=false;
    const refresh=async()=>{
      try {
        if(!sessionReady){await preparePlayerSession();sessionReady=true;}
        const list=await read<MessageContact[]>('/api/player/messages');
        if(active){setPeople(list);setError('');}
      } catch (problem) {
        if(active)setError(problem instanceof Error?problem.message:'Could not load conversations.');
      } finally {
        if(active)next=window.setTimeout(refresh,2000);
      }
    };
    void refresh();
    return ()=>{active=false;window.clearTimeout(next);};
  },[]);

  const openConversation=(person:PublicProfile)=>{
    lookup.current?.abort();
    setTarget(person);
    setComposing(false);
    setQuery('');
    setResults(undefined);
  };
  const search=async(event:FormEvent)=>{
    event.preventDefault();
    lookup.current?.abort();
    const controller=new AbortController();
    lookup.current=controller;
    setError('');
    try {
      const entries=await read<PublicProfile[]>('/api/player/directory?'+new URLSearchParams({view:'search',q:query.trim()}),{signal:controller.signal});
      if(!controller.signal.aborted)setResults(entries);
    } catch(problem) {
      if(!controller.signal.aborted)setError(problem instanceof Error?problem.message:'Could not find players.');
    }
  };

  return <dialog className="messages-modal" aria-labelledby="messages-title" ref={dialog}
    onCancel={(event)=>{event.preventDefault();onClose();}}>
    <header className="messages-modal-header">
      {(target||composing) && <button className="message-square" aria-label="Back to inbox" onClick={()=>{lookup.current?.abort();setTarget(undefined);setComposing(false);setResults(undefined);setQuery('');}}><ArrowLeft size={19}/></button>}
      {target && <ContactAvatar person={target}/>}
      <h2 id="messages-title">{target ? target.key===selfKey?'Notes to self':target.name : composing?'New message':'Messages'}</h2>
      <button className="message-square inbox-close" autoFocus aria-label="Close messages" onClick={onClose}><X size={20}/></button>
    </header>
    {target ? <MessageThread key={target.key} person={target}/> : <>
      {composing && <form className="messages-compose" onSubmit={search}>
        <input autoFocus className="profile-field" aria-label="Find recipient" placeholder="Search players" value={query} maxLength={64} onChange={(event)=>setQuery(event.target.value)}/>
        <button className="league-button" disabled={!query.trim()}>Search</button>
      </form>}
      <div className="messages-list" aria-label={composing?'Recipients':'Conversations'}>
        {error && <p role="alert">{error}</p>}
        {!people && !error && <p role="status">Loading conversations…</p>}
        {composing && results?.length===0 && <p>No players found.</p>}
        {(composing && results ? results : people ?? []).map((contact:MessageContact)=><button key={contact.key} className="message-contact" onClick={()=>openConversation(contact)}>
          <ContactAvatar person={contact}/>
          <span><strong>{contact.key===selfKey?'Notes to self':contact.name}</strong><small>{contact.latest ? (contact.latest.mine?'You: ':'')+contact.latest.body : contact.key===selfKey?'Keep a private note':contact.username?'@'+contact.username:'Start a conversation'}</small></span>
          {contact.latest && <time dateTime={new Date(contact.latest.time).toISOString()}>{new Date(contact.latest.time).toLocaleDateString(undefined,{month:'short',day:'numeric'})}</time>}
          <ChevronRight size={16} aria-hidden="true"/>
        </button>)}
      </div>
      {!composing && <footer className="messages-modal-footer"><button className="message-square message-compose-button" aria-label="New message" title="New message" onClick={()=>{setQuery('');setResults(undefined);setComposing(true);}}><Pencil size={21}/></button></footer>}
    </>}
  </dialog>;
}

function MessageThread({person}:{person:PublicProfile}) {
  const [messages,setMessages]=useState<DirectMessage[]>();
  const [draft,setDraft]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const revision=useRef(0);
  const log=useRef<HTMLOListElement>(null);
  const last=messages?.at(-1)?.id;

  useEffect(()=>{
    const controller=new AbortController();
    let next:number|undefined;
    const poll=async()=>{
      const version=revision.current;
      try {
        const list=await read<DirectMessage[]>('/api/player/messages?'+new URLSearchParams({key:person.key}),{signal:controller.signal});
        if(!controller.signal.aborted && revision.current===version)setMessages(list);
      } catch(problem) {
        if(!controller.signal.aborted && revision.current===version && version===0)setError(problem instanceof Error?problem.message:'Could not load messages.');
      } finally {
        if(!controller.signal.aborted)next=window.setTimeout(poll,1500);
      }
    };
    void poll();
    return ()=>{controller.abort();window.clearTimeout(next);};
  },[person.key]);

  useEffect(()=>{ if(log.current)log.current.scrollTop=log.current.scrollHeight; },[last]);

  const send=async(event:FormEvent)=>{
    event.preventDefault();
    if(busy||!draft.trim())return;
    setBusy(true);setError('');revision.current++;
    try {
      const thread=await read<DirectMessage[]>('/api/player/messages',{
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({key:person.key,body:draft.trim()}),
      });
      revision.current++;
      setMessages(thread);
      setDraft('');
    } catch(problem) {
      setError(problem instanceof Error?problem.message:'Message could not be sent.');
    } finally {setBusy(false);}
  };

  return <>
    <ol className="profile-messages message-thread" aria-label="Conversation" ref={log} aria-live="polite">
      {!messages?.length && !error && <li className="message-thread-empty">{messages?'Start with a message.':'Loading messages…'}</li>}
      {messages?.map((message)=><li key={message.id} data-mine={message.mine}>{message.body}</li>)}
    </ol>
    {error && <p className="message-error" role="alert">{error}</p>}
    <form className="messages-compose" onSubmit={send}>
      <input className="profile-field" aria-label="Message" placeholder="Write a message" value={draft} maxLength={500} onChange={(event)=>setDraft(event.target.value)}/>
      <button className="message-square message-compose-button" aria-label="Send message" title="Send message" disabled={busy||!draft.trim()}><Send size={18}/></button>
    </form>
  </>;
}
