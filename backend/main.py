from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, SessionLocal, migrate
from models import Base, Movie, User, Rating
from seed_data import MOVIES
from routers import movies, users, recommendations

Base.metadata.create_all(bind=engine)
migrate()


POSTER_PATHS = {
    1: '/9cqNxx0GxF0bflZmeSMuL5tnGzr.jpg', 2: '/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',
    3: '/qJ2tW6WMUDux911r6m7haRef0WH.jpg', 4: '/vQWk5YBFWF4bZaofAbv0tShwBvQ.jpg',
    5: '/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg', 6: '/yQvGrMoipbRoddT0ZR8tPoR7NfX.jpg',
    7: '/jSziioSwPVrOy9Yow3XhWIBDjq1.jpg', 8: '/aOIuZAjPaRIE6CMzbazvcHuHXDc.jpg',
    9: '/9OkCLM73MIU2CrKZbqiT8Ln1wY2.jpg', 10: '/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg',
    11: '/6yoghtyTpznpBik8EngEmJskVUO.jpg', 12: '/uS9m8OBk1A8eM9I042bx8XXpqAq.jpg',
    13: '/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg', 14: '/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg',
    15: '/7fn624j5lj3xTme2SgiLCeuedmO.jpg', 16: '/uDO8zWDhfWwoFdKS4fzkUJt0Rf0.jpg',
    17: '/hA2ple9q4qnwxp3hKVNhroipsir.jpg', 18: '/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg',
    19: '/x2FJsf1ElAgr63Y3PNPtJrcmpoe.jpg', 20: '/eCOtqtfvn7mxGl6nfmq4b1exJRc.jpg',
    21: '/34m2tygAYBGqA9MXKhRDtzYd4MR.jpg', 22: '/6d5XOczc226jECq0LIX0siKtgHR.jpg',
    23: '/nT97ifVT2J1yMQmeq20Qblg61T.jpg', 24: '/uqx37cS8cpHg8U35f9U5IBlrCV3.jpg',
    25: '/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg', 26: '/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg',
    27: '/cMYCDADoLKLbB83g4WnJegaZimC.jpg', 28: '/q719jXXEzOoYaps6babgKnONONX.jpg',
    29: '/pWDtjs568ZfOTMbURQBYuT4Qxka.jpg', 30: '/eWdyYQreja6JGCzqHWXpWHDrrPo.jpg',
    31: '/tFXcEccSQMf3lfhfXKSU9iRBpa3.jpg', 32: '/4GFPuL14eXi66V96xBWY73Y9PfR.jpg',
    33: '/7LEI8ulZzO5gy9Ww2NVCrKmHeDZ.jpg', 34: '/nAU74GmpUk7t5iklEp3bufwDq4n.jpg',
    35: '/pThyQovXQrw2m0s9x82twj48Jq4.jpg', 36: '/iZf0KyrE25z1sage4SYFLCCrMi9.jpg',
    37: '/ebSnODDg9lbsMIaWg2uAbjn7TO5.jpg', 38: '/nTr0lvAzeQmUjgSgDEHTJpnrxTz.jpg',
    39: '/nOd6vjEmzCT0k4VYqsA2hwyi87C.jpg', 40: '/orY4PX3TNFdCbdVwhKY32UKMvoA.jpg',
    41: '/99X2SgyFunJFXGAYnDv3sb9pnUD.jpg', 42: '/ji3ecJphATlVgWNY0B0RVXZizdf.jpg',
    43: '/qLnfEmPrDjJfPyyddLJPkXmshkp.jpg', 44: '/Ag2B2KHKQPukjH7WutmgnnSNurZ.jpg',
    45: '/fKTPH2WvH8nHTXeBYBVhawtRqtR.jpg', 46: '/nSxDa3M9aMvGVLoItzWTepQ5h5d.jpg',
    47: '/k7eYdWvhYQyRQoU2TB2A2Xu2TfD.jpg', 48: '/z7xXihu5wHuSMWymq5VAulPVuvg.jpg',
    49: '/5MwkWH9tYHv3mV9OdYTMR5qreIz.jpg', 50: '/vuza0WqY239yBXOadKlGwJsZJFE.jpg',
    51: '/kZ2nZw8D681aphje8NJi8EfbL1U.jpg', 52: '/k9IAS4TehZFcKi4HVByxZNPfqex.jpg',
    53: '/sKCr78MXSLixwmZ8DyJLrpMsd15.jpg', 54: '/uXDfjJbdP4ijW5hWSBrPrlKpxab.jpg',
    55: '/mFvoEwSfLqbcWwFsDjQebn9bzFe.jpg', 56: '/hbhFnRzzg6ZDmm8YAmxBnQpQIPh.jpg',
    57: '/2H1TmgdfNtsKlU9jKdeNyYL5y8T.jpg', 58: '/b6ko0IKC8MdYBBPkkA1aBPLe2yz.jpg',
    59: '/ve72VxNqjGM69Uky4WTo2bK6rfq.jpg', 60: '/fa0RDkAlCec0STeMNAhPaF89q6U.jpg',
    61: '/gGEsBPAijhVUFoiNpgZXqRVWJt2.jpg', 62: '/8GjMBToPbNb5r6XlHvr9dzJrCzr.jpg',
    63: '/7ulbyPajXTNZkki9AtcLI9YYhc2.jpg', 64: '/xCEg6KowNISWvMh8GvPSxtdf9TO.jpg',
    65: '/d5NXSklXo0qyIYkgV94XAgMIckC.jpg', 66: '/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
    67: '/iuFNMS8U5cb6xfzi51Dbkovj7vM.jpg', 68: '/w3LxiVYdWWRvEVdn5RYq6jIqkb1.jpg',
    69: '/m9yILVd4tNbuTRLdR22auGNQGmG.jpg', 70: '/jKZ0JgtPHYG1wAVIneJYijBUOw7.jpg',
    71: '/jQ0gylJMxWSL490sy0RrPj1Lj7e.jpg', 72: '/kCGlIMHnOm8JPXq3rXM6c5wMxcT.jpg',
    73: '/dB6Krk806zeqd0YNp2ngQ9zXteH.jpg', 74: '/kaSvEH3RJvQa6NfAuEVqDMBEk5E.jpg',
    75: '/hm52uLYqV7hQx2EuQJpVCKOGoAH.jpg',
    76: '/aKuFiU82s5ISJpGZp7YkIr3kCUd.jpg', 77: '/uS9m8OBk1A8eM9I042bx8XXpqAq.jpg',
    78: '/vfrQk5IPloGg1v9Rzbh2Eg3VGyM.jpg', 79: '/63N9uy8nd9j7Eog2axPQ8lbr3Wj.jpg',
    80: '/gQB8Y5RCMkv2zwzFHbUJX3kAhvA.jpg', 81: '/ekstpH614fwDX8DUln1a2Opz0N8.jpg',
    82: '/ve72VxNqjGM69Uky4WTo2bK6rfq.jpg', 83: '/4sHeTAp65WrSSuc05nRBKddhBxO.jpg',
    84: '/vuza0WqY239yBXOadKlGwJsZJFE.jpg', 85: '/5MwkWH9tYHv3mV9OdYTMR5qreIz.jpg',
    86: '/6d5XOczc226jECq0LIX0siKtgHR.jpg', 87: '/fa0RDkAlCec0STeMNAhPaF89q6U.jpg',
    88: '/7fn624j5lj3xTme2SgiLCeuedmO.jpg', 89: '/uDO8zWDhfWwoFdKS4fzkUJt0Rf0.jpg',
    90: '/tFXcEccSQMf3lfhfXKSU9iRBpa3.jpg', 91: '/hA2ple9q4qnwxp3hKVNhroipsir.jpg',
    92: '/eWdyYQreja6JGCzqHWXpWHDrrPo.jpg', 93: '/eCOtqtfvn7mxGl6nfmq4b1exJRc.jpg',
    94: '/qLnfEmPrDjJfPyyddLJPkXmshkp.jpg', 95: '/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
    96: '/nT97ifVT2J1yMQmeq20Qblg61T.jpg',  97: '/gziIkUSnYuj9ChCi8qOu2ZunpSC.jpg',
    98: '/e09dLw1Ljtccd2P4NsuUvVtS5du.jpg',  99: '/3bv6WAp6BSxxYvB5ozKFUYuRA8C.jpg',
    100: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg', 101: '/n0ybibhJtQ5icDqTp8eRytcIHJx.jpg',
    102: '/qNBAXBIQlnOThrVvA6mA2B5ggV6.jpg', 103: '/orY4PX3TNFdCbdVwhKY32UKMvoA.jpg',
    104: '/9BTwsLaMVHOGFlmsSlx5QYCaXb.jpg',  105: '/nTr0lvAzeQmUjgSgDEHTJpnrxTz.jpg',
    106: '/z7xXihu5wHuSMWymq5VAulPVuvg.jpg', 107: '/nSxDa3M9aMvGVLoItzWTepQ5h5d.jpg',
    108: '/k7eYdWvhYQyRQoU2TB2A2Xu2TfD.jpg', 109: '/pWDtjs568ZfOTMbURQBYuT4Qxka.jpg',
    110: '/sQ3uSRb0wrgJf9sWc8LxYbnqltC.jpg', 111: '/uFm2vnp9LhHx5MNo1Ego6O3vUhl.jpg',
    112: '/sJAPRj3vHmjV4z97YK84iDovYlm.jpg', 113: '/p5OivnZuXfy5E3BKKFIeSidmwys.jpg',
    114: '/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg', 115: '/cMYCDADoLKLbB83g4WnJegaZimC.jpg',
    116: '/qG3RYlIVpTYclR9TYIsy8p7m7AT.jpg', 117: '/qsdjk9oAKSQMWs0Vt5Pyfh6O4GZ.jpg',
    118: '/Ag2B2KHKQPukjH7WutmgnnSNurZ.jpg', 119: '/fKTPH2WvH8nHTXeBYBVhawtRqtR.jpg',
    120: '/jsS3a3ep2KyBVmmiwaz3LvK49b1.jpg', 121: '/x2FJsf1ElAgr63Y3PNPtJrcmpoe.jpg',
    122: '/lz8vNyXeidqqOdJW9ZjnDAMb5Vr.jpg', 123: '/whwT3Q9JxbAYzEc3t7uYYcCbTMf.jpg',
    124: '/bX2xnavhMYjWDoZp1VM6VnU1xwe.jpg', 125: '/6TbMfJueFlfwdn8pURQdcugjUFC.jpg',
    126: '/5UwdhrjXhUgsiDhe1dpS9z4yj7q.jpg',
    127: 'https://upload.wikimedia.org/wikipedia/commons/3/38/Rear_Window_film_poster.jpg',
    128: '/yz4QVqPx3h1hD1DfqqQkCq3rmxW.jpg', 129: '/ppd84D2i9W8jXmsyInGyihiSyqz.jpg',
    130: '/5K7cOHoay2mZusSLezBOY0Qxh8a.jpg', 131: '/twLGHXPjQtS8UyVGp5GXmhJiTM7.jpg',
    132: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Some_Like_It_Hot_%281959_poster%29.png/960px-Some_Like_It_Hot_%281959_poster%29.png',
    133: '/zK7HsOC7QxW1ldKIeFG8YJ5F2Eb.jpg',
    134: 'https://upload.wikimedia.org/wikipedia/en/3/38/Chinatownposter1.jpg',
    135: '/uCC3j4pV9eOZwzDUWp2ilbcTf1f.jpg', 136: '/an0nD6uq6byfxXCfk6lQBzdL2J1.jpg',
    137: '/ceG9VzoRAVGwivFU403Wc3AHRys.jpg',  138: '/oU7Oq2kFAAlGqbU4VoAE36g4hoI.jpg',
    139: '/qvktm0BHcnmDpul4Hz01GIazWPr.jpg', 140: '/fNOH9f1aA7XRTzl1sAOx9iF553Q.jpg',
    141: '/9xjZS2rlVxm8SFx8kPC3aIGCOYQ.jpg', 142: '/sKCr78MXSLixwmZ8DyJLrpMsd15.jpg',
    143: '/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg', 144: '/xazWoLealQwEgqZ89MLZklLZD3k.jpg',
    145: '/or1gBugydmjToAEq7OZY0owwFk.jpg',  146: '/6x7MzQ6BOMlRzam1StcmPO9v61g.jpg',
    147: '/2hFvxCCWrTmCYwfy7yum0GKRi3Y.jpg', 148: '/ty8TGRuvJLPUmAR1H1nRIsgwvim.jpg',
    149: '/or1gBugydmjToAEq7OZY0owwFk.jpg',  150: '/aA5qHS0FbSXO8PxcxUIHbDrJyuh.jpg',
}


def seed_database():
    db = SessionLocal()
    try:
        if db.query(Movie).count() == 0:
            seen_titles: set[str] = set()
            for m in MOVIES:
                if m["title"] not in seen_titles:
                    db.add(Movie(**m))
                    seen_titles.add(m["title"])
            db.commit()
            # Apply confirmed working poster paths immediately after seeding
            for movie_id, path in POSTER_PATHS.items():
                m = db.query(Movie).filter(Movie.id == movie_id).first()
                if m:
                    m.poster_path = path
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
