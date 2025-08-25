import os
import asyncpg
from typing import Optional
import logging

logger = logging.getLogger(__name__)

# Global connection pool
_pool: Optional[asyncpg.Pool] = None

async def init_db_pool() -> None:
    """Initialize the database connection pool."""
    global _pool
    
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise ValueError("DATABASE_URL environment variable is required")
    
    try:
        _pool = await asyncpg.create_pool(
            database_url,
            min_size=5,
            max_size=20,
            command_timeout=60,
            server_settings={
                'jit': 'off'
            }
        )
        logger.info("Database connection pool initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database pool: {e}")
        raise

async def close_db_pool() -> None:
    """Close the database connection pool."""
    global _pool
    
    if _pool:
        await _pool.close()
        _pool = None
        logger.info("Database connection pool closed")

def get_db_pool() -> asyncpg.Pool:
    """Get the database connection pool."""
    if _pool is None:
        raise RuntimeError("Database pool not initialized. Call init_db_pool() first.")
    return _pool

async def get_db():
    """Get a database connection from the pool."""
    pool = get_db_pool()
    async with pool.acquire() as connection:
        yield connection