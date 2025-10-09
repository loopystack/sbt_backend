from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn
import asyncio

from app.core.config import settings
from app.core.database import engine
from app.models import Base
from app.routers import auth, odds, payments, deposits, social_auth, betting_records, transactions, betting_settlement, bulletproof_settlement, match_result_update, admin
# from app.routers import wallet
# from app.services.scheduler import start_crypto_scheduler, stop_crypto_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create database tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Start crypto scheduler
    # scheduler_task = asyncio.create_task(start_crypto_scheduler())
    
    yield
    
    # Stop crypto scheduler
    # await stop_crypto_scheduler()
    # scheduler_task.cancel()
    # try:
    #     await scheduler_task
    # except asyncio.CancelledError:
    #     pass


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan
)

# CORS middleware - Allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(social_auth.router, prefix="/api/auth", tags=["Social Authentication"])
app.include_router(odds.router, prefix="/api/odds", tags=["Odds"])
app.include_router(payments.router, prefix="/api/payments", tags=["Payments"])
app.include_router(deposits.router, tags=["Deposits"])
app.include_router(betting_records.router, tags=["Betting Records"])
app.include_router(transactions.router, tags=["Transactions"])
app.include_router(betting_settlement.router, prefix="/api/betting", tags=["Betting Settlement"])
app.include_router(bulletproof_settlement.router, prefix="/api/settlement", tags=["Bulletproof Settlement"])
app.include_router(admin.router, prefix="/api", tags=["Admin"])


print('settings.APP_VERSION', settings.APP_VERSION)

@app.get("/")
async def root():
    print('root')
    return {"message": "Soccer Betting Platform", "version": settings.APP_VERSION}

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": "2024-01-01T00:00:00Z",
        "version": settings.APP_VERSION
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=5001,
        reload=settings.DEBUG
    )
