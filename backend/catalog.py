"""
Catalogue facets that go beyond raw columns: who you watch with, the season
of the year, eras. Each facet is expressed as genre include/exclude lists
(plus a text match for Christmas) so it can be applied as a SQL filter and
combined freely with every other filter.
"""
from __future__ import annotations

from datetime import date

from sqlalchemy import or_, and_, not_

from models import Movie

# ---------------------------------------------------------------------------
# Who are you watching with?
# ---------------------------------------------------------------------------
AUDIENCES: dict[str, dict] = {
    "family": {
        "label": "En famille",
        "emoji": "👨‍👩‍👧",
        "description": "Animation, aventure et films tous publics",
        "include": ["Family", "Animation"],
        "exclude": ["Horror", "Crime", "War"],
    },
    "couple": {
        "label": "En couple",
        "emoji": "💑",
        "description": "Romances et comédies à deux",
        "include": ["Romance", "Comedy"],
        "exclude": ["Horror", "War", "Animation", "Family", "Action"],
    },
    "solo": {
        "label": "Seul(e)",
        "emoji": "🎧",
        "description": "Thrillers, mystères et science-fiction à savourer tranquillement",
        "include": ["Thriller", "Mystery", "Horror", "Sci-Fi", "Crime", "Documentary"],
        "exclude": ["Family", "Animation"],
    },
    "friends": {
        "label": "Entre amis",
        "emoji": "🍿",
        "description": "Action, comédies et frissons à partager",
        "include": ["Action", "Comedy", "Horror", "Adventure"],
        "exclude": ["Romance", "Documentary"],
    },
}

# ---------------------------------------------------------------------------
# Season of the year
# ---------------------------------------------------------------------------
SEASONS: dict[str, dict] = {
    "winter": {
        "label": "Hiver",
        "emoji": "❄️",
        "tagline": "Films de Noël, contes et soirées au chaud",
        "months": (12, 1, 2),
        "include": ["Family", "Fantasy", "Animation", "Romance"],
        "exclude": ["Horror"],
        "text": ["christmas", "noël", "santa", "snow", "winter"],
    },
    "spring": {
        "label": "Printemps",
        "emoji": "🌸",
        "tagline": "Comédies, romances et aventures légères",
        "months": (3, 4, 5),
        "include": ["Romance", "Comedy", "Animation", "Adventure"],
        "exclude": ["Horror", "War"],
        "text": [],
    },
    "summer": {
        "label": "Été",
        "emoji": "☀️",
        "tagline": "Blockbusters, action et grandes aventures",
        "months": (6, 7, 8),
        "include": ["Action", "Adventure", "Comedy", "Sci-Fi"],
        "exclude": [],
        "text": [],
    },
    "autumn": {
        "label": "Automne",
        "emoji": "🎃",
        "tagline": "Halloween : horreur, mystères et frissons",
        "months": (9, 10, 11),
        "include": ["Horror", "Thriller", "Mystery", "Fantasy"],
        "exclude": ["Family"],
        "text": ["halloween", "haunted", "witch", "ghost"],
    },
}


def current_season(today: date | None = None) -> str:
    month = (today or date.today()).month
    for key, s in SEASONS.items():
        if month in s["months"]:
            return key
    return "winter"


# ---------------------------------------------------------------------------
# Eras
# ---------------------------------------------------------------------------
ERAS: dict[str, dict] = {
    "classics": {"label": "Classiques (avant 1970)", "year_min": None, "year_max": 1969},
    "1970s": {"label": "Années 70", "year_min": 1970, "year_max": 1979},
    "1980s": {"label": "Années 80", "year_min": 1980, "year_max": 1989},
    "1990s": {"label": "Années 90", "year_min": 1990, "year_max": 1999},
    "2000s": {"label": "Années 2000", "year_min": 2000, "year_max": 2009},
    "2010s": {"label": "Années 2010", "year_min": 2010, "year_max": 2019},
    "2020s": {"label": "Années 2020", "year_min": 2020, "year_max": None},
}

# ---------------------------------------------------------------------------
# Durations (minutes; per episode for series)
# ---------------------------------------------------------------------------
DURATIONS: dict[str, dict] = {
    "short": {"label": "Court (< 90 min)", "runtime_min": None, "runtime_max": 89},
    "medium": {"label": "Standard (90-120 min)", "runtime_min": 90, "runtime_max": 120},
    "long": {"label": "Long (2h-3h)", "runtime_min": 121, "runtime_max": 180},
    "epic": {"label": "Très long (> 3h)", "runtime_min": 181, "runtime_max": None},
    "episode_short": {"label": "Épisodes courts (≤ 30 min)", "runtime_min": None, "runtime_max": 30},
    "episode_long": {"label": "Épisodes longs (> 45 min)", "runtime_min": 46, "runtime_max": None},
}

# Genres shown as themes in the UI, with French labels
THEMES: list[dict] = [
    {"key": "Action", "label": "Action", "emoji": "💥"},
    {"key": "Adventure", "label": "Aventure", "emoji": "🧭"},
    {"key": "Animation", "label": "Animation", "emoji": "🎨"},
    {"key": "Comedy", "label": "Comédie", "emoji": "😂"},
    {"key": "Crime", "label": "Policier", "emoji": "🕵️"},
    {"key": "Documentary", "label": "Documentaire", "emoji": "🎥"},
    {"key": "Drama", "label": "Drame", "emoji": "🎭"},
    {"key": "Family", "label": "Famille", "emoji": "🏠"},
    {"key": "Fantasy", "label": "Fantastique", "emoji": "🧙"},
    {"key": "History", "label": "Historique", "emoji": "🏛️"},
    {"key": "Horror", "label": "Horreur", "emoji": "👻"},
    {"key": "Music", "label": "Musique", "emoji": "🎵"},
    {"key": "Mystery", "label": "Mystère", "emoji": "🔍"},
    {"key": "Romance", "label": "Romance", "emoji": "❤️"},
    {"key": "Sci-Fi", "label": "Science-fiction", "emoji": "🚀"},
    {"key": "Thriller", "label": "Thriller", "emoji": "🔪"},
    {"key": "War", "label": "Guerre", "emoji": "⚔️"},
    {"key": "Western", "label": "Western", "emoji": "🤠"},
]


# ---------------------------------------------------------------------------
# SQL helpers
# ---------------------------------------------------------------------------
def _has_genre(genre: str):
    return Movie.genres.ilike(f"%{genre}%")


def genre_facet_filter(include: list[str], exclude: list[str], text: list[str] | None = None):
    """SQL condition: has any `include` genre (or matches text), and none of `exclude`."""
    positives = [_has_genre(g) for g in include]
    for word in text or []:
        positives.append(Movie.title.ilike(f"%{word}%"))
        positives.append(Movie.synopsis.ilike(f"%{word}%"))
    cond = or_(*positives) if positives else None
    if exclude:
        negatives = not_(or_(*[_has_genre(g) for g in exclude]))
        cond = and_(cond, negatives) if cond is not None else negatives
    return cond


def audience_filter(key: str):
    a = AUDIENCES[key]
    return genre_facet_filter(a["include"], a["exclude"])


def season_filter(key: str):
    s = SEASONS[key]
    return genre_facet_filter(s["include"], s["exclude"], s["text"])


def public_facets() -> dict:
    """Facet definitions for the frontend (no SQL)."""
    return {
        "themes": THEMES,
        "audiences": [{"key": k, "label": v["label"], "emoji": v["emoji"], "description": v["description"]} for k, v in AUDIENCES.items()],
        "seasons": [{"key": k, "label": v["label"], "emoji": v["emoji"], "tagline": v["tagline"]} for k, v in SEASONS.items()],
        "current_season": current_season(),
        "eras": [{"key": k, **v} for k, v in ERAS.items()],
        "durations": [{"key": k, "label": v["label"]} for k, v in DURATIONS.items()],
    }
