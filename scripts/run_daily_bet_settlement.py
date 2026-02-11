#!/usr/bin/env python3
"""
Daily Bet Settlement Job
Settles all bets for matches that have a result in the odds table (e.g. from the OddsPortal scraper).
Run after the scraper so new results are turned into Won/Lost and balances updated.
"""
import asyncio
import logging
import sys
import os

# On Windows, psycopg async requires SelectorEventLoop (default is ProactorEventLoop).
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

# Ensure backend root is on path (when run as script from repo root or scripts/)
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import AsyncSessionLocal
from app.routers.bulletproof_settlement import run_settle_all_finished

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


async def main():
    logger.info("Starting daily bet settlement job")
    async with AsyncSessionLocal() as db:
        try:
            result = await run_settle_all_finished(db)
            logger.info(
                "Settlement complete: %s bets settled, $%.2f winnings paid",
                result["bets_settled"],
                result["total_winnings_paid"],
            )
            sys.exit(0)
        except Exception as e:
            logger.exception("Settlement failed: %s", e)
            sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
