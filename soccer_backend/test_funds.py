"""
Test script to check database and funds endpoint
"""

import asyncio
from sqlalchemy import text
from app.core.database import engine
from app.core.security import create_access_token

async def test_database_and_funds():
    """Test database connection and funds endpoint"""
    try:
        # Check database connection
        async with engine.begin() as conn:
            result = await conn.execute(text("SELECT id, username, email FROM users LIMIT 1"))
            user = result.fetchone()
            
            if user:
                print(f"✅ Found user: ID={user[0]}, Username={user[1]}, Email={user[2]}")
                
                # Create a test token for this user
                token = create_access_token(data={"sub": str(user[0])})
                print(f"✅ Generated test token: {token[:50]}...")
                
                return token
            else:
                print("❌ No users found in database")
                return None
                
    except Exception as e:
        print(f"❌ Database error: {str(e)}")
        return None

if __name__ == "__main__":
    token = asyncio.run(test_database_and_funds())
    if token:
        print(f"\n🧪 Test the funds endpoint with this token:")
        print(f"curl -X POST http://localhost:8000/api/auth/funds/add \\")
        print(f"  -H 'Content-Type: application/json' \\")
        print(f"  -H 'Authorization: Bearer {token}' \\")
        print(f"  -d '{{\"amount\": 100}}'")
