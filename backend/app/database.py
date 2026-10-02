import logging
from collections.abc import Generator
from urllib.parse import urlsplit

from sqlmodel import Session, SQLModel, create_engine

from .config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()


def _normalize_url(url: str) -> str:
    # Hosts like Supabase/Render hand out postgres:// or postgresql:// URLs;
    # SQLAlchemy needs the explicit psycopg (v3) driver name.
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix):]
    return url


database_url = _normalize_url(settings.database_url)
connect_args = {"check_same_thread": False} if database_url.startswith("sqlite") else {}
engine = create_engine(database_url, connect_args=connect_args, pool_pre_ping=True)


def init_db() -> None:
    # Creates any missing tables; never drops or alters existing ones, so
    # it's safe to call on every startup without a migration tool.
    SQLModel.metadata.create_all(engine)


def describe_target() -> str:
    """Loggable description of the configured database.

    Credentials are never included: only the driver, host, port, database
    name and sslmode. A wrong or unparseable DATABASE_URL should produce
    something readable in the deploy logs instead of a bare stack trace.
    """
    try:
        parts = urlsplit(database_url)
        port = parts.port
    except ValueError:
        return "<DATABASE_URL has an unparseable host or port>"
    query = dict(pair.split("=", 1) for pair in parts.query.split("&") if "=" in pair)
    return (
        f"driver={parts.scheme or '<none>'} host={parts.hostname or '<none>'} "
        f"port={port or '<none>'} db={parts.path.lstrip('/') or '<none>'} "
        f"sslmode={query.get('sslmode', '<unset>')}"
    )


def check_database() -> tuple[bool, str]:
    """Run a trivial query against the configured database.

    Returns (ok, detail). The detail is safe to log and to return from an
    unauthenticated health endpoint: it never contains the password.
    """
    try:
        with engine.connect() as connection:
            connection.exec_driver_sql("SELECT 1")
    except Exception as exc:  # surfaced via logs and /api/health
        logger.warning("Database check failed: %s: %s", type(exc).__name__, exc)
        return False, f"{type(exc).__name__}: {exc}"
    return True, "connected"


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
