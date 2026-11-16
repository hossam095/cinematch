"""Runtime configuration read from the environment or backend/.env."""
import os

ENV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")


def get_tmdb_key() -> str:
    """TMDB API key (v3 key or v4 token), or "" when not configured."""
    key = os.environ.get("TMDB_API_KEY", "").strip()
    if not key and os.path.exists(ENV_PATH):
        with open(ENV_PATH, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line.startswith("TMDB_API_KEY="):
                    key = line.split("=", 1)[1].strip().strip('"').strip("'")
    return key
