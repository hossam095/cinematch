export interface Movie {
  id: number
  title: string
  year: number
  genres: string
  director: string
  cast: string
  synopsis: string
  runtime: number
  language: string
  poster_path: string | null
  tmdb_rating: number
  popularity: number
  avg_user_rating?: number | null
  user_rating_count?: number
  score?: number
  source?: string
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
}
