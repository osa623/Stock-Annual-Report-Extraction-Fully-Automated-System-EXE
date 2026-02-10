"""
MongoDB connection and collection accessor.
"""

from pymongo import MongoClient, ASCENDING
from pymongo.collection import Collection
from pymongo.database import Database

from app.core.config import settings

_client: MongoClient | None = None
_db: Database | None = None


def get_client() -> MongoClient:
    global _client
    if _client is None:
        if not settings.MONGO_DB_URL:
            raise RuntimeError(
                "MONGO_DB_URL is not configured. "
                "Set it in your .env file."
            )
        _client = MongoClient(settings.MONGO_DB_URL)
    return _client


def get_database() -> Database:
    global _db
    if _db is None:
        _db = get_client()[settings.MONGO_DB_NAME]
    return _db


def get_mda_collection() -> Collection:
    return get_database()[settings.MDA_COLLECTION]


def ensure_indexes() -> None:
    """Create required indexes on the mda_extractions collection."""
    col = get_mda_collection()
    col.create_index([("sector", ASCENDING)])
    col.create_index([("company", ASCENDING)])
    col.create_index([("year", ASCENDING)])
    col.create_index([("output_path", ASCENDING)])
    col.create_index(
        [("sector", ASCENDING), ("company", ASCENDING), ("year", ASCENDING)]
    )


def ping() -> bool:
    """Return True if MongoDB is reachable."""
    try:
        get_client().admin.command("ping")
        return True
    except Exception:
        return False
