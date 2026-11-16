from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import func
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models import Movie, Rating
from catalog import (
    AUDIENCES, SEASONS, ERAS, DURATIONS,
    audience_filter, season_filter, current_season, public_facets,
)

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
    backdrop_path: str | None = None
    tmdb_rating: float
    popularity: float
    media_type: str = "movie"
    tmdb_id: int | None = None
    seasons: int | None = None
    avg_user_rating: float | None = None
    user_rating_count: int = 0

    model_config = {"from_attributes": True}


class TrailerOut(BaseModel):
    youtube_key: str | None
    kind: str | None  # "Teaser" | "Trailer"


class SeasonalOut(BaseModel):
    season: dict
    movies: list[MovieOut]
    series: list[MovieOut]


def enrich_many(movies: list[Movie], db: Session) -> list[MovieOut]:
    """Attach community rating stats with a single grouped query."""
    if not movies:
        return []
    stats = dict(
        (mid, (avg, count))
        for mid, avg, count in db.query(Rating.movie_id, func.avg(Rating.rating), func.count(Rating.id))
        .filter(Rating.movie_id.in_([m.id for m in movies]))
        .group_by(Rating.movie_id)
        .all()
    )
    out = []
    for m in movies:
        o = MovieOut.model_validate(m)
        avg, count = stats.get(m.id, (None, 0))
        o.avg_user_rating = round(avg, 2) if avg else None
        o.user_rating_count = count
        out.append(o)
    return out


def enrich(movie: Movie, db: Session) -> MovieOut:
    return enrich_many([movie], db)[0]


def _apply_sort(q, sort: str):
    if sort == "rating":
        return q.order_by(Movie.tmdb_rating.desc(), Movie.popularity.desc())
    if sort == "year":
        return q.order_by(Movie.year.desc(), Movie.popularity.desc())
    if sort == "year_asc":
        return q.order_by(Movie.year.asc(), Movie.popularity.desc())
    if sort == "title":
        return q.order_by(Movie.title)
    return q.order_by(Movie.popularity.desc())


@router.get("/facets")
def facets():
    """Everything the UI needs to render the filter groups (themes, audiences, seasons, eras, durations)."""
    return public_facets()


@router.get("", response_model=list[MovieOut])
def list_movies(
    response: Response,
    # free text
    search: str | None = Query(None, description="title, director/creator or cast"),
    actor: str | None = Query(None, description="cast member name"),
    director: str | None = Query(None, description="director / creator name"),
    # facets (all combinable)
    media_type: str | None = Query(None, pattern="^(movie|tv)$"),
    genre: str | None = Query(None, description="comma-separated: title must have ALL of them"),
    exclude_genre: str | None = Query(None, description="comma-separated: title must have NONE of them"),
    audience: str | None = Query(None, description="|".join(AUDIENCES)),
    season: str | None = Query(None, description="current|" + "|".join(SEASONS)),
    era: str | None = Query(None, description="|".join(ERAS)),
    duration: str | None = Query(None, description="|".join(DURATIONS)),
    # raw ranges
    year_min: int | None = Query(None),
    year_max: int | None = Query(None),
    runtime_min: int | None = Query(None),
    runtime_max: int | None = Query(None),
    rating_min: float | None = Query(None, description="minimum TMDB rating"),
    language: str | None = Query(None),
    # paging
    sort: str = Query("popularity", pattern="^(popularity|rating|year|year_asc|title)$"),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    q = db.query(Movie)

    if search:
        q = q.filter(
            Movie.title.ilike(f"%{search}%")
            | Movie.director.ilike(f"%{search}%")
            | Movie.cast.ilike(f"%{search}%")
        )
    if actor:
        q = q.filter(Movie.cast.ilike(f"%{actor}%"))
    if director:
        q = q.filter(Movie.director.ilike(f"%{director}%"))

    if media_type:
        q = q.filter(Movie.media_type == media_type)
    for g in (genre or "").split(","):
        if g.strip():
            q = q.filter(Movie.genres.ilike(f"%{g.strip()}%"))
    for g in (exclude_genre or "").split(","):
        if g.strip():
            q = q.filter(~Movie.genres.ilike(f"%{g.strip()}%"))

    if audience:
        if audience not in AUDIENCES:
            raise HTTPException(422, f"audience must be one of {list(AUDIENCES)}")
        q = q.filter(audience_filter(audience))
    if season:
        key = current_season() if season == "current" else season
        if key not in SEASONS:
            raise HTTPException(422, f"season must be one of {list(SEASONS)} or 'current'")
        q = q.filter(season_filter(key))
    if era:
        if era not in ERAS:
            raise HTTPException(422, f"era must be one of {list(ERAS)}")
        year_min = year_min or ERAS[era]["year_min"]
        year_max = year_max or ERAS[era]["year_max"]
    if duration:
        if duration not in DURATIONS:
            raise HTTPException(422, f"duration must be one of {list(DURATIONS)}")
        runtime_min = runtime_min or DURATIONS[duration]["runtime_min"]
        runtime_max = runtime_max or DURATIONS[duration]["runtime_max"]

    if year_min:
        q = q.filter(Movie.year >= year_min)
    if year_max:
        q = q.filter(Movie.year <= year_max)
    if runtime_min:
        q = q.filter(Movie.runtime >= runtime_min)
    if runtime_max:
        q = q.filter(Movie.runtime <= runtime_max)
    if rating_min:
        q = q.filter(Movie.tmdb_rating >= rating_min)
    if language:
        q = q.filter(Movie.language == language)

    # Total before pagination, so the client can show "N titres" and page through
    response.headers["X-Total-Count"] = str(q.count())

    movies = _apply_sort(q, sort).offset(offset).limit(limit).all()
    return enrich_many(movies, db)


@router.get("/seasonal", response_model=SeasonalOut)
def seasonal(
    season: str | None = Query(None, description="defaults to the current season"),
    limit: int = Query(12, le=50),
    db: Session = Depends(get_db),
):
    """Films and series that fit the (current) season of the year."""
    key = season or current_season()
    if key not in SEASONS:
        raise HTTPException(422, f"season must be one of {list(SEASONS)}")

    def pick(media_type: str) -> list[Movie]:
        return (
            db.query(Movie)
            .filter(Movie.media_type == media_type, Movie.tmdb_rating >= 6.5)
            .filter(season_filter(key))
            .order_by(Movie.popularity.desc())
            .limit(limit)
            .all()
        )

    s = SEASONS[key]
    return SeasonalOut(
        season={"key": key, "label": s["label"], "emoji": s["emoji"], "tagline": s["tagline"]},
        movies=enrich_many(pick("movie"), db),
        series=enrich_many(pick("tv"), db),
    )


@router.get("/onboarding", response_model=list[MovieOut])
def onboarding_movies(db: Session = Depends(get_db)):
    """
    Return a diverse set of well-known films for onboarding calibration.
    Picks the top-rated film per genre bucket among the most popular films,
    so the selection covers the full catalogue with titles people have seen.
    """
    # Skip this year's releases (few people have seen them yet) and weak titles,
    # so the picks are films users are likely to recognise.
    current_year = datetime.now().year
    pool = (
        db.query(Movie)
        .filter(Movie.media_type == "movie", Movie.year < current_year, Movie.tmdb_rating >= 6.5)
        .order_by(Movie.popularity.desc())
        .limit(400)
        .all()
    )
    pool.sort(key=lambda m: m.tmdb_rating, reverse=True)

    genre_buckets = [
        "Action", "Adventure", "Animation", "Biography", "Comedy",
        "Crime", "Drama", "Fantasy", "History", "Horror",
        "Music", "Mystery", "Romance", "Sci-Fi", "Thriller",
        "War", "Western", "Family",
    ]

    seen_ids: set[int] = set()
    result = []

    # One representative per genre (highest-rated not yet picked)
    for genre in genre_buckets:
        for m in pool:
            if m.id not in seen_ids and genre.lower() in m.genres.lower():
                result.append(m)
                seen_ids.add(m.id)
                break

    # Fill remaining slots from most popular films not yet included
    for m in sorted(pool, key=lambda x: x.popularity, reverse=True):
        if m.id not in seen_ids:
            result.append(m)
            seen_ids.add(m.id)
        if len(result) >= 60:
            break

    return enrich_many(result, db)


@router.get("/{movie_id}", response_model=MovieOut)
def get_movie(movie_id: int, db: Session = Depends(get_db)):
    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")
    return enrich(movie, db)


@router.get("/{movie_id}/similar", response_model=list[MovieOut])
def similar_movies(movie_id: int, top_n: int = 8, db: Session = Depends(get_db)):
    from algorithms.content_based import build_index, get_similar_movies

    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")

    all_movies = db.query(Movie).all()
    index = build_index(all_movies)
    similar = get_similar_movies(movie_id, all_movies, index, top_n=top_n)

    id_map = {m.id: m for m in all_movies}
    return enrich_many([id_map[mid] for mid, _ in similar if mid in id_map], db)


@router.get("/{movie_id}/trailer", response_model=TrailerOut)
def get_trailer(movie_id: int, db: Session = Depends(get_db)):
    """
    Spoiler-light clip for a title: the official YouTube *teaser* when there is
    one, otherwise the trailer. Looked up once on TMDB, then cached in the DB.
    """
    from tmdb_videos import find_trailer

    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")

    if movie.trailer_key is None:
        key, kind = find_trailer(movie.media_type, movie.tmdb_id)
        movie.trailer_key = f"{kind}:{key}" if key else ""
        db.commit()

    if not movie.trailer_key:
        return TrailerOut(youtube_key=None, kind=None)
    kind, _, key = movie.trailer_key.partition(":")
    return TrailerOut(youtube_key=key, kind=kind)
