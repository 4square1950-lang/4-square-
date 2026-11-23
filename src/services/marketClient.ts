import type { Card, MarketView } from './marketTypes';

let sessionRequest: Promise<void> = Promise.resolve();

async function readJson<T>(response: Response): Promise<T> {
  if (!(response.headers.get('content-type') ?? '').includes('application/json')) throw new Error('Game server unavailable.');
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Request failed.');
  return body as T;
}

export function preparePlayerSession(visible?: boolean) {
  sessionRequest = sessionRequest.catch(() => {}).then(async () => {
    const response = await fetch('/api/player/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visible }),
    });
    await readJson(response);
  });
  return sessionRequest;
}

export async function loadMarket() {
  return readJson<MarketView>(await fetch('/api/market', { cache: 'no-store' }));
}

export async function updateMarket(action: string, id: string, amount?: number) {
  const data = JSON.stringify({ action, id, amount, request: crypto.randomUUID() });
  const send = () => fetch('/api/market', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: data });
  const response = await send().catch(send);
  return readJson<{ market: MarketView; revealed: Card[] }>(response);
}
