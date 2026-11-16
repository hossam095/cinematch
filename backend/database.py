import os
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# Always resolve the DB next to this file, whatever the current working directory is.
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cinematch.db")
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Columns added after the first release. create_all() never alters existing tables,
# so an existing cinematch.db needs these added by hand.
_MIGRATIONS: dict[str, list[tuple[str, str]]] = {
    "movies": [
        ("backdrop_path", "VARCHAR"),
        ("media_type", "VARCHAR NOT NULL DEFAULT 'movie'"),
        ("tmdb_id", "INTEGER"),
        ("seasons", "INTEGER"),
        ("trailer_key", "VARCHAR"),
    ],
}


def migrate() -> None:
    """Add any missing columns to existing tables (idempotent)."""
    inspector = inspect(engine)
    with engine.begin() as conn:
        for table, columns in _MIGRATIONS.items():
            if table not in inspector.get_table_names():
                continue
            existing = {c["name"] for c in inspector.get_columns(table)}
            for name, ddl in columns:
                if name not in existing:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_movies_media_type ON movies (media_type)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_movies_tmdb_id ON movies (tmdb_id)"))
