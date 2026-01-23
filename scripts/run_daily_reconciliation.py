#!/usr/bin/env python3
"""
Daily Reconciliation Job
Runs daily reconciliation between user balances and platform wallet balances
"""
import asyncio
import logging
import sys
from datetime import date, datetime, timezone

# Add the backend directory to Python path
sys.path.insert(0, '/opt/sportsbet/backend')

from app.core.database import get_db_session
from app.services.reconciliation_service import reconciliation_service
from app.core.config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def run_daily_reconciliation():
    """Run the daily reconciliation process"""
    logger.info("Starting daily reconciliation job")

    # Get today's date
    target_date = date.today()

    try:
        async with get_db_session() as db:
            # Run reconciliation
            report = await reconciliation_service.run_daily_reconciliation(db, target_date)

            logger.info(f"Daily reconciliation completed: {report.status}")
            logger.info(f"Delta: {report.delta}")
            logger.info(f"Details: {report.details}")

            # Exit with appropriate code based on status
            if report.status == "critical":
                logger.error("CRITICAL: Reconciliation found significant discrepancies!")
                sys.exit(1)
            elif report.status == "warn":
                logger.warning("WARNING: Reconciliation found minor discrepancies")
                sys.exit(0)
            else:
                logger.info("SUCCESS: Reconciliation completed with no issues")
                sys.exit(0)

    except Exception as e:
        logger.error(f"Daily reconciliation job failed: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    # Validate environment
    if settings.ENV == "dev":
        logger.warning("Running reconciliation in development environment")
    elif settings.ENV == "staging":
        logger.info("Running reconciliation in staging environment")
    elif settings.ENV == "production":
        logger.info("Running reconciliation in production environment")
    else:
        logger.error(f"Unknown environment: {settings.ENV}")
        sys.exit(1)

    # Run the reconciliation
    asyncio.run(run_daily_reconciliation())