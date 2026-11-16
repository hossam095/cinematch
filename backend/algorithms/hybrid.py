"""
Hybrid recommender: blends collaborative and content-based scores.

Weight schedule based on number of ratings:
  < 5  ratings  → 10% collab + 90% content  (cold start)
  5–20 ratings  → 40% collab + 60% content
  > 20 ratings  → 70% collab + 30% content
"""

from algorithms.collaborative import get_collaborative_recommendations
from algorithms.content_based import get_content_recommendations


def _weights(n_ratings: int) -> tuple[float, float]:
    if n_ratings < 5:
        return 0.10, 0.90
    if n_ratings <= 20:
        return 0.40, 0.60
    return 0.70, 0.30


def get_hybrid_recommendations(
    user_id: int,
    user_ratings: list,          # Rating ORM objects for THIS user
    all_ratings: list,           # Rating ORM objects for ALL users
    movies: list,                # Movie ORM objects
    index,                       # ContentIndex from content_based.build_index
    top_n: int = 20,
) -> list[dict]:
    """
    Returns a list of dicts: {movie_id, score, source}
    where source is 'hybrid', 'content', or 'collaborative'.
    """
    n_ratings = len(user_ratings)
    w_collab, w_content = _weights(n_ratings)

    rated_ids = {r.movie_id for r in user_ratings}
    user_rating_pairs = [(r.movie_id, r.rating) for r in user_ratings]

    movie_ids = {m.id for m in movies}

    # --- Content-based scores ---
    content_raw = get_content_recommendations(user_rating_pairs, movies, index, top_n=50)
    content_scores = {mid: score for mid, score in content_raw}

    # Normalise to [0, 1]
    if content_scores:
        max_c = max(content_scores.values()) or 1.0
        content_scores = {mid: s / max_c for mid, s in content_scores.items()}

    # --- Collaborative scores ---
    collab_raw = get_collaborative_recommendations(user_id, all_ratings, top_n=50)
    collab_scores = {mid: score for mid, score in collab_raw}

    if collab_scores:
        max_col = max(collab_scores.values()) or 1.0
        collab_scores = {mid: s / max_col for mid, s in collab_scores.items()}

    # --- Merge ---
    candidate_ids = (set(content_scores) | set(collab_scores)) - rated_ids
    candidate_ids &= movie_ids  # only include movies we have in DB

    results = []
    for mid in candidate_ids:
        c_score = content_scores.get(mid, 0.0)
        col_score = collab_scores.get(mid, 0.0)
        hybrid_score = w_content * c_score + w_collab * col_score

        if c_score > 0 and col_score > 0:
            source = "hybrid"
        elif c_score > 0:
            source = "content"
        else:
            source = "collaborative"

        results.append({"movie_id": mid, "score": hybrid_score, "source": source})

    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:top_n]


def get_popular_fallback(movies: list, exclude_ids: set, top_n: int = 20) -> list[dict]:
    """Fallback for new users with no ratings: return by popularity & rating."""
    candidates = [m for m in movies if m.id not in exclude_ids]
    candidates.sort(key=lambda m: (m.tmdb_rating * 0.5 + m.popularity * 0.5), reverse=True)
    return [{"movie_id": m.id, "score": m.tmdb_rating, "source": "popular"} for m in candidates[:top_n]]
