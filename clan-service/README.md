# Cross-game clans

Four Square, Tetherball, Ministicks, Ringette, Water Polo, and Playground Games share one clan account and one clan membership. A clan can field separate divisions in each sport. Games open a common hub and pass their sport in the URL.

## Local playtest

Use Node.js 24 or later. On PowerShell, run these from the Four Square directory.

```powershell
$env:CLAN_DEV = '1'
node clan-service/service.mjs
node --test clan-service/service.test.mjs
```

Open `http://localhost:4110`. Loopback development sign-in supports testing with two accounts in separate browser profiles. The default SQLite database lives in `.game-data/clans.sqlite`.

## Hosting

Serve the hub behind HTTPS with `CLAN_ORIGIN` set to its public origin. Use `CLAN_HOST` and `CLAN_PORT` for the reverse proxy address and `CLAN_DB` for a persistent SQLite location. Leave `CLAN_DEV` unset. Point the five static games' clan links and Four Square's `VITE_CLAN_HUB_URL` to the same public origin. Keep SQLite and its journal together when backing up.

The hub uses Steam OpenID for browser sign-in. Run a live Steam sign-in on the public origin before opening registration. Native Steam authentication tickets require a separate integration with the game servers.

Current flows include clan creation, branding, roles, recruitment, roster and divisions, event scheduling, chat, blocks, and message reports. Competitive results, clan XP, rankings, wars, tournament brackets, and a platform moderation console still require separate implementation.
