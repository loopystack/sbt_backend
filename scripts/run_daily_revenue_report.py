"""
Run daily revenue report (GGR/NGR + cashflow) for a given date or yesterday.
Usage:
  python scripts/run_daily_revenue_report.py
  python scripts/run_daily_revenue_report.py --date 2026-02-03
"""
import asyncio
import sys
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.database import AsyncSessionLocal
from app.services.revenue_report_service import revenue_report_service

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())


async def main():
    report_date = date.today() - timedelta(days=1)
    if len(sys.argv) > 1 and sys.argv[1] == "--date" and len(sys.argv) > 2:
        report_date = date.fromisoformat(sys.argv[2])

    async with AsyncSessionLocal() as db:
        report = await revenue_report_service.compute_and_store(report_date, "USDT", db)
        await db.commit()
        print(f"Report for {report_date}: GGR={report.ggr} NGR={report.ngr} "
              f"Deposits={report.total_deposited_onchain} Withdrawals={report.total_withdrawn_onchain} "
              f"Net inflow={report.net_inflow}")


if __name__ == "__main__":
    asyncio.run(main())
