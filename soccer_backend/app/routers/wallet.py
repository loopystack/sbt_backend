"""
Wallet Management API endpoints
Handles crypto wallet operations and fund aggregation
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Dict, List, Any
import logging

from app.core.database import get_db
from app.services.wallet_sweeper import wallet_sweeper
from app.schemas.deposit import DepositIntentResponse
from app.models.deposit import DepositIntent, CryptoTransaction

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/sweep/{asset}/{network}")
async def sweep_deposits(
    asset: str,
    network: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Manually trigger sweep of all confirmed deposits for a specific asset/network
    """
    try:
        # Validate asset and network
        valid_assets = ["BTC", "ETH", "USDC", "USDT", "XRP", "XLM", "BNB"]
        if asset not in valid_assets:
            raise HTTPException(status_code=400, detail=f"Invalid asset. Must be one of: {valid_assets}")
        
        # Run sweep in background
        background_tasks.add_task(wallet_sweeper.sweep_deposits, asset, network)
        
        return {
            "message": f"Sweep initiated for {asset} on {network}",
            "status": "initiated"
        }
        
    except Exception as e:
        logger.error(f"Error initiating sweep: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sweep-all")
async def sweep_all_deposits(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Trigger sweep for all supported assets/networks
    """
    try:
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
        
        for asset, network in assets_networks:
            background_tasks.add_task(wallet_sweeper.sweep_deposits, asset, network)
        
        return {
            "message": "Sweep initiated for all supported assets",
            "status": "initiated",
            "assets_networks": assets_networks
        }
        
    except Exception as e:
        logger.error(f"Error initiating sweep all: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sweep-summary")
async def get_sweep_summary(db: Session = Depends(get_db)):
    """
    Get summary of pending and completed sweeps
    """
    try:
        summary = await wallet_sweeper.get_sweep_summary()
        return summary
        
    except Exception as e:
        logger.error(f"Error getting sweep summary: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/pending-deposits")
async def get_pending_deposits(
    asset: str = None,
    network: str = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    Get list of deposits pending sweep
    """
    try:
        query = db.query(DepositIntent).filter(
            DepositIntent.status == "confirmed",
            DepositIntent.settled_at.is_(None)
        )
        
        if asset:
            query = query.filter(DepositIntent.asset == asset)
        if network:
            query = query.filter(DepositIntent.network == network)
        
        deposits = query.limit(limit).all()
        
        result = []
        for deposit in deposits:
            # Get transaction details
            transactions = db.query(CryptoTransaction).filter(
                CryptoTransaction.deposit_intent_id == deposit.id,
                CryptoTransaction.status == "settled"
            ).all()
            
            total_amount = sum(tx.amount_crypto for tx in transactions)
            total_value_usd = sum(tx.amount_usd_at_settlement or 0 for tx in transactions)
            
            result.append({
                "id": deposit.id,
                "user_id": deposit.user_id,
                "asset": deposit.asset,
                "network": deposit.network,
                "deposit_address": deposit.deposit_address,
                "memo": deposit.memo,
                "total_amount": total_amount,
                "total_value_usd": total_value_usd,
                "confirmations": deposit.confirmations,
                "required_confirmations": deposit.required_confirmations,
                "created_at": deposit.created_at,
                "updated_at": deposit.updated_at,
                "transactions": [
                    {
                        "tx_hash": tx.tx_hash,
                        "amount_crypto": tx.amount_crypto,
                        "amount_usd": tx.amount_usd_at_settlement,
                        "confirmations": tx.confirmations,
                        "status": tx.status,
                        "created_at": tx.created_at
                    }
                    for tx in transactions
                ]
            })
        
        return {
            "deposits": result,
            "count": len(result),
            "filters": {
                "asset": asset,
                "network": network,
                "limit": limit
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting pending deposits: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/main-wallets")
async def get_main_wallets():
    """
    Get the main wallet addresses for each asset
    """
    try:
        return {
            "main_wallets": wallet_sweeper.main_wallets,
            "minimum_sweep_amounts": {
                asset: float(amount) 
                for asset, amount in wallet_sweeper.minimum_sweep_amounts.items()
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting main wallets: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/main-wallets")
async def update_main_wallets(
    wallets: Dict[str, str],
    db: Session = Depends(get_db)
):
    """
    Update main wallet addresses
    """
    try:
        # Validate wallet addresses (basic validation)
        for asset, address in wallets.items():
            if not address or len(address) < 10:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Invalid wallet address for {asset}: {address}"
                )
        
        # Update the main wallets
        wallet_sweeper.main_wallets.update(wallets)
        
        return {
            "message": "Main wallet addresses updated successfully",
            "updated_wallets": wallets
        }
        
    except Exception as e:
        logger.error(f"Error updating main wallets: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sweep-history")
async def get_sweep_history(
    asset: str = None,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Get history of completed sweeps
    """
    try:
        query = db.query(DepositIntent).filter(
            DepositIntent.status == "settled",
            DepositIntent.settled_at.is_not(None)
        )
        
        if asset:
            query = query.filter(DepositIntent.asset == asset)
        
        deposits = query.order_by(DepositIntent.settled_at.desc()).limit(limit).all()
        
        result = []
        for deposit in deposits:
            # Get sweep transaction
            sweep_transactions = db.query(CryptoTransaction).filter(
                CryptoTransaction.deposit_intent_id == deposit.id,
                CryptoTransaction.tx_hash.like("%_sweep_%")
            ).all()
            
            result.append({
                "id": deposit.id,
                "user_id": deposit.user_id,
                "asset": deposit.asset,
                "network": deposit.network,
                "deposit_address": deposit.deposit_address,
                "main_wallet": wallet_sweeper.main_wallets.get(deposit.asset),
                "settled_at": deposit.settled_at,
                "sweep_transactions": [
                    {
                        "tx_hash": tx.tx_hash,
                        "amount_crypto": tx.amount_crypto,
                        "amount_usd": tx.amount_usd_at_settlement,
                        "fee_crypto": tx.fee_crypto,
                        "confirmations": tx.confirmations,
                        "status": tx.status,
                        "created_at": tx.created_at
                    }
                    for tx in sweep_transactions
                ]
            })
        
        return {
            "sweep_history": result,
            "count": len(result),
            "filters": {
                "asset": asset,
                "limit": limit
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting sweep history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
