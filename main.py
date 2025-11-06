from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import uvicorn
import asyncio
import traceback
import logging
import re

# Suppress SQLAlchemy engine logging
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

from app.core.config import settings
from app.core.database import engine
from app.core.rollbar_setup import init_rollbar, report_error
from app.models import Base
from app.routers import auth, odds, payments, deposits, social_auth, betting_records, transactions, betting_settlement, bulletproof_settlement, match_result_update, admin, analytics, affiliates
# from app.routers import wallet
# from app.services.scheduler import start_crypto_scheduler, stop_crypto_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize Rollbar error tracking
    init_rollbar()
    
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

# CORS Configuration - Build comprehensive allowed origins list
allowed_origins_list = [
    f"http://{settings.LOCALHOST_IP}",
    f"https://{settings.LOCALHOST_IP}",
    f"http://{settings.LOCALHOST_IP}:80",
    f"https://{settings.LOCALHOST_IP}:443",
    f"http://{settings.LOCALHOST_IP}:3000",
    f"http://{settings.LOCALHOST_IP}:5000",
    f"http://{settings.LOCALHOST_IP}:5173",
    f"http://{settings.LOCALHOST_IP}:8080",
    "http://localhost",
    "http://localhost:3000",
    "http://35.159.122.94",
    "http://localhost:8080",
    "http://127.0.0.1",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:8080",
    "https://localhost",
    "https://127.0.0.1",
]

# Add production URL if it exists
if hasattr(settings, 'FRONTEND_PRODUCTION_URL') and settings.FRONTEND_PRODUCTION_URL:
    allowed_origins_list.append(settings.FRONTEND_PRODUCTION_URL)

# Build regex pattern for dynamic port matching - allows any port
escaped_ip = settings.LOCALHOST_IP.replace('.', r'\.')
origin_regex = f"^(http|https)://({escaped_ip}|localhost|127\\.0\\.0\\.1)(:\\d+)?$"

print(f"🔧 CORS configured for IP: {settings.LOCALHOST_IP}")
print(f"🔧 Primary allowed origin: http://{settings.LOCALHOST_IP}")
print(f"🔧 Regex pattern: {origin_regex}")

# Add CORS middleware - MUST be added before routers
# Use allow_origins for exact matches, allow_origin_regex for dynamic ports
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins_list,  # Exact matches first
    allow_origin_regex=origin_regex,     # Then regex for any port
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
    expose_headers=["*"], # Expose all headers
)

# Global exception handler for Rollbar error tracking
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch all unhandled exceptions and report to Rollbar"""
    report_error(
        error=exc,
        request=request,
        extra_data={
            'path': str(request.url),
            'method': request.method,
            'client_host': request.client.host if request.client else None,
        }
    )
    
    print(f"❌ Unhandled exception: {exc}")
    print(traceback.format_exc())
    
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An internal server error occurred. The error has been logged.",
            "error_type": type(exc).__name__
        }
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
app.include_router(analytics.router, prefix="/api", tags=["Analytics"])
app.include_router(affiliates.router, prefix="/api", tags=["Affiliates"])


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
