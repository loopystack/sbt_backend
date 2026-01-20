#!/usr/bin/env python3
"""
Reconciliation Job Runner
Runs daily reconciliation to compare internal balances vs on-chain platform assets
"""
import asyncio
import logging
import sys
from pathlib import Path
from datetime import date, timedelta

# Add the app directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

from app.services.reconciliation_service import reconciliation_service
from app.core.database import AsyncSessionLocal
from app.core.config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(message)s'
)

logger = logging.getLogger(__name__)


async def main():
    """Main entry point for reconciliation job"""
    import argparse

    parser = argparse.ArgumentParser(description='Run daily reconciliation')
    parser.add_argument(
        '--date',
        type=str,
        help='Date to reconcile (YYYY-MM-DD format, defaults to yesterday)',
        default=None
    )
    parser.add_argument(
        '--force-today',
        action='store_true',
        help='Force reconciliation for today (normally runs for previous day)',
        default=False
    )

    args = parser.parse_args()

    # Determine target date
    if args.date:
        target_date = date.fromisoformat(args.date)
    elif args.force_today:
        target_date = date.today()
    else:
        # Default to yesterday (since reconciliation typically runs after day ends)
        target_date = date.today() - timedelta(days=1)

    logger.info(f"Starting reconciliation for date: {target_date}")
    logger.info(f"Reconciliation tolerance: {settings.RECON_TOLERANCE_USDT} USDT")

    async with AsyncSessionLocal() as db:
        try:
            report = await reconciliation_service.run_daily_reconciliation(db, target_date)

            logger.info("Reconciliation completed:")
            logger.info(f"  Date: {report.date.date()}")
            logger.info(f"  Status: {report.status}")
            logger.info(f"  User Liability: {report.total_user_liability}")
            logger.info(f"  Platform Balance: {report.platform_total_balance}")
            logger.info(f"  Delta: {report.delta}")

            # Exit with appropriate code based on status
            if report.status == "critical":
                logger.error("CRITICAL: Reconciliation shows significant discrepancies!")
                sys.exit(1)
            elif report.status == "warn":
                logger.warning("WARNING: Reconciliation shows minor discrepancies")
                sys.exit(1)
            elif report.status == "error":
                logger.error("ERROR: Reconciliation failed to complete")
                sys.exit(1)
            else:
                logger.info("SUCCESS: Reconciliation completed with no issues")
                sys.exit(0)

        except Exception as e:
            logger.error(f"Reconciliation job failed: {e}", exc_info=True)
            sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())