#!/usr/bin/env python3
"""
Simple test to check what matches exist and test the automatic settlement
"""

import asyncio
import httpx
import json

async def test_simple():
    """Simple test of the automatic settlement system"""
    
    print("🎯 SIMPLE AUTOMATIC SETTLEMENT TEST")
    print("=" * 40)
    
    try:
        async with httpx.AsyncClient() as client:
            # First, let's see what matches exist
            print("🔍 Checking available matches...")
            matches_response = await client.get("http://localhost:5001/api/odds/matches")
            
            if matches_response.status_code == 200:
                matches_data = matches_response.json()
                print(f"   ✅ Found {len(matches_data.get('matches', []))} matches")
                
                # Show first few matches
                matches = matches_data.get('matches', [])
                for i, match in enumerate(matches[:3]):
                    print(f"      {i+1}. {match.get('home_team', 'N/A')} vs {match.get('away_team', 'N/A')} (ID: {match.get('id', 'N/A')})")
                    print(f"         Result: {match.get('result', 'None')}")
                
                if matches:
                    # Test with the first match
                    test_match = matches[0]
                    match_id = test_match['id']
                    test_result = "2-1"  # Home team wins
                    
                    print(f"\n🎯 Testing automatic settlement with:")
                    print(f"   Match: {test_match['home_team']} vs {test_match['away_team']}")
                    print(f"   Match ID: {match_id}")
                    print(f"   Test Result: {test_result}")
                    
                    # Test the settlement endpoint
                    print(f"\n🚀 Calling automatic settlement endpoint...")
                    settlement_response = await client.put(
                        f"http://localhost:5001/api/match/update-result/{match_id}?result={test_result}"
                    )
                    
                    print(f"   Response Status: {settlement_response.status_code}")
                    print(f"   Response Text: {settlement_response.text}")
                    
                    if settlement_response.status_code == 200:
                        settlement_data = settlement_response.json()
                        print(f"   ✅ SUCCESS! Settlement completed:")
                        print(f"      Message: {settlement_data.get('message', 'N/A')}")
                        print(f"      Bets settled: {settlement_data.get('bets_settled', 0)}")
                        print(f"      Total winnings: ${settlement_data.get('total_winnings', 0):.2f}")
                    else:
                        print(f"   ❌ Settlement failed: {settlement_response.status_code}")
                        print(f"      Error: {settlement_response.text}")
                else:
                    print("   ⚠️ No matches found in database")
            else:
                print(f"   ❌ Failed to get matches: {matches_response.status_code}")
                print(f"      Response: {matches_response.text}")
                
    except httpx.ConnectError:
        print("❌ Connection Error: Make sure the backend server is running on http://localhost:5001")
        print("   Run: python main.py")
    except Exception as e:
        print(f"❌ Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()
    
    print("\n🎉 SIMPLE TEST COMPLETE!")
    print("=" * 40)

if __name__ == "__main__":
    asyncio.run(test_simple())
