PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS players(id TEXT PRIMARY KEY, name TEXT NOT NULL, admin INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY, player TEXT NOT NULL REFERENCES players(id), expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS login_challenges(id TEXT PRIMARY KEY, expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS games(id TEXT PRIMARY KEY, name TEXT NOT NULL);
INSERT OR IGNORE INTO games VALUES ('four-square','Four Square'),('tetherball','Tetherball'),('ministicks','Ministicks'),('ringette','Ringette'),('water-polo','Water Polo'),('playground','Playground Games');
CREATE TABLE IF NOT EXISTS clans(
 id TEXT PRIMARY KEY, name TEXT NOT NULL COLLATE NOCASE UNIQUE, tag TEXT NOT NULL COLLATE NOCASE UNIQUE,
 emblem TEXT NOT NULL, color TEXT NOT NULL, description TEXT NOT NULL, slogan TEXT NOT NULL, region TEXT NOT NULL,
 language TEXT NOT NULL, classification TEXT NOT NULL CHECK(classification IN ('Casual','Competitive','Professional')),
 privacy TEXT NOT NULL CHECK(privacy IN ('Public','Private','Invite only')), requirements TEXT NOT NULL, created INTEGER NOT NULL,
 capacity INTEGER NOT NULL DEFAULT 50 CHECK(capacity BETWEEN 2 AND 200), suspended INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS members(
 player TEXT PRIMARY KEY REFERENCES players(id), clan TEXT NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
 role TEXT NOT NULL CHECK(role IN ('Founder','Co-Leader','Officer','Captain','Veteran','Member','Recruit')), joined INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS clan_founder ON members(clan) WHERE role='Founder';
CREATE INDEX IF NOT EXISTS clan_members ON members(clan,joined);
CREATE TABLE IF NOT EXISTS requests(
 clan TEXT REFERENCES clans(id) ON DELETE CASCADE, player TEXT REFERENCES players(id), kind TEXT CHECK(kind IN ('Invite','Application')),
 created INTEGER NOT NULL, PRIMARY KEY(clan,player,kind)
);
CREATE INDEX IF NOT EXISTS request_player ON requests(player,kind);
CREATE TABLE IF NOT EXISTS divisions(
 id TEXT PRIMARY KEY, clan TEXT REFERENCES clans(id) ON DELETE CASCADE, game TEXT REFERENCES games(id), name TEXT NOT NULL,
 captain TEXT REFERENCES members(player) ON DELETE SET NULL, UNIQUE(clan,game,name)
);
CREATE TABLE IF NOT EXISTS division_members(
 division TEXT REFERENCES divisions(id) ON DELETE CASCADE, player TEXT REFERENCES members(player) ON DELETE CASCADE,
 PRIMARY KEY(division,player)
);
CREATE TABLE IF NOT EXISTS messages(
 id INTEGER PRIMARY KEY AUTOINCREMENT, clan TEXT REFERENCES clans(id) ON DELETE CASCADE,
 channel TEXT NOT NULL, player TEXT REFERENCES players(id), text TEXT NOT NULL, created INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS messages_channel ON messages(clan,channel,id DESC);
CREATE TABLE IF NOT EXISTS blocks(player TEXT REFERENCES players(id), blocked TEXT REFERENCES players(id), PRIMARY KEY(player,blocked));
CREATE TABLE IF NOT EXISTS clan_events(
 id INTEGER PRIMARY KEY AUTOINCREMENT, clan TEXT REFERENCES clans(id) ON DELETE CASCADE,
 division TEXT REFERENCES divisions(id) ON DELETE CASCADE, player TEXT REFERENCES players(id),
 title TEXT NOT NULL, starts INTEGER NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('Training','Competition'))
);
CREATE TABLE IF NOT EXISTS reports(
 id INTEGER PRIMARY KEY AUTOINCREMENT, clan TEXT REFERENCES clans(id) ON DELETE CASCADE, player TEXT REFERENCES players(id),
 message INTEGER REFERENCES messages(id) ON DELETE SET NULL, reason TEXT NOT NULL, created INTEGER NOT NULL, resolved INTEGER
);
CREATE TABLE IF NOT EXISTS audit(
 id INTEGER PRIMARY KEY AUTOINCREMENT, clan TEXT, player TEXT NOT NULL, action TEXT NOT NULL, subject TEXT, created INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS audit_clan ON audit(clan,id DESC);
PRAGMA user_version=1;
