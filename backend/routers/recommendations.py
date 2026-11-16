from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models import Movie, Rating, User

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


class RecoMovie(BaseModel):
    id: int
    title: str
    year: int
    genres: str
    director: str
    cast: str
    synopsis: str
    runtime: int
    language: str
    poster_path: str | None
    backdrop_path: str | None = None
    tmdb_rating: float
    popularity: float
    media_type: str = "movie"
    seasons: int | None = None
    score: float
    source: str

    model_config = {"from_attributes": True}


def _movie_to_reco(movie: Movie, score: float, source: str) -> RecoMovie:
    return RecoMovie(
        id=movie.id,
        title=movie.title,
        year=movie.year,
        genres=movie.genres,
        director=movie.director,
        cast=movie.cast,
        synopsis=movie.synopsis,
        runtime=movie.runtime,
        language=movie.language,
        poster_path=movie.poster_path,
        backdrop_path=movie.backdrop_path,
        tmdb_rating=movie.tmdb_rating,
        popularity=movie.popularity,
        media_type=movie.media_type,
        seasons=movie.seasons,
        score=round(score, 4),
        source=source,
    )


@router.get("/{user_id}", response_model=list[RecoMovie])
def get_recommendations(
    user_id: int,
    top_n: int = Query(20, le=50),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    all_movies = db.query(Movie).all()
    user_ratings = db.query(Rating).filter(Rating.user_id == user_id).all()
    all_ratings = db.query(Rating).all()

    rated_ids = {r.movie_id for r in user_ratings}
    movie_map = {m.id: m for m in all_movies}

    # Cold-start: no ratings yet
    if not user_ratings:
        from algorithms.hybrid import get_popular_fallback
        fallback = get_popular_fallback(all_movies, rated_ids, top_n)
        return [_movie_to_reco(movie_map[r["movie_id"]], r["score"], r["source"]) for r in fallback if r["movie_id"] in movie_map]

    from algorithms.content_based import build_index
    from algorithms.hybrid import get_hybrid_recommendations

    index = build_index(all_movies)
    recs = get_hybrid_recommendations(
        user_id, user_ratings, all_ratings, all_movies, index, top_n
    )
    return [_movie_to_reco(movie_map[r["movie_id"]], r["score"], r["source"]) for r in recs if r["movie_id"] in movie_map]


@router.get("/{user_id}/sections", response_model=dict)
def get_recommendation_sections(user_id: int, db: Session = Depends(get_db)):
    """
    Returns personalised homepage sections:
    - tonight: contextual (time of day + short runtime)
    - because_you_liked: content-based from best-rated movie
    - collaborative: what similar users liked
    - short_films: films with runtime <= 100 min
    - trending: most popular films
    - trending_series: most popular series
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    all_movies = db.query(Movie).all()
    user_ratings = db.query(Rating).filter(Rating.user_id == user_id).all()
    all_ratings = db.query(Rating).all()

    rated_ids = {r.movie_id for r in user_ratings}
    movie_map = {m.id: m for m in all_movies}

    def to_out(m: Movie, score: float, source: str):
        return _movie_to_reco(m, score, source)

    films = [m for m in all_movies if m.media_type == "movie"]
    series = [m for m in all_movies if m.media_type == "tv"]

    # ---- Trending ----
    trending = sorted(
        [m for m in films if m.id not in rated_ids],
        key=lambda m: m.popularity,
        reverse=True,
    )[:10]
    trending_series = sorted(
        [m for m in series if m.id not in rated_ids],
        key=lambda m: m.popularity,
        reverse=True,
    )[:10]

    # ---- Short films ----
    short = sorted(
        [m for m in films if m.runtime <= 100 and m.id not in rated_ids],
        key=lambda m: m.tmdb_rating,
        reverse=True,
    )[:10]

    sections: dict = {
        "trending": [to_out(m, m.popularity / 100, "popular") for m in trending],
        "trending_series": [to_out(m, m.popularity / 100, "popular") for m in trending_series],
        "short_films": [to_out(m, m.tmdb_rating / 10, "content") for m in short],
        "because_you_liked": [],
        "collaborative": [],
        "tonight": [to_out(m, m.popularity / 100, "popular") for m in trending[:6]],
    }

    if not user_ratings:
        # guest: just return popular
        sections["tonight"] = sections["trending"][:6]
        return sections

    from algorithms.content_based import build_index, get_similar_movies
    from algorithms.collaborative import get_collaborative_recommendations

    index = build_index(all_movies)

    # Because you liked (top rated title)
    top_rated = max(user_ratings, key=lambda r: r.rating)
    similar = get_similar_movies(top_rated.movie_id, all_movies, index, top_n=10, exclude_ids=rated_ids)
    ref_movie = movie_map.get(top_rated.movie_id)
    sections["because_you_liked"] = {
        "reference": ref_movie.title if ref_movie else "",
        "movies": [to_out(movie_map[mid], score, "content") for mid, score in similar if mid in movie_map],
    }

    # Collaborative
    collab_recs = get_collaborative_recommendations(user_id, all_ratings, top_n=10)
    sections["collaborative"] = [to_out(movie_map[mid], score, "collaborative") for mid, score in collab_recs if mid in movie_map and mid not in rated_ids]

    # Tonight: contextual by hour + runtime
    hour = datetime.utcnow().hour
    if 6 <= hour < 12:
        # morning: short, feel-good
        tonight_pool = [m for m in films if m.runtime <= 100 and m.id not in rated_ids]
        tonight_pool.sort(key=lambda m: m.tmdb_rating, reverse=True)
    elif 12 <= hour < 18:
        # afternoon: action/adventure
        tonight_pool = [m for m in films if any(g in m.genres for g in ["Action", "Adventure"]) and m.id not in rated_ids]
        tonight_pool.sort(key=lambda m: m.popularity, reverse=True)
    else:
        # evening: drama/thriller
        tonight_pool = [m for m in films if any(g in m.genres for g in ["Drama", "Thriller"]) and m.id not in rated_ids]
        tonight_pool.sort(key=lambda m: m.tmdb_rating, reverse=True)

    sections["tonight"] = [to_out(m, m.tmdb_rating / 10, "contextual") for m in tonight_pool[:8]]

    return sections
