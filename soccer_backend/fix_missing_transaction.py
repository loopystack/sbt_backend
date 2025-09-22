#!/usr/bin/env python3
"""
Script to fix the missing transaction record for the Manchester City bet.
This will create the transaction record so it shows up in transaction history.
"""

import asyncio
from app.models.betting_record import BettingRecord
from app.models.transaction import Transaction
from app.models.user import User
from app.core.database import AsyncSessionLocal
from sqlalchemy import select, text

async def fix_missing_transaction():
    """Create missing transaction record for settled Manchester City bet"""
    
    async with AsyncSessionLocal() as session:
        try:
            print("🔍 Looking for settled Manchester City bet without transaction...")
            
            # Find the settled Manchester City bet
            bet_query = """
            SELECT id, user_id, bet_amount, actual_profit, bet_status, 
                   match_teams, selected_outcome, odds_decimal, settlement_date
            FROM betting_records 
            WHERE match_teams LIKE '%Manchester City%' 
            AND is_settled = true
            ORDER BY id DESC 
            LIMIT 1;
            """
            
            result = await session.execute(text(bet_query))
            bet_record = result.first()
            
            if not bet_record:
                print("❌ No settled Manchester City bet found!")
                return
            
            bet_id, user_id, bet_amount, actual_profit, bet_status, match_teams, selected_outcome, odds_decimal, settlement_date = bet_record
            
            print(f"✅ Found settled bet:")
            print(f"   Bet ID: {bet_id}")
            print(f"   User ID: {user_id}")
            print(f"   Match: {match_teams}")
            print(f"   Amount: ${bet_amount}")
            print(f"   Status: {bet_status}")
            print(f"   Profit: ${actual_profit}")
            
            # Check if transaction already exists
            transaction_check = """
            SELECT id FROM transactions 
            WHERE reference_id = %s 
            AND reference_type = 'betting_record'
            AND transaction_type = 'bet_won';
            """
            
            existing_result = await session.execute(text(transaction_check), [str(bet_id)])
            existing_transaction = existing_result.first()
            
            if existing_transaction:
                print("✅ Transaction already exists - no fix needed!")
                return
            
            print("🔧 Creating missing transaction record...")
            
            # Get user current balance
            user = await session.get(User, user_id)
            if not user:
                print(f"❌ User {user_id} not found!")
                return
            
            current_balance = float(user.funds_usd)
            
            # Calculate what the balance was before the settlement
            total_return = bet_amount * odds_decimal
            balance_before_settlement = current_balance - total_return
            
            print(f"💰 Balance calculation:")
            print(f"   Current balance: ${current_balance:.2f}")
            print(f"   Total return: ${total_return:.2f}")
            print(f"   Balance before settlement: ${balance_before_settlement:.2f}")
            
            # Create the missing transaction
            transaction_data = {
                "user_id": user_id,
                "transaction_type": "bet_won",
                "amount": total_return,
                "balance_before": balance_before_settlement,
                "balance_after": current_balance,
                "description": f"🏆 Bet Won: {match_teams} - {selected_outcome} (Profit: +${actual_profit:.2f})",
                "reference_id": str(bet_id),
                "reference_type": "betting_record",
                "status": "completed",
                "payment_method": "betting_settlement"
            }
            
            insert_query = """
            INSERT INTO transactions 
            (user_id, transaction_type, amount, balance_before, balance_after, 
             description, reference_id, reference_type, status, payment_method)
            VALUES 
            (:user_id, :transaction_type, :amount, :balance_before, :balance_after,
             :description, :reference_id, :reference_type, :status, :payment_method);
            """
            
            await session.execute(text(insert_query), transaction_data)
            await session.commit()
            
            print("✅ Successfully created missing transaction record!")
            print("📊 The transaction will now show up in your transaction history!")
            print(f"   Type: {transaction_data['transaction_type']}")
            print(f"   Amount: ${transaction_data['amount']:.2f}")
            print(f"   Description: {transaction_data['description']}")
            
        except Exception as e:
            await session.rollback()
            print(f"❌ Error fixing transaction: {e}")
            raise

if __name__ == "__main__":
    print("🚀 Starting transaction fix...")
    asyncio.run(fix_missing_transaction())
    print("✨ Transaction fix completed!")
