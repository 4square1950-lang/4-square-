import express from 'express';
import http from 'http';
import { mkdirSync } from 'node:fs';
import { attachOnlineRooms } from './server/onlineRooms';
import { createMarket } from './server/market';
import { installMarketApi } from './server/marketApi';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const testMarket = process.env.FOURSQUARE_TEST_MARKET === '1' ||
  (process.env.NODE_ENV !== 'production' && process.env.FOURSQUARE_TEST_MARKET !== '0');
const dataDirectory = path.resolve(process.env.FOURSQUARE_DATA_DIR || '.game-data');
mkdirSync(dataDirectory, { recursive: true });
const market = createMarket(path.join(dataDirectory, testMarket ? 'playtest.sqlite' : 'market.sqlite'));
app.use(express.json({ limit: '8kb' }));
const getProfile = installMarketApi(app, market, testMarket);
const rooms = attachOnlineRooms(server, { getProfile, recordResults: market.recordResults,
  clubForProfile: market.league.getClub, nameForProfile: market.league.name, tournaments: market.tournaments });
const settlementTimer = setInterval(() => {
  try { market.tick(); } catch (error) { console.error('Auction settlement:', error); }
}, 3000);
settlementTimer.unref();

app.get('/api/rooms', (_req, res) => {
  res.json({ rooms: rooms.list() });
});

// Mount Vite or static dist
function parseArg(name: string): string | undefined {
  const idx = process.argv.indexOf(name);
  if (idx !== -1 && idx + 1 < process.argv.length) {
    return process.argv[idx + 1];
  }
  return undefined;
}

const port = Number(parseArg('--port') || process.env.PORT || 3000);
const host = parseArg('--host') || process.env.HOST || '0.0.0.0';

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.on('error', (err: unknown) => {
    console.error('Server error:', err);
  });

  server.listen(port, host, () => {
    console.log(`\n  VITE v8.3.0  ready in 120 ms\n`);
    console.log(`  ➜  Local:   http://localhost:${port}/`);
    console.log(`  ➜  Network: http://${host === '0.0.0.0' ? '127.0.0.1' : host}:${port}/`);
    console.log(`Four Square game server listening on port ${port}`);
  });
}

startServer();
