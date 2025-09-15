#!/usr/bin/env python3
"""
Test script to verify that Stripe payments are now creating real transactions
"""

import requests
import json
import os
from datetime import datetime

# Configuration
BASE_URL = "http://127.0.0.1:5001"
TEST_CARD_NUMBER = "4242424242424242"  # Stripe test card that always succeeds
TEST_CARD_EXPIRY_MONTH = 12
TEST_CARD_EXPIRY_YEAR = 2025
TEST_CARD_CVV = "123"
TEST_CARDHOLDER_NAME = "Test User"
TEST_AMOUNT = 10.00

def test_payment_mode():
    """Test the payment mode endpoint"""
    print("🔍 Testing payment mode endpoint...")
    
    try:
        response = requests.get(f"{BASE_URL}/api/payments/payment-mode")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Payment mode: {data['payment_mode']}")
            print(f"✅ Stripe mode: {data['stripe_mode']}")
            print(f"✅ Key type: {data['key_type']}")
            print(f"✅ Key prefix: {data['key_prefix']}")
            print(f"✅ Message: {data['message']}")
            print(f"✅ Note: {data['note']}")
            return True
        else:
            print(f"❌ Payment mode endpoint failed: {response.status_code}")
            print(response.text)
            return False
    except Exception as e:
        print(f"❌ Error testing payment mode: {e}")
        return False

def test_card_payment():
    """Test a card payment to see if it creates a real Stripe transaction"""
    print("\n💳 Testing card payment...")
    
    # First, we need to get an auth token
    # For this test, we'll assume you have a valid token
    # In a real scenario, you'd login first
    
    auth_token = input("Please enter your auth token (or press Enter to skip): ").strip()
    if not auth_token:
        print("⚠️  Skipping payment test - no auth token provided")
        return False
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    }
    
    payment_data = {
        "card_type": "visa",
        "card_number": TEST_CARD_NUMBER,
        "expiry_month": TEST_CARD_EXPIRY_MONTH,
        "expiry_year": TEST_CARD_EXPIRY_YEAR,
        "cvv": TEST_CARD_CVV,
        "cardholder_name": TEST_CARDHOLDER_NAME,
        "amount": TEST_AMOUNT
    }
    
    try:
        print(f"🔄 Processing payment of ${TEST_AMOUNT}...")
        response = requests.post(
            f"{BASE_URL}/api/payments/process-card",
            headers=headers,
            json=payment_data
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Payment successful!")
            print(f"✅ Transaction ID: {data['transaction_id']}")
            print(f"✅ Status: {data['status']}")
            print(f"✅ Amount: ${data['amount']}")
            print(f"✅ New balance: ${data['new_balance']}")
            print(f"✅ Message: {data['message']}")
            
            # Check if it's a real Stripe transaction ID
            if data['transaction_id'].startswith('pi_'):
                print("🎉 SUCCESS: Real Stripe PaymentIntent created!")
                print(f"🔗 Check your Stripe Dashboard for transaction: {data['transaction_id']}")
                return True
            else:
                print("⚠️  WARNING: Transaction ID doesn't look like a real Stripe ID")
                return False
        else:
            print(f"❌ Payment failed: {response.status_code}")
            print(response.text)
            return False
            
    except Exception as e:
        print(f"❌ Error processing payment: {e}")
        return False

def main():
    """Main test function"""
    print("🧪 Stripe Payment Integration Test")
    print("=" * 50)
    
    # Test payment mode
    mode_ok = test_payment_mode()
    
    if mode_ok:
        # Test card payment
        payment_ok = test_card_payment()
        
        if payment_ok:
            print("\n🎉 All tests passed! Transactions should now appear in Stripe Dashboard.")
        else:
            print("\n⚠️  Payment test failed. Check the error messages above.")
    else:
        print("\n❌ Payment mode test failed. Check your configuration.")

if __name__ == "__main__":
    main()
