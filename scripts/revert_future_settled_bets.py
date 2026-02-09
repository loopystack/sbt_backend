"""
One-off script: revert bets that were wrongly settled (match not yet played).
Finds all settled bets whose match_date is in the future, resets them to pending,
reverses any winnings paid out, and removes the settlement transactions.

Run from project root: python scripts/revert_future_settled_bets.py
"""
import asyncio
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select, and_
from app.core.database import AsyncSessionLocal
from app.models.betting_record import BettingRecord
from app.models.transaction import Transaction
from app.models.user import User

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())


def _match_date_still_future(match_date) -> bool:
    """True if match_date is in the future (match not yet played)."""
    if not match_date:
        return False
    now = datetime.now(timezone.utc)
    md = match_date
    if md.tzinfo is None:
        md = md.replace(tzinfo=timezone.utc)
    return md > now


async def main() -> None:
    async with AsyncSessionLocal() as db:
        # All settled bets
        result = await db.execute(
            select(BettingRecord).where(BettingRecord.is_settled == True)
        )
        settled = result.scalars().all()
        # Keep only those whose match_date is in the future
        to_revert = [b for b in settled if _match_date_still_future(b.match_date)]
        if not to_revert:
            print("No wrongly settled (future) bets found.")
            return

        print(f"Found {len(to_revert)} bet(s) settled for future matches. Reverting...")
        for bet in to_revert:
            user = await db.get(User, bet.user_id)
            if not user:
                continue
            # Remove settlement transactions (bet_won / bet_lost for this record)
            tx_result = await db.execute(
                select(Transaction).where(
                    and_(
                        Transaction.reference_type == "betting_record",
                        Transaction.reference_id == str(bet.id),
                        Transaction.transaction_type.in_(["bet_won", "bet_lost"]),
                    )
                )
            )
            for tx in tx_result.scalars().all():
                await db.delete(tx)
            # If we had wrongly paid winnings, subtract them from balance
            if bet.bet_status == "won":
                winnings = float(bet.bet_amount * bet.odds_decimal)
                old = float(user.funds_usd)
                new_balance = max(0.0, old - winnings)
                user.funds_usd = new_balance
                db.add(
                    Transaction(
                        user_id=bet.user_id,
                        transaction_type="balance_correction",
                        amount=-winnings,
                        balance_before=old,
                        balance_after=new_balance,
                        description=f"Balance correction: reverted mistaken payout for future match ({bet.match_teams})",
                        reference_id=str(bet.id),
                        reference_type="betting_record",
                        status="completed",
                        payment_method="revert_future_settlement",
                    )
                )
                print(f"  Bet #{bet.id} ({bet.match_teams}): reverted WON, subtracted ${winnings:.2f} from user {user.id}")
            else:
                print(f"  Bet #{bet.id} ({bet.match_teams}): reverted LOST (no balance change)")
            # Reset bet to pending
            bet.bet_status = "pending"
            bet.is_settled = False
            bet.actual_profit = None
            bet.settlement_date = None
            bet.match_status = "upcoming"

        await db.commit()
        print(f"Done. Reverted {len(to_revert)} bet(s). Refresh your dashboard to see them as pending.")


if __name__ == "__main__":
    asyncio.run(main())
