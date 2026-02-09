from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.exc import OperationalError
from fastapi import HTTPException
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


def _is_connection_lost(err: Exception) -> bool:
    """True if the error indicates the DB connection was closed (e.g. server restart)."""
    if not isinstance(err, OperationalError):
        return False
    orig = getattr(err, "orig", None)
    if orig is None:
        return False
    # psycopg errors: AdminShutdown, ConnectionReset, etc.
    return getattr(orig, "pgcode", None) == "57P01" or "terminating connection" in str(orig).lower()

# Convert database URL to async version
database_url = settings.DATABASE_URL

# Handle different database types
if database_url.startswith("postgresql://"):
    # PostgreSQL with psycopg driver (psycopg3 works with Python 3.14)
    database_url = database_url.replace("postgresql://", "postgresql+psycopg://", 1)
elif database_url.startswith("sqlite://"):
    # SQLite with aiosqlite driver
    database_url = database_url.replace("sqlite://", "sqlite+aiosqlite://", 1)
elif database_url.startswith("mysql://"):
    # MySQL with aiomysql driver
    database_url = database_url.replace("mysql://", "mysql+aiomysql://", 1)

# Create async engine
# pool_pre_ping: test connections before use (avoids using dead connections after DB restart)
# pool_recycle: avoid long-lived connections that PostgreSQL may close
engine = create_async_engine(
    database_url,
    echo=False,  # Disable SQL query logging
    future=True,
    pool_pre_ping=True,
    pool_recycle=300,  # seconds; recycle connections to avoid AdminShutdown after idle/restart
    # SQLite specific configuration
    connect_args={"check_same_thread": False} if "sqlite" in database_url else {}
)

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)


class Base(DeclarativeBase):
    pass


# Dependency to get database session
async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except HTTPException:
            await session.rollback()
            raise  # Re-raise without logging; not a DB error
        except Exception as e:
            await session.rollback()
            logger.error(f"Database session error: {e}")
            # If PostgreSQL closed connections (e.g. admin restart), discard pool so next request gets new connections
            if _is_connection_lost(e):
                try:
                    await engine.dispose()
                    logger.info("Database connection pool disposed after connection shutdown; next request will create new connections.")
                except Exception as dispose_err:
                    logger.warning("Failed to dispose engine after connection error: %s", dispose_err)
            raise
        finally:
            await session.close()
