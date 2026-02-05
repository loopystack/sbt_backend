"""
Compliance Service
Handles all responsible gaming and regional restrictions enforcement
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, Union
from decimal import Decimal
from fastapi import HTTPException, status

from app.models.analytics import UserCompliance, ComplianceAlert, RegionalRestriction
from app.models.transaction import Transaction


class ComplianceService:
    """Service to handle compliance checks and restrictions"""
    
    @staticmethod
    async def get_user_compliance(
        user_id: int,
        db: AsyncSession
    ) -> Optional[UserCompliance]:
        """Get or create compliance record for user"""
        result = await db.execute(
            select(UserCompliance).where(UserCompliance.user_id == user_id)
        )
        compliance = result.scalar_one_or_none()
        
        if not compliance:
            # Create default compliance record
            compliance = UserCompliance(
                user_id=user_id,
                daily_deposit_limit=1000.0,
                weekly_deposit_limit=5000.0,
                monthly_deposit_limit=20000.0,
                max_bet_amount=500.0,
                max_daily_bet_limit=2000.0,
                max_session_duration_minutes=240,
                cooling_off_hours=24
            )
            db.add(compliance)
            await db.commit()
            await db.refresh(compliance)
        
        return compliance
    
    @staticmethod
    async def check_deposit_limits(
        user_id: int,
        deposit_amount: Union[float, Decimal],
        db: AsyncSession
    ) -> Dict[str, Any]:
        """Check if deposit amount violates limits"""
        # Convert deposit_amount to Decimal for consistent calculations
        deposit_amount_decimal = Decimal(str(deposit_amount))
        
        compliance = await ComplianceService.get_user_compliance(user_id, db)
        
        if not compliance:
            return {"allowed": True, "reason": None}
        
        # Check self-exclusion
        if compliance.is_self_excluded:
            if compliance.self_exclusion_until and compliance.self_exclusion_until > datetime.now(timezone.utc).replace(tzinfo=None):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Account is self-excluded until {compliance.self_exclusion_until}"
                )
            elif not compliance.self_exclusion_until:  # Permanent
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Account is permanently self-excluded"
                )
        
        # Calculate daily deposits
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        daily_deposits_query = select(func.sum(func.abs(Transaction.amount))).where(
            and_(
                Transaction.user_id == user_id,
                Transaction.transaction_type == 'deposit',
                Transaction.status == 'completed',
                Transaction.created_at >= today_start
            )
        )
        daily_deposits_result = await db.execute(daily_deposits_query)
        daily_deposits_raw = daily_deposits_result.scalar() or 0.0
        # Convert to Decimal for consistent calculations
        daily_deposits = Decimal(str(daily_deposits_raw))
        
        # Convert limit to Decimal
        daily_limit = Decimal(str(compliance.daily_deposit_limit))
        
        # Check daily limit
        total_deposits = daily_deposits + deposit_amount_decimal
        if total_deposits > daily_limit:
            await ComplianceService.create_alert(
                user_id=user_id,
                alert_type="deposit_limit_exceeded",
                severity="warning",
                message=f"Daily deposit limit exceeded. Limit: ${daily_limit}, Attempted: ${total_deposits:.2f}",
                db=db
            )
            return {
                "allowed": False,
                "reason": f"Exceeds daily deposit limit of ${daily_limit:.2f}",
                "current_usage": float(daily_deposits),
                "limit": float(daily_limit)
            }
        
        return {"allowed": True, "reason": None}
    
    @staticmethod
    async def check_bet_limits(
        user_id: int,
        bet_amount: Union[float, Decimal],
        db: AsyncSession
    ) -> Dict[str, Any]:
        """Check if bet amount violates limits"""
        # Convert bet_amount to Decimal for consistent calculations
        bet_amount_decimal = Decimal(str(bet_amount))
        
        compliance = await ComplianceService.get_user_compliance(user_id, db)
        
        if not compliance:
            return {"allowed": True, "reason": None}
        
        # Convert limits to Decimal
        max_bet_limit = Decimal(str(compliance.max_bet_amount))
        max_daily_bet_limit = Decimal(str(compliance.max_daily_bet_limit))
        
        # Check max bet amount
        if bet_amount_decimal > max_bet_limit:
            await ComplianceService.create_alert(
                user_id=user_id,
                alert_type="bet_limit_exceeded",
                severity="warning",
                message=f"Bet amount exceeds limit. Limit: ${max_bet_limit:.2f}, Attempted: ${bet_amount_decimal:.2f}",
                db=db
            )
            return {
                "allowed": False,
                "reason": f"Exceeds maximum bet limit of ${max_bet_limit:.2f}",
                "limit": float(max_bet_limit)
            }
        
        # Check daily betting limit
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        from app.models.betting_record import BettingRecord
        daily_bets_query = select(func.sum(BettingRecord.bet_amount)).where(
            and_(
                BettingRecord.user_id == user_id,
                BettingRecord.created_at >= today_start
            )
        )
        daily_bets_result = await db.execute(daily_bets_query)
        daily_bets_raw = daily_bets_result.scalar() or 0.0
        # Convert to Decimal for consistent calculations
        daily_bets = Decimal(str(daily_bets_raw))
        
        total_bets = daily_bets + bet_amount_decimal
        if total_bets > max_daily_bet_limit:
            await ComplianceService.create_alert(
                user_id=user_id,
                alert_type="daily_bet_limit_exceeded",
                severity="warning",
                message=f"Daily bet limit exceeded. Limit: ${max_daily_bet_limit:.2f}, Current: ${total_bets:.2f}",
                db=db
            )
            return {
                "allowed": False,
                "reason": f"Exceeds daily bet limit of ${max_daily_bet_limit:.2f}",
                "current_usage": float(daily_bets),
                "limit": float(max_daily_bet_limit)
            }
        
        return {"allowed": True, "reason": None}
    
    @staticmethod
    async def check_regional_access(
        country_code: str,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """Check if access from country is allowed"""
        result = await db.execute(
            select(RegionalRestriction).where(
                RegionalRestriction.country_code == country_code
            )
        )
        restriction = result.scalar_one_or_none()
        
        if restriction and restriction.is_restricted:
            return {
                "allowed": False,
                "reason": f"Gambling is restricted in {restriction.country_name}",
                "country": restriction.country_name,
                "restriction_type": restriction.restriction_type
            }
        
        return {"allowed": True, "reason": None}
    
    @staticmethod
    async def create_alert(
        user_id: int,
        alert_type: str,
        severity: str,
        message: str,
        db: AsyncSession,
        meta_data: Optional[Dict[str, Any]] = None
    ):
        """Create a compliance alert"""
        alert = ComplianceAlert(
            user_id=user_id,
            alert_type=alert_type,
            severity=severity,
            message=message,
            meta_data=meta_data or {},
            acknowledged=False
        )
        db.add(alert)
        await db.commit()
    
    @staticmethod
    async def check_session_timeout(
        user_id: int,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """Check if user session should timeout"""
        compliance = await ComplianceService.get_user_compliance(user_id, db)
        
        if not compliance or not compliance.session_start_time:
            return {"timeout": False, "warnings": []}
        
        session_duration = datetime.now(timezone.utc).replace(tzinfo=None) - compliance.session_start_time
        session_minutes = session_duration.total_seconds() / 60
        max_minutes = compliance.max_session_duration_minutes
        
        warnings = []
        if session_minutes >= max_minutes:
            # Force timeout
            return {
                "timeout": True,
                "reason": f"Session duration limit reached ({max_minutes} minutes)",
                "session_minutes": session_minutes
            }
        elif session_minutes >= max_minutes * 0.8:  # 80% warning
            warnings.append({
                "level": "critical",
                "message": f"Session will timeout in {max_minutes - int(session_minutes)} minutes"
            })
        elif session_minutes >= max_minutes * 0.5:  # 50% warning
            warnings.append({
                "level": "warning",
                "message": f"Session warning: {int(session_minutes)}/{max_minutes} minutes used"
            })
        
        return {"timeout": False, "warnings": warnings}


compliance_service = ComplianceService()

