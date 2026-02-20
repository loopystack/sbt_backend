#!/usr/bin/env python3
"""
Set is_superuser = True for an admin user by email.
Use this if the admin user can sign in but gets "Admin access required" (403) on
admin-only API calls (e.g. ROI dashboard, withdrawal management) because their
DB row has is_superuser = False.

Usage (from backend root):
  python scripts/set_admin_superuser.py
  python scripts/set_admin_superuser.py --email adminuser@gmail.com
"""
import asyncio
import os
import sys

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import select, update
from app.core.database import AsyncSessionLocal
from app.models.user import User


async def main(email: str = "adminuser@gmail.com"):
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if not user:
            print(f"No user found with email: {email}")
            return 1
        if user.is_superuser:
            print(f"User {email} already has is_superuser=True.")
            return 0
        await db.execute(update(User).where(User.email == email).values(is_superuser=True))
        await db.commit()
        print(f"Set is_superuser=True for {email}. They can now access admin-only endpoints (ROI dashboard, etc.).")
        return 0


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser(description="Set is_superuser=True for an admin user by email.")
    p.add_argument("--email", default="adminuser@gmail.com", help="User email (default: adminuser@gmail.com)")
    args = p.parse_args()
    exit(asyncio.run(main(email=args.email)))
