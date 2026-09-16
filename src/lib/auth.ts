import { betterAuth } from 'better-auth'
import { anonymous } from 'better-auth/plugins'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
// @ts-ignore
import { env } from 'cloudflare:workers'
import { db } from '#/db'
import * as schema from '#/db/schema'
import { eq } from 'drizzle-orm'

// ─── Display name generator ──────────────────────────────────────────────────
// Generates fun anonymous handles like "Cosmic Fox #a3f2"
const adjectives = [
  'Cosmic', 'Silent', 'Electric', 'Shadow', 'Solar', 'Arctic',
  'Neon', 'Phantom', 'Turbo', 'Lunar', 'Blazing', 'Crystal',
]
const nouns = [
  'Fox', 'Eagle', 'Wolf', 'Panda', 'Hawk', 'Tiger',
  'Falcon', 'Lynx', 'Raven', 'Otter', 'Viper', 'Comet',
]

export function generateDisplayName(): string {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  const suffix = Math.random().toString(36).slice(2, 6)
  return `${adj} ${noun} #${suffix}`
}

// ─── Auth config ─────────────────────────────────────────────────────────────
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'sqlite',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),

  baseURL:
    process.env.BETTER_AUTH_URL ||
    (env as any)?.BETTER_AUTH_URL ||
    'https://gen.hun-wrk0966.workers.dev',

  secret:
    process.env.BETTER_AUTH_SECRET ||
    (env as any)?.BETTER_AUTH_SECRET ||
    'supersecretdefaultauthkeyforgeneratorexams32chars',

  emailAndPassword: {
    enabled: true,
  },

  user: {
    additionalFields: {
      displayName: {
        type: 'string',
        required: false,
        defaultValue: '',
        input: false,
      },
    },
  },

  plugins: [
    tanstackStartCookies(),

    anonymous({
      generateName: () => generateDisplayName(),

      // When anonymous user links their email account, migrate all their data
      onLinkAccount: async ({ anonymousUser, newUser }) => {
        const anonId = anonymousUser.user.id
        const newId = newUser.user.id

        await Promise.all([
          db.update(schema.exams)
            .set({ userId: newId })
            .where(eq(schema.exams.userId, anonId)),
          db.update(schema.attempts)
            .set({ userId: newId })
            .where(eq(schema.attempts.userId, anonId)),
        ])
      },
    }),
  ],
})

export type Session = typeof auth.$Infer.Session
export type User = typeof auth.$Infer.Session.user
