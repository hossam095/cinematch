"""
Content-based filtering: recommends titles with similar attributes
(genres, director, cast, year, media type) to titles the user rated highly.

Instead of materialising an n×n similarity matrix (400 MB at 7 000 titles),
we keep the L2-normalised feature matrix X (n × d, sparse) and compute
similarity rows on demand: sim(i, ·) = X[i] · Xᵀ.
"""

from __future__ import annotations

import numpy as np
from scipy.sparse import csr_matrix, hstack
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import MinMaxScaler, normalize


class ContentIndex:
    """Feature matrix plus id lookups for a fixed list of titles."""

    def __init__(self, movies: list):
        self.ids: list[int] = [m.id for m in movies]
        self.id_to_idx: dict[int, int] = {mid: i for i, mid in enumerate(self.ids)}
        self.X: csr_matrix = _build_feature_matrix(movies)

    def similarity_row(self, movie_id: int) -> np.ndarray | None:
        """Cosine similarity between one title and every title in the index."""
        idx = self.id_to_idx.get(movie_id)
        if idx is None:
            return None
        return np.asarray(self.X[idx].dot(self.X.T).todense()).ravel()

    def profile_scores(self, user_ratings: list[tuple[int, float]]) -> np.ndarray | None:
        """
        Score every title against a user profile: the rating-weighted
        sum of the feature vectors of the titles they rated.
        """
        total = sum(r for _, r in user_ratings)
        if total <= 0:
            return None
        weights = np.zeros(len(self.ids))
        for mid, rating in user_ratings:
            idx = self.id_to_idx.get(mid)
            if idx is not None:
                weights[idx] += rating / total
        if not weights.any():
            return None
        profile = self.X.T.dot(weights)  # (d,)
        return np.asarray(self.X.dot(profile)).ravel()


def _build_feature_text(movie) -> str:
    genres = movie.genres.replace(",", " ").lower()
    director = movie.director.replace(",", " ").replace(" ", "_").lower()
    cast = movie.cast.replace(",", " ").replace(" ", "_").lower()
    kind = f"type_{getattr(movie, 'media_type', 'movie')}"
    # weight genres 3x, director 2x and media type 2x so films match films
    return f"{genres} {genres} {genres} {director} {director} {cast} {kind} {kind}"


def _build_feature_matrix(movies: list) -> csr_matrix:
    if not movies:
        return csr_matrix((0, 0))

    texts = [_build_feature_text(m) for m in movies]
    tfidf = TfidfVectorizer(analyzer="word", ngram_range=(1, 2), min_df=1)
    tfidf_matrix = tfidf.fit_transform(texts)

    years = np.array([[m.year] for m in movies], dtype=float)
    runtimes = np.array([[m.runtime] for m in movies], dtype=float)
    year_norm = MinMaxScaler().fit_transform(years)
    runtime_norm = MinMaxScaler().fit_transform(runtimes)
    extra = np.hstack([year_norm * 0.5, runtime_norm * 0.3])

    combined = hstack([tfidf_matrix, csr_matrix(extra)]).tocsr()
    # L2-normalise rows so a dot product is a cosine similarity
    return normalize(combined, norm="l2", axis=1)


# ---- cache -----------------------------------------------------------------
# The catalogue only changes when the import script runs, so one index per
# process is enough. It is rebuilt when the title count or max id changes.
_cache: tuple[tuple[int, int], ContentIndex] | None = None


def build_index(movies: list) -> ContentIndex:
    global _cache
    key = (len(movies), max((m.id for m in movies), default=0))
    if _cache is None or _cache[0] != key:
        _cache = (key, ContentIndex(movies))
    return _cache[1]


# Kept for backward compatibility with older call sites / the report.
build_similarity_matrix = build_index


def get_similar_movies(
    target_movie_id: int,
    movies: list,
    index: ContentIndex,
    top_n: int = 10,
    exclude_ids: set | None = None,
) -> list[tuple[int, float]]:
    """Return list of (movie_id, score) sorted by similarity descending."""
    row = index.similarity_row(target_movie_id)
    if row is None:
        return []

    exclude = set(exclude_ids or ())
    exclude.add(target_movie_id)

    results = []
    for i in np.argsort(-row):
        mid = index.ids[i]
        if mid in exclude:
            continue
        results.append((mid, float(row[i])))
        if len(results) >= top_n:
            break
    return results


def get_content_recommendations(
    user_ratings: list[tuple[int, float]],
    movies: list,
    index: ContentIndex,
    top_n: int = 20,
) -> list[tuple[int, float]]:
    """
    Given a user's (movie_id, rating) pairs, score every unrated title
    by similarity to the rating-weighted user profile.
    """
    if not user_ratings or index.X.shape[0] == 0:
        return []

    scores = index.profile_scores(user_ratings)
    if scores is None:
        return []

    rated_ids = {r[0] for r in user_ratings}
    results = []
    for i in np.argsort(-scores):
        mid = index.ids[i]
        if mid in rated_ids:
            continue
        results.append((mid, float(scores[i])))
        if len(results) >= top_n:
            break
    return results
