import { createAuthClient } from 'better-auth/react'
import { anonymousClient } from 'better-auth/client/plugins'
import { useState, useEffect } from 'react'

export const authClient = createAuthClient({
  plugins: [
    anonymousClient(),
  ],
})

// Safe hook that never calls relative fetch during SSR (which causes workerd deadlocks)
export function useSession() {
  const [mounted, setMounted] = useState(false)
  const session = authClient.useSession()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || typeof window === 'undefined') {
    return { data: null, isPending: true, error: null }
  }

  return session
}

export type Session = typeof authClient.$Infer.Session
