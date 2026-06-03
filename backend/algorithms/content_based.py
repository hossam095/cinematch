"""
Content-based filtering: recommends movies with similar attributes
(genres, director, cast, year) to movies the user has rated highly.
"""

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import MinMaxScaler


def _build_feature_text(movie) -> str:
    genres = movie.genres.replace(",", " ").lower()
    director = movie.director.replace(",", " ").replace(" ", "_").lower()
    cast = movie.cast.replace(",", " ").replace(" ", "_").lower()
    # weight genres 3x and director 2x to prioritise them
    return f"{genres} {genres} {genres} {director} {director} {cast}"


def build_similarity_matrix(movies: list) -> np.ndarray:
    """Return an (n x n) cosine similarity matrix for all movies."""
    if not movies:
        return np.array([])

    texts = [_build_feature_text(m) for m in movies]

    tfidf = TfidfVectorizer(analyzer="word", ngram_range=(1, 2))
    tfidf_matrix = tfidf.fit_transform(texts)

    # Append normalised year and runtime as extra features
    years = np.array([[m.year] for m in movies], dtype=float)
    runtimes = np.array([[m.runtime] for m in movies], dtype=float)
    scaler = MinMaxScaler()
    year_norm = scaler.fit_transform(years)
    runtime_norm = scaler.fit_transform(runtimes)

    extra = np.hstack([year_norm * 0.5, runtime_norm * 0.3])

    from scipy.sparse import hstack, csr_matrix
    combined = hstack([tfidf_matrix, csr_matrix(extra)])

    return cosine_similarity(combined, combined)


def get_similar_movies(
    target_movie_id: int,
    movies: list,
    sim_matrix: np.ndarray,
    top_n: int = 10,
    exclude_ids: set | None = None,
) -> list[tuple[int, float]]:
    """Return list of (movie_id, score) sorted by similarity descending."""
    id_to_idx = {m.id: i for i, m in enumerate(movies)}
    if target_movie_id not in id_to_idx:
        return []

    idx = id_to_idx[target_movie_id]
    scores = list(enumerate(sim_matrix[idx]))
    scores = sorted(scores, key=lambda x: x[1], reverse=True)

    exclude = exclude_ids or set()
    exclude.add(target_movie_id)

    results = []
    for i, score in scores:
        movie_id = movies[i].id
        if movie_id not in exclude:
            results.append((movie_id, float(score)))
        if len(results) >= top_n:
            break
    return results


def get_content_recommendations(
    user_ratings: list[tuple[int, float]],
    movies: list,
    sim_matrix: np.ndarray,
    top_n: int = 20,
) -> list[tuple[int, float]]:
    """
    Given a user's (movie_id, rating) pairs, score every unrated movie
    as a weighted sum of cosine similarities to rated movies (weight = rating).
    """
    if not user_ratings or sim_matrix.size == 0:
        return []

    id_to_idx = {m.id: i for i, m in enumerate(movies)}
    rated_ids = {r[0] for r in user_ratings}

    scores: dict[int, float] = {}
    total_weight = sum(r for _, r in user_ratings)
    if total_weight == 0:
        return []

    for movie_id, rating in user_ratings:
        if movie_id not in id_to_idx:
            continue
        idx = id_to_idx[movie_id]
        sim_row = sim_matrix[idx]
        weight = rating / total_weight
        for m in movies:
            if m.id in rated_ids:
                continue
            j = id_to_idx[m.id]
            scores[m.id] = scores.get(m.id, 0.0) + weight * sim_row[j]

    ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    return ranked[:top_n]
