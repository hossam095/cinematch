"""
Récupère les posters depuis TMDB par scraping — aucune clé API requise.
Usage:
    python3 fetch_posters.py
"""
from __future__ import annotations

import re
import sys
import time
import urllib.request
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import engine, SessionLocal
from models import Base, Movie

Base.metadata.create_all(bind=engine)

# TMDB movie IDs for each film in the seed data
TMDB_IDS: dict[str, int] = {
    "The Shawshank Redemption": 278,
    "The Godfather": 238,
    "The Dark Knight": 155,
    "Pulp Fiction": 680,
    "Inception": 27205,
    "Interstellar": 157336,
    "Fight Club": 550,
    "The Matrix": 603,
    "Goodfellas": 769,
    "Schindler's List": 424,
    "Se7en": 807,
    "The Silence of the Lambs": 274,
    "Parasite": 496243,
    "Joker": 475557,
    "Whiplash": 244786,
    "La La Land": 313369,
    "Mad Max: Fury Road": 76341,
    "Blade Runner 2049": 335984,
    "Arrival": 329865,
    "Her": 152601,
    "The Wolf of Wall Street": 106646,
    "No Country for Old Men": 6977,
    "The Departed": 1422,
    "Saving Private Ryan": 857,
    "Forrest Gump": 13,
    "Spirited Away": 129,
    "Princess Mononoke": 128,
    "Your Name": 372058,
    "Oldboy": 670,
    "The Grand Budapest Hotel": 120467,
    "Get Out": 419430,
    "Hereditary": 493922,
    "Midsommar": 530385,
    "A Quiet Place": 447332,
    "Knives Out": 546554,
    "1917": 530915,
    "Dunkirk": 374720,
    "Black Swan": 45612,
    "Requiem for a Dream": 641,
    "American History X": 11096,
    "The Usual Suspects": 629,
    "The Revenant": 281957,
    "Moonlight": 376867,
    "The Prestige": 1124,
    "Memento": 77,
    "Amélie": 194,
    "City of God": 598,
    "Pan's Labyrinth": 1453,
    "Eternal Sunshine of the Spotless Mind": 38,
    "The Truman Show": 37165,
    "Gravity": 49047,
    "Children of Men": 9693,
    "The Lion King": 8587,
    "Toy Story": 862,
    "Up": 14160,
    "WALL-E": 10681,
    "Inside Out": 150540,
    "The Shining": 694,
    "2001: A Space Odyssey": 62,
    "There Will Be Blood": 7549,
    "Coco": 354912,
    "About Time": 163270,
    "The Lobster": 254193,
    "Portrait of a Lady on Fire": 578701,
    "Dune": 438631,
    "Oppenheimer": 872585,
    "Barbie": 346698,
    "Everything Everywhere All at Once": 545611,
    "The Banshees of Inisherin": 811721,
    "Tár": 921502,
    "The Whale": 785084,
    "Poor Things": 792307,
    "Killers of the Flower Moon": 961268,
    "The Zone of Interest": 981314,
    "Aftersun": 952513,
    # Films supplémentaires
    "Pan's Labyrinth": 1453,
    "About Time": 163270,
    "A Clockwork Orange": 185,
    "Casino": 524,
    "Heat": 949,
    "The Big Lebowski": 115,
    "The Social Network": 37799,
    "The Hunt": 90405,
    "A Separation": 72545,
    "Yi Yi": 10576,
    "The Lives of Others": 6069,
    "Burning": 508947,
    "Prisoners": 146233,
    "Sicario": 273481,
    "Once Upon a Time in the West": 902,
    "Lawrence of Arabia": 5765,
    "Vertigo": 4960,
    "Rear Window": 8861,
    "Singin' in the Rain": 11975,
    "Some Like It Hot": 1057,
    "Network": 14537,
    "Chinatown": 1015,
    "The Wizard of Oz": 630,
    "E.T. the Extra-Terrestrial": 601,
    "The Terminator": 218,
    "Dr. Strangelove": 935,
    "The Matrix Reloaded": 604,
}

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}


def scrape_poster(tmdb_id: int) -> str | None:
    url = f"https://www.themoviedb.org/movie/{tmdb_id}"
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode("utf-8", errors="ignore")
        # poster path is embedded in og:image or directly in img tags
        match = re.search(
            r'image\.tmdb\.org/t/p/\w+(/[a-zA-Z0-9_\-]+\.(?:jpg|png))', html
        )
        return match.group(1) if match else None
    except Exception as e:
        return None


def is_broken(poster_path: str | None) -> bool:
    if not poster_path:
        return True
    if poster_path.startswith("http"):
        return False  # full URL assumed valid
    url = "https://image.tmdb.org/t/p/w185" + poster_path
    try:
        req = urllib.request.Request(
            url, method="HEAD", headers={"User-Agent": "Mozilla/5.0"}
        )
        with urllib.request.urlopen(req, timeout=4) as r:
            return r.status != 200
    except Exception:
        return True


def main():
    db = SessionLocal()
    try:
        movies = db.query(Movie).all()

        # Only process movies that have a known TMDB ID AND a broken poster
        targets = [
            m for m in movies
            if m.title in TMDB_IDS and is_broken(m.poster_path)
        ]
        print(f"🎬 {len(targets)} films avec poster cassé à corriger...\n")

        updated = 0
        failed = []

        for i, movie in enumerate(targets, 1):
            tmdb_id = TMDB_IDS[movie.title]
            print(f"[{i:02d}/{len(targets)}] {movie.title}... ", end="", flush=True)

            poster = scrape_poster(tmdb_id)
            if poster:
                movie.poster_path = poster
                print(f"✓ {poster}")
                updated += 1
            else:
                print("✗")
                failed.append(movie.title)

            time.sleep(0.4)  # respecter les serveurs TMDB

        db.commit()
        print(f"\n✅ {updated}/{len(targets)} posters mis à jour.")
        if failed:
            print(f"❌ Échecs ({len(failed)}): {', '.join(failed)}")

    finally:
        db.close()


if __name__ == "__main__":
    main()
