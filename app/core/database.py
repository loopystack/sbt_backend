from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

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
engine = create_async_engine(
    database_url,
    echo=False,  # Disable SQL query logging
    future=True,
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
        except Exception as e:
            await session.rollback()
            logger.error(f"Database session error: {e}")
            raise
        finally:
            await session.close()
