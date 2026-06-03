import type { Movie, User, RatingOut, RecoSection } from '../types'

const BASE = '/api'

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`)
  return res.json()
}

export const api = {
  // Movies
  getMovies: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return req<Movie[]>(`/movies${qs}`)
  },
  getMovie: (id: number) => req<Movie>(`/movies/${id}`),
  getSimilar: (id: number) => req<Movie[]>(`/movies/${id}/similar`),
  getOnboardingMovies: () => req<Movie[]>('/movies/onboarding'),

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

  // Poster helper
  posterUrl: (path: string | null | undefined, size = 'w500') =>
    path
      ? `https://image.tmdb.org/t/p/${size}${path}`
      : `https://placehold.co/300x450/181818/666666?text=No+Poster`,
}
