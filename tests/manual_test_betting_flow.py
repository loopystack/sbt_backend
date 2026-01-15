"""
Manual Testing Script for Betting Flow
Run this script to verify all betting scenarios manually.

Usage:
    python tests/manual_test_betting_flow.py

This script will:
1. Create a test user with 100 USDT available, 0 reserved
2. Test Case 1: Place bet (stake=10, odds=2.0)
3. Test Case 2: Settle WIN
4. Test Case 3: Place bet and settle LOSS
5. Test Case 4: Place bet and settle VOID
6. Test Idempotency: Re-settle each bet
"""
import asyncio
import sys
from decimal import Decimal
from datetime import date, timedelta
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy import select

# Add parent directory to path
sys.path.insert(0, '.')

from app.models.user import User
from app.models.odds import Odds
from app.models.deposit import UserCryptoBalance
from app.models.bet import Bet, BetStatus
from app.models.wallet_transaction import WalletTransaction, WalletTransactionType, ReferenceType
from app.services.bet_service import BetService
from app.services.wallet_service import WalletService


# Test database setup
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

async def setup_test_environment():
    """Set up test database and create test user with seeded wallet"""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    
    from app.models import Base
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async_session = async_sessionmaker(engine, expire_on_commit=False)
    session = async_session()
    
    # Create test user
    user = User(
        email="test@example.com",
        username="testuser",
        hashed_password="hashed",
        is_active=True
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    
    # Create seeded wallet: available=100, reserved=0
    balance = UserCryptoBalance(
        user_id=user.id,
        asset="USDT",
        balance=Decimal("100.00"),
        locked_balance=Decimal("0")
    )
    session.add(balance)
    await session.commit()
    
    # Create test match
    match = Odds(
        home_team="Team A",
        away_team="Team B",
        league="Test League",
        country="Test Country",
        season=2024,
        date=date.today() + timedelta(days=1),
        odd_1=Decimal("2.00"),
        odd_X=Decimal("3.00"),
        odd_2=Decimal("2.50"),
        result=None
    )
    session.add(match)
    await session.commit()
    await session.refresh(match)
    
    return session, user, match


async def get_balance(session, user_id):
    """Get current balance"""
    return await WalletService.get_balance(user_id, "USDT", session)


async def get_ledger_entries(session, bet_id):
    """Get all ledger entries for a bet"""
    stmt = select(WalletTransaction).where(
        WalletTransaction.reference_type == ReferenceType.BET,
        WalletTransaction.reference_id == bet_id
    ).order_by(WalletTransaction.created_at)
    result = await session.execute(stmt)
    return list(result.scalars().all())


def print_balance(balance, label=""):
    """Print balance in readable format"""
    print(f"{label}")
    print(f"  Available: {balance['available']} USDT")
    print(f"  Reserved: {balance['reserved']} USDT")
    print(f"  Total: {balance['total']} USDT")
    print()


def print_ledger_entries(entries, label=""):
    """Print ledger entries in readable format"""
    print(f"{label}")
    if not entries:
        print("  No ledger entries")
    else:
        for i, entry in enumerate(entries, 1):
            print(f"  {i}. {entry.type.value}: {entry.amount} USDT")
            print(f"     Balance: {entry.balance_before} -> {entry.balance_after}")
            print(f"     Reserved: {entry.reserved_before} -> {entry.reserved_after}")
            print(f"     Description: {entry.description}")
    print()


async def test_case_1_place_bet(session, user, match):
    """Case 1: Place bet stake=10 odds=2.0"""
    print("=" * 60)
    print("CASE 1: Place Bet (stake=10, odds=2.0)")
    print("=" * 60)
    
    user_id = user.id
    stake = Decimal("10.00")
    odds = Decimal("2.00")
    
    # Get initial balance
    balance_before = await get_balance(session, user_id)
    print_balance(balance_before, "Balance BEFORE placing bet:")
    
    # Place bet
    bet = await BetService.place_bet(
        user_id=user_id,
        match_id=match.id,
        market_key="1x2",
        selection_key="home",
        odds_decimal=odds,
        stake=stake,
        db=session
    )
    
    print(f"[OK] Bet placed! Bet ID: {bet.id}")
    print(f"   Stake: {stake} USDT")
    print(f"   Odds: {odds}")
    print(f"   Status: {bet.status.value}")
    print()
    
    # Get balance after
    balance_after = await get_balance(session, user_id)
    print_balance(balance_after, "Balance AFTER placing bet:")
    
    # Verify expected values
    print("Expected:")
    print("  available=90")
    print("  reserved=10")
    print()
    
    print("Actual:")
    print(f"  available={balance_after['available']}")
    print(f"  reserved={balance_after['reserved']}")
    print()
    
    # Verify
    assert balance_after['available'] == Decimal("90.00"), f"Expected available=90, got {balance_after['available']}"
    assert balance_after['reserved'] == Decimal("10.00"), f"Expected reserved=10, got {balance_after['reserved']}"
    print("[OK] Balance verification PASSED")
    print()
    
    # Get ledger entries
    entries = await get_ledger_entries(session, bet.id)
    print_ledger_entries(entries, "Ledger entries:")
    
    # Verify ledger
    assert len(entries) == 1, f"Expected 1 ledger entry, got {len(entries)}"
    assert entries[0].type == WalletTransactionType.BET_LOCK, f"Expected BET_LOCK, got {entries[0].type}"
    assert entries[0].amount == stake, f"Expected amount {stake}, got {entries[0].amount}"
    print("[OK] Ledger verification PASSED")
    print()
    
    return bet


async def test_case_2_settle_win(session, user, bet):
    """Case 2: Settle WIN"""
    print("=" * 60)
    print("CASE 2: Settle WIN")
    print("=" * 60)
    
    user_id = user.id
    stake = bet.stake
    odds = bet.odds_decimal
    expected_profit = stake * (odds - Decimal("1"))  # 10 * (2 - 1) = 10
    
    print(f"Bet ID: {bet.id}")
    print(f"Stake: {stake} USDT")
    print(f"Odds: {odds}")
    print(f"Expected Profit: {expected_profit} USDT (stake * (odds - 1) = {stake} * ({odds} - 1))")
    print()
    
    # Get balance before
    balance_before = await get_balance(session, user_id)
    print_balance(balance_before, "Balance BEFORE settling WIN:")
    
    # Settle as WIN
    settled_bet = await BetService.settle_bet(bet.id, "WIN", db=session)
    print(f"[OK] Bet settled as WIN!")
    print(f"   Status: {settled_bet.status.value}")
    print()
    
    # Get balance after
    balance_after = await get_balance(session, user_id)
    print_balance(balance_after, "Balance AFTER settling WIN:")
    
    # Verify expected values
    print("Expected:")
    print("  available=110 (90 + 10 stake returned + 10 profit)")
    print("  reserved=0")
    print()
    
    print("Actual:")
    print(f"  available={balance_after['available']}")
    print(f"  reserved={balance_after['reserved']}")
    print()
    
    # Verify
    assert balance_after['available'] == Decimal("110.00"), f"Expected available=110, got {balance_after['available']}"
    assert balance_after['reserved'] == Decimal("0"), f"Expected reserved=0, got {balance_after['reserved']}"
    print("[OK] Balance verification PASSED")
    print()
    
    # Get ledger entries
    entries = await get_ledger_entries(session, bet.id)
    print_ledger_entries(entries, "Ledger entries:")
    
    # Verify ledger
    assert len(entries) == 3, f"Expected 3 ledger entries, got {len(entries)}"
    assert entries[0].type == WalletTransactionType.BET_LOCK, "First entry should be BET_LOCK"
    assert entries[1].type == WalletTransactionType.BET_UNLOCK, "Second entry should be BET_UNLOCK"
    assert entries[2].type == WalletTransactionType.BET_PAYOUT, "Third entry should be BET_PAYOUT"
    assert entries[1].amount == stake, f"BET_UNLOCK should be {stake}, got {entries[1].amount}"
    assert entries[2].amount == expected_profit, f"BET_PAYOUT should be {expected_profit}, got {entries[2].amount}"
    print("[OK] Ledger verification PASSED")
    print()
    
    return bet


async def test_case_3_place_and_lose(session, user, match):
    """Case 3: Place bet then settle LOSS"""
    print("=" * 60)
    print("CASE 3: Place Bet and Settle LOSS")
    print("=" * 60)
    
    user_id = user.id
    stake = Decimal("10.00")
    odds = Decimal("2.00")
    
    # Get balance before placing
    balance_before_place = await get_balance(session, user_id)
    print_balance(balance_before_place, "Balance BEFORE placing bet:")
    
    # Place bet
    bet = await BetService.place_bet(
        user_id=user_id,
        match_id=match.id,
        market_key="1x2",
        selection_key="home",
        odds_decimal=odds,
        stake=stake,
        db=session
    )
    
    print(f"[OK] Bet placed! Bet ID: {bet.id}")
    print()
    
    # Get balance after placing
    balance_after_place = await get_balance(session, user_id)
    print_balance(balance_after_place, "Balance AFTER placing bet:")
    
    # Verify after place
    print("Expected after place:")
    print("  available=100")
    print("  reserved=10")
    print()
    
    print("Actual after place:")
    print(f"  available={balance_after_place['available']}")
    print(f"  reserved={balance_after_place['reserved']}")
    print()
    
    assert balance_after_place['available'] == Decimal("100.00"), f"Expected available=100, got {balance_after_place['available']}"
    assert balance_after_place['reserved'] == Decimal("10.00"), f"Expected reserved=10, got {balance_after_place['reserved']}"
    print("[OK] Balance after place verification PASSED")
    print()
    
    # Settle as LOSS
    settled_bet = await BetService.settle_bet(bet.id, "LOSS", db=session)
    print(f"[OK] Bet settled as LOSS!")
    print()
    
    # Get balance after loss
    balance_after_loss = await get_balance(session, user_id)
    print_balance(balance_after_loss, "Balance AFTER settling LOSS:")
    
    # Verify after loss
    print("Expected after loss:")
    print("  available=100 (unchanged)")
    print("  reserved=0")
    print()
    
    print("Actual after loss:")
    print(f"  available={balance_after_loss['available']}")
    print(f"  reserved={balance_after_loss['reserved']}")
    print()
    
    assert balance_after_loss['available'] == Decimal("100.00"), f"Expected available=100, got {balance_after_loss['available']}"
    assert balance_after_loss['reserved'] == Decimal("0"), f"Expected reserved=0, got {balance_after_loss['reserved']}"
    print("[OK] Balance after loss verification PASSED")
    print()
    
    # Get ledger entries
    entries = await get_ledger_entries(session, bet.id)
    print_ledger_entries(entries, "Ledger entries:")
    
    # Verify ledger
    assert len(entries) == 2, f"Expected 2 ledger entries, got {len(entries)}"
    assert entries[0].type == WalletTransactionType.BET_LOCK, "First entry should be BET_LOCK"
    assert entries[1].type == WalletTransactionType.BET_DEBIT, "Second entry should be BET_DEBIT"
    assert entries[1].amount == stake, f"BET_DEBIT should be {stake}, got {entries[1].amount}"
    print("[OK] Ledger verification PASSED")
    print()
    
    return bet


async def test_case_4_place_and_void(session, user, match):
    """Case 4: Place bet then settle VOID"""
    print("=" * 60)
    print("CASE 4: Place Bet and Settle VOID")
    print("=" * 60)
    
    user_id = user.id
    stake = Decimal("10.00")
    odds = Decimal("2.00")
    
    # Get balance before placing
    balance_before_place = await get_balance(session, user_id)
    print_balance(balance_before_place, "Balance BEFORE placing bet:")
    available_before = balance_before_place['available']
    reserved_before = balance_before_place['reserved']
    
    # Place bet
    bet = await BetService.place_bet(
        user_id=user_id,
        match_id=match.id,
        market_key="1x2",
        selection_key="home",
        odds_decimal=odds,
        stake=stake,
        db=session
    )
    
    print(f"[OK] Bet placed! Bet ID: {bet.id}")
    print()
    
    # Settle as VOID
    settled_bet = await BetService.settle_bet(bet.id, "VOID", db=session)
    print(f"[OK] Bet settled as VOID!")
    print()
    
    # Get balance after void
    balance_after_void = await get_balance(session, user_id)
    print_balance(balance_after_void, "Balance AFTER settling VOID:")
    
    # Verify after void
    print("Expected after void:")
    print(f"  available={available_before} (returns back)")
    print(f"  reserved={reserved_before} (back to 0)")
    print()
    
    print("Actual after void:")
    print(f"  available={balance_after_void['available']}")
    print(f"  reserved={balance_after_void['reserved']}")
    print()
    
    assert balance_after_void['available'] == available_before, f"Available should return to {available_before}, got {balance_after_void['available']}"
    assert balance_after_void['reserved'] == Decimal("0"), f"Reserved should be 0, got {balance_after_void['reserved']}"
    print("[OK] Balance verification PASSED")
    print()
    
    # Get ledger entries
    entries = await get_ledger_entries(session, bet.id)
    print_ledger_entries(entries, "Ledger entries:")
    
    # Verify ledger
    assert len(entries) == 2, f"Expected 2 ledger entries, got {len(entries)}"
    assert entries[0].type == WalletTransactionType.BET_LOCK, "First entry should be BET_LOCK"
    assert entries[1].type == WalletTransactionType.BET_UNLOCK, "Second entry should be BET_UNLOCK"
    assert entries[1].amount == stake, f"BET_UNLOCK should be {stake}, got {entries[1].amount}"
    
    # Verify NO BET_PAYOUT
    payout_entries = [e for e in entries if e.type == WalletTransactionType.BET_PAYOUT]
    assert len(payout_entries) == 0, "VOID should NOT have BET_PAYOUT entry"
    print("[OK] Ledger verification PASSED")
    print()
    
    return bet


async def test_idempotency(session, user, bets):
    """Test idempotency: Re-settle each bet and verify balances don't change"""
    print("=" * 60)
    print("IDEMPOTENCY TEST: Re-settle bets and verify balances don't change")
    print("=" * 60)
    
    user_id = user.id
    
    for i, bet in enumerate(bets, 1):
        print(f"\n--- Testing Bet {i} (ID: {bet.id}, Status: {bet.status.value}) ---")
        
        # Get balance before re-settlement
        balance_before = await get_balance(session, user_id)
        print(f"Balance BEFORE re-settlement:")
        print(f"  Available: {balance_before['available']} USDT")
        print(f"  Reserved: {balance_before['reserved']} USDT")
        
        # Get ledger count before
        entries_before = await get_ledger_entries(session, bet.id)
        ledger_count_before = len(entries_before)
        
        # Determine outcome based on current status
        if bet.status == BetStatus.WON:
            outcome = "WIN"
        elif bet.status == BetStatus.LOST:
            outcome = "LOSS"
        elif bet.status == BetStatus.VOID:
            outcome = "VOID"
        else:
            print(f"  [SKIP] Bet {bet.id} is not settled, skipping idempotency test")
            continue
        
        # Re-settle
        print(f"  Re-settling as {outcome}...")
        settled_bet = await BetService.settle_bet(bet.id, outcome, db=session)
        
        # Get balance after re-settlement
        balance_after = await get_balance(session, user_id)
        print(f"Balance AFTER re-settlement:")
        print(f"  Available: {balance_after['available']} USDT")
        print(f"  Reserved: {balance_after['reserved']} USDT")
        
        # Get ledger count after
        entries_after = await get_ledger_entries(session, bet.id)
        ledger_count_after = len(entries_after)
        
        # Verify balances unchanged
        assert balance_after['available'] == balance_before['available'], (
            f"Available balance should not change. Before: {balance_before['available']}, After: {balance_after['available']}"
        )
        assert balance_after['reserved'] == balance_before['reserved'], (
            f"Reserved balance should not change. Before: {balance_before['reserved']}, After: {balance_after['reserved']}"
        )
        assert ledger_count_after == ledger_count_before, (
            f"Ledger entry count should not change. Before: {ledger_count_before}, After: {ledger_count_after}"
        )
        
        print(f"  [OK] Idempotency test PASSED for Bet {bet.id}")
    
    print("\n[OK] All idempotency tests PASSED")
    print()


async def main():
    """Run all test cases"""
    print("\n" + "=" * 60)
    print("MANUAL BETTING FLOW TEST")
    print("=" * 60)
    print()
    
    try:
        # Setup
        session, user, match = await setup_test_environment()
        print("[OK] Test environment setup complete")
        print(f"   User ID: {user.id}")
        print(f"   Initial Balance: 100 USDT available, 0 reserved")
        print()
        
        bets = []
        
        # Case 1: Place bet
        bet1 = await test_case_1_place_bet(session, user, match)
        bets.append(bet1)
        
        # Case 2: Settle WIN
        bet1_win = await test_case_2_settle_win(session, user, bet1)
        
        # Case 3: Place bet and settle LOSS
        bet2 = await test_case_3_place_and_lose(session, user, match)
        bets.append(bet2)
        
        # Case 4: Place bet and settle VOID
        bet3 = await test_case_4_place_and_void(session, user, match)
        bets.append(bet3)
        
        # Idempotency test
        await test_idempotency(session, user, bets)
        
        print("=" * 60)
        print("[OK] ALL TESTS PASSED!")
        print("=" * 60)
        print()
        
        # Final balance
        final_balance = await get_balance(session, user.id)
        print_balance(final_balance, "Final Balance:")
        
    except AssertionError as e:
        print(f"\n[FAILED] TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    except Exception as e:
        print(f"\n[ERROR] ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    # Set event loop policy for Windows
    import sys
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    
    asyncio.run(main())
