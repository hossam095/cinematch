"""Look up a YouTube teaser/trailer for a title through the TMDB videos endpoint."""
from __future__ import annotations

import requests

from settings import get_tmdb_key

API = "https://api.themoviedb.org/3"
# Teasers first: they are cut to intrigue, not to summarise the plot
PREFERRED_KINDS = ("Teaser", "Trailer")


def _request(path: str, params: dict) -> dict | None:
    key = get_tmdb_key()
    if not key:
        return None
    headers = {}
    if key.startswith("eyJ"):
        headers["Authorization"] = f"Bearer {key}"
    else:
        params = {**params, "api_key": key}
    try:
        r = requests.get(f"{API}{path}", params=params, headers=headers, timeout=10)
    except requests.RequestException:
        return None
    return r.json() if r.status_code == 200 else None


def find_trailer(media_type: str, tmdb_id: int | None) -> tuple[str | None, str | None]:
    """Return (youtube_key, kind) or (None, None)."""
    if not tmdb_id:
        return None, None
    videos: list[dict] = []
    # English first (most complete), then French
    for lang in ("en-US", "fr-FR"):
        data = _request(f"/{media_type}/{tmdb_id}/videos", {"language": lang})
        videos.extend((data or {}).get("results", []))

    youtube = [v for v in videos if v.get("site") == "YouTube" and v.get("key")]
    for kind in PREFERRED_KINDS:
        candidates = [v for v in youtube if v.get("type") == kind]
        if candidates:
            # Official uploads first, then the most recent
            candidates.sort(key=lambda v: (not v.get("official", False), v.get("published_at", "")), reverse=False)
            candidates.sort(key=lambda v: v.get("official", False), reverse=True)
            return candidates[0]["key"], kind
    return None, None
