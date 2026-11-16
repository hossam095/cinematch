export type MediaType = 'movie' | 'tv'

export interface Movie {
  id: number
  title: string
  year: number
  genres: string
  director: string // creator(s) for series
  cast: string
  synopsis: string
  runtime: number // minutes (per episode for series)
  language: string
  poster_path: string | null
  backdrop_path?: string | null
  tmdb_rating: number
  popularity: number
  media_type?: MediaType
  tmdb_id?: number | null
  seasons?: number | null
  avg_user_rating?: number | null
  user_rating_count?: number
  score?: number
  source?: string
}

export const isSeries = (m: Movie) => m.media_type === 'tv'

export interface PagedMovies {
  items: Movie[]
  total: number
}

export interface Facets {
  themes: { key: string; label: string; emoji: string }[]
  audiences: { key: string; label: string; emoji: string; description: string }[]
  seasons: { key: string; label: string; emoji: string; tagline: string }[]
  current_season: string
  eras: { key: string; label: string; year_min: number | null; year_max: number | null }[]
  durations: { key: string; label: string }[]
}

export interface Seasonal {
  season: { key: string; label: string; emoji: string; tagline: string }
  movies: Movie[]
  series: Movie[]
}

export interface Trailer {
  youtube_key: string | null
  kind: 'Teaser' | 'Trailer' | null
}

export interface User {
  id: number
  username: string
  rating_count: number
}

export interface RatingOut {
  movie_id: number
  rating: number
  movie_title?: string
}

export interface RecoSection {
  tonight: Movie[]
  because_you_liked: { reference: string; movies: Movie[] } | Movie[]
  collaborative: Movie[]
  short_films: Movie[]
  trending: Movie[]
  trending_series?: Movie[]
}
