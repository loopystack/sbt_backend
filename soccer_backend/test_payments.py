#!/usr/bin/env python3
"""
Test script to verify payments router functionality
"""

import os
import sys

# Set environment variables
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test.db"
os.environ["STRIPE_TEST_SECRET_KEY"] = "sk_test_51S5nIdEPfR8232yqb72jbFUfB1rH6XmYaPoZCmXEDiduE1qJgQUHbF9tSLeiZUtfkruG0XgwmlYmbI5mwPrHC6c700Mltm9zhD"
os.environ["STRIPE_TEST_PUBLISHABLE_KEY"] = "pk_test_51S5nIdEPfR8232yqBZKdH2rIt70y8YPK9QIMKrMtLlCjew9IpjXzMdGPASFfDg8SH9u9g6ss9CWlyXcwVyWnzq4B00XubMZyoj"
os.environ["PAYMENT_MODE"] = "test"

try:
    print("Testing imports...")
    from fastapi import FastAPI
    print("✓ FastAPI imported")
    
    from app.routers import payments
    print("✓ Payments router imported")
    
    from app.core.config import settings
    print("✓ Settings imported")
    print(f"✓ Stripe key: {settings.stripe_secret_key[:10]}...")
    
    app = FastAPI()
    print("✓ FastAPI app created")
    
    app.include_router(payments.router, prefix="/api/payments", tags=["Payments"])
    print("✓ Payments router registered")
    
    # Check if the endpoint exists
    routes = [route.path for route in app.routes]
    print(f"✓ Available routes: {routes}")
    
    if "/api/payments/process-card" in routes:
        print("✅ SUCCESS: Payments endpoint is registered!")
    else:
        print("❌ ERROR: Payments endpoint not found in routes")
        
except Exception as e:
    print(f"❌ ERROR: {e}")
    import traceback
    traceback.print_exc()
