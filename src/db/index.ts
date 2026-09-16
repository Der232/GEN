import { createRequire } from 'node:module'
import * as schema from './schema.ts'

const require = createRequire(import.meta.url)

let _db: any = null

export function getDb(): any {
  if (_db) return _db

  // 1. Cloudflare Workers environment (via cloudflare:workers env.DB binding)
  try {
    // @ts-ignore
    const cf = require('cloudflare:workers')
    if (cf?.env?.DB) {
      const { drizzle } = require('drizzle-orm/d1')
      _db = drizzle(cf.env.DB, { schema })
      return _db
    }
  } catch {}

  // 2. Global process.env.DB binding
  if ((process.env as any)?.DB) {
    try {
      const { drizzle } = require('drizzle-orm/d1')
      _db = drizzle((process.env as any).DB, { schema })
      return _db
    } catch {}
  }

  // 3. Local Node.js / Vitest / CLI environment
  try {
    const Database = require('better-sqlite3')
    const { drizzle } = require('drizzle-orm/better-sqlite3')
    const sqlite = new Database(process.env.DATABASE_URL || 'dev.db')
    _db = drizzle(sqlite, { schema })
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
