import { useEffect, useMemo, useState } from 'react';
import { Coins, Gavel, Layers, PackageOpen, X } from 'lucide-react';
import { CARD_PACKS, COIN_BUNDLES, type Card, type MarketView } from '../services/marketTypes';
import { loadMarket, preparePlayerSession, updateMarket } from '../services/marketClient';
import { CHARACTERS } from '../utils/characters';
import { renderCardPortrait } from '../utils/cardPortrait';
import { soundFX } from '../services/soundEffects';
import { CharacterLineup } from './CharacterLineup';
import { BALLS } from '../services/ballCatalog';

type Props = { isOpen: boolean; onClose: () => void; page?: 'shop' | 'auctions' };
type Tab = 'Packs' | 'Coins' | 'Collection' | 'Auctions' | 'Balls';
const tabs: Tab[] = ['Packs', 'Balls', 'Coins', 'Collection', 'Auctions'];
const actionClass = 'rounded-lg bg-amber-300 px-4 py-2 text-sm font-bold text-neutral-950 hover:bg-amber-200 disabled:opacity-40';
const inputClass = 'w-24 rounded-lg border border-white/15 bg-neutral-950 px-2 py-2 text-sm text-white';
const nameOf = (id: string) => CHARACTERS.find((character) => character.id === id)?.name ?? id;

export function PlayerCard({ characterId }: { characterId: string }) {
  const character = CHARACTERS.find(({ id }) => id === characterId);
  const [portrait, setPortrait] = useState<string>();
  useEffect(() => { if (character) setPortrait(renderCardPortrait(character)); }, [character]);
  return (
    <div className="player-card relative overflow-hidden rounded-xl border border-white/15 bg-gradient-to-br from-[#343e44] to-neutral-950 p-4">
      <div className="pointer-events-none absolute right-2 top-[-28px] text-[150px] font-black italic opacity-30" style={{ color: character?.avatarColor }}>4</div>
      {portrait && <img src={portrait} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-contain" />}
      <p className="relative text-[10px] font-bold uppercase tracking-widest text-neutral-300">{character?.speciesType}</p>
      <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 px-4 pb-3 pt-10 text-lg font-black">{nameOf(characterId)}</p>
    </div>
  );
}

export function MarketModal(props: Props) {
  const [tab, setTab] = useState<Tab>('Packs');
  const [market, setMarket] = useState<MarketView>();
  const [revealed, setRevealed] = useState<Card[]>([]);
  const [packOpened, setPackOpened] = useState(false);
  const [packOpening, setPackOpening] = useState(false);
  const [cardCount, setCardCount] = useState(0);
  const [ballColors, setBallColors] = useState<Record<string,string>>({});
  const spotlight = useMemo(() => {
    const id = revealed[cardCount - 1]?.characterId;
    return CHARACTERS.filter((character) => character.id === id);
  }, [revealed, cardCount]);
  useEffect(() => {
    if (!packOpening || !props.isOpen) return;
    const timer = window.setTimeout(() => {
      soundFX.playCoinEarned();
      setPackOpened(true);
      setPackOpening(false);
      setCardCount(1);
    }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1200);
    return () => window.clearTimeout(timer);
  }, [packOpening, props.isOpen]);
  useEffect(() => { if (props.isOpen) { setTab(props.page === 'auctions' ? 'Auctions' : 'Packs'); setRevealed([]); setPackOpened(false); setPackOpening(false); } }, [props.isOpen, props.page]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [clock, setClock] = useState(Date.now);
  const [filter, setFilter] = useState<'All' | 'My listings' | 'My bids'>('All');

  useEffect(() => {
    if (!props.isOpen) return;
    let active = true;
    const refresh = () => loadMarket().then((data) => { if (active) setMarket(data); });
    void preparePlayerSession().then(refresh).catch((error) => { if (active) setMessage(error.message); });
    const interval = window.setInterval(() => {
      setClock(Date.now());
      if (tab === 'Auctions' && !busy) void refresh().catch(() => {});
    }, 1500);
    return () => { active = false; window.clearInterval(interval); };
  }, [props.isOpen, tab, busy]);

  async function order(action: string, id: string, amount?: number) {
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      const next = await updateMarket(action, id, amount);
      setMarket(next.market);
      setClock(Date.now());
      if (next.revealed.length) { setPackOpened(false); setCardCount(0); setRevealed(next.revealed); }
      else setMessage({ bundle: 'Test coins added.', list: 'Card listed.', bid: 'Bid placed.', 'npc-bid': 'Test bid placed.', ball:'Ball unlocked.' }[action] ?? '');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The order could not be completed.');
    } finally {
      setBusy(false);
    }
  }

  if (!props.isOpen) return null;
  const openCollection = () => { setPackOpening(false); setRevealed([]); setTab('Collection'); };
  return (
    <div role="dialog" aria-modal="true" aria-label={props.page === 'auctions' ? 'Auctions' : 'Shop'} className="fixed inset-0 z-50 overflow-auto bg-[#131918] text-neutral-100">
      <header className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-5 sm:px-10">
        <h2 className="text-3xl font-black tracking-tight">{props.page === 'auctions' ? 'Auctions' : 'Shop'}</h2>
        <div className="flex items-center gap-5">
          {market && <span className="inline-flex items-center gap-2 text-amber-300"><Coins size={16} />{market.coins} {market.test ? 'test coins' : 'coins'}</span>}
          <button onClick={() => { setRevealed([]); setMessage(''); props.onClose(); }} aria-label="Close shop"><X /></button>
        </div>
      </header>
      <nav className="flex flex-wrap gap-2 border-b border-white/10 px-5 py-3 sm:px-10" aria-label="Shop sections">
        {tabs.filter((item) => props.page === 'auctions' ? item === 'Auctions' || item === 'Collection' : item !== 'Auctions').map((item) => <button key={item} aria-pressed={tab === item} onClick={() => { setTab(item); setMessage(''); }} className={`rounded-lg px-3 py-2 text-sm font-semibold ${tab === item ? 'bg-neutral-800 text-amber-300' : 'text-neutral-400 hover:text-white'}`}>{item}</button>)}
      </nav>
      <main className="mx-auto max-w-6xl px-5 py-9">
        <p role="status" className="mb-3 text-sm text-neutral-300">{message || (!market ? 'Connecting…' : '')}</p>
        {tab === 'Balls' && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...BALLS].reverse().map((ball) => {
            const owned = market?.balls?.find(({id}) => id === ball.id);
            const color = ballColors[ball.id] ?? owned?.color ?? ball.color;
            return <article className="field-panel p-4" key={ball.id}>
              <div className={`catalog-ball ball-${ball.pattern}`} style={{ backgroundColor:color, '--trim':ball.trim } as React.CSSProperties} aria-hidden="true"/>
              <h3 className="my-3 font-bold">{ball.name}</h3>
              {owned ? <div className="flex items-center gap-2">
                <input type="color" aria-label={`Color for ${ball.name}`} value={color} onChange={(event) => setBallColors({ ...ballColors, [ball.id]:event.target.value })}/>
                <button className="league-button" disabled={busy || color===owned.color} onClick={async () => {
                  setBusy(true);
                  try {
                    const response = await fetch('/api/market/ball-color',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:ball.id,color})});
                    if (!response.ok) throw Error();
                    setMarket(await response.json());
                    setMessage('Ball color saved.');
                  } catch { setMessage('Could not save the ball color.'); }
                  finally { setBusy(false); }
                }}>Save color</button>
              </div> : <button className={actionClass} disabled={busy || !market || market.coins<ball.price} onClick={() => void order('ball',ball.id)}>{ball.price.toLocaleString()} coins</button>}
            </article>;
          })}
        </div>}
        {tab === 'Coins' && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {COIN_BUNDLES.map(({ id, amount }, index) => <article key={id} className="overflow-hidden rounded-xl border border-white/15 bg-neutral-900">
              <div className="relative grid h-40 place-items-center overflow-hidden bg-gradient-to-br from-teal-950 to-neutral-900">
                <span className="absolute select-none text-9xl font-black italic text-teal-800/60">4</span><Coins size={48 + index * 9} className="relative text-amber-300 drop-shadow-lg" />
              </div>
              <div className="p-4">
                <h3 className="mb-4 text-xl font-black">{amount.toLocaleString()} coins</h3>
                <button className={actionClass} disabled={busy || !market?.test} onClick={() => void order('bundle', id)}>{market && !market.test ? 'Unavailable' : 'Test checkout'}</button>
              </div>
            </article>)}
          </div>
        )}
        {tab === 'Packs' && (
          <>
            {market?.test && market.coins < 40 && <button disabled={busy} onClick={() => void order('bundle', 'warmup')} className="mb-4 rounded-lg bg-amber-200 px-4 py-2 font-bold text-neutral-950">Add 120 test coins</button>}
            <p className="mb-5 text-sm text-neutral-400">Earn coins in online matches. Every card has the same chance.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {CARD_PACKS.map((pack) => <article key={pack.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/15 bg-neutral-900 p-5">
                <div><PackageOpen className="mb-3 text-amber-300" size={36} /><h3 className="text-xl font-black">{pack.name}</h3><p className="text-sm text-neutral-400">{pack.count} cards</p></div>
                <button className={actionClass} disabled={busy || !market} onClick={() => void order('pack', pack.id)}>Open · {pack.cost} coins</button>
              </article>)}
            </div>
          </>
        )}
        {tab === 'Collection' && (
          <>
            <h3 className="mb-5 flex items-center gap-2 text-xl font-bold"><Layers size={18} /> Collection</h3>
            {market?.cards.length === 0 && <p className="text-neutral-400">Open a pack or win an auction to collect cards.</p>}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {market?.cards.map((card) => <article key={card.id} className="rounded-xl border border-white/10 bg-neutral-900 p-3">
                <PlayerCard characterId={card.characterId} />
                {card.listed ? <p className="px-1 pt-3 text-sm text-amber-300">Listed</p> : <form className="mt-3 flex gap-2" onSubmit={(event) => { event.preventDefault(); void order('list', card.id, Number(prices[card.id] ?? 10)); }}>
                  <input type="number" min="1" max="1000000" required aria-label={`Starting bid for ${nameOf(card.characterId)}`} value={prices[card.id] ?? '10'} onChange={(event) => setPrices({ ...prices, [card.id]: event.target.value })} className={inputClass} />
                  <button className={actionClass} disabled={busy}>List card</button>
                </form>}
              </article>)}
            </div>
          </>
        )}
        {tab === 'Auctions' && (
          <>
            <div className="mb-4 flex gap-2" aria-label="Filter auctions">
              {(['All', 'My listings', 'My bids'] as const).map((item) => (
                <button key={item} onClick={() => setFilter(item)} aria-pressed={filter === item} className={`rounded-lg px-3 py-2 text-sm font-semibold ${filter === item ? 'bg-neutral-800 text-amber-200' : 'text-neutral-400'}`}>{item}</button>
              ))}
            </div>
            {market && !market.listings.some((lot) => filter === 'All' || (filter === 'My listings' ? lot.mine : lot.placedBid)) && <p className="text-neutral-400">No matching listings.</p>}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {market?.listings.filter((lot) => filter === 'All' || (filter === 'My listings' ? lot.mine : lot.placedBid)).map((lot) => {
                const nextBid = Math.max(lot.price, lot.bid + 1);
                const seconds = Math.max(0, Math.ceil((lot.expires - clock) / 1000));
                return <article key={lot.id} className="field-panel flex min-w-0 flex-col gap-3 p-3">
                  <PlayerCard characterId={lot.characterId} />
                  <div><p className="text-sm text-neutral-300">
                    {lot.bid || lot.price} coins · {lot.status === 'open' ? `${seconds}s left` : lot.status}
                    {lot.mine ? ' · Yours' : lot.leading ? (lot.status === 'sold' ? ' · Won' : ' · Your bid') : lot.placedBid ? ' · Outbid' : ''}{lot.npc ? ' · NPC test' : ''}
                  </p></div>
                  {lot.status === 'open' && seconds > 0 && <div className="flex flex-wrap gap-2">
                    {!lot.mine && <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); void order('bid', lot.id, Number(prices[lot.id] ?? nextBid)); }}>
                      <input type="number" min={nextBid} max="1000000" required aria-label={`Bid for ${nameOf(lot.characterId)}`} className={inputClass} value={prices[lot.id] ?? nextBid} onChange={(event) => setPrices({ ...prices, [lot.id]: event.target.value })} />
                      <button className={actionClass} disabled={busy}>Bid</button>
                    </form>}
                    {market.test && (lot.mine || lot.leading) && <button disabled={busy} className="rounded-lg border border-white/20 px-3 py-2 text-sm" onClick={() => void order('npc-bid', lot.id)}>Simulate NPC bid</button>}
                  </div>}
                </article>;
              })}
            </div>
          </>
        )}
      </main>
      {revealed.length > 0 && (
        <div className={`pack-stage ${packOpening ? 'pack-stage-opening' : ''}`}>
          <section role="dialog" aria-modal="true" aria-label="Pack reveal" className="pack-stage-content">
            <header className="flex justify-between gap-3"><h3 className="text-2xl font-black">Pack opening</h3>
              <button className="league-button" onClick={openCollection}>Skip to collection</button></header>
            {!packOpened ? <div className="pack-stage-center">
              <button className={`pack-foil pack-wrap ${packOpening ? 'pack-foil-opening' : ''}`} disabled={packOpening} onClick={() => {
                soundFX.playWhoosh();
                setPackOpening(true);
              }} autoFocus><span className="pack-wrap-grid" aria-hidden="true"><i/><i/><i/><i/></span><strong>Four Square</strong><span>{packOpening ? 'Opening…' : 'Open pack'}</span></button>
            </div> : <>
              <div className="pack-presentation">
                {spotlight.length > 0 && <div className="pack-spotlight">
                  <CharacterLineup characters={spotlight} motion="victory"/>
                  <strong>{spotlight[0].name}</strong>
                </div>}
                <div className="pack-cards" aria-live="polite">{revealed.map((card, index) => index < cardCount
                ? <div key={card.id} className="pack-reveal"><PlayerCard characterId={card.characterId}/></div>
                : <div key={card.id} className="pack-card-back" aria-label="Unrevealed card">4</div>)}</div>
              </div>
              <footer className="flex flex-wrap items-center justify-center gap-3">
                <span className="text-sm">{cardCount} / {revealed.length}</span>
                {cardCount < revealed.length ? <>
                  <button autoFocus className={actionClass} onClick={() => { soundFX.playClick(); setCardCount(cardCount + 1); }}>Next card</button>
                  <button className="league-button" onClick={() => { soundFX.playCoinEarned(); setCardCount(revealed.length); }}>Reveal all</button>
                </> : <button className={actionClass} onClick={openCollection}>View collection</button>}
              </footer>
            </>}
          </section>
        </div>
      )}
    </div>
  );
}
