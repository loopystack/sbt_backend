"""
Crypto Service
Basic crypto operations and utilities
"""

from typing import Dict, List, Optional
from decimal import Decimal

class CryptoService:
    """Basic crypto service for handling crypto operations"""
    
    @staticmethod
    def get_supported_assets() -> Dict[str, List[str]]:
        """Get supported crypto assets and their networks"""
        return {
            "BTC": ["Bitcoin"],
            "ETH": ["Ethereum"],
            "USDC": ["Ethereum", "Polygon", "Base"],
            "USDT": ["Ethereum", "TRON", "Polygon"],
            "XRP": ["XRP Ledger"],
            "XLM": ["Stellar"],
            "BNB": ["BNB Beacon Chain"]
        }
    
    @staticmethod
    def get_minimum_deposit(asset: str) -> Decimal:
        """Get minimum deposit amount for an asset"""
        minimums = {
            "BTC": Decimal("0.001"),
            "ETH": Decimal("0.01"),
            "USDC": Decimal("10"),
            "USDT": Decimal("10"),
            "XRP": Decimal("10"),
            "XLM": Decimal("10"),
            "BNB": Decimal("0.1")
        }
        return minimums.get(asset, Decimal("1"))
    
    @staticmethod
    def get_required_confirmations(asset: str, network: str) -> int:
        """Get required confirmations for an asset/network"""
        confirmations = {
            "BTC": {"Bitcoin": 1},
            "ETH": {"Ethereum": 12},
            "USDC": {"Ethereum": 12, "Polygon": 128, "Base": 12},
            "USDT": {"Ethereum": 12, "TRON": 20, "Polygon": 128},
            "XRP": {"XRP Ledger": 1},
            "XLM": {"Stellar": 1},
            "BNB": {"BNB Beacon Chain": 1}
        }
        return confirmations.get(asset, {}).get(network, 1)
    
    @staticmethod
    def is_memo_required(asset: str, network: str) -> bool:
        """Check if memo/tag is required for an asset/network"""
        memo_required = {
            "XRP": {"XRP Ledger": True},
            "XLM": {"Stellar": True},
            "BNB": {"BNB Beacon Chain": True}
        }
        return memo_required.get(asset, {}).get(network, False)
    
    @staticmethod
    def get_current_price(asset: str) -> float:
        """Get current USD price for an asset (mock implementation)"""
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
