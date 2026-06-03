from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from models import Movie, Rating
from pydantic import BaseModel

router = APIRouter(prefix="/movies", tags=["movies"])


class MovieOut(BaseModel):
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
    tmdb_rating: float
    popularity: float
    avg_user_rating: float | None = None
    user_rating_count: int = 0

    model_config = {"from_attributes": True}


def enrich(movie: Movie, db: Session) -> MovieOut:
    ratings = db.query(Rating).filter(Rating.movie_id == movie.id).all()
    avg = sum(r.rating for r in ratings) / len(ratings) if ratings else None
    out = MovieOut.model_validate(movie)
    out.avg_user_rating = round(avg, 2) if avg else None
    out.user_rating_count = len(ratings)
    return out


@router.get("", response_model=list[MovieOut])
def list_movies(
    genre: str | None = Query(None),
    search: str | None = Query(None),
    year_min: int | None = Query(None),
    year_max: int | None = Query(None),
    runtime_max: int | None = Query(None),
    language: str | None = Query(None),
    sort: str = Query("popularity"),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
):
    q = db.query(Movie)
    if genre:
        q = q.filter(Movie.genres.ilike(f"%{genre}%"))
    if search:
        q = q.filter(
            Movie.title.ilike(f"%{search}%") | Movie.director.ilike(f"%{search}%")
        )
    if year_min:
        q = q.filter(Movie.year >= year_min)
    if year_max:
        q = q.filter(Movie.year <= year_max)
    if runtime_max:
        q = q.filter(Movie.runtime <= runtime_max)
    if language:
        q = q.filter(Movie.language == language)

    if sort == "rating":
        q = q.order_by(Movie.tmdb_rating.desc())
    elif sort == "year":
        q = q.order_by(Movie.year.desc())
    elif sort == "title":
        q = q.order_by(Movie.title)
    else:
        q = q.order_by(Movie.popularity.desc())

    movies = q.limit(limit).all()
    return [enrich(m, db) for m in movies]


@router.get("/onboarding", response_model=list[MovieOut])
def onboarding_movies(db: Session = Depends(get_db)):
    """Return a diverse set of ~15 movies to calibrate a new user's taste."""
    representative_ids = [3, 5, 13, 26, 30, 15, 34, 47, 53, 17, 49, 65, 61, 68, 29]
    movies = db.query(Movie).filter(Movie.id.in_(representative_ids)).all()
    # preserve the order
    id_map = {m.id: m for m in movies}
    return [enrich(id_map[i], db) for i in representative_ids if i in id_map]


@router.get("/{movie_id}", response_model=MovieOut)
def get_movie(movie_id: int, db: Session = Depends(get_db)):
    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")
    return enrich(movie, db)


@router.get("/{movie_id}/similar", response_model=list[MovieOut])
def similar_movies(movie_id: int, top_n: int = 8, db: Session = Depends(get_db)):
    from algorithms.content_based import build_similarity_matrix, get_similar_movies

    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")

    all_movies = db.query(Movie).all()
    sim_matrix = build_similarity_matrix(all_movies)
    similar = get_similar_movies(movie_id, all_movies, sim_matrix, top_n=top_n)

    id_map = {m.id: m for m in all_movies}
    return [enrich(id_map[mid], db) for mid, _ in similar if mid in id_map]
