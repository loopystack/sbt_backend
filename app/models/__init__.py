from app.core.database import Base
from .user import User, EmailVerification, PasswordReset
from .odds import Odds
from .deposit import DepositIntent, CryptoTransaction, CryptoInventory, UserCryptoBalance, WithdrawalIntent
from .user_limits import UserDailyLimits
from .platform_wallet import PlatformWallet
from .wallet_transaction import WalletTransaction, WalletTransactionType, ReferenceType
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
    "WithdrawalIntent",
    "CryptoTransaction", 
    "CryptoInventory",
    "UserCryptoBalance",
    "UserDailyLimits",
    "PlatformWallet",
    "WalletTransaction",
    "WalletTransactionType",
    "ReferenceType",
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
