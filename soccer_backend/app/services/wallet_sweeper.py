"""
Crypto Wallet Sweeper Service
Handles automatic transfer of user deposits to main wallet
"""

import asyncio
import logging
from typing import Dict, List, Optional
from decimal import Decimal
from datetime import datetime, timedelta

from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.deposit import DepositIntent, CryptoTransaction, CryptoInventory
from app.services.blockchain_watcher import BlockchainWatcher
from app.services.address_generator import AddressGenerator

logger = logging.getLogger(__name__)

class WalletSweeper:
    def __init__(self):
        self.main_wallets = {
            "BTC": "bc1qYOUR_REAL_BITCOIN_WALLET_ADDRESS_HERE",
            "ETH": "0xYOUR_REAL_ETHEREUM_WALLET_ADDRESS_HERE",
            "USDC": "0xYOUR_REAL_ETHEREUM_WALLET_ADDRESS_HERE",  # Same as ETH for ERC-20 tokens
            "USDT": "0xYOUR_REAL_ETHEREUM_WALLET_ADDRESS_HERE",  # Same as ETH for ERC-20 tokens
            "XRP": "rYOUR_REAL_XRP_WALLET_ADDRESS_HERE",
            "XLM": "GYOUR_REAL_STELLAR_WALLET_ADDRESS_HERE",
            "BNB": "bnbYOUR_REAL_BNB_WALLET_ADDRESS_HERE"
        }
        
        self.minimum_sweep_amounts = {
            "BTC": Decimal("0.001"),  # Minimum 0.001 BTC to sweep
            "ETH": Decimal("0.01"),   # Minimum 0.01 ETH to sweep
            "USDC": Decimal("10"),    # Minimum $10 USDC to sweep
            "USDT": Decimal("10"),    # Minimum $10 USDT to sweep
            "XRP": Decimal("10"),     # Minimum 10 XRP to sweep
            "XLM": Decimal("10"),     # Minimum 10 XLM to sweep
            "BNB": Decimal("0.1")     # Minimum 0.1 BNB to sweep
        }
        
        self.blockchain_watcher = BlockchainWatcher()
        self.address_generator = AddressGenerator()

    async def sweep_deposits(self, asset: str, network: str) -> Dict[str, any]:
        """
        Sweep all confirmed deposits for a specific asset/network to main wallet
        """
        try:
            db = next(get_db())
            
            # Get all confirmed deposits for this asset/network
            deposits = db.query(DepositIntent).filter(
                DepositIntent.asset == asset,
                DepositIntent.network == network,
                DepositIntent.status == "confirmed",
                DepositIntent.settled_at.is_(None)  # Not yet swept
            ).all()
            
            if not deposits:
                return {"status": "no_deposits", "count": 0}
            
            total_amount = Decimal("0")
            swept_count = 0
            failed_sweeps = []
            
            for deposit in deposits:
                try:
                    # Get the total amount from all transactions for this deposit
                    transactions = db.query(CryptoTransaction).filter(
                        CryptoTransaction.deposit_intent_id == deposit.id,
                        CryptoTransaction.status == "settled"
                    ).all()
                    
                    deposit_amount = sum(Decimal(str(tx.amount_crypto)) for tx in transactions)
                    
                    # Check if amount meets minimum sweep threshold
                    if deposit_amount < self.minimum_sweep_amounts.get(asset, Decimal("0")):
                        logger.info(f"Deposit {deposit.id} amount {deposit_amount} below minimum sweep threshold")
                        continue
                    
                    # Perform the sweep transaction
                    sweep_tx_hash = await self._perform_sweep(
                        asset=asset,
                        network=network,
                        from_address=deposit.deposit_address,
                        to_address=self.main_wallets[asset],
                        amount=deposit_amount,
                        memo=deposit.memo
                    )
                    
                    if sweep_tx_hash:
                        # Mark deposit as swept
                        deposit.settled_at = datetime.utcnow()
                        deposit.status = "settled"
                        
                        # Create sweep transaction record
                        sweep_transaction = CryptoTransaction(
                            deposit_intent_id=deposit.id,
                            tx_hash=sweep_tx_hash,
                            amount_crypto=float(deposit_amount),
                            amount_usd_at_settlement=float(deposit_amount) * self._get_current_price(asset),
                            fee_crypto=0.0,  # Will be updated when transaction is confirmed
                            confirmations=0,
                            status="detected"
                        )
                        db.add(sweep_transaction)
                        
                        total_amount += deposit_amount
                        swept_count += 1
                        
                        logger.info(f"Successfully swept {deposit_amount} {asset} from deposit {deposit.id}")
                    else:
                        failed_sweeps.append(deposit.id)
                        
                except Exception as e:
                    logger.error(f"Failed to sweep deposit {deposit.id}: {str(e)}")
                    failed_sweeps.append(deposit.id)
            
            db.commit()
            
            return {
                "status": "completed",
                "swept_count": swept_count,
                "total_amount": float(total_amount),
                "asset": asset,
                "failed_sweeps": failed_sweeps
            }
            
        except Exception as e:
            logger.error(f"Error in sweep_deposits: {str(e)}")
            return {"status": "error", "message": str(e)}
        finally:
            db.close()

    async def _perform_sweep(
        self, 
        asset: str, 
        network: str, 
        from_address: str, 
        to_address: str, 
        amount: Decimal,
        memo: Optional[str] = None
    ) -> Optional[str]:
        """
        Perform the actual sweep transaction on the blockchain
        """
        try:
            # This would integrate with your blockchain service provider
            # Examples: Infura, Alchemy, BlockCypher, etc.
            
            if asset == "BTC":
                return await self._sweep_bitcoin(from_address, to_address, amount)
            elif asset in ["ETH", "USDC", "USDT"]:
                return await self._sweep_ethereum(from_address, to_address, amount, asset)
            elif asset == "XRP":
                return await self._sweep_xrp(from_address, to_address, amount, memo)
            elif asset == "XLM":
                return await self._sweep_stellar(from_address, to_address, amount, memo)
            elif asset == "BNB":
                return await self._sweep_bnb(from_address, to_address, amount, memo)
            else:
                logger.error(f"Unsupported asset for sweeping: {asset}")
                return None
                
        except Exception as e:
            logger.error(f"Error performing sweep: {str(e)}")
            return None

    async def _sweep_bitcoin(self, from_address: str, to_address: str, amount: Decimal) -> Optional[str]:
        """Sweep Bitcoin using your preferred Bitcoin service"""
        # Example implementation - replace with your Bitcoin service
        try:
            # This would use a service like BlockCypher, BitGo, or your own Bitcoin node
            # For now, return a mock transaction hash
            logger.info(f"Sweeping {amount} BTC from {from_address} to {to_address}")
            return f"btc_sweep_{datetime.utcnow().timestamp()}"
        except Exception as e:
            logger.error(f"Bitcoin sweep failed: {str(e)}")
            return None

    async def _sweep_ethereum(self, from_address: str, to_address: str, amount: Decimal, asset: str) -> Optional[str]:
        """Sweep Ethereum/ERC-20 tokens"""
        try:
            # This would use Web3.py or a service like Infura/Alchemy
            logger.info(f"Sweeping {amount} {asset} from {from_address} to {to_address}")
            return f"eth_sweep_{datetime.utcnow().timestamp()}"
        except Exception as e:
            logger.error(f"Ethereum sweep failed: {str(e)}")
            return None

    async def _sweep_xrp(self, from_address: str, to_address: str, amount: Decimal, memo: Optional[str]) -> Optional[str]:
        """Sweep XRP"""
        try:
            logger.info(f"Sweeping {amount} XRP from {from_address} to {to_address}")
            return f"xrp_sweep_{datetime.utcnow().timestamp()}"
        except Exception as e:
            logger.error(f"XRP sweep failed: {str(e)}")
            return None

    async def _sweep_stellar(self, from_address: str, to_address: str, amount: Decimal, memo: Optional[str]) -> Optional[str]:
        """Sweep Stellar Lumens"""
        try:
            logger.info(f"Sweeping {amount} XLM from {from_address} to {to_address}")
            return f"xlm_sweep_{datetime.utcnow().timestamp()}" 
        except Exception as e:
            logger.error(f"Stellar sweep failed: {str(e)}")
            return None

    async def _sweep_bnb(self, from_address: str, to_address: str, amount: Decimal, memo: Optional[str]) -> Optional[str]:
        """Sweep BNB"""
        try:
            logger.info(f"Sweeping {amount} BNB from {from_address} to {to_address}")
            return f"bnb_sweep_{datetime.utcnow().timestamp()}"
        except Exception as e:
            logger.error(f"BNB sweep failed: {str(e)}")
            return None

    def _get_current_price(self, asset: str) -> float:
        """Get current USD price for asset"""
        # This would integrate with a price API like CoinGecko, CoinMarketCap, etc.
        prices = {
            "BTC": 45000.0,
            "ETH": 3000.0,
            "USDC": 1.0,
            "USDT": 1.0,
            "XRP": 0.5,
            "XLM": 0.1,
            "BNB": 300.0
        }
        return prices.get(asset, 1.0)

    async def get_sweep_summary(self) -> Dict[str, any]:
        """Get summary of all pending and completed sweeps"""
        try:
            db = next(get_db())
            
            # Get pending deposits (confirmed but not swept)
            pending_deposits = db.query(DepositIntent).filter(
                DepositIntent.status == "confirmed",
                DepositIntent.settled_at.is_(None)
            ).all()
            
            # Get swept deposits
            swept_deposits = db.query(DepositIntent).filter(
                DepositIntent.status == "settled",
                DepositIntent.settled_at.is_not(None)
            ).all()
            
            summary = {
                "pending_sweeps": len(pending_deposits),
                "completed_sweeps": len(swept_deposits),
                "pending_by_asset": {},
                "total_pending_value_usd": 0.0
            }
            
            # Calculate pending amounts by asset
            for deposit in pending_deposits:
                asset = deposit.asset
                if asset not in summary["pending_by_asset"]:
                    summary["pending_by_asset"][asset] = {
                        "count": 0,
                        "total_amount": 0.0,
                        "total_value_usd": 0.0
                    }
                
                # Get transaction amounts
                transactions = db.query(CryptoTransaction).filter(
                    CryptoTransaction.deposit_intent_id == deposit.id,
                    CryptoTransaction.status == "settled"
                ).all()
                
                deposit_amount = sum(tx.amount_crypto for tx in transactions)
                deposit_value_usd = deposit_amount * self._get_current_price(asset)
                
                summary["pending_by_asset"][asset]["count"] += 1
                summary["pending_by_asset"][asset]["total_amount"] += deposit_amount
                summary["pending_by_asset"][asset]["total_value_usd"] += deposit_value_usd
                summary["total_pending_value_usd"] += deposit_value_usd
            
            return summary
            
        except Exception as e:
            logger.error(f"Error getting sweep summary: {str(e)}")
            return {"error": str(e)}
        finally:
            db.close()

# Global instance
wallet_sweeper = WalletSweeper()
