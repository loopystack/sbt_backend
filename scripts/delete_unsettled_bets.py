"""
One-off script: remove all unsettled bets from the database.
For each unsettled bet, unlocks the stake (returns reserved -> available) then deletes the record.
Run from project root: python scripts/delete_unsettled_bets.py
"""
import asyncio
import sys
from decimal import Decimal
from pathlib import Path

# Add project root so "app" can be imported
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.betting_record import BettingRecord
from app.models.wallet_transaction import ReferenceType, WalletTransaction, WalletTransactionType
from app.services.wallet_service import WalletService

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())


async def main() -> None:
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(BettingRecord).where(BettingRecord.is_settled == False)
        )
        unsettled = result.scalars().all()
        if not unsettled:
            print("No unsettled bets found.")
            return

        print(f"Found {len(unsettled)} unsettled bet(s). Unlocking stake (if any) and deleting...")
        deleted = 0
        unlocked = 0
        for bet in unsettled:
            amount = Decimal(str(bet.bet_amount))
            try:
                await WalletService.unlock_balance(
                    user_id=bet.user_id,
                    asset="USDT",
                    amount=amount,
                    db=db,
                    reference_type=ReferenceType.BET,
                    reference_id=bet.id,
                    description=f"Remove unsettled bet: stake returned for bet {bet.id}",
                )
                tx_result = await db.execute(
                    select(WalletTransaction)
                    .where(
                        WalletTransaction.reference_type == ReferenceType.BET,
                        WalletTransaction.reference_id == bet.id,
                    )
                    .order_by(WalletTransaction.id.desc())
                    .limit(1)
                )
                last_tx = tx_result.scalar_one_or_none()
                if last_tx:
                    last_tx.type = WalletTransactionType.BET_CANCEL_UNLOCK
                unlocked += 1
            except Exception as e:
                # Reserved already 0 or inconsistent: skip unlock, still delete the bet
                if "Insufficient reserved" in str(e):
                    pass  # no unlock needed
                else:
                    print(f"  Unlock skipped for bet {bet.id}: {e}")
            await db.delete(bet)
            deleted += 1

        await db.commit()
        print(f"Done. Deleted {deleted} unsettled bet(s) ({unlocked} had stake unlocked).")


if __name__ == "__main__":
    asyncio.run(main())
