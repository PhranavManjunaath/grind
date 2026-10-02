from collections.abc import Generator

from sqlmodel import Session, SQLModel, create_engine

from .config import get_settings

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


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
