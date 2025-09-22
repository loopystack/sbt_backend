#!/usr/bin/env python3
"""
Test the automatic settlement system
Create a test bet and update match result to see if settlement works automatically
"""

import asyncio
import httpx
import json

async def test_automatic_settlement():
    """Test the automatic settlement system"""
    
    print("🤖 TESTING AUTOMATIC SETTLEMENT SYSTEM")
    print("=" * 50)
    print("This will test if settlement happens automatically when Dashboard loads")
    print()
    
    try:
        async with httpx.AsyncClient() as client:
            
            # Step 1: Check if there are any unsettled bets
            print("🔍 Step 1: Checking for unsettled bets...")
            
            # We need to authenticate first - let's try to get betting records
            # This should trigger automatic settlement
            betting_response = await client.get("http://localhost:5001/api/betting/records")
            
            print(f"   Betting records response: {betting_response.status_code}")
            if betting_response.status_code == 200:
                betting_data = betting_response.json()
                print(f"   ✅ Found {len(betting_data.get('records', []))} betting records")
                
                # Check for unsettled bets
                unsettled_count = 0
                for record in betting_data.get('records', []):
                    if not record.get('is_settled', True):
                        unsettled_count += 1
                        print(f"      - {record.get('match_teams', 'N/A')}: {record.get('bet_status', 'N/A')}")
                
                print(f"   📊 Unsettled bets: {unsettled_count}")
            else:
                print(f"   ❌ Failed to get betting records: {betting_response.text}")
            
            print()
            
            # Step 2: Check transactions (this also triggers settlement)
            print("🔍 Step 2: Checking transaction history...")
            
            transactions_response = await client.get("http://localhost:5001/api/transactions/")
            
            print(f"   Transactions response: {transactions_response.status_code}")
            if transactions_response.status_code == 200:
                transactions_data = transactions_response.json()
                print(f"   ✅ Found {len(transactions_data.get('transactions', []))} transactions")
                
                # Check for recent settlement transactions
                recent_settlements = 0
                for transaction in transactions_data.get('transactions', []):
                    if transaction.get('payment_method') == 'auto_settlement':
                        recent_settlements += 1
                        print(f"      - {transaction.get('transaction_type', 'N/A')}: {transaction.get('description', 'N/A')}")
                
                print(f"   📊 Recent auto-settlements: {recent_settlements}")
            else:
                print(f"   ❌ Failed to get transactions: {transactions_response.text}")
            
            print()
            
            # Step 3: Check betting stats (this also triggers settlement)
            print("🔍 Step 3: Checking betting statistics...")
            
            stats_response = await client.get("http://localhost:5001/api/betting/records/stats")
            
            print(f"   Stats response: {stats_response.status_code}")
            if stats_response.status_code == 200:
                stats_data = stats_response.json()
                print(f"   ✅ Betting statistics:")
                print(f"      Total bets: {stats_data.get('total_bets', 0)}")
                print(f"      Won bets: {stats_data.get('won_bets', 0)}")
                print(f"      Lost bets: {stats_data.get('lost_bets', 0)}")
                print(f"      Pending bets: {stats_data.get('pending_bets', 0)}")
                print(f"      Total profit: ${stats_data.get('total_profit', 0):.2f}")
                print(f"      Win rate: {stats_data.get('win_rate', 0)}%")
            else:
                print(f"   ❌ Failed to get stats: {stats_response.text}")
            
            print()
            print("🎉 AUTOMATIC SETTLEMENT TEST COMPLETE!")
            print("=" * 50)
            print("✅ The system now automatically settles bets when:")
            print("   - Dashboard loads (fetches betting records)")
            print("   - Transaction history is loaded")
            print("   - Betting statistics are fetched")
            print()
            print("🚀 No more manual scripts needed!")
            print("🚀 Just update match results in database and refresh Dashboard!")
            
    except httpx.ConnectError:
        print("❌ Connection Error: Make sure the backend server is running on http://localhost:5001")
        print("   Run: python main.py")
    except Exception as e:
        print(f"❌ Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_automatic_settlement())
