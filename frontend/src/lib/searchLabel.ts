import type { Facets } from '../types'

/** Which URL params count as "a search worth remembering" (sort/paging excluded). */
export const FILTER_KEYS = [
  'search', 'actor', 'type', 'genre', 'audience', 'season', 'era', 'duration', 'language',
] as const

export const LANGUAGE_LABELS: Record<string, string> = {
  en: 'Anglais', fr: 'Français', ja: 'Japonais', ko: 'Coréen', es: 'Espagnol',
  pt: 'Portugais', de: 'Allemand', it: 'Italien', hi: 'Hindi', zh: 'Chinois',
}

/** Human-readable summary of a filter set, e.g. "Séries · En famille · Années 90". */
export function describeSearch(params: Record<string, string>, facets?: Facets): string {
  const parts: string[] = []
  const find = <T extends { key: string; label: string }>(list: T[] | undefined, key: string) =>
    list?.find((x) => x.key === key)?.label ?? key

  if (params.search) parts.push(`« ${params.search} »`)
  if (params.actor) parts.push(`avec ${params.actor}`)
  if (params.type === 'movie') parts.push('Films')
  if (params.type === 'tv') parts.push('Séries')
  if (params.audience) parts.push(find(facets?.audiences, params.audience))
  if (params.genre)
    parts.push(params.genre.split(',').map((g) => find(facets?.themes, g)).join(' + '))
  if (params.season) parts.push(find(facets?.seasons, params.season))
  if (params.era) parts.push(find(facets?.eras, params.era))
  if (params.duration) parts.push(find(facets?.durations, params.duration))
  if (params.language) parts.push(LANGUAGE_LABELS[params.language] ?? params.language)
  return parts.join(' · ')
}

/** Convert /discover URL params into GET /movies query params. */
export function toApiParams(params: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(params)) {
    if (!v) continue
    if (k === 'type') out.media_type = v
    else out[k] = v
  }
  return out
}
