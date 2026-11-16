import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface RecentSearch {
  /** Query-string params of the /discover page (also sent to GET /movies) */
  params: Record<string, string>
  /** Human label, e.g. "En famille · Années 90 · Court" */
  label: string
  at: number
}

interface SearchStore {
  recent: RecentSearch[]
  addSearch: (s: Omit<RecentSearch, 'at'>) => void
  removeSearch: (key: string) => void
  clear: () => void
}

export const searchKey = (params: Record<string, string>) =>
  Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&')

const MAX_RECENT = 6
const TEXT_KEYS = new Set(['search', 'actor'])

/**
 * Two searches are "related" when one is a refinement of the other:
 * every filter of the smaller set is present in the larger one (text filters
 * may be a prefix, so "nol" → "nolan" while typing counts as the same search).
 * Only the latest search of a lineage is kept.
 */
function related(a: Record<string, string>, b: Record<string, string>): boolean {
  const [small, big] = Object.keys(a).length <= Object.keys(b).length ? [a, b] : [b, a]
  return Object.entries(small).every(([k, v]) => {
    const other = big[k]
    if (other === undefined) return false
    if (TEXT_KEYS.has(k)) return other.startsWith(v) || v.startsWith(other)
    if (k === 'genre') {
      const mine = v.split(','), theirs = other.split(',')
      return mine.every((g) => theirs.includes(g)) || theirs.every((g) => mine.includes(g))
    }
    return other === v
  })
}

export const useSearchStore = create<SearchStore>()(
  persist(
    (set) => ({
      recent: [],
      addSearch: (s) =>
        set((state) => {
          const rest = state.recent.filter((r) => !related(r.params, s.params))
          return { recent: [{ ...s, at: Date.now() }, ...rest].slice(0, MAX_RECENT) }
        }),
      removeSearch: (key) =>
        set((state) => ({ recent: state.recent.filter((r) => searchKey(r.params) !== key) })),
      clear: () => set({ recent: [] }),
    }),
    { name: 'cinematch-searches' }
  )
)
