import logging
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import settings

logger = logging.getLogger(__name__)


class MongoDB:
    client: AsyncIOMotorClient = None
    db: AsyncIOMotorDatabase = None


db_instance = MongoDB()


async def connect_to_mongo():
    target_uri = settings.MONGODB_URI
    preferred_db_name = settings.MONGODB_DATABASE

    logger.info("Attempting MongoDB connection to %s...", target_uri)
    try:
        client = AsyncIOMotorClient(target_uri, serverSelectionTimeoutMS=4000)
        await client.admin.command("ping")
        # Handle case sensitivity on Windows MongoDB
        actual_db_name = await resolve_db_case(client, preferred_db_name)
        db_instance.client = client
        db_instance.db = client[actual_db_name]
        logger.info("[OK] Successfully connected to MongoDB at %s (DB: %s)", target_uri, actual_db_name)
    except Exception as e:
        logger.warning(
            "Primary MongoDB connection failed (%s). Falling back to local MongoDB at mongodb://127.0.0.1:27017...",
            e
        )
        fallback_uri = "mongodb://127.0.0.1:27017"
        try:
            fallback_client = AsyncIOMotorClient(fallback_uri, serverSelectionTimeoutMS=4000)
            await fallback_client.admin.command("ping")
            actual_db_name = await resolve_db_case(fallback_client, preferred_db_name)
            db_instance.client = fallback_client
            db_instance.db = fallback_client[actual_db_name]
            logger.info("[OK] Successfully connected to fallback local MongoDB (DB: %s)", actual_db_name)
        except Exception as err:
            logger.error("Failed to connect to local MongoDB fallback: %s", err)
            db_instance.client = client
            db_instance.db = client[preferred_db_name]

    await create_indexes()


async def resolve_db_case(client: AsyncIOMotorClient, preferred_name: str) -> str:
    """Resolve casing to match existing database on MongoDB to prevent Windows DatabaseDifferCase error."""
    try:
        existing_dbs = await client.list_database_names()
        for d in existing_dbs:
            if d.lower() == preferred_name.lower():
                return d
    except Exception:
        pass
    return preferred_name


async def close_mongo_connection():
    logger.info("Closing MongoDB connection...")
    if db_instance.client:
        db_instance.client.close()
        logger.info("MongoDB connection closed.")


def get_database() -> AsyncIOMotorDatabase:
    return db_instance.db


async def create_indexes():
    """Create essential MongoDB indexes as required by the specification."""
    try:
        db = db_instance.db
        if db is None:
            return

        # Users: unique index on email
        await db.users.create_index("email", unique=True)

        # Incidents: indexes
        await db.incidents.create_index("created_at")
        await db.incidents.create_index("incident_type")
        await db.incidents.create_index("source_type")
        await db.incidents.create_index("created_by")
        await db.incidents.create_index("incident_detected_at")

        logger.info("[OK] MongoDB indexes successfully verified/created.")
    except Exception as e:
        logger.error(f"Error creating MongoDB indexes: {e}")
