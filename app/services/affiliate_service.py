"""
Affiliate Service
Handles affiliate registration, referral tracking, and commission calculations
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from decimal import Decimal
import secrets
import string

from app.models.affiliate import Affiliate, Referral, AffiliateCommission, CommissionStatus
from app.models.user import User
from app.models.transaction import Transaction
from app.models.betting_record import BettingRecord


class AffiliateService:
    """Service to handle affiliate operations"""
    
    @staticmethod
    def generate_referral_code(length: int = 8) -> str:
        """Generate a unique referral code"""
        alphabet = string.ascii_uppercase + string.digits
        return ''.join(secrets.choice(alphabet) for _ in range(length))
    
    @staticmethod
    async def create_affiliate(
        user_id: int,
        db: AsyncSession,
        **kwargs
    ) -> Affiliate:
        """Create a new affiliate account"""
        # Check if user already has an affiliate account
        existing = await db.execute(
            select(Affiliate).where(Affiliate.user_id == user_id)
        )
        if existing.scalar_one_or_none():
            raise ValueError("User already has an affiliate account")
        
        # Generate unique referral code
        referral_code = AffiliateService.generate_referral_code()
        max_attempts = 10
        attempts = 0
        while attempts < max_attempts:
            existing_code = await db.execute(
                select(Affiliate).where(Affiliate.referral_code == referral_code)
            )
            if not existing_code.scalar_one_or_none():
                break
            referral_code = AffiliateService.generate_referral_code()
            attempts += 1
        
        if attempts >= max_attempts:
            raise ValueError("Failed to generate unique referral code")
        
        # Prepare affiliate data, ensuring Numeric fields are Decimal
        from decimal import Decimal
        
        # Start with required fields
        affiliate_data = {
            'user_id': user_id,
            'referral_code': referral_code,
        }
        
        # Handle kwargs and convert Numeric fields to Decimal if needed
        for key, value in kwargs.items():
            # Convert Numeric fields to Decimal
            if key in ['commission_rate', 'cpa_amount', 'total_commission_earned', 'total_commission_paid']:
                if value is not None:
                    if isinstance(value, (int, float, str)):
                        affiliate_data[key] = Decimal(str(value))
                    elif isinstance(value, Decimal):
                        affiliate_data[key] = value
                    else:
                        affiliate_data[key] = Decimal(str(value))
                # Don't set if None - let model defaults handle it
            else:
                affiliate_data[key] = value
        
        affiliate = Affiliate(**affiliate_data)
        db.add(affiliate)
        await db.commit()
        await db.refresh(affiliate)
        
        return affiliate
    
    @staticmethod
    async def register_referral(
        affiliate_id: int,
        referred_user_id: int,
        referral_code: str,
        db: AsyncSession,
        source: Optional[str] = None,
        campaign_id: Optional[str] = None
    ) -> Referral:
        """Register a new referral"""
        # Verify affiliate exists
        affiliate = await db.get(Affiliate, affiliate_id)
        if not affiliate:
            raise ValueError("Affiliate not found")
        
        # Check if referral already exists
        existing = await db.execute(
            select(Referral).where(Referral.referred_user_id == referred_user_id)
        )
        if existing.scalar_one_or_none():
            raise ValueError("User already referred")
        
        referral = Referral(
            affiliate_id=affiliate_id,
            referred_user_id=referred_user_id,
            referral_code_used=referral_code,
            source=source,
            campaign_id=campaign_id,
            signup_date=datetime.now(timezone.utc).replace(tzinfo=None)
        )
        
        db.add(referral)
        
        # Update affiliate stats
        affiliate.total_referrals += 1
        
        await db.commit()
        await db.refresh(referral)
        
        return referral
    
    @staticmethod
    async def track_conversion(
        referral_id: int,
        conversion_type: str,
        db: AsyncSession
    ) -> Optional[Referral]:
        """Track a conversion event (first deposit, first bet, etc.)"""
        referral = await db.get(Referral, referral_id)
        if not referral:
            return None
        
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        
        if conversion_type == "first_deposit" and not referral.first_deposit_date:
            referral.first_deposit_date = now
        elif conversion_type == "first_bet" and not referral.first_bet_date:
            referral.first_bet_date = now
        
        if not referral.is_converted and (referral.first_deposit_date or referral.first_bet_date):
            referral.is_converted = True
            referral.conversion_date = now
            referral.affiliate.total_conversions += 1
        
        await db.commit()
        await db.refresh(referral)
        
        return referral
    
    @staticmethod
    async def calculate_commission(
        affiliate_id: int,
        transaction_id: int,
        transaction_type: str,
        base_amount: Decimal,
        db: AsyncSession
    ) -> AffiliateCommission:
        """Calculate and create commission for an affiliate"""
        affiliate = await db.get(Affiliate, affiliate_id)
        if not affiliate:
            raise ValueError("Affiliate not found")
        
        # Find referral for this transaction's user
        transaction = await db.get(Transaction, transaction_id)
        if not transaction:
            raise ValueError("Transaction not found")
        
        referral = await db.execute(
            select(Referral).where(
                and_(
                    Referral.affiliate_id == affiliate_id,
                    Referral.referred_user_id == transaction.user_id
                )
            )
        )
        referral = referral.scalar_one_or_none()
        
        # Calculate commission based on type
        if affiliate.commission_type == "revenue_share":
            commission_amount = (base_amount * affiliate.commission_rate / 100)
        elif affiliate.commission_type == "cpa" and affiliate.cpa_amount:
            commission_amount = affiliate.cpa_amount
        else:
            commission_amount = Decimal("0")
        
        commission = AffiliateCommission(
            affiliate_id=affiliate_id,
            referral_id=referral.id if referral else None,
            transaction_id=transaction_id,
            transaction_type=transaction_type,
            base_amount=base_amount,
            commission_rate=affiliate.commission_rate,
            commission_amount=commission_amount,
            status=CommissionStatus.PENDING.value
        )
        
        db.add(commission)
        
        # Update affiliate total commission earned
        affiliate.total_commission_earned += commission_amount
        
        await db.commit()
        await db.refresh(commission)
        
        return commission
    
    @staticmethod
    async def update_referral_revenue(
        referral_id: int,
        db: AsyncSession
    ):
        """Update referral revenue stats from transactions and bets"""
        referral = await db.get(Referral, referral_id)
        if not referral:
            return
        
        # Calculate total deposits
        deposits_query = select(func.sum(func.abs(Transaction.amount))).where(
            and_(
                Transaction.user_id == referral.referred_user_id,
                Transaction.transaction_type == 'deposit',
                Transaction.status == 'completed'
            )
        )
        deposits_result = await db.execute(deposits_query)
        total_deposits = deposits_result.scalar() or Decimal("0")
        
        # Calculate total bet volume
        bets_query = select(func.sum(BettingRecord.bet_amount)).where(
            BettingRecord.user_id == referral.referred_user_id
        )
        bets_result = await db.execute(bets_query)
        total_bets = bets_result.scalar() or Decimal("0")
        
        # Calculate revenue (platform profit from lost bets)
        revenue_query = select(func.sum(func.abs(BettingRecord.actual_profit))).where(
            and_(
                BettingRecord.user_id == referral.referred_user_id,
                BettingRecord.is_settled == True,
                BettingRecord.actual_profit < 0
            )
        )
        revenue_result = await db.execute(revenue_query)
        total_revenue = revenue_result.scalar() or Decimal("0")
        
        referral.total_deposits = total_deposits
        referral.total_bets = total_bets
        referral.total_revenue_generated = total_revenue
        
        await db.commit()
        
    @staticmethod
    async def get_affiliate_dashboard(
        affiliate_id: int,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """Get affiliate dashboard data"""
        try:
            affiliate = await db.get(Affiliate, affiliate_id)
            if not affiliate:
                raise ValueError("Affiliate not found")
            
            # Initialize defaults
            recent_referrals = []
            recent_commissions = []
            total_referrals = 0
            converted_referrals = 0
            pending_commissions = Decimal("0")
            approved_commissions = Decimal("0")
            total_revenue = Decimal("0")
            
            try:
                # Get referrals
                referrals_query = select(Referral).where(
                    Referral.affiliate_id == affiliate_id
                ).order_by(desc(Referral.created_at)).limit(10)
                referrals_result = await db.execute(referrals_query)
                recent_referrals = referrals_result.scalars().all()
            except Exception as e:
                print(f"Error fetching referrals: {e}")
                # Continue with empty list
            
            try:
                # Get commissions
                commissions_query = select(AffiliateCommission).where(
                    AffiliateCommission.affiliate_id == affiliate_id
                ).order_by(desc(AffiliateCommission.created_at)).limit(10)
                commissions_result = await db.execute(commissions_query)
                recent_commissions = commissions_result.scalars().all()
            except Exception as e:
                print(f"Error fetching commissions: {e}")
                # Continue with empty list
            
            try:
                # Calculate stats - more efficient queries
                total_referrals_query = select(func.count(Referral.id)).where(
                    Referral.affiliate_id == affiliate_id
                )
                total_referrals_result = await db.execute(total_referrals_query)
                total_referrals = total_referrals_result.scalar() or 0
            except Exception as e:
                print(f"Error counting referrals: {e}")
                # Use default 0
            
            try:
                converted_referrals_query = select(func.count(Referral.id)).where(
                    and_(Referral.affiliate_id == affiliate_id, Referral.is_converted == True)
                )
                converted_referrals_result = await db.execute(converted_referrals_query)
                converted_referrals = converted_referrals_result.scalar() or 0
            except Exception as e:
                print(f"Error counting converted referrals: {e}")
                # Use default 0
            
            try:
                # Pending commissions
                pending_commissions_query = select(func.sum(AffiliateCommission.commission_amount)).where(
                    and_(
                        AffiliateCommission.affiliate_id == affiliate_id,
                        AffiliateCommission.status == CommissionStatus.PENDING.value
                    )
                )
                pending_result = await db.execute(pending_commissions_query)
                pending_commissions = pending_result.scalar() or Decimal("0")
            except Exception as e:
                print(f"Error calculating pending commissions: {e}")
                # Use default Decimal("0")
            
            try:
                # Approved commissions
                approved_commissions_query = select(func.sum(AffiliateCommission.commission_amount)).where(
                    and_(
                        AffiliateCommission.affiliate_id == affiliate_id,
                        AffiliateCommission.status == CommissionStatus.APPROVED.value
                    )
                )
                approved_result = await db.execute(approved_commissions_query)
                approved_commissions = approved_result.scalar() or Decimal("0")
            except Exception as e:
                print(f"Error calculating approved commissions: {e}")
                # Use default Decimal("0")
            
            try:
                # Calculate total revenue from all referrals
                total_revenue_query = select(func.sum(Referral.total_revenue_generated)).where(
                    Referral.affiliate_id == affiliate_id
                )
                revenue_result = await db.execute(total_revenue_query)
                total_revenue = revenue_result.scalar() or Decimal("0")
            except Exception as e:
                print(f"Error calculating total revenue: {e}")
                # Use default Decimal("0")
            
            conversion_rate = (converted_referrals / total_referrals * 100) if total_referrals > 0 else 0
            avg_revenue_per_referral = (total_revenue / total_referrals) if total_referrals > 0 else Decimal("0")
            
            return {
                "total_referrals": total_referrals,
                "active_referrals": total_referrals,
                "converted_referrals": converted_referrals,
                "pending_commissions": pending_commissions,
                "approved_commissions": approved_commissions,
                "paid_commissions": affiliate.total_commission_paid or Decimal("0"),
                "total_revenue_generated": total_revenue,
                "conversion_rate": float(conversion_rate),
                "average_revenue_per_referral": avg_revenue_per_referral,
                "recent_referrals": recent_referrals,
                "recent_commissions": recent_commissions
            }
        except ValueError:
            raise
        except Exception as e:
            import traceback
            traceback.print_exc()
            raise Exception(f"Failed to get affiliate dashboard: {str(e)}")


affiliate_service = AffiliateService()

