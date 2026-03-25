import os
import logging
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

logger = logging.getLogger(__name__)


class Base(DeclarativeBase):
    pass


_database_url = os.getenv("DATABASE_URL", "").strip()
engine = None


class _UnavailableSessionFactory:
    def __call__(self):
        raise RuntimeError("Database is not configured. Set DATABASE_URL.")


SessionLocal = _UnavailableSessionFactory()

if _database_url:
    normalized = _database_url
    if normalized.startswith("postgresql://"):
        normalized = normalized.replace("postgresql://", "postgresql+psycopg://", 1)

    engine = create_async_engine(
        normalized,
        future=True,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
    )
    SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
else:
    logger.warning("DATABASE_URL is not set.")


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        yield session


async def init_db() -> None:
    if engine is None:
        return
    from app.models import admin_models  # noqa: F401
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as exc:
        logger.exception("Database initialization failed: %s", exc)
