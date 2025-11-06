from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, and_, or_
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime, timedelta
import json

from app.core.database import get_db
from app.core.admin_deps import get_admin_user
from app.core.deps import get_current_user
from app.models.user import User
from app.services.geo_location import geo_location_service
from app.services.compliance_service import compliance_service
from app.models.analytics import (
    ClickEvent,
    PageView,
    ConversionEvent,
    RegionalRestriction,
    UserCompliance,
    ComplianceAlert
)
from app.models.betting_record import BettingRecord
from app.models.transaction import Transaction
from app.schemas.analytics import (
    ClickEventCreate,
    ClickEventResponse,
    PageViewCreate,
    PageViewResponse,
    ConversionEventCreate,
    ConversionEventResponse,
    RegionalRestrictionCreate,
    RegionalRestrictionUpdate,
    RegionalRestrictionResponse,
    UserComplianceUpdate,
    UserComplianceResponse,
    ComplianceAlertResponse,
    CTRMetrics,
    ConversionMetrics,
    RevenueMetrics,
    RegionalAnalytics,
    ComplianceDashboard,
    MatchCTR,
    ROIMetrics,
    HeatmapData
)

router = APIRouter(prefix="/analytics", tags=["analytics"])


# ========== CTR TRACKING ENDPOINTS ==========

@router.post("/clicks", response_model=ClickEventResponse, status_code=status.HTTP_201_CREATED)
async def track_click(
    click_data: ClickEventCreate,
    user_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    """Track a click event for analytics"""
    
    click_event = ClickEvent(
        user_id=user_id,
        element_type=click_data.element_type,
        element_id=click_data.element_id,
        page_path=click_data.page_path,
        session_id=click_data.session_id,
        ip_address=click_data.ip_address,
        user_agent=click_data.user_agent,
        meta_data=click_data.meta_data
    )
    
    db.add(click_event)
    await db.commit()
    await db.refresh(click_event)
    
    return click_event


@router.post("/pageviews", response_model=PageViewResponse, status_code=status.HTTP_201_CREATED)
async def track_page_view(
    page_view_data: PageViewCreate,
    user_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    """Track a page view for analytics"""
    
    page_view = PageView(
        user_id=user_id,
        page_path=page_view_data.page_path,
        page_title=page_view_data.page_title,
        referrer=page_view_data.referrer,
        duration_seconds=page_view_data.duration_seconds,
        session_id=page_view_data.session_id,
        ip_address=page_view_data.ip_address,
        user_agent=page_view_data.user_agent,
        meta_data=page_view_data.meta_data
    )
    
    db.add(page_view)
    await db.commit()
    await db.refresh(page_view)
    
    return page_view


@router.get("/clicks", response_model=List[ClickEventResponse])
async def get_click_events(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    element_type: Optional[str] = None,
    user_id: Optional[int] = None,
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Get click events with filters"""
    
    offset = (page - 1) * size
    start_date = datetime.now() - timedelta(days=days)
    
    query = select(ClickEvent).where(ClickEvent.created_at >= start_date)
    
    if element_type:
        query = query.where(ClickEvent.element_type == element_type)
    if user_id:
        query = query.where(ClickEvent.user_id == user_id)
    
    query = query.order_by(desc(ClickEvent.created_at)).offset(offset).limit(size)
    
    result = await db.execute(query)
    clicks = result.scalars().all()
    
    return clicks


@router.get("/ctr-by-matches", response_model=List[MatchCTR])
async def get_ctr_by_matches(
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Get Click-Through Rate metrics grouped by matches"""
    
    print(f"[MATCH CTR API] Called with days={days}, user={current_user.username}")
    start_date = datetime.now() - timedelta(days=days)
    
    # Get all click events with match data
    clicks_query = select(ClickEvent).where(
        ClickEvent.created_at >= start_date,
        ClickEvent.meta_data.isnot(None)
    )
    
    clicks_result = await db.execute(clicks_query)
    clicks = clicks_result.scalars().all()
    
    print(f"[MATCH CTR API] Found {len(clicks)} click events with meta_data")
    
    # Group by match teams from meta_data
    match_stats = {}
    for click in clicks:
        meta_data = click.meta_data or {}
        match_teams = meta_data.get('match_teams', 'Unknown Match')
        match_league = meta_data.get('match_league', 'Unknown League')
        
        if match_teams not in match_stats:
            match_stats[match_teams] = {
                'match_name': match_teams,
                'league': match_league,
                'total_clicks': 0,
                'unique_users': set(),
                'selected_outcomes': {},
                'avg_odds': []
            }
        
        match_stats[match_teams]['total_clicks'] += 1
        if click.user_id:
            match_stats[match_teams]['unique_users'].add(click.user_id)
        
        # Track selected outcomes
        outcome = meta_data.get('selected_outcome', 'unknown')
        if outcome not in match_stats[match_teams]['selected_outcomes']:
            match_stats[match_teams]['selected_outcomes'][outcome] = 0
        match_stats[match_teams]['selected_outcomes'][outcome] += 1
        
        # Track odds
        odds_value = meta_data.get('odds_value')
        if odds_value:
            try:
                match_stats[match_teams]['avg_odds'].append(float(odds_value))
            except ValueError:
                pass
    
    # Format results
    results = []
    for match_name, stats in match_stats.items():
        unique_users = len(stats['unique_users'])
        avg_odds = sum(stats['avg_odds']) / len(stats['avg_odds']) if stats['avg_odds'] else 0
        top_outcome = max(stats['selected_outcomes'].items(), key=lambda x: x[1])[0] if stats['selected_outcomes'] else 'N/A'
        
        results.append({
            'match_name': match_name,
            'league': stats['league'],
            'total_clicks': stats['total_clicks'],
            'unique_users': unique_users,
            'avg_odds': round(avg_odds, 2),
            'top_outcome': top_outcome,
            'outcome_distribution': stats['selected_outcomes']
        })
    
    # Sort by total clicks descending
    results.sort(key=lambda x: x['total_clicks'], reverse=True)
    
    print(f"[MATCH CTR API] Returning {len(results)} matches")
    print(f"[MATCH CTR API] Full data structure:")
    for i, match in enumerate(results[:3]):
        print(f"  Match {i+1}: {json.dumps(match, indent=2)}")
    
    return results


@router.get("/ctr-metrics", response_model=List[CTRMetrics])
async def get_ctr_metrics(
    days: int = Query(30, ge=1, le=365),
    element_type: Optional[str] = None,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Get Click-Through Rate metrics"""
    
    print(f"[CTR API] Called with days={days}, element_type={element_type}, user={current_user.username}")
    start_date = datetime.now() - timedelta(days=days)
    
    # Base query for clicks
    clicks_query = select(
        ClickEvent.element_type,
        func.count(ClickEvent.id).label('total_clicks'),
        func.count(func.distinct(ClickEvent.user_id)).label('unique_users')
    ).where(
        ClickEvent.created_at >= start_date
    ).group_by(ClickEvent.element_type)
    
    if element_type:
        clicks_query = clicks_query.where(ClickEvent.element_type == element_type)
    
    clicks_result = await db.execute(clicks_query)
    clicks_data = clicks_result.all()
    
    print(f"[CTR API] Found {len(clicks_data)} different element types with clicks")
    
    # Get page views grouped by page_path for CTR calculation
    # We'll match clicks to views on the same pages where clicks occurred
    page_views_query = select(
        PageView.page_path,
        func.count(PageView.id).label('total_views')
    ).where(
        PageView.created_at >= start_date
    ).group_by(PageView.page_path)
    
    views_result = await db.execute(page_views_query)
    views_data = views_result.all()
    page_views_dict = {v.page_path: v.total_views for v in views_data}
    
    # Get clicks grouped by element_type and page_path to match with views
    clicks_by_page_query = select(
        ClickEvent.element_type,
        ClickEvent.page_path,
        func.count(ClickEvent.id).label('clicks_on_page')
    ).where(
        ClickEvent.created_at >= start_date
    ).group_by(ClickEvent.element_type, ClickEvent.page_path)
    
    if element_type:
        clicks_by_page_query = clicks_by_page_query.where(ClickEvent.element_type == element_type)
    
    clicks_by_page_result = await db.execute(clicks_by_page_query)
    clicks_by_page_data = clicks_by_page_result.all()
    
    # Calculate CTR metrics - match clicks to views on same pages
    element_views = {}  # Track views per element type
    for click_page_stat in clicks_by_page_data:
        element = click_page_stat.element_type
        page_path = click_page_stat.page_path
        views_on_page = page_views_dict.get(page_path, 0)
        
        if element not in element_views:
            element_views[element] = 0
        element_views[element] += views_on_page
    
    print(f"[CTR API] Found page views for {len(page_views_dict)} different pages")
    
    # Calculate CTR metrics
    metrics = []
    for click_stat in clicks_data:
        element = click_stat.element_type
        total_clicks = click_stat.total_clicks
        total_views = element_views.get(element, 0)
        
        # If no views found for this element type, use total page views as fallback
        # This handles cases where element clicks are on pages without tracked views
        if total_views == 0:
            total_page_views = sum(page_views_dict.values())
            total_views = total_page_views if total_page_views > 0 else 1
            print(f"[CTR API] Warning: No views found for element '{element}', using total page views as fallback")
        
        ctr_percentage = (total_clicks / total_views * 100) if total_views > 0 else 0
        
        metrics.append(CTRMetrics(
            element_type=element,
            total_clicks=total_clicks,
            total_views=total_views,
            ctr_percentage=round(ctr_percentage, 2),
            unique_users=click_stat.unique_users,
            period_days=days
        ))
        
        print(f"[CTR API] Added metric: {element} - {total_clicks} clicks, {total_views} views, CTR: {ctr_percentage:.2f}%")
    
    print(f"[CTR API] Returning {len(metrics)} CTR metrics")
    return metrics


# ========== CONVERSION TRACKING ENDPOINTS ==========

@router.post("/conversions", response_model=ConversionEventResponse, status_code=status.HTTP_201_CREATED)
async def track_conversion(
    conversion_data: ConversionEventCreate,
    user_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    """Track a conversion event"""
    
    conversion_event = ConversionEvent(
        user_id=user_id,
        event_type=conversion_data.event_type,
        element_id=conversion_data.element_id,
        page_path=conversion_data.page_path,
        value=conversion_data.value,
        session_id=conversion_data.session_id,
        meta_data=conversion_data.meta_data
    )
    
    db.add(conversion_event)
    await db.commit()
    await db.refresh(conversion_event)
    
    return conversion_event


@router.get("/conversion-metrics", response_model=List[ConversionMetrics])
async def get_conversion_metrics(
    days: int = Query(30, ge=1, le=365),
    event_type: Optional[str] = None,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Get conversion funnel metrics"""
    
    start_date = datetime.now() - timedelta(days=days)
    
    query = select(
        ConversionEvent.event_type,
        func.count(ConversionEvent.id).label('total_conversions'),
        func.sum(ConversionEvent.value).label('total_value')
    ).where(
        ConversionEvent.created_at >= start_date
    ).group_by(ConversionEvent.event_type)
    
    if event_type:
        query = query.where(ConversionEvent.event_type == event_type)
    
    result = await db.execute(query)
    data = result.all()
    
    # Calculate conversion rates
    # Note: This is simplified - in production, you'd join with page views
    metrics = []
    for stat in data:
        metrics.append(ConversionMetrics(
            event_type=stat.event_type,
            total_conversions=stat.total_conversions or 0,
            total_views=stat.total_conversions,  # Simplified
            conversion_rate=100.0,  # Simplified
            total_value=float(stat.total_value or 0),
            period_days=days
        ))
    
    return metrics


# ========== REVENUE TRACKING ENDPOINTS ==========

@router.get("/revenue", response_model=RevenueMetrics)
async def get_revenue_metrics(
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Get comprehensive revenue metrics"""
    
    start_date = datetime.now() - timedelta(days=days)
    
    # Get total deposits (deposits are stored as positive amounts)
    deposits_query = select(func.sum(Transaction.amount)).where(
        and_(
            Transaction.created_at >= start_date,
            Transaction.transaction_type == 'deposit',
            Transaction.status == 'completed',
            Transaction.amount > 0  # Ensure positive (deposits should be positive)
        )
    )
    deposits_result = await db.execute(deposits_query)
    total_deposits = float(deposits_result.scalar() or 0)
    
    # Get total withdrawals (withdrawals are stored as negative amounts, so we take absolute value)
    withdrawals_query = select(func.sum(func.abs(Transaction.amount))).where(
        and_(
            Transaction.created_at >= start_date,
            Transaction.transaction_type == 'withdrawal',
            Transaction.status == 'completed',
            Transaction.amount < 0  # Ensure negative (withdrawals should be negative)
        )
    )
    withdrawals_result = await db.execute(withdrawals_query)
    total_withdrawals = float(withdrawals_result.scalar() or 0)
    
    # Get total bet volume
    bets_query = select(func.sum(BettingRecord.bet_amount)).where(
        BettingRecord.created_at >= start_date
    )
    bets_result = await db.execute(bets_query)
    total_bet_volume = float(bets_result.scalar() or 0)
    
    # Get settled losses (revenue)
    settled_query = select(func.sum(func.abs(BettingRecord.actual_profit))).where(
        and_(
            BettingRecord.created_at >= start_date,
            BettingRecord.is_settled == True,
            BettingRecord.actual_profit < 0
        )
    )
    settled_result = await db.execute(settled_query)
    platform_profit = float(settled_result.scalar() or 0)
    
    total_revenue = platform_profit
    margin_percentage = (platform_profit / total_deposits * 100) if total_deposits > 0 else 0
    daily_average = total_revenue / days if days > 0 else 0
    
    return RevenueMetrics(
        total_revenue=total_revenue,
        total_deposits=total_deposits,
        total_withdrawals=total_withdrawals,
        total_bet_volume=total_bet_volume,
        platform_profit=platform_profit,
        margin_percentage=round(margin_percentage, 2),
        period_days=days,
        daily_average=round(daily_average, 2)
    )


# ========== ROI TRACKING ENDPOINTS ==========

@router.get("/roi-dashboard", response_model=ROIMetrics)
async def get_roi_dashboard(
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Get comprehensive ROI metrics"""
    
    try:
        start_date = datetime.now() - timedelta(days=days)
        
        # Get total revenue (from revenue endpoint logic)
        revenue_metrics = await get_revenue_metrics(days=days, current_user=current_user, db=db)
        total_revenue = revenue_metrics.total_revenue
        
        # Calculate total cost (marketing spend, affiliate commissions, etc.)
        # For now, we'll use affiliate commissions as cost
        from app.models.affiliate import AffiliateCommission
        cost_query = select(func.sum(AffiliateCommission.commission_amount)).where(
            and_(
                AffiliateCommission.created_at >= start_date,
                AffiliateCommission.status.in_(["approved", "paid"])
            )
        )
        cost_result = await db.execute(cost_query)
        total_cost = float(cost_result.scalar() or 0)
        
        # Add other costs (for now, simplified - in production you'd track marketing costs)
        # Could add: ad spend, promotional costs, etc.
        
        net_profit = total_revenue - total_cost
        roi_percentage = (net_profit / total_cost * 100) if total_cost > 0 else 0
        
        # ROI by source (from conversion events and page views)
        roi_by_source = {}
        try:
            # Get all conversion events and process manually to avoid JSON query issues
            conversions_query = select(ConversionEvent).where(
                ConversionEvent.created_at >= start_date
            )
            conversions_result = await db.execute(conversions_query)
            conversions = conversions_result.scalars().all()
            
            # Group by source manually
            source_revenue = {}
            for conv in conversions:
                meta = conv.meta_data or {}
                source = meta.get('source', 'direct')
                if source not in source_revenue:
                    source_revenue[source] = 0.0
                source_revenue[source] += float(conv.value or 0)
            
            # Calculate ROI for each source
            for source, revenue in source_revenue.items():
                cost = 0  # Simplified - in production, track cost per source
                # Since cost tracking isn't implemented, show revenue instead of ROI
                # ROI would be infinite/undefined when cost is 0, so we'll use revenue as a proxy
                # In production, you'd track actual marketing costs per source
                if cost > 0:
                    roi = ((revenue - cost) / cost * 100)
                    roi_by_source[source] = round(roi, 2)
                else:
                    # When cost is 0, we can't calculate ROI, so skip or use revenue as metric
                    # For now, skip sources without cost tracking
                    pass
        except Exception as e:
            print(f"Error calculating ROI by source: {e}")
            import traceback
            traceback.print_exc()
            # Return empty dict if there's an error
            roi_by_source = {}
        
        # ROI by campaign (from referrals)
        roi_by_campaign = {}
        try:
            from app.models.affiliate import Referral
            campaign_query = select(
                Referral.campaign_id,
                func.sum(Referral.total_revenue_generated).label('revenue'),
                func.count(Referral.id).label('referrals')
            ).where(
                Referral.created_at >= start_date
            ).group_by(Referral.campaign_id)
            
            campaign_result = await db.execute(campaign_query)
            for row in campaign_result:
                campaign = row.campaign_id or "default"
                revenue = float(row.revenue or 0)
                cost = float(row.referrals or 0) * 10  # Simplified CPA
                roi = ((revenue - cost) / cost * 100) if cost > 0 else 0
                roi_by_campaign[campaign] = round(roi, 2)
        except Exception as e:
            print(f"Error calculating ROI by campaign: {e}")
            pass
        
        # Daily ROI trend (simplified - calculate daily for last N days)
        daily_roi_trend = []
        for i in range(days):
            day_date = start_date + timedelta(days=i)
            day_end = day_date + timedelta(days=1)
            
            day_revenue_query = select(func.sum(func.abs(BettingRecord.actual_profit))).where(
                and_(
                    BettingRecord.created_at >= day_date,
                    BettingRecord.created_at < day_end,
                    BettingRecord.is_settled == True,
                    BettingRecord.actual_profit < 0
                )
            )
            day_revenue_result = await db.execute(day_revenue_query)
            day_revenue = float(day_revenue_result.scalar() or 0)
            
            day_cost_query = select(func.sum(AffiliateCommission.commission_amount)).where(
                and_(
                    AffiliateCommission.created_at >= day_date,
                    AffiliateCommission.created_at < day_end,
                    AffiliateCommission.status.in_(["approved", "paid"])
                )
            )
            day_cost_result = await db.execute(day_cost_query)
            day_cost = float(day_cost_result.scalar() or 0)
            
            day_roi = ((day_revenue - day_cost) / day_cost * 100) if day_cost > 0 else 0
            
            daily_roi_trend.append({
                "date": day_date.isoformat(),
                "revenue": day_revenue,
                "cost": day_cost,
                "roi": round(day_roi, 2)
            })
    
        return ROIMetrics(
            total_revenue=total_revenue,
            total_cost=total_cost,
            net_profit=net_profit,
            roi_percentage=round(roi_percentage, 2),
            period_days=days,
            roi_by_source=roi_by_source,
            roi_by_campaign=roi_by_campaign,
            daily_roi_trend=daily_roi_trend
        )
    except Exception as e:
        print(f"Error in get_roi_dashboard: {e}")
        import traceback
        traceback.print_exc()
        # Return empty/default ROI metrics on error
        return ROIMetrics(
            total_revenue=0.0,
            total_cost=0.0,
            net_profit=0.0,
            roi_percentage=0.0,
            period_days=days,
            roi_by_source={},
            roi_by_campaign={},
            daily_roi_trend=[]
        )


# ========== REGIONAL RESTRICTIONS ENDPOINTS ==========

@router.get("/regions", response_model=List[RegionalRestrictionResponse])
async def get_regional_restrictions(
    is_restricted: Optional[bool] = None,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all regional restrictions"""
    
    query = select(RegionalRestriction)
    
    if is_restricted is not None:
        query = query.where(RegionalRestriction.is_restricted == is_restricted)
    
    query = query.order_by(RegionalRestriction.country_name)
    
    result = await db.execute(query)
    restrictions = result.scalars().all()
    
    return restrictions


@router.post("/regions", response_model=RegionalRestrictionResponse, status_code=status.HTTP_201_CREATED)
async def create_regional_restriction(
    restriction_data: RegionalRestrictionCreate,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new regional restriction"""
    
    restriction = RegionalRestriction(**restriction_data.model_dump())
    
    db.add(restriction)
    await db.commit()
    await db.refresh(restriction)
    
    return restriction


@router.put("/regions/{restriction_id}", response_model=RegionalRestrictionResponse)
async def update_regional_restriction(
    restriction_id: int,
    restriction_data: RegionalRestrictionUpdate,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a regional restriction"""
    
    query = select(RegionalRestriction).where(RegionalRestriction.id == restriction_id)
    result = await db.execute(query)
    restriction = result.scalar_one_or_none()
    
    if not restriction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Regional restriction not found"
        )
    
    # Update fields
    for field, value in restriction_data.model_dump(exclude_unset=True).items():
        setattr(restriction, field, value)
    
    restriction.updated_at = datetime.now()
    
    await db.commit()
    await db.refresh(restriction)
    
    return restriction


@router.get("/regions/analytics", response_model=List[RegionalAnalytics])
async def get_regional_analytics(
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Get analytics by region"""
    
    # This would aggregate data by user location
    # For now, return basic structure
    regions_query = select(RegionalRestriction)
    regions_result = await db.execute(regions_query)
    regions = regions_result.scalars().all()
    
    analytics = []
    for region in regions:
        # Simplified - in production, aggregate actual data by country
        analytics.append(RegionalAnalytics(
            country_code=region.country_code,
            country_name=region.country_name,
            total_users=0,  # Would calculate from users table
            total_revenue=0.0,
            total_deposits=0.0,
            average_deposit=0.0,
            compliance_flags=0,
            is_restricted=region.is_restricted
        ))
    
    return analytics


# ========== COMPLIANCE ENDPOINTS ==========

@router.get("/compliance/dashboard", response_model=ComplianceDashboard)
async def get_compliance_dashboard(
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Get compliance dashboard data"""
    
    # Total users
    users_query = select(func.count(User.id))
    users_result = await db.execute(users_query)
    total_users = users_result.scalar() or 0
    
    # Users with compliance limits
    compliance_query = select(func.count(UserCompliance.id))
    compliance_result = await db.execute(compliance_query)
    users_with_limits = compliance_result.scalar() or 0
    
    # Self-excluded users
    excluded_query = select(func.count(UserCompliance.id)).where(
        UserCompliance.is_self_excluded == True
    )
    excluded_result = await db.execute(excluded_query)
    self_excluded_users = excluded_result.scalar() or 0
    
    # Recent alerts
    alerts_query = select(ComplianceAlert).where(
        ComplianceAlert.acknowledged == False
    ).order_by(desc(ComplianceAlert.created_at)).limit(10)
    alerts_result = await db.execute(alerts_query)
    recent_alerts = alerts_result.scalars().all()
    
    # Alert responses (simplified)
    alerts_response = [
        ComplianceAlertResponse.model_validate(alert)
        for alert in recent_alerts
    ]
    
    return ComplianceDashboard(
        total_users=total_users,
        users_with_limits=users_with_limits,
        active_session_timeouts=0,  # Would calculate from sessions
        cooling_off_active=0,  # Would calculate from cooling_off
        self_excluded_users=self_excluded_users,
        recent_alerts=alerts_response,
        at_risk_users=0  # Would calculate from compliance flags
    )


@router.get("/compliance/users/{user_id}", response_model=UserComplianceResponse)
async def get_user_compliance(
    user_id: int,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user compliance settings"""
    
    query = select(UserCompliance).where(UserCompliance.user_id == user_id)
    result = await db.execute(query)
    compliance = result.scalar_one_or_none()
    
    if not compliance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User compliance record not found"
        )
    
    return compliance


@router.put("/compliance/users/{user_id}", response_model=UserComplianceResponse)
async def update_user_compliance(
    user_id: int,
    compliance_data: UserComplianceUpdate,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Update user compliance settings"""
    
    query = select(UserCompliance).where(UserCompliance.user_id == user_id)
    result = await db.execute(query)
    compliance = result.scalar_one_or_none()
    
    if not compliance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User compliance record not found"
        )
    
    # Update fields
    for field, value in compliance_data.model_dump(exclude_unset=True).items():
        setattr(compliance, field, value)
    
    compliance.updated_at = datetime.now()
    
    await db.commit()
    await db.refresh(compliance)
    
    return compliance


@router.post("/compliance/users/{user_id}/self-exclude")
async def self_exclude_user(
    user_id: int,
    duration_days: int,
    reason: str,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Self-exclude a user for a specified period"""
    
    query = select(UserCompliance).where(UserCompliance.user_id == user_id)
    result = await db.execute(query)
    compliance = result.scalar_one_or_none()
    
    if not compliance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User compliance record not found"
        )
    
    compliance.is_self_excluded = True
    compliance.self_exclusion_until = datetime.now() + timedelta(days=duration_days)
    compliance.self_exclusion_reason = reason
    compliance.updated_at = datetime.now()
    
    # Create alert
    alert = ComplianceAlert(
        user_id=user_id,
        alert_type="self_exclusion",
        severity="critical",
        message=f"User self-excluded until {compliance.self_exclusion_until}",
        meta_data={"duration_days": duration_days, "reason": reason}
    )
    
    db.add(alert)
    await db.commit()
    
    return {"message": "User self-excluded successfully", "until": compliance.self_exclusion_until}


# ========== REGIONAL RESTRICTIONS ENDPOINTS ==========

@router.post("/regions", response_model=RegionalRestrictionResponse)
async def create_regional_restriction(
    restriction_data: RegionalRestrictionCreate,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new regional restriction"""
    
    # Check if already exists
    result = await db.execute(
        select(RegionalRestriction).where(
            RegionalRestriction.country_code == restriction_data.country_code
        )
    )
    existing = result.scalar_one_or_none()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Regional restriction for {restriction_data.country_code} already exists. Use the Edit button to update it."
        )
    
    try:
        restriction = RegionalRestriction(**restriction_data.model_dump())
        db.add(restriction)
        await db.commit()
        await db.refresh(restriction)
        
        return restriction
    except Exception as e:
        await db.rollback()
        print(f"Error creating regional restriction: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create regional restriction: {str(e)}"
        )


@router.put("/regions/{restriction_id}", response_model=RegionalRestrictionResponse)
async def update_regional_restriction(
    restriction_id: int,
    restriction_data: RegionalRestrictionUpdate,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a regional restriction"""
    
    restriction = await db.get(RegionalRestriction, restriction_id)
    if not restriction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restriction not found"
        )
    
    for field, value in restriction_data.model_dump(exclude_unset=True).items():
        setattr(restriction, field, value)
    
    restriction.updated_at = datetime.now()
    await db.commit()
    await db.refresh(restriction)
    
    return restriction


@router.delete("/regions/{restriction_id}")
async def delete_regional_restriction(
    restriction_id: int,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a regional restriction"""
    
    restriction = await db.get(RegionalRestriction, restriction_id)
    if not restriction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restriction not found"
        )
    
    await db.delete(restriction)
    await db.commit()
    
    return {"message": "Restriction deleted successfully"}


# ========== USER COMPLIANCE ENDPOINTS ==========

@router.get("/compliance/my-compliance")
async def get_my_compliance(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current user's compliance settings"""
    from app.services.compliance_service import compliance_service
    
    compliance = await compliance_service.get_user_compliance(current_user.id, db)
    
    if not compliance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Compliance record not found"
        )
    
    return {
        "daily_deposit_limit": compliance.daily_deposit_limit,
        "weekly_deposit_limit": compliance.weekly_deposit_limit,
        "monthly_deposit_limit": compliance.monthly_deposit_limit,
        "max_bet_amount": compliance.max_bet_amount,
        "max_daily_bet_limit": compliance.max_daily_bet_limit,
        "is_self_excluded": compliance.is_self_excluded,
        "self_exclusion_until": compliance.self_exclusion_until
    }


@router.post("/compliance/self-exclude")
async def self_exclude(
    duration_days: int,
    reason: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """User self-exclusion"""
    from app.services.compliance_service import compliance_service
    
    compliance = await compliance_service.get_user_compliance(current_user.id, db)
    
    if compliance.is_self_excluded:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is already self-excluded"
        )
    
    # Set exclusion
    compliance.is_self_excluded = True
    compliance.self_exclusion_until = datetime.utcnow() + timedelta(days=duration_days)
    compliance.self_exclusion_reason = reason
    compliance.updated_at = datetime.utcnow()
    
    # Create alert
    await compliance_service.create_alert(
        user_id=current_user.id,
        alert_type="self_exclusion",
        severity="critical",
        message=f"User self-excluded for {duration_days} days",
        db=db,
        meta_data={"duration_days": duration_days, "reason": reason}
    )
    
    await db.commit()
    await db.refresh(compliance)
    
    return {
        "message": "Account self-excluded successfully",
        "until": compliance.self_exclusion_until,
        "duration_days": duration_days
    }


@router.post("/compliance/self-exclude/cancel")
async def cancel_self_exclusion(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Cancel self-exclusion (only if temporary)"""
    from app.services.compliance_service import compliance_service
    
    compliance = await compliance_service.get_user_compliance(current_user.id, db)
    
    if not compliance.is_self_excluded:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is not self-excluded"
        )
    
    if not compliance.self_exclusion_until:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Permanent self-exclusion cannot be cancelled. Contact support."
        )
    
    # Cancel exclusion
    compliance.is_self_excluded = False
    compliance.self_exclusion_until = None
    compliance.self_exclusion_reason = None
    compliance.updated_at = datetime.utcnow()
    
    await compliance_service.create_alert(
        user_id=current_user.id,
        alert_type="self_exclusion_cancelled",
        severity="info",
        message="User cancelled self-exclusion",
        db=db
    )
    
    await db.commit()
    
    return {"message": "Self-exclusion cancelled successfully"}


# ========== HEATMAP ENDPOINTS ==========

@router.get("/heatmap", response_model=HeatmapData)
async def get_heatmap_data(
    page_path: str = Query(..., description="Page path to analyze"),
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Get heatmap data for a specific page"""
    
    start_date = datetime.now() - timedelta(days=days)
    
    # Get click events for this page
    clicks_query = select(ClickEvent).where(
        and_(
            ClickEvent.page_path == page_path,
            ClickEvent.created_at >= start_date
        )
    )
    clicks_result = await db.execute(clicks_query)
    clicks = clicks_result.scalars().all()
    
    # Aggregate clicks by approximate position (using meta_data or element_id)
    coordinate_map = {}
    element_stats = {}
    
    for click in clicks:
        # Extract position from meta_data if available
        meta = click.meta_data or {}
        x = meta.get('x', 0)
        y = meta.get('y', 0)
        element_type = click.element_type
        
        # Round to grid (every 50px)
        grid_x = int(x / 50) * 50
        grid_y = int(y / 50) * 50
        key = f"{grid_x},{grid_y}"
        
        if key not in coordinate_map:
            coordinate_map[key] = {
                "x": grid_x,
                "y": grid_y,
                "clicks": 0,
                "conversions": 0,
                "intensity": 0
            }
        
        coordinate_map[key]["clicks"] += 1
        
        # Check for conversions
        conv_count = 0
        if click.user_id:
            # Match conversions by user_id and time window (more flexible than exact page_path match)
            # This allows conversions to be tracked even if they happen on different pages after clicking
            conv_query = select(func.count(ConversionEvent.id)).where(
                and_(
                    ConversionEvent.user_id == click.user_id,
                    ConversionEvent.created_at >= click.created_at,
                    ConversionEvent.created_at <= click.created_at + timedelta(hours=24)  # Extended to 24 hours
                )
            )
            conv_result = await db.execute(conv_query)
            conv_count = conv_result.scalar() or 0
            coordinate_map[key]["conversions"] += conv_count
        elif click.session_id:
            # Also check by session_id for anonymous users
            conv_query = select(func.count(ConversionEvent.id)).where(
                and_(
                    ConversionEvent.session_id == click.session_id,
                    ConversionEvent.created_at >= click.created_at,
                    ConversionEvent.created_at <= click.created_at + timedelta(hours=24)
                )
            )
            conv_result = await db.execute(conv_query)
            conv_count = conv_result.scalar() or 0
            coordinate_map[key]["conversions"] += conv_count
        
        # Element type stats
        if element_type not in element_stats:
            element_stats[element_type] = {
                "clicks": 0,
                "conversions": 0,
                "ctr": 0
            }
        element_stats[element_type]["clicks"] += 1
        element_stats[element_type]["conversions"] += conv_count
    
    # Calculate intensity (normalized clicks)
    if coordinate_map:
        max_clicks = max([c["clicks"] for c in coordinate_map.values()], default=1)
        for coord in coordinate_map.values():
            coord["intensity"] = coord["clicks"] / max_clicks if max_clicks > 0 else 0
    else:
        # No click data found
        print(f"[HEATMAP] No click events found for page_path={page_path} in last {days} days")
    
    coordinates = list(coordinate_map.values()) if coordinate_map else []
    element_heatmap = [
        {
            "element_type": k,
            **v
        }
        for k, v in element_stats.items()
    ]
    
    return HeatmapData(
        page_path=page_path,
        coordinates=coordinates,
        element_heatmap=element_heatmap
    )


# ========== COUNTRY DETECTION & RESTRICTION CHECK ==========

@router.get("/check-country")
async def check_user_country(
    request: Request,
    test_country: Optional[str] = Query(None, description="Test country code for localhost testing (e.g., PH for Philippines)"),
    db: AsyncSession = Depends(get_db)
):
    """
    Detect user's country from IP and check if access is restricted
    This endpoint is called on app startup to verify regional access
    
    For localhost testing, add ?test_country=PH to simulate Philippines access
    """
    try:
        # Detect country from IP (with optional test_country for localhost)
        country_info = await geo_location_service.detect_user_country(request, test_country=test_country)
        
        if not country_info:
            # If country detection fails, allow access (fail-open)
            return {
                "country_code": None,
                "country_name": "Unknown",
                "allowed": True,
                "reason": "Country detection unavailable"
            }
        
        country_code = country_info.get("country_code", "")
        
        # Check if this country is restricted
        restriction_check = await compliance_service.check_regional_access(country_code, db)
        
        return {
            "country_code": country_code,
            "country_name": country_info.get("country_name", "Unknown"),
            "allowed": restriction_check.get("allowed", True),
            "reason": restriction_check.get("reason"),
            "restriction_type": restriction_check.get("restriction_type")
        }
    
    except Exception as e:
        print(f"Error checking user country: {str(e)}")
        # Fail-open: allow access if detection fails
        return {
            "country_code": None,
            "country_name": "Unknown",
            "allowed": True,
            "reason": "Country detection error - access allowed"
        }

