"""
Limits Service
Handles daily limits checking and updating for deposits, withdrawals, and bets
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import Session
from datetime import date, datetime
from decimal import Decimal
from typing import Dict, Any, Optional
from fastapi import HTTPException, status

from app.models.user_limits import UserDailyLimits
from app.models.deposit import DepositIntent, WithdrawalIntent
from app.models.betting_record import BettingRecord


class LimitsService:
    """Service to handle daily limits checking and tracking"""
    
    # Default limits (can be moved to config)
    MIN_DEPOSIT_USD = Decimal("10.00")
    MAX_DEPOSIT_SINGLE_USD = Decimal("50000.00")
    MAX_DEPOSIT_DAILY_USD = Decimal("100000.00")
    MAX_DEPOSIT_MONTHLY_USD = Decimal("500000.00")
    
    MIN_WITHDRAWAL_USD = Decimal("20.00")
    MAX_WITHDRAWAL_SINGLE_USD = Decimal("10000.00")
    MAX_WITHDRAWAL_DAILY_USD = Decimal("5000.00")
    MAX_WITHDRAWAL_MONTHLY_USD = Decimal("50000.00")
    
    MIN_BET_USD = Decimal("1.00")
    MAX_BET_SINGLE_USD = Decimal("1000.00")
    MAX_BET_DAILY_USD = Decimal("10000.00")
    
    AUTO_APPROVE_WITHDRAWAL_USD = Decimal("100.00")
    KYC_REQUIRED_WITHDRAWAL_USD = Decimal("1000.00")
    
    @staticmethod
    async def get_or_create_daily_limits(
        user_id: int,
        target_date: date,
        db: AsyncSession
    ) -> UserDailyLimits:
        """Get or create daily limits record for user and date"""
        stmt = select(UserDailyLimits).where(
            and_(
                UserDailyLimits.user_id == user_id,
                UserDailyLimits.date == target_date
            )
        )
        result = await db.execute(stmt)
        limits = result.scalar_one_or_none()
        
        if not limits:
            limits = UserDailyLimits(
                user_id=user_id,
                date=target_date,
                deposits_count=0,
                deposits_amount_usd=Decimal("0"),
                withdrawals_count=0,
                withdrawals_amount_usd=Decimal("0"),
                bets_count=0,
                bets_amount_usd=Decimal("0")
            )
            db.add(limits)
            await db.commit()
            await db.refresh(limits)
        
        return limits
    
    @staticmethod
    async def check_deposit_limits(
        user_id: int,
        amount_usd: Decimal,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """Check if deposit amount is within limits"""
        today = date.today()
        
        # Check minimum
        if amount_usd < LimitsService.MIN_DEPOSIT_USD:
            return {
                "allowed": False,
                "reason": f"Minimum deposit is ${LimitsService.MIN_DEPOSIT_USD}",
                "min_amount": LimitsService.MIN_DEPOSIT_USD
            }
        
        # Check single deposit max
        if amount_usd > LimitsService.MAX_DEPOSIT_SINGLE_USD:
            return {
                "allowed": False,
                "reason": f"Maximum single deposit is ${LimitsService.MAX_DEPOSIT_SINGLE_USD}",
                "max_amount": LimitsService.MAX_DEPOSIT_SINGLE_USD
            }
        
        # Get today's limits
        limits = await LimitsService.get_or_create_daily_limits(user_id, today, db)
        
        # Check daily limit
        if limits.deposits_amount_usd + amount_usd > LimitsService.MAX_DEPOSIT_DAILY_USD:
            return {
                "allowed": False,
                "reason": f"Daily deposit limit exceeded. Limit: ${LimitsService.MAX_DEPOSIT_DAILY_USD}, Used: ${limits.deposits_amount_usd}",
                "daily_limit": LimitsService.MAX_DEPOSIT_DAILY_USD,
                "current_usage": limits.deposits_amount_usd,
                "remaining": LimitsService.MAX_DEPOSIT_DAILY_USD - limits.deposits_amount_usd
            }
        
        # Check monthly limit (sum of all deposits this month)
        month_start = date(today.year, today.month, 1)
        stmt = select(func.sum(DepositIntent.amount_quote_fiat)).where(
            and_(
                DepositIntent.user_id == user_id,
                DepositIntent.status.in_(["confirmed", "settled"]),
                func.date(DepositIntent.created_at) >= month_start
            )
        )
        result = await db.execute(stmt)
        monthly_total = result.scalar() or Decimal("0")
        
        if monthly_total + amount_usd > LimitsService.MAX_DEPOSIT_MONTHLY_USD:
            return {
                "allowed": False,
                "reason": f"Monthly deposit limit exceeded. Limit: ${LimitsService.MAX_DEPOSIT_MONTHLY_USD}, Used: ${monthly_total}",
                "monthly_limit": LimitsService.MAX_DEPOSIT_MONTHLY_USD,
                "current_usage": monthly_total,
                "remaining": LimitsService.MAX_DEPOSIT_MONTHLY_USD - monthly_total
            }
        
        return {
            "allowed": True,
            "daily_limit": LimitsService.MAX_DEPOSIT_DAILY_USD,
            "current_usage": limits.deposits_amount_usd,
            "remaining": LimitsService.MAX_DEPOSIT_DAILY_USD - limits.deposits_amount_usd
        }
    
    @staticmethod
    async def check_withdrawal_limits(
        user_id: int,
        amount_usd: Decimal,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """Check if withdrawal amount is within limits"""
        today = date.today()
        
        # Check minimum
        if amount_usd < LimitsService.MIN_WITHDRAWAL_USD:
            return {
                "allowed": False,
                "reason": f"Minimum withdrawal is ${LimitsService.MIN_WITHDRAWAL_USD}",
                "min_amount": LimitsService.MIN_WITHDRAWAL_USD
            }
        
        # Check single withdrawal max
        if amount_usd > LimitsService.MAX_WITHDRAWAL_SINGLE_USD:
            return {
                "allowed": False,
                "reason": f"Maximum single withdrawal is ${LimitsService.MAX_WITHDRAWAL_SINGLE_USD}",
                "max_amount": LimitsService.MAX_WITHDRAWAL_SINGLE_USD
            }
        
        # Get today's limits
        limits = await LimitsService.get_or_create_daily_limits(user_id, today, db)
        
        # Check daily limit
        if limits.withdrawals_amount_usd + amount_usd > LimitsService.MAX_WITHDRAWAL_DAILY_USD:
            return {
                "allowed": False,
                "reason": f"Daily withdrawal limit exceeded. Limit: ${LimitsService.MAX_WITHDRAWAL_DAILY_USD}, Used: ${limits.withdrawals_amount_usd}",
                "daily_limit": LimitsService.MAX_WITHDRAWAL_DAILY_USD,
                "current_usage": limits.withdrawals_amount_usd,
                "remaining": LimitsService.MAX_WITHDRAWAL_DAILY_USD - limits.withdrawals_amount_usd
            }
        
        # Check if KYC required
        kyc_required = amount_usd >= LimitsService.KYC_REQUIRED_WITHDRAWAL_USD
        
        # Check if auto-approve
        auto_approve = amount_usd <= LimitsService.AUTO_APPROVE_WITHDRAWAL_USD
        
        return {
            "allowed": True,
            "daily_limit": LimitsService.MAX_WITHDRAWAL_DAILY_USD,
            "current_usage": limits.withdrawals_amount_usd,
            "remaining": LimitsService.MAX_WITHDRAWAL_DAILY_USD - limits.withdrawals_amount_usd,
            "kyc_required": kyc_required,
            "auto_approve": auto_approve
        }
    
    @staticmethod
    async def check_betting_limits(
        user_id: int,
        amount_usd: Decimal,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """Check if bet amount is within limits"""
        today = date.today()
        
        # Check minimum
        if amount_usd < LimitsService.MIN_BET_USD:
            return {
                "allowed": False,
                "reason": f"Minimum bet is ${LimitsService.MIN_BET_USD}",
                "min_amount": LimitsService.MIN_BET_USD
            }
        
        # Check single bet max
        if amount_usd > LimitsService.MAX_BET_SINGLE_USD:
            return {
                "allowed": False,
                "reason": f"Maximum single bet is ${LimitsService.MAX_BET_SINGLE_USD}",
                "max_amount": LimitsService.MAX_BET_SINGLE_USD
            }
        
        # Get today's limits
        limits = await LimitsService.get_or_create_daily_limits(user_id, today, db)
        
        # Check daily limit
        if limits.bets_amount_usd + amount_usd > LimitsService.MAX_BET_DAILY_USD:
            return {
                "allowed": False,
                "reason": f"Daily betting limit exceeded. Limit: ${LimitsService.MAX_BET_DAILY_USD}, Used: ${limits.bets_amount_usd}",
                "daily_limit": LimitsService.MAX_BET_DAILY_USD,
                "current_usage": limits.bets_amount_usd,
                "remaining": LimitsService.MAX_BET_DAILY_USD - limits.bets_amount_usd
            }
        
        return {
            "allowed": True,
            "daily_limit": LimitsService.MAX_BET_DAILY_USD,
            "current_usage": limits.bets_amount_usd,
            "remaining": LimitsService.MAX_BET_DAILY_USD - limits.bets_amount_usd
        }
    
    @staticmethod
    async def update_deposit_limits(
        user_id: int,
        amount_usd: Decimal,
        db: AsyncSession
    ) -> None:
        """Update daily deposit limits after successful deposit"""
        today = date.today()
        limits = await LimitsService.get_or_create_daily_limits(user_id, today, db)
        
        limits.deposits_count += 1
        limits.deposits_amount_usd += amount_usd
        limits.updated_at = datetime.utcnow()
        
        await db.commit()
    
    @staticmethod
    async def update_withdrawal_limits(
        user_id: int,
        amount_usd: Decimal,
        db: AsyncSession
    ) -> None:
        """Update daily withdrawal limits after withdrawal request"""
        today = date.today()
        limits = await LimitsService.get_or_create_daily_limits(user_id, today, db)
        
        limits.withdrawals_count += 1
        limits.withdrawals_amount_usd += amount_usd
        limits.updated_at = datetime.utcnow()
        
        await db.commit()
    
    @staticmethod
    async def update_betting_limits(
        user_id: int,
        amount_usd: Decimal,
        db: AsyncSession
    ) -> None:
        """Update daily betting limits after bet placement"""
        today = date.today()
        limits = await LimitsService.get_or_create_daily_limits(user_id, today, db)
        
        limits.bets_count += 1
        limits.bets_amount_usd += amount_usd
        limits.updated_at = datetime.utcnow()
        
        await db.commit()
    
    @staticmethod
    async def get_remaining_limits(
        user_id: int,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """Get remaining limits for user today"""
        today = date.today()
        limits = await LimitsService.get_or_create_daily_limits(user_id, today, db)
        
        return {
            "date": today.isoformat(),
            "deposits": {
                "count": limits.deposits_count,
                "amount_usd": float(limits.deposits_amount_usd),
                "remaining_usd": float(LimitsService.MAX_DEPOSIT_DAILY_USD - limits.deposits_amount_usd),
                "limit_usd": float(LimitsService.MAX_DEPOSIT_DAILY_USD)
            },
            "withdrawals": {
                "count": limits.withdrawals_count,
                "amount_usd": float(limits.withdrawals_amount_usd),
                "remaining_usd": float(LimitsService.MAX_WITHDRAWAL_DAILY_USD - limits.withdrawals_amount_usd),
                "limit_usd": float(LimitsService.MAX_WITHDRAWAL_DAILY_USD)
            },
            "bets": {
                "count": limits.bets_count,
                "amount_usd": float(limits.bets_amount_usd),
                "remaining_usd": float(LimitsService.MAX_BET_DAILY_USD - limits.bets_amount_usd),
                "limit_usd": float(LimitsService.MAX_BET_DAILY_USD)
            }
        }


# Create singleton instance
limits_service = LimitsService()

