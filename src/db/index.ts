import { createRequire } from 'node:module'
// @ts-ignore
import { env } from 'cloudflare:workers'
import { drizzle as drizzleD1 } from 'drizzle-orm/d1'
import * as schema from './schema.ts'

let _db: any = null

function getLocalSqliteDb() {
  const safeUrl =
    typeof import.meta?.url === 'string' && import.meta.url
      ? import.meta.url
      : 'file:///app/src/db/index.ts'
  const req = createRequire(safeUrl)
  const Database = req('better-sqlite3')
  const { drizzle } = req('drizzle-orm/better-sqlite3')
  const sqlite = new Database(process.env.DATABASE_URL || 'dev.db')
  return drizzle(sqlite, { schema })
}

export function getDb(): any {
  if (_db) return _db

  // 1. Cloudflare Workers environment via cloudflare:workers env.DB binding
  try {
    if (env?.DB) {
      _db = drizzleD1(env.DB, { schema })
      return _db
    }
  } catch (err) {
    console.warn('Could not initialize D1 from cloudflare:workers env:', err)
  }

  // 2. Global process.env.DB binding (when nodejs_compat_populate_process_env is enabled)
  if ((process.env as any)?.DB) {
    try {
      _db = drizzleD1((process.env as any).DB, { schema })
      return _db
    } catch {}
  }

  // 3. Local Node.js / Vitest / CLI environment
  try {
    _db = getLocalSqliteDb()
    return _db
  } catch (err) {
    console.error('Failed to initialize database connection:', err)
    throw err
  }
}

export const db: any = new Proxy({} as any, {
  get(_target, prop) {
    const instance = getDb()
    const value = instance[prop]
    if (typeof value === 'function') {
      return value.bind(instance)
    }
    return value
  },
})
