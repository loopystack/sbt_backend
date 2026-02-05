"""
Scheduled Tasks for Crypto Operations
Handles automatic sweeping and monitoring
"""

import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, List

from app.services.wallet_sweeper import wallet_sweeper
from app.services.blockchain_watcher import blockchain_watcher

logger = logging.getLogger(__name__)

class ScheduledTasks:
    def __init__(self):
        self.is_running = False
        self.sweep_interval = 300  # 5 minutes
        self.monitor_interval = 60  # 1 minute
        
    async def start_scheduler(self):
        """Start the background scheduler"""
        if self.is_running:
            logger.warning("Scheduler is already running")
            return
        
        self.is_running = True
        logger.info("Starting crypto operations scheduler")
        
        # Start background tasks
        tasks = [
            asyncio.create_task(self._sweep_scheduler()),
            asyncio.create_task(self._monitor_scheduler()),
        ]
        
        try:
            await asyncio.gather(*tasks)
        except Exception as e:
            logger.error(f"Scheduler error: {str(e)}")
        finally:
            self.is_running = False

    async def _sweep_scheduler(self):
        """Automatically sweep deposits every 5 minutes"""
        while self.is_running:
            try:
                logger.info("Running automatic sweep cycle")
                
                # Sweep all supported assets
                assets_networks = [
                    ("BTC", "Bitcoin"),
                    ("ETH", "Ethereum"),
                    ("USDC", "Ethereum"),
                    ("USDC", "Polygon"),
                    ("USDC", "Base"),
                    ("USDT", "Ethereum"),
                    ("USDT", "TRON"),
                    ("USDT", "Polygon"),
                    ("XRP", "XRP Ledger"),
                    ("XLM", "Stellar"),
                    ("BNB", "BNB Beacon Chain")
                ]
                
                sweep_results = []
                for asset, network in assets_networks:
                    try:
                        result = await wallet_sweeper.sweep_deposits(asset, network)
                        if result.get("swept_count", 0) > 0:
                            sweep_results.append({
                                "asset": asset,
                                "network": network,
                                "swept_count": result.get("swept_count", 0),
                                "total_amount": result.get("total_amount", 0)
                            })
                    except Exception as e:
                        logger.error(f"Error sweeping {asset}/{network}: {str(e)}")
                
                if sweep_results:
                    logger.info(f"Sweep cycle completed: {sweep_results}")
                else:
                    logger.info("Sweep cycle completed: No deposits to sweep")
                
            except Exception as e:
                logger.error(f"Error in sweep scheduler: {str(e)}")
            
            # Wait for next cycle
            await asyncio.sleep(self.sweep_interval)

    async def _monitor_scheduler(self):
        """Monitor blockchain for new transactions every minute"""
        while self.is_running:
            try:
                logger.debug("Running blockchain monitoring cycle")
                
                # Check for new transactions on all monitored addresses
                await blockchain_watcher.check_all_addresses()
                
            except Exception as e:
                logger.error(f"Error in monitor scheduler: {str(e)}")
            
            # Wait for next cycle
            await asyncio.sleep(self.monitor_interval)

    async def stop_scheduler(self):
        """Stop the scheduler"""
        logger.info("Stopping crypto operations scheduler")
        self.is_running = False

    def get_status(self) -> Dict[str, any]:
        """Get current scheduler status"""
        return {
            "is_running": self.is_running,
            "sweep_interval": self.sweep_interval,
            "monitor_interval": self.monitor_interval,
            "uptime": datetime.now(timezone.utc).isoformat() if self.is_running else None
        }

# Global scheduler instance
scheduler = ScheduledTasks()

# Startup and shutdown events
async def start_crypto_scheduler():
    """Start the crypto scheduler (call this in your FastAPI startup)"""
    await scheduler.start_scheduler()

async def stop_crypto_scheduler():
    """Stop the crypto scheduler (call this in your FastAPI shutdown)"""
    await scheduler.stop_scheduler()
