import { describe, it, expect, beforeEach } from 'vitest'
import {
  checkUploadLimit,
  checkGenerationLimit,
  recordGeneration,
  LIMITS,
} from '#/lib/rate-limiter'
import { db } from '#/db'
import { documents, rateLimits, user } from '#/db/schema'
import { sql } from 'drizzle-orm'

describe('Rate Limiter Module', () => {
  beforeEach(async () => {
    // Clean up test tables
    try {
      await db.run(sql`DELETE FROM rate_limits`)
      await db.run(sql`DELETE FROM documents`)
    } catch {}
  })

  async function ensureTestUser(userId: string) {
    try {
      await db.insert(user).values({
        id: userId,
        name: 'Test User',
        email: `${userId}@test.invalid`,
        displayName: 'Test User',
        isAnonymous: true,
      }).onConflictDoNothing()
    } catch {}
  }

  describe('Upload Limits', () => {
    it('allows initial upload when under limits', async () => {
      const result = await checkUploadLimit('test_user_1')
      expect(result.allowed).toBe(true)
    })

    it('rejects upload when active uploads reach max concurrent (3)', async () => {
      const userId = 'test_user_concurrent'
      await ensureTestUser(userId)
      // Insert 3 active documents
      for (let i = 0; i < 3; i++) {
        await db.insert(documents).values({
          id: `doc_${i}_${Date.now()}`,
          userId,
          filename: `test_${i}.pdf`,
          fileType: 'pdf',
          fileSize: 1024,
          r2Key: `key_${i}`,
          status: 'uploading',
        })
      }

      const result = await checkUploadLimit(userId)
      expect(result.allowed).toBe(false)
      expect(result.error).toContain('max 3 at a time')
    })

    it('rejects upload when daily uploads reach max (15)', async () => {
      const userId = 'test_user_daily'
      await ensureTestUser(userId)
      // Insert 15 documents completed today
      for (let i = 0; i < 15; i++) {
        await db.insert(documents).values({
          id: `doc_daily_${i}_${Date.now()}`,
          userId,
          filename: `test_${i}.pdf`,
          fileType: 'pdf',
          fileSize: 1024,
          r2Key: `key_${i}`,
          status: 'ready',
        })
      }

      const result = await checkUploadLimit(userId)
      expect(result.allowed).toBe(false)
      expect(result.error).toContain('15 files per day')
    })
  })

  describe('Exam Generation Limits', () => {
    it('allows initial generation', async () => {
      const result = await checkGenerationLimit({
        userId: 'gen_user_1',
        isAnonymous: false,
      })
      expect(result.allowed).toBe(true)
      expect(result.remainingDaily).toBe(LIMITS.MAX_DAILY_GENERATIONS_USER)
    })

    it('enforces 30-second cooldown between generations', async () => {
      const userId = 'gen_user_cooldown'
      // Record a generation right now
      await recordGeneration({ userId, isAnonymous: false })

      // Immediately attempt next generation
      const result = await checkGenerationLimit({
        userId,
        isAnonymous: false,
      })
      expect(result.allowed).toBe(false)
      expect(result.error).toContain('Please wait')
      expect(result.retryAfterSeconds).toBeGreaterThan(0)
    })

    it('enforces 10 exams/day limit for guest/anonymous users', async () => {
      const userId = 'gen_guest_quota'
      // Insert 10 records spread out slightly in the past (beyond 30s cooldown)
      const pastTime = new Date(Date.now() - 60 * 1000)
      for (let i = 0; i < 10; i++) {
        await db.insert(rateLimits).values({
          id: `rl_quota_${i}_${Date.now()}`,
          key: userId,
          action: 'generation',
          createdAt: pastTime,
        })
      }

      const result = await checkGenerationLimit({
        userId,
        isAnonymous: true,
      })
      expect(result.allowed).toBe(false)
      expect(result.error).toContain('10 exams/day for guest accounts')
    })

    it('enforces 25 exams/day limit for registered users', async () => {
      const userId = 'gen_registered_quota'
      const pastTime = new Date(Date.now() - 60 * 1000)
      for (let i = 0; i < 25; i++) {
        await db.insert(rateLimits).values({
          id: `rl_reg_${i}_${Date.now()}`,
          key: userId,
          action: 'generation',
          createdAt: pastTime,
        })
      }

      const result = await checkGenerationLimit({
        userId,
        isAnonymous: false,
      })
      expect(result.allowed).toBe(false)
      expect(result.error).toContain('25 exams/day')
    })

    it('tracks client IP for anonymous users to prevent session rotation', async () => {
      const ip = '198.51.100.42'
      const anonUserA = 'guest_session_A'
      const anonUserB = 'guest_session_B'

      // User A from this IP generates an exam
      await recordGeneration({ userId: anonUserA, isAnonymous: true, clientIp: ip })

      // User B immediately tries from the same IP
      const result = await checkGenerationLimit({
        userId: anonUserB,
        isAnonymous: true,
        clientIp: ip,
      })

      // IP cooldown triggers even with different session ID
      expect(result.allowed).toBe(false)
      expect(result.error).toContain('Please wait')
    })
  })
})
