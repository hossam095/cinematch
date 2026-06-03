"""
Fetches correct poster paths from TMDB for all movies in the DB.
Usage:
    python3 fetch_posters.py <TMDB_API_KEY>

Get a free key at: https://www.themoviedb.org/settings/api
"""

import sys
import time
import urllib.request
import json
from database import engine, SessionLocal
from models import Base, Movie

Base.metadata.create_all(bind=engine)


def tmdb_search(title: str, year: int, api_key: str):
    query = urllib.parse.quote(title)
    url = (
        f"https://api.themoviedb.org/3/search/movie"
        f"?query={query}&year={year}&language=fr-FR"
        f"&api_key={api_key}"
    )
    try:
        req = urllib.request.Request(url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read())
        results = data.get("results", [])
        if results:
            return results[0].get("poster_path")
        # retry without year constraint
        url2 = (
            f"https://api.themoviedb.org/3/search/movie"
            f"?query={query}&language=fr-FR&api_key={api_key}"
        )
        req2 = urllib.request.Request(url2, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req2, timeout=8) as resp2:
            data2 = json.loads(resp2.read())
        results2 = data2.get("results", [])
        return results2[0].get("poster_path") if results2 else None
    except Exception as e:
        print(f"  ⚠ Erreur TMDB pour '{title}': {e}")
        return None


def main():
    import urllib.parse

    if len(sys.argv) < 2:
        print("Usage: python3 fetch_posters.py <TMDB_API_KEY>")
        sys.exit(1)

    api_key = sys.argv[1].strip()
    db = SessionLocal()

    try:
        movies = db.query(Movie).all()
        print(f"Mise à jour de {len(movies)} films...\n")

        updated = 0
        failed = []

        for i, movie in enumerate(movies, 1):
            print(f"[{i:02d}/{len(movies)}] {movie.title} ({movie.year})...", end=" ", flush=True)

            poster = tmdb_search(movie.title, movie.year, api_key)

            if poster:
                movie.poster_path = poster
                print(f"✓ {poster}")
                updated += 1
            else:
                print("✗ non trouvé")
                failed.append(movie.title)

            # Respect TMDB rate limit (40 req/10s)
            time.sleep(0.3)

        db.commit()
        print(f"\n✅ {updated}/{len(movies)} posters mis à jour.")
        if failed:
            print(f"❌ Non trouvés ({len(failed)}):")
            for t in failed:
                print(f"   - {t}")

    finally:
        db.close()


if __name__ == "__main__":
    main()
