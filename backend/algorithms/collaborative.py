"""
User-based collaborative filtering:
"Users similar to you also liked..."

Builds a user-item rating matrix and computes cosine similarity
between users to predict ratings for unseen movies.
"""

import numpy as np
from sklearn.metrics.pairwise import cosine_similarity


def build_user_item_matrix(
    all_ratings: list, user_ids: list, movie_ids: list
) -> np.ndarray:
    """
    all_ratings: list of Rating ORM objects with .user_id, .movie_id, .rating
    Returns (n_users x n_movies) matrix, 0 where no rating exists.
    """
    uid_to_idx = {uid: i for i, uid in enumerate(user_ids)}
    mid_to_idx = {mid: j for j, mid in enumerate(movie_ids)}

    matrix = np.zeros((len(user_ids), len(movie_ids)), dtype=float)
    for r in all_ratings:
        if r.user_id in uid_to_idx and r.movie_id in mid_to_idx:
            matrix[uid_to_idx[r.user_id], mid_to_idx[r.movie_id]] = r.rating

    return matrix


def get_similar_users(
    target_user_idx: int,
    user_item_matrix: np.ndarray,
    top_k: int = 20,
) -> list[tuple[int, float]]:
    """Return (user_idx, similarity) for the top-k most similar users."""
    if user_item_matrix.shape[0] < 2:
        return []

    # Mean-center each user's ratings (only over rated items)
    matrix = user_item_matrix.copy()
    for i in range(matrix.shape[0]):
        rated_mask = matrix[i] != 0
        if rated_mask.any():
            matrix[i, rated_mask] -= matrix[i, rated_mask].mean()

    sim = cosine_similarity(matrix)
    user_sims = list(enumerate(sim[target_user_idx]))
    user_sims = sorted(user_sims, key=lambda x: x[1], reverse=True)
    # exclude self
    return [(idx, score) for idx, score in user_sims if idx != target_user_idx][:top_k]


def predict_ratings(
    target_user_idx: int,
    user_item_matrix: np.ndarray,
    similar_users: list[tuple[int, float]],
    rated_movie_indices: set,
) -> dict[int, float]:
    """
    Predict scores for unrated movies using weighted average of
    similar users' ratings. Returns {movie_idx: predicted_score}.
    """
    n_movies = user_item_matrix.shape[1]
    predictions: dict[int, float] = {}

    for j in range(n_movies):
        if j in rated_movie_indices:
            continue

        weighted_sum = 0.0
        sim_sum = 0.0
        for u_idx, sim_score in similar_users:
            r = user_item_matrix[u_idx, j]
            if r > 0 and sim_score > 0:
                weighted_sum += sim_score * r
                sim_sum += sim_score

        if sim_sum > 0:
            predictions[j] = weighted_sum / sim_sum

    return predictions


def get_collaborative_recommendations(
    target_user_id: int,
    all_ratings: list,
    top_n: int = 20,
) -> list[tuple[int, float]]:
    """
    Full collaborative pipeline: build matrix → find similar users →
    predict ratings → return top-n (movie_id, predicted_score) list.
    """
    if not all_ratings:
        return []

    user_ids = sorted({r.user_id for r in all_ratings})
    movie_ids = sorted({r.movie_id for r in all_ratings})

    if target_user_id not in user_ids:
        return []

    uid_to_idx = {uid: i for i, uid in enumerate(user_ids)}
    mid_to_idx = {mid: j for j, mid in enumerate(movie_ids)}
    idx_to_mid = {j: mid for mid, j in mid_to_idx.items()}

    matrix = build_user_item_matrix(all_ratings, user_ids, movie_ids)

    target_idx = uid_to_idx[target_user_id]
    rated_idxs = {mid_to_idx[r.movie_id] for r in all_ratings if r.user_id == target_user_id}

    similar_users = get_similar_users(target_idx, matrix)
    predictions = predict_ratings(target_idx, matrix, similar_users, rated_idxs)

    ranked = sorted(predictions.items(), key=lambda x: x[1], reverse=True)
    return [(idx_to_mid[j], score) for j, score in ranked[:top_n] if j in idx_to_mid]
