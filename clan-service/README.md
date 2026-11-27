# Game-specific clans

Each game has its own clan page, SQLite database, sign-in session, directory, and membership. A player can belong to one clan per game. Clan names and tags are unique within their game. Divisions, recruitment, inbox, chat, and moderation are scoped to that game's database.

## Local playtest

Run from the Four Square directory with Node.js 24 or later.

```powershell
$env:CLAN_DEV = '1'
node clan-service/service.mjs
```

| Game | Local clan page |
| --- | --- |
| Four Square | http://localhost:4110/ |
| Tetherball | http://localhost:4111/ |
| Ministicks | http://localhost:4112/ |
| Ringette | http://localhost:4113/ |
| Water Polo | http://localhost:4114/ |
| Playground Games | http://localhost:4115/ |

Local testing starts all six listeners with separate databases under `.game-data/clans/`. To start just one, set `CLAN_GAME` to its ID. Run the API checks with `node --test clan-service/service.test.mjs`. The previous shared playtest databases are preserved. Their clans had no single game assignment, so they require an explicit allocation if they should be imported.

## Hosting

Run one instance per game with its own `CLAN_GAME`, HTTPS `CLAN_ORIGIN`, and persistent `CLAN_DB`. Use `CLAN_HOST` and `CLAN_PORT` for the reverse proxy target. Leave `CLAN_DEV` unset. Configure each game's clan link to its own origin. Four Square uses `VITE_CLAN_HUB_URL`. The others use a link in their HTML.

The service supports Steam OpenID for browser sign-in. Verify that flow on each public origin before opening registration. Native Steam authentication, competitive results, clan XP, rankings, wars, tournament brackets, and a platform moderation console require separate work.
