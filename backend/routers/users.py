from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models import User, Rating, Movie

router = APIRouter(prefix="/users", tags=["users"])


class UserCreate(BaseModel):
    username: str


class UserOut(BaseModel):
    id: int
    username: str
    rating_count: int = 0

    model_config = {"from_attributes": True}


class RatingCreate(BaseModel):
    movie_id: int
    rating: float


class RatingOut(BaseModel):
    movie_id: int
    rating: float
    movie_title: str | None = None

    model_config = {"from_attributes": True}


@router.post("", response_model=UserOut)
def create_user(data: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.username == data.username).first()
    if existing:
        count = db.query(Rating).filter(Rating.user_id == existing.id).count()
        out = UserOut.model_validate(existing)
        out.rating_count = count
        return out
    user = User(username=data.username)
    db.add(user)
    db.commit()
    db.refresh(user)
    out = UserOut.model_validate(user)
    out.rating_count = 0
    return out


@router.get("/{user_id}", response_model=UserOut)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    count = db.query(Rating).filter(Rating.user_id == user_id).count()
    out = UserOut.model_validate(user)
    out.rating_count = count
    return out


@router.post("/{user_id}/ratings", response_model=RatingOut)
def rate_movie(user_id: int, data: RatingCreate, db: Session = Depends(get_db)):
    if not 1.0 <= data.rating <= 5.0:
        raise HTTPException(status_code=422, detail="Rating must be between 1 and 5")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    movie = db.query(Movie).filter(Movie.id == data.movie_id).first()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")

    existing = (
        db.query(Rating)
        .filter(Rating.user_id == user_id, Rating.movie_id == data.movie_id)
        .first()
    )
    if existing:
        existing.rating = data.rating
        db.commit()
        return RatingOut(movie_id=data.movie_id, rating=data.rating, movie_title=movie.title)

    rating = Rating(user_id=user_id, movie_id=data.movie_id, rating=data.rating)
    db.add(rating)
    db.commit()
    return RatingOut(movie_id=data.movie_id, rating=data.rating, movie_title=movie.title)


@router.get("/{user_id}/ratings", response_model=list[RatingOut])
def get_user_ratings(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    ratings = db.query(Rating).filter(Rating.user_id == user_id).all()
    result = []
    for r in ratings:
        movie = db.query(Movie).filter(Movie.id == r.movie_id).first()
        result.append(
            RatingOut(
                movie_id=r.movie_id,
                rating=r.rating,
                movie_title=movie.title if movie else None,
            )
        )
    return result
