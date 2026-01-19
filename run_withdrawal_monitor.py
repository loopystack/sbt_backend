"""
Standalone script to run the withdrawal monitor worker
Withdrawal Execution Monitor
"""
import asyncio
import logging
import platform
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

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
    """Main function to run withdrawal monitor worker"""
    from app.workers.withdrawal_monitor import withdrawal_monitor_worker
    
    try:
        logger.info("Starting withdrawal monitor worker...")
        await withdrawal_monitor_worker.run_forever()
    except KeyboardInterrupt:
        logger.info("Shutting down withdrawal monitor worker...")
    except Exception as e:
        logger.error(f"Fatal error in withdrawal monitor: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    # Handle Windows event loop compatibility
    if platform.system() == "Windows":
        # Windows requires SelectorEventLoop for psycopg
        import selectors
        loop = asyncio.SelectorEventLoop(selectors.SelectSelector())
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(main())
        finally:
            loop.close()
    else:
        # Linux/Unix can use default event loop
        asyncio.run(main())

