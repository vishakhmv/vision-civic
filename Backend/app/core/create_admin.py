import os
import asyncio
import sys
from datetime import datetime, timezone
from app.core.config import settings
from app.core.security import hash_password
from app.database.mongodb import connect_to_mongo, get_database, close_mongo_connection
from app.schemas.user import UserRole


async def create_or_promote_admin(email: str, password: str, name: str = "Administrator"):
    if not email or not password:
        raise ValueError("Admin email and password must be provided.")

    await connect_to_mongo()
    db = get_database()

    existing = await db.users.find_one({"email": email.lower().strip()})
    if existing:
        await db.users.update_one(
            {"_id": existing["_id"]},
            {"$set": {"role": UserRole.ADMIN.value, "updated_at": datetime.now(timezone.utc)}}
        )
        print(f"[OK] Existing user '{email}' promoted to ADMIN role.")
    else:
        doc = {
            "name": name,
            "email": email.lower().strip(),
            "password_hash": hash_password(password),
            "role": UserRole.ADMIN.value,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        res = await db.users.insert_one(doc)
        print(f"[OK] Admin account created: Email: {email}, ID: {res.inserted_id}")

    await close_mongo_connection()


if __name__ == "__main__":
    email_arg = sys.argv[1] if len(sys.argv) > 1 else os.getenv("ADMIN_EMAIL")
    password_arg = sys.argv[2] if len(sys.argv) > 2 else os.getenv("ADMIN_PASSWORD")
    name_arg = sys.argv[3] if len(sys.argv) > 3 else os.getenv("ADMIN_NAME", "Administrator")

    if not email_arg or not password_arg:
        print("[ERROR] Please provide email and password as arguments or via ADMIN_EMAIL and ADMIN_PASSWORD environment variables.")
        print("Usage: python -m app.core.create_admin <email> <password> [name]")
        sys.exit(1)

    asyncio.run(create_or_promote_admin(email_arg, password_arg, name_arg))
