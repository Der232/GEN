import { create } from 'zustand'

export interface UserStats {
  examsCreated: number
  examsTaken: number
  averageScore: number
}

interface UserState {
  user: any | null
  stats: UserStats
  loading: boolean
  lastFetchedAt: number | null

  // Actions
  fetchUserMe: () => Promise<void>
  setUser: (user: any) => void
  setStats: (stats: UserStats) => void
  invalidateAndRefresh: () => Promise<void>
  clearUser: () => void
}

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  stats: {
    examsCreated: 0,
    examsTaken: 0,
    averageScore: 0,
  },
  loading: false,
  lastFetchedAt: null,

  fetchUserMe: async () => {
    set({ loading: true })
    try {
      const res = await fetch('/api/user/me')
      if (!res.ok) {
        set({ loading: false })
        return
      }
      const data = await res.json()
      if (data?.user) {
        set({
          user: data.user,
          stats: data.stats || { examsCreated: 0, examsTaken: 0, averageScore: 0 },
          loading: false,
          lastFetchedAt: Date.now(),
        })
      } else {
        set({ user: null, loading: false })
      }
    } catch (err) {
      console.error('Failed to fetch user in useUserStore:', err)
      set({ loading: false })
    }
  },

  setUser: (user) => set({ user }),
  setStats: (stats) => set({ stats }),

  invalidateAndRefresh: async () => {
    await get().fetchUserMe()
  },

  clearUser: () =>
    set({
      user: null,
      stats: { examsCreated: 0, examsTaken: 0, averageScore: 0 },
      loading: false,
      lastFetchedAt: null,
    }),
}))
