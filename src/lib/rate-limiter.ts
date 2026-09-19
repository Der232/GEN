import { db } from '#/db'
import { documents, rateLimits } from '#/db/schema'
import { and, eq, gte, lt, inArray, sql, desc, or } from 'drizzle-orm'

// ─── LIMIT CONSTANTS ─────────────────────────────────────────────────────────
export const LIMITS = {
  MAX_CONCURRENT_UPLOADS: 3,
  MAX_DAILY_UPLOADS: 15,
  GENERATION_COOLDOWN_SECONDS: 30,
  MAX_DAILY_GENERATIONS_GUEST: 10,
  MAX_DAILY_GENERATIONS_USER: 25,
}

let tableChecked = false

async function ensureTable() {
  if (tableChecked) return
  try {
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS rate_limits (
        id text PRIMARY KEY NOT NULL,
        key text NOT NULL,
        action text NOT NULL,
        created_at integer DEFAULT (unixepoch()) NOT NULL
      )
    `)
    tableChecked = true
  } catch {
    tableChecked = true
  }
}

/**
 * Check if a user can upload a file.
 * Enforces:
 * 1. Max 3 files currently in-progress ('uploading', 'uploaded', 'processing').
 * 2. Max 15 files uploaded in the last 24 hours.
 */
export async function checkUploadLimit(userId: string): Promise<{
  allowed: boolean
  error?: string
  activeCount?: number
  dailyCount?: number
}> {
  try {
    // 1. Check concurrent in-flight uploads
    const activeDocs = await db
      .select({ count: sql<number>`count(*)` })
      .from(documents)
      .where(
        and(
          eq(documents.userId, userId),
          inArray(documents.status, ['uploading', 'uploaded', 'processing'])
        )
      )

    const activeCount = Number(activeDocs[0]?.count || 0)
    if (activeCount >= LIMITS.MAX_CONCURRENT_UPLOADS) {
      return {
        allowed: false,
        error: `Upload limit reached: You have ${activeCount} file(s) currently uploading or processing. Please wait for them to finish before uploading more (max ${LIMITS.MAX_CONCURRENT_UPLOADS} at a time).`,
        activeCount,
      }
    }

    // 2. Check 24-hour daily upload limit
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const dailyDocs = await db
      .select({ count: sql<number>`count(*)` })
      .from(documents)
      .where(
        and(
          eq(documents.userId, userId),
          gte(documents.createdAt, oneDayAgo)
        )
      )

    const dailyCount = Number(dailyDocs[0]?.count || 0)
    if (dailyCount >= LIMITS.MAX_DAILY_UPLOADS) {
      return {
        allowed: false,
        error: `Daily upload limit reached (${LIMITS.MAX_DAILY_UPLOADS} files per day). Please try again tomorrow.`,
        dailyCount,
      }
    }

    return { allowed: true, activeCount, dailyCount }
  } catch (err: any) {
    console.error('[RateLimiter] Error checking upload limit:', err)
    // Fail open if unexpected DB error so legitimate users aren't locked out
    return { allowed: true }
  }
}

/**
 * Check if a user can generate an exam.
 * Enforces:
 * 1. 30-second cooldown between generations.
 * 2. Daily limits: 10/day for guest/anonymous users, 25/day for registered users.
 * 3. IP tracking fallback for anonymous/guest users.
 */
export async function checkGenerationLimit({
  userId,
  isAnonymous,
  clientIp,
}: {
  userId: string
  isAnonymous: boolean
  clientIp?: string | null
}): Promise<{
  allowed: boolean
  error?: string
  retryAfterSeconds?: number
  remainingDaily?: number
}> {
  await ensureTable()

  try {
    const now = Date.now()
    const cooldownCutoff = new Date(now - LIMITS.GENERATION_COOLDOWN_SECONDS * 1000)
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000)

    const keysToCheck = [userId]
    if (isAnonymous && clientIp && clientIp.trim()) {
      keysToCheck.push(`ip_${clientIp.trim()}`)
    }

    // 1. Cooldown check (30 seconds)
    const recentGenerations = await db
      .select({ createdAt: rateLimits.createdAt })
      .from(rateLimits)
      .where(
        and(
          inArray(rateLimits.key, keysToCheck),
          eq(rateLimits.action, 'generation'),
          gte(rateLimits.createdAt, cooldownCutoff)
        )
      )
      .orderBy(desc(rateLimits.createdAt))
      .limit(1)

    if (recentGenerations.length > 0) {
      const lastCreatedTime = new Date(recentGenerations[0].createdAt).getTime()
      const elapsedSeconds = Math.floor((now - lastCreatedTime) / 1000)
      const remainingSeconds = Math.max(1, LIMITS.GENERATION_COOLDOWN_SECONDS - elapsedSeconds)

      return {
        allowed: false,
        error: `Please wait ${remainingSeconds}s before generating another exam.`,
        retryAfterSeconds: remainingSeconds,
      }
    }

    // 2. Daily generation quota check (24 hours)
    const maxDaily = isAnonymous
      ? LIMITS.MAX_DAILY_GENERATIONS_GUEST
      : LIMITS.MAX_DAILY_GENERATIONS_USER

    const dailyGenerations = await db
      .select({ count: sql<number>`count(*)` })
      .from(rateLimits)
      .where(
        and(
          inArray(rateLimits.key, keysToCheck),
          eq(rateLimits.action, 'generation'),
          gte(rateLimits.createdAt, oneDayAgo)
        )
      )

    const dailyCount = Number(dailyGenerations[0]?.count || 0)

    if (dailyCount >= maxDaily) {
      const errorMsg = isAnonymous
        ? `Daily exam generation limit reached (${LIMITS.MAX_DAILY_GENERATIONS_GUEST} exams/day for guest accounts). Sign in or link your account to unlock ${LIMITS.MAX_DAILY_GENERATIONS_USER} exams per day!`
        : `Daily exam generation limit reached (${LIMITS.MAX_DAILY_GENERATIONS_USER} exams/day). Your quota will reset in 24 hours.`

      return {
        allowed: false,
        error: errorMsg,
        remainingDaily: 0,
      }
    }

    return {
      allowed: true,
      remainingDaily: Math.max(0, maxDaily - dailyCount),
    }
  } catch (err: any) {
    console.error('[RateLimiter] Error checking generation limit:', err)
    return { allowed: true }
  }
}

/**
 * Record a successful generation to update cooldown and daily quotas.
 */
export async function recordGeneration({
  userId,
  isAnonymous,
  clientIp,
}: {
  userId: string
  isAnonymous: boolean
  clientIp?: string | null
}) {
  await ensureTable()

  try {
    const entries = [
      {
        id: `rl_${crypto.randomUUID()}`,
        key: userId,
        action: 'generation',
        createdAt: new Date(),
      },
    ]

    if (isAnonymous && clientIp && clientIp.trim()) {
      entries.push({
        id: `rl_${crypto.randomUUID()}`,
        key: `ip_${clientIp.trim()}`,
        action: 'generation',
        createdAt: new Date(),
      })
    }

    await db.insert(rateLimits).values(entries)

    // Fire-and-forget: clean up records older than 48 hours to keep table small
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000)
    db.delete(rateLimits)
      .where(lt(rateLimits.createdAt, twoDaysAgo))
      .catch(() => {})
  } catch (err: any) {
    console.warn('[RateLimiter] Failed to record generation:', err)
  }
}
