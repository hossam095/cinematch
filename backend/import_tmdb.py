"""
Import the most popular films and series from the TMDB API into cinematch.db.

Setup:
    1. Create a free account on https://www.themoviedb.org and request an API key
       (Settings → API). Either the "API Key" (v3) or the "API Read Access Token"
       (v4) works.
    2. Put it in backend/.env:   TMDB_API_KEY=xxxxxxxx
       (or export TMDB_API_KEY in your shell)

Usage:
    python3 import_tmdb.py                    # ≈ 4 500 films + 2 500 series
    python3 import_tmdb.py --movies 2000 --tv 1000
    python3 import_tmdb.py --lang fr-FR       # French titles & synopses

Re-running is safe: titles already imported are updated, not duplicated.
"""
from __future__ import annotations

import argparse
import math
import os
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import engine, SessionLocal, migrate  # noqa: E402
from models import Base, Movie  # noqa: E402
from settings import get_tmdb_key  # noqa: E402

API = "https://api.themoviedb.org/3"
PAGE_SIZE = 20
MAX_PAGE = 500  # hard limit of the TMDB discover endpoint

# TMDB genre names → names already used by the app / frontend filters
GENRE_MAP = {
    "Science Fiction": "Sci-Fi",
    "Sci-Fi & Fantasy": "Sci-Fi,Fantasy",
    "Action & Adventure": "Action,Adventure",
    "War & Politics": "War",
    "Kids": "Family",
    "TV Movie": "Drama",
}
# Non-fiction formats we do not want in a recommendation catalogue
TV_EXCLUDED_GENRE_IDS = "10763,10764,10767"  # News, Reality, Talk


# ---------------------------------------------------------------------------
# API key
# ---------------------------------------------------------------------------
def load_api_key() -> str:
    key = get_tmdb_key()
    if not key:
        sys.exit(
            "Clé TMDB manquante. Ajoute TMDB_API_KEY=... dans backend/.env "
            "(voir backend/.env.example) ou exporte la variable d'environnement."
        )
    return key


class Tmdb:
    """Thin TMDB client: auth, retries and a global rate limit."""

    def __init__(self, api_key: str, language: str, rate_per_sec: float = 35.0):
        self.session = requests.Session()
        self.params: dict[str, str] = {"language": language}
        # v4 tokens are JWTs; v3 keys are 32 hex chars
        if api_key.startswith("eyJ"):
            self.session.headers["Authorization"] = f"Bearer {api_key}"
        else:
            self.params["api_key"] = api_key
        self._lock = threading.Lock()
        self._min_interval = 1.0 / rate_per_sec
        self._next_slot = 0.0

    def _throttle(self) -> None:
        with self._lock:
            now = time.monotonic()
            wait = self._next_slot - now
            self._next_slot = max(now, self._next_slot) + self._min_interval
        if wait > 0:
            time.sleep(wait)

    def get(self, path: str, **params) -> dict | None:
        url = f"{API}{path}"
        for attempt in range(5):
            self._throttle()
            try:
                r = self.session.get(url, params={**self.params, **params}, timeout=20)
            except requests.RequestException:
                time.sleep(2 ** attempt)
                continue
            if r.status_code == 200:
                return r.json()
            if r.status_code == 404:
                return None
            if r.status_code == 401:
                sys.exit("Clé TMDB refusée (401). Vérifie TMDB_API_KEY dans backend/.env.")
            if r.status_code == 429:
                time.sleep(float(r.headers.get("Retry-After", 2)))
                continue
            time.sleep(2 ** attempt)
        print(f"  ! abandon {path} après 5 essais", file=sys.stderr)
        return None


# ---------------------------------------------------------------------------
# Parsing
# ---------------------------------------------------------------------------
def _genres(raw: list[dict]) -> str:
    out: list[str] = []
    for g in raw:
        for name in GENRE_MAP.get(g["name"], g["name"]).split(","):
            if name not in out:
                out.append(name)
    return ",".join(out)


def _names(people: list[dict], limit: int) -> str:
    return ",".join(p["name"].replace(",", " ") for p in people[:limit] if p.get("name"))


def parse_movie(d: dict) -> dict | None:
    """Turn a /movie/{id}?append_to_response=credits payload into Movie columns."""
    date = d.get("release_date") or ""
    if not (d.get("poster_path") and d.get("overview") and len(date) >= 4):
        return None
    runtime = d.get("runtime") or 0
    if runtime <= 0:
        return None
    crew = d.get("credits", {}).get("crew", [])
    directors = [p for p in crew if p.get("job") == "Director"]
    return {
        "tmdb_id": d["id"],
        "media_type": "movie",
        "title": d.get("title") or d.get("original_title"),
        "year": int(date[:4]),
        "genres": _genres(d.get("genres", [])) or "Drama",
        "director": _names(directors, 2) or "Unknown",
        "cast": _names(d.get("credits", {}).get("cast", []), 4),
        "synopsis": d["overview"],
        "runtime": runtime,
        "language": d.get("original_language") or "en",
        "poster_path": d["poster_path"],
        "backdrop_path": d.get("backdrop_path"),
        "tmdb_rating": round(float(d.get("vote_average") or 0), 1),
        "popularity": float(d.get("popularity") or 0),
        "seasons": None,
    }


def parse_tv(d: dict) -> dict | None:
    """Turn a /tv/{id}?append_to_response=credits payload into Movie columns."""
    date = d.get("first_air_date") or ""
    if not (d.get("poster_path") and d.get("overview") and len(date) >= 4):
        return None
    run_times = [t for t in d.get("episode_run_time") or [] if t]
    runtime = int(sum(run_times) / len(run_times)) if run_times else 45
    creators = d.get("created_by") or []
    if not creators:
        crew = d.get("credits", {}).get("crew", [])
        creators = [p for p in crew if p.get("job") in ("Executive Producer", "Producer")]
    return {
        "tmdb_id": d["id"],
        "media_type": "tv",
        "title": d.get("name") or d.get("original_name"),
        "year": int(date[:4]),
        "genres": _genres(d.get("genres", [])) or "Drama",
        "director": _names(creators, 2) or "Unknown",
        "cast": _names(d.get("credits", {}).get("cast", []), 4),
        "synopsis": d["overview"],
        "runtime": runtime,
        "language": d.get("original_language") or "en",
        "poster_path": d["poster_path"],
        "backdrop_path": d.get("backdrop_path"),
        "tmdb_rating": round(float(d.get("vote_average") or 0), 1),
        "popularity": float(d.get("popularity") or 0),
        "seasons": d.get("number_of_seasons") or 1,
    }


# ---------------------------------------------------------------------------
# Fetching
# ---------------------------------------------------------------------------
def discover_ids(client: Tmdb, kind: str, target: int) -> list[int]:
    """Most popular TMDB ids of the given kind ("movie" | "tv")."""
    params: dict = {
        "sort_by": "popularity.desc",
        "include_adult": "false",
        "vote_count.gte": 100 if kind == "movie" else 50,
    }
    if kind == "tv":
        params["without_genres"] = TV_EXCLUDED_GENRE_IDS
    else:
        params["include_video"] = "false"

    ids: list[int] = []
    seen: set[int] = set()
    pages = min(math.ceil(target * 1.15 / PAGE_SIZE), MAX_PAGE)  # 15% slack for skipped titles
    for page in range(1, pages + 1):
        data = client.get(f"/discover/{kind}", page=page, **params)
        if not data or not data.get("results"):
            break
        for item in data["results"]:
            if item["id"] not in seen:
                seen.add(item["id"])
                ids.append(item["id"])
        if page % 25 == 0 or page == pages:
            print(f"  {kind}: page {page}/{pages} → {len(ids)} ids")
        if page >= data.get("total_pages", page):
            break
    return ids


def fetch_details(client: Tmdb, kind: str, ids: list[int], target: int, workers: int) -> list[dict]:
    parse = parse_movie if kind == "movie" else parse_tv
    rows: list[dict] = []
    done = 0
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {
            pool.submit(client.get, f"/{kind}/{tid}", append_to_response="credits"): tid
            for tid in ids
        }
        for fut in as_completed(futures):
            done += 1
            data = fut.result()
            row = parse(data) if data else None
            if row:
                rows.append(row)
            if done % 500 == 0:
                print(f"  {kind}: {done}/{len(ids)} détails récupérés, {len(rows)} valides")
    # Keep the most popular ones up to the target
    rows.sort(key=lambda r: r["popularity"], reverse=True)
    return rows[:target]


# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------
def rescale_popularity(rows: list[dict]) -> None:
    """
    Map TMDB's unbounded popularity to the 0–100 scale the app expects.
    Uses the rank within each media type (percentile), so the most popular film
    and the most popular series are both at 100 and a mixed list interleaves
    films and series evenly instead of one type crowding out the other.
    """
    for kind in {r["media_type"] for r in rows}:
        subset = sorted((r for r in rows if r["media_type"] == kind), key=lambda r: r["popularity"], reverse=True)
        n = len(subset)
        for rank, r in enumerate(subset):
            r["popularity"] = round(100.0 * (1 - rank / n), 2) if n > 1 else 100.0


def _title_key(title: str, year: int) -> tuple[str, int]:
    """Loose match key: 'WALL·E' and 'WALL-E', 'Your Name.' and 'Your Name' are the same film."""
    return ("".join(ch for ch in title.lower() if ch.isalnum()), year)


def upsert(rows: list[dict]) -> tuple[int, int]:
    db = SessionLocal()
    try:
        existing = db.query(Movie).all()
        by_tmdb = {(m.tmdb_id, m.media_type): m for m in existing if m.tmdb_id}
        # Legacy seed rows have no tmdb_id: match them on title + year so the
        # demo users' ratings keep pointing at the same ids.
        by_title = {_title_key(m.title, m.year): m for m in existing if not m.tmdb_id}

        inserted = updated = 0
        for i, row in enumerate(rows, 1):
            m = by_tmdb.get((row["tmdb_id"], row["media_type"]))
            if m is None and row["media_type"] == "movie":
                m = by_title.pop(_title_key(row["title"], row["year"]), None)
            if m is None:
                db.add(Movie(**row))
                inserted += 1
            else:
                for k, v in row.items():
                    setattr(m, k, v)
                updated += 1
            if i % 1000 == 0:
                db.commit()
        db.commit()
        return inserted, updated
    finally:
        db.close()


def reconcile_legacy(client: Tmdb) -> None:
    """
    Seed films that the import did not match on title (spelling differs on TMDB)
    either already exist as an imported copy → merge ratings into it and drop the
    seed row, or are missing from the popular set → look them up and fill them in.
    """
    from models import Rating

    db = SessionLocal()
    try:
        legacy = db.query(Movie).filter(Movie.tmdb_id.is_(None)).all()
        if not legacy:
            return
        imported = {
            _title_key(m.title, m.year): m
            for m in db.query(Movie).filter(Movie.tmdb_id.isnot(None), Movie.media_type == "movie")
        }
        print(f"\n{len(legacy)} anciens films à rattacher à TMDB…")
        for m in legacy:
            twin = imported.get(_title_key(m.title, m.year))
            if twin is None:
                found = client.get("/search/movie", query=m.title, year=m.year)
                hit = (found or {}).get("results") or []
                if hit:
                    twin_by_id = db.query(Movie).filter(Movie.tmdb_id == hit[0]["id"], Movie.media_type == "movie").first()
                    if twin_by_id is not None:
                        twin = twin_by_id
                    else:
                        data = client.get(f"/movie/{hit[0]['id']}", append_to_response="credits")
                        row = parse_movie(data) if data else None
                        if row:
                            for k, v in row.items():
                                setattr(m, k, v)
                            print(f"  ✓ {m.title} ({m.year}) complété depuis TMDB")
                            continue
                if twin is None:
                    print(f"  ? {m.title} ({m.year}) introuvable sur TMDB, conservé tel quel")
                    continue
            # Merge: move ratings to the imported copy (unless the user already rated it), drop the seed row.
            # Done with bulk statements and flushed first, otherwise deleting the row would null
            # out the ratings' movie_id through the ORM relationship.
            already = {uid for (uid,) in db.query(Rating.user_id).filter(Rating.movie_id == twin.id)}
            if already:
                db.query(Rating).filter(Rating.movie_id == m.id, Rating.user_id.in_(already)).delete(synchronize_session=False)
            db.query(Rating).filter(Rating.movie_id == m.id).update({"movie_id": twin.id}, synchronize_session=False)
            db.flush()
            db.expire(m)
            db.delete(m)
            print(f"  ✓ {m.title} ({m.year}) fusionné avec « {twin.title} » (#{twin.id})")
        db.commit()
    finally:
        db.close()


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--movies", type=int, default=4500, help="number of films to import")
    ap.add_argument("--tv", type=int, default=2500, help="number of series to import")
    ap.add_argument("--lang", default="en-US", help="TMDB language for titles/synopses (e.g. fr-FR)")
    ap.add_argument("--workers", type=int, default=8, help="parallel detail requests")
    ap.add_argument("--reconcile-only", action="store_true", help="only re-attach legacy seed films, no import")
    args = ap.parse_args()

    client = Tmdb(load_api_key(), args.lang)
    Base.metadata.create_all(bind=engine)
    migrate()

    if args.reconcile_only:
        reconcile_legacy(client)
        return

    t0 = time.time()
    all_rows: list[dict] = []
    for kind, target in (("movie", args.movies), ("tv", args.tv)):
        if target <= 0:
            continue
        print(f"\n[{kind}] recherche des {target} titres les plus populaires…")
        ids = discover_ids(client, kind, target)
        print(f"[{kind}] récupération des détails ({len(ids)} titres)…")
        rows = fetch_details(client, kind, ids, target, args.workers)
        print(f"[{kind}] {len(rows)} titres valides")
        all_rows.extend(rows)

    print("\nEnregistrement en base…")
    rescale_popularity(all_rows)
    inserted, updated = upsert(all_rows)
    reconcile_legacy(client)

    db = SessionLocal()
    try:
        n_movie = db.query(Movie).filter(Movie.media_type == "movie").count()
        n_tv = db.query(Movie).filter(Movie.media_type == "tv").count()
    finally:
        db.close()

    print(
        f"\nTerminé en {time.time() - t0:.0f}s : {inserted} ajoutés, {updated} mis à jour.\n"
        f"Catalogue : {n_movie} films + {n_tv} séries = {n_movie + n_tv} titres."
    )


if __name__ == "__main__":
    main()
