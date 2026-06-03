import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '../types'

interface UserStore {
  user: User | null
  localRatings: Record<number, number>
  setUser: (user: User) => void
  logout: () => void
  setLocalRating: (movieId: number, rating: number) => void
  hasCompletedOnboarding: boolean
  setOnboardingComplete: () => void
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      user: null,
      localRatings: {},
      hasCompletedOnboarding: false,
      setUser: (user) => set({ user }),
      logout: () => set({ user: null, localRatings: {}, hasCompletedOnboarding: false }),
      setLocalRating: (movieId, rating) =>
        set((s) => ({ localRatings: { ...s.localRatings, [movieId]: rating } })),
      setOnboardingComplete: () => set({ hasCompletedOnboarding: true }),
    }),
    { name: 'cinematch-user' }
  )
)
