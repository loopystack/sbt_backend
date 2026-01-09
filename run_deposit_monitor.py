"""
Run Deposit Monitor Worker
Standalone script to run the deposit monitor worker
"""
import asyncio
import logging
import sys
import platform
import selectors
from app.core.database import get_db
from app.workers.deposit_monitor import deposit_monitor_worker

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)


async def main():
    """Main entry point for deposit monitor worker"""
    logger.info("Starting deposit monitor worker...")
    
    try:
        # Run worker forever (it handles database sessions internally)
        await deposit_monitor_worker.run_forever()
        
    except KeyboardInterrupt:
        logger.info("Deposit monitor worker stopped by user")
    except Exception as e:
        logger.error(f"Fatal error in deposit monitor worker: {str(e)}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    # Cross-platform compatibility:
    # - Windows: psycopg requires SelectorEventLoop (not ProactorEventLoop)
    # - Linux/Ubuntu: Default event loop works fine
    # This ensures the worker runs correctly on both development (Windows) and production (Ubuntu)
    if platform.system() == "Windows":
        # Use SelectorEventLoop on Windows for psycopg compatibility
        selector = selectors.SelectSelector()
        loop = asyncio.SelectorEventLoop(selector)
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(main())
        finally:
            loop.close()
    else:
        # On Unix/Linux systems (Ubuntu production), use default event loop
        # This works perfectly with psycopg on Linux
        asyncio.run(main())

