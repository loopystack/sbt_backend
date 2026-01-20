"""
Run a single withdrawal execution by ID.
This is useful for ops testing and manual recovery.
"""
import asyncio
import sys
import platform
from pathlib import Path

project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))


async def main(withdrawal_id: int):
    from app.core.database import AsyncSessionLocal
    from app.services.withdrawal_execution_service import WithdrawalExecutionService

    async with AsyncSessionLocal() as db:
        tx_hash = await WithdrawalExecutionService.execute_withdrawal(withdrawal_id=withdrawal_id, db=db)
        print(f"withdrawal_id={withdrawal_id} tx_hash={tx_hash}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python run_withdrawal_execute_once.py <withdrawal_id>")
        raise SystemExit(2)

    wid = int(sys.argv[1])

    # Windows event loop compatibility
    if platform.system() == "Windows":
        import selectors
        loop = asyncio.SelectorEventLoop(selectors.SelectSelector())
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(main(wid))
        finally:
            loop.close()
    else:
        asyncio.run(main(wid))

