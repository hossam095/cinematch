from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base


class Movie(Base):
    """A catalogue title: either a film (media_type="movie") or a series (media_type="tv")."""

    __tablename__ = "movies"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False, index=True)
    year = Column(Integer, nullable=False)
    genres = Column(String, nullable=False)  # comma-separated
    director = Column(String, nullable=False)  # creator(s) for series
    cast = Column(String, nullable=False)  # comma-separated, top 4
    synopsis = Column(Text, nullable=False)
    runtime = Column(Integer, nullable=False)  # minutes (per episode for series)
    language = Column(String, default="en")
    poster_path = Column(String, nullable=True)
    backdrop_path = Column(String, nullable=True)
    tmdb_rating = Column(Float, default=0.0)
    popularity = Column(Float, default=0.0)
    media_type = Column(String, default="movie", nullable=False, index=True)  # "movie" | "tv"
    tmdb_id = Column(Integer, nullable=True, index=True)
    seasons = Column(Integer, nullable=True)  # series only
    trailer_key = Column(String, nullable=True)  # YouTube id of the teaser/trailer; "" = none found

    ratings = relationship("Rating", back_populates="movie")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    ratings = relationship("Rating", back_populates="user")


class Rating(Base):
    __tablename__ = "ratings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    movie_id = Column(Integer, ForeignKey("movies.id"), nullable=False)
    rating = Column(Float, nullable=False)  # 1.0 to 5.0
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="ratings")
    movie = relationship("Movie", back_populates="ratings")
