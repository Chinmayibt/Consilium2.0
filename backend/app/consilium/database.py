from typing import Any

from app.core.database import get_database


async def get_db() -> Any:
    """Compatibility wrapper for PMZero-style consilium modules."""
    return await get_database()
