import type { Movie, PagedMovies, User, RatingOut, RecoSection, Facets, Seasonal, Trailer } from '../types'

const BASE = '/api'

async function fetchOk(path: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`)
  return res
}

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  return (await fetchOk(path, options)).json()
}

const qs = (params?: Record<string, string>) =>
  params ? '?' + new URLSearchParams(params).toString() : ''

export const api = {
  // Movies
  getMovies: (params?: Record<string, string>) => req<Movie[]>(`/movies${qs(params)}`),
  // Same endpoint, but also returns the total match count (X-Total-Count header)
  getMoviesPaged: async (params?: Record<string, string>): Promise<PagedMovies> => {
    const res = await fetchOk(`/movies${qs(params)}`)
    const items: Movie[] = await res.json()
    const total = Number(res.headers.get('X-Total-Count') ?? items.length)
    return { items, total }
  },
  getMovie: (id: number) => req<Movie>(`/movies/${id}`),
  getSimilar: (id: number) => req<Movie[]>(`/movies/${id}/similar`),
  getTrailer: (id: number) => req<Trailer>(`/movies/${id}/trailer`),
  getOnboardingMovies: () => req<Movie[]>('/movies/onboarding'),
  getFacets: () => req<Facets>('/movies/facets'),
  getSeasonal: (season?: string, limit = 12) =>
    req<Seasonal>(`/movies/seasonal${qs({ ...(season ? { season } : {}), limit: String(limit) })}`),

  // Users
  createUser: (username: string) =>
    req<User>('/users', { method: 'POST', body: JSON.stringify({ username }) }),
  getUser: (id: number) => req<User>(`/users/${id}`),
  getUserRatings: (id: number) => req<RatingOut[]>(`/users/${id}/ratings`),
  rateMovie: (userId: number, movieId: number, rating: number) =>
    req<RatingOut>(`/users/${userId}/ratings`, {
      method: 'POST',
      body: JSON.stringify({ movie_id: movieId, rating }),
    }),

  // Recommendations
  getRecommendations: (userId: number) => req<Movie[]>(`/recommendations/${userId}`),
  getRecommendationSections: (userId: number) =>
    req<RecoSection>(`/recommendations/${userId}/sections`),

  // Poster helper — supports TMDB relative paths (/xxx.jpg),
  // full URLs (https://...) from OMDB/other sources, or null
  posterUrl: (path: string | null | undefined, size = 'w500') => {
    if (!path) return `https://placehold.co/300x450/181818/ffc107?text=?`
    if (path.startsWith('http')) return path
    return `https://image.tmdb.org/t/p/${size}${path}`
  },
}
