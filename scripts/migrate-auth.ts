// Directly creates Better Auth tables in SQLite
// Run: pnpm tsx scripts/migrate-auth.ts
import Database from 'better-sqlite3'
import { config } from 'dotenv'

config({ path: ['.env.local', '.env'] })

const db = new Database(process.env.DATABASE_URL!)

const SQL = `
-- Better Auth: user table
CREATE TABLE IF NOT EXISTS "user" (
  "id"              TEXT NOT NULL PRIMARY KEY,
  "name"            TEXT NOT NULL,
  "email"           TEXT NOT NULL UNIQUE,
  "emailVerified"   INTEGER NOT NULL DEFAULT 0,
  "image"           TEXT,
  "createdAt"       INTEGER NOT NULL,
  "updatedAt"       INTEGER NOT NULL,
  "displayName"     TEXT,
  "isAnonymous"     INTEGER DEFAULT 0
);

-- Better Auth: session table
CREATE TABLE IF NOT EXISTS "session" (
  "id"              TEXT NOT NULL PRIMARY KEY,
  "expiresAt"       INTEGER NOT NULL,
  "token"           TEXT NOT NULL UNIQUE,
  "createdAt"       INTEGER NOT NULL,
  "updatedAt"       INTEGER NOT NULL,
  "ipAddress"       TEXT,
  "userAgent"       TEXT,
  "userId"          TEXT NOT NULL REFERENCES "user"("id")
);

-- Better Auth: account table
CREATE TABLE IF NOT EXISTS "account" (
  "id"                      TEXT NOT NULL PRIMARY KEY,
  "accountId"               TEXT NOT NULL,
  "providerId"              TEXT NOT NULL,
  "userId"                  TEXT NOT NULL REFERENCES "user"("id"),
  "accessToken"             TEXT,
  "refreshToken"            TEXT,
  "idToken"                 TEXT,
  "accessTokenExpiresAt"    INTEGER,
  "refreshTokenExpiresAt"   INTEGER,
  "scope"                   TEXT,
  "password"                TEXT,
  "createdAt"               INTEGER NOT NULL,
  "updatedAt"               INTEGER NOT NULL
);

-- Better Auth: verification table
CREATE TABLE IF NOT EXISTS "verification" (
  "id"          TEXT NOT NULL PRIMARY KEY,
  "identifier"  TEXT NOT NULL,
  "value"       TEXT NOT NULL,
  "expiresAt"   INTEGER NOT NULL,
  "createdAt"   INTEGER,
  "updatedAt"   INTEGER
);
`

try {
  db.exec(SQL)
  console.log('✓ Better Auth tables created successfully')
  process.exit(0)
} catch (err) {
  console.error('Migration failed:', err)
  process.exit(1)
}
