from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, SessionLocal
from models import Base, Movie, User, Rating
from seed_data import MOVIES
from routers import movies, users, recommendations

Base.metadata.create_all(bind=engine)


def seed_database():
    db = SessionLocal()
    try:
        if db.query(Movie).count() == 0:
            for m in MOVIES:
                db.add(Movie(**m))
            db.commit()

        # Demo users with ratings so collaborative filtering has data
        if db.query(User).count() == 0:
            demo_users = [
                {"username": "alice", "ratings": [(1, 5), (3, 5), (5, 4), (7, 4), (9, 5), (11, 3), (15, 5), (26, 4), (44, 5)]},
                {"username": "bob", "ratings": [(2, 5), (4, 4), (9, 5), (22, 4), (23, 5), (42, 4), (47, 5), (60, 4)]},
                {"username": "carla", "ratings": [(13, 5), (14, 4), (29, 5), (31, 5), (32, 4), (33, 3), (35, 5), (41, 4)]},
                {"username": "david", "ratings": [(5, 5), (6, 5), (8, 4), (17, 5), (18, 4), (19, 5), (37, 4), (65, 5)]},
                {"username": "eva", "ratings": [(16, 5), (20, 5), (26, 4), (27, 4), (28, 5), (43, 5), (46, 5), (49, 5)]},
                {"username": "felix", "ratings": [(10, 5), (21, 4), (23, 4), (24, 5), (25, 5), (42, 3), (54, 4), (53, 5)]},
                {"username": "grace", "ratings": [(26, 5), (27, 5), (28, 5), (56, 5), (57, 5), (53, 4), (54, 5), (61, 5)]},
                {"username": "hiro", "ratings": [(13, 4), (29, 5), (46, 4), (47, 5), (48, 5), (64, 5), (28, 4), (68, 5)]},
            ]
            for demo in demo_users:
                user = User(username=demo["username"])
                db.add(user)
                db.flush()
                for movie_id, rating in demo["ratings"]:
                    db.add(Rating(user_id=user.id, movie_id=movie_id, rating=float(rating)))
            db.commit()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app):
    seed_database()
    yield


app = FastAPI(title="CineMatch API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(movies.router)
app.include_router(users.router)
app.include_router(recommendations.router)


@app.get("/health")
def health():
    return {"status": "ok"}
