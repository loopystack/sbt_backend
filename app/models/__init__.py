from app.core.database import Base
from .user import User, EmailVerification, PasswordReset
from .odds import Odds
from .deposit import DepositIntent, CryptoTransaction, CryptoInventory, UserCryptoBalance
from .betting_record import BettingRecord
from .transaction import Transaction
from .affiliate import Affiliate, Referral, AffiliateCommission
from .analytics import (
    ClickEvent,
    PageView,
    ConversionEvent,
    RegionalRestriction,
    UserCompliance,
    ComplianceAlert
)

__all__ = [
    "Base", 
    "User", 
    "EmailVerification", 
    "PasswordReset", 
    "Odds",
    "DepositIntent",
    "CryptoTransaction", 
    "CryptoInventory",
    "UserCryptoBalance",
    "BettingRecord",
    "Transaction",
    "Affiliate",
    "Referral",
    "AffiliateCommission",
    "ClickEvent",
    "PageView",
    "ConversionEvent",
    "RegionalRestriction",
    "UserCompliance",
    "ComplianceAlert"
]
