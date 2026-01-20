#!/usr/bin/env python3
"""
Monitoring Worker Runner
Starts the monitoring worker that checks system health and creates alerts
"""
import asyncio
import logging
import sys
from pathlib import Path

# Add the app directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

from app.workers.monitoring_worker import monitoring_worker
from app.core.config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)


async def main():
    """Main entry point for monitoring worker"""
    logger.info("Starting monitoring worker...")
    logger.info(f"Monitoring interval: {settings.MONITORING_INTERVAL_SECONDS} seconds")
    logger.info(f"Alerts enabled: {settings.ALERTS_ENABLED}")

    if settings.ALERT_EMAIL_TO:
        logger.info(f"Alert emails will be sent to: {settings.ALERT_EMAIL_TO}")
    if settings.ALERT_WEBHOOK_URL:
        logger.info(f"Alert webhooks will be sent to: {settings.ALERT_WEBHOOK_URL}")

    try:
        await monitoring_worker.run_forever()
    except KeyboardInterrupt:
        logger.info("Monitoring worker stopped by user")
    except Exception as e:
        logger.error(f"Monitoring worker crashed: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())