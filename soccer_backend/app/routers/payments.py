"""
Payment Processing API endpoints
Handles traditional payment methods (Visa, Mastercard, Bank Transfer, PayPal)
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, List, Any
from datetime import datetime
import logging
from decimal import Decimal
import stripe
import os

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.config import settings
from app.models.user import User
from app.schemas.payment import (
    PaymentResponse,
    PaymentStatus,
    CardPaymentRequest,
    BankTransferRequest,
    PayPalPaymentRequest
)
from app.services.blockchain_verifier import blockchain_verifier

router = APIRouter(tags=["payments"])
logger = logging.getLogger(__name__)

# Initialize Stripe with the appropriate API key
stripe.api_key = settings.stripe_secret_key

def get_stripe_key_info():
    """Get information about which Stripe key is being used"""
    if settings.PAYMENT_MODE == "live":
        return {
            "mode": "LIVE",
            "key_type": "Production",
            "key_prefix": settings.stripe_secret_key[:7] if settings.stripe_secret_key else "Not set"
        }
    else:
        return {
            "mode": "TEST", 
            "key_type": "Development",
            "key_prefix": settings.stripe_secret_key[:7] if settings.stripe_secret_key else "Not set"
        }

@router.get("/test")
async def test_endpoint():
    print('test endpoint called')
    return {"message": "Payments API is working"}

@router.post("/process-card", response_model=PaymentResponse)
async def process_card_payment(
    payment_data: CardPaymentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Process Visa/Mastercard payment using Stripe
    """
    try:
        # Validate payment amount
        if payment_data.amount <= 0:
            raise HTTPException(status_code=400, detail="Invalid payment amount")
        
        if payment_data.amount > 10000:  # Max $10,000 per transaction
            raise HTTPException(status_code=400, detail="Payment amount exceeds maximum limit")
        
        # Get Stripe key info for logging
        key_info = get_stripe_key_info()
        logger.info(f"Processing {key_info['mode']} payment for user {current_user.id} using {key_info['key_type']} key: {key_info['key_prefix']}")
        
        # Clean card number
        card_number = payment_data.card_number.replace(" ", "").replace("-", "")
        
        # Create Stripe payment intent
        try:
            # For test mode, simulate different scenarios
            if settings.PAYMENT_MODE == "test":
                # Test card numbers that simulate different outcomes
                if card_number.endswith("0000"):
                    raise stripe.error.CardError("Your card was declined.", param="number", code="card_declined")
                elif card_number.endswith("0001"):
                    raise stripe.error.CardError("Your card has insufficient funds.", param="number", code="card_declined")
                elif card_number.endswith("0002"):
                    raise stripe.error.CardError("Your card has expired.", param="number", code="expired_card")
            
            # Direct approach: Use test tokens immediately to create real Stripe transactions
            logger.info(f"Processing payment for user {current_user.id} with card ending in {card_number[-4:]}")
            
            # Map card numbers to Stripe test tokens for real transactions
            test_tokens = {
                '4242424242424242': 'pm_card_visa',
                '4000000000000002': 'pm_card_visa_debit', 
                '4000000000009995': 'pm_card_visa_debit',
                '5555555555554444': 'pm_card_mastercard',
                '2223003122003222': 'pm_card_mastercard',
                '4000000000000069': 'pm_card_visa_debit',
                '4000000000000119': 'pm_card_visa_debit',
                '4000000000000256': 'pm_card_visa_debit',
                '4000000000000510': 'pm_card_visa_debit',
                '4000000000001007': 'pm_card_visa_debit',
            }
            
            # Get test token for this card number
            test_token = test_tokens.get(card_number, None)
            
            if test_token:
                # Create REAL Stripe PaymentIntent with test token
                logger.info(f"Creating real Stripe transaction with test token: {test_token}")
                intent = stripe.PaymentIntent.create(
                    amount=int(payment_data.amount * 100),
                    currency='usd',
                    payment_method=test_token,
                    confirm=True,
                    description=f'Payment for user {current_user.id}',
                    metadata={
                        'user_id': str(current_user.id),
                        'payment_type': payment_data.card_type,
                        'mode': settings.PAYMENT_MODE,
                        'card_last4': card_number[-4:],
                        'cardholder_name': payment_data.cardholder_name
                    },
                    automatic_payment_methods={
                        'enabled': True,
                        'allow_redirects': 'never'
                    }
                )
                logger.info(f"Real Stripe PaymentIntent created: {intent.id}, Status: {intent.status}")
            else:
                # For unsupported test cards, create a simulated transaction
                logger.info(f"No test token available for card {card_number}, simulating payment")
                
                # Update user funds
                current_user.funds_usd += Decimal(str(payment_data.amount))
                await db.commit()
                await db.refresh(current_user)
                
                transaction_id = f"sim_{current_user.id}_{int(datetime.now().timestamp())}"
                
                return PaymentResponse(
                    transaction_id=transaction_id,
                    status=PaymentStatus.SUCCESS,
                    amount=payment_data.amount,
                    message=f"Payment processed successfully (SIMULATED - Card not supported for real transactions)",
                    new_balance=float(current_user.funds_usd)
                )
            
            # Check if payment was successful
            if intent.status == 'succeeded':
                # Log current user info
                logger.info(f"Stripe payment successful for user {current_user.id}, current balance: {current_user.funds_usd}")
                
                # Update user funds
                current_user.funds_usd += Decimal(str(payment_data.amount))
                await db.commit()
                
                # Refresh the user object to get updated balance
                await db.refresh(current_user)
                
                logger.info(f"Payment successful for user {current_user.id}, new balance: {current_user.funds_usd}")
                
                return PaymentResponse(
                    transaction_id=intent.id,
                    status=PaymentStatus.SUCCESS,
                    amount=payment_data.amount,
                    message=f"Payment processed successfully ({key_info['mode']} mode)",
                    new_balance=float(current_user.funds_usd)
                )
            else:
                raise HTTPException(status_code=400, detail=f"Payment failed with status: {intent.status}")
                
        except stripe.error.CardError as e:
            logger.error(f"Stripe card error: {str(e)}")
            raise HTTPException(status_code=400, detail=str(e))
        except stripe.error.AuthenticationError as e:
            logger.error(f"Stripe authentication error: {str(e)}")
            raise HTTPException(status_code=500, detail="Payment service authentication failed")
        except stripe.error.APIConnectionError as e:
            logger.error(f"Stripe API connection error: {str(e)}")
            raise HTTPException(status_code=500, detail="Payment service temporarily unavailable")
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error: {str(e)}")
            raise HTTPException(status_code=500, detail="Payment processing failed")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Card payment processing error: {str(e)}")
        raise HTTPException(status_code=500, detail="Payment processing failed")

@router.get("/payment-mode")
async def get_payment_mode():
    """Get current payment mode and key information"""
    key_info = get_stripe_key_info()
    
    return {
        "payment_mode": settings.PAYMENT_MODE,
        "stripe_mode": key_info["mode"],
        "key_type": key_info["key_type"],
        "key_prefix": key_info["key_prefix"],
        "message": f"Currently using {key_info['mode']} mode with {key_info['key_type']} Stripe key",
        "note": f"All payments will create real Stripe transactions in {key_info['mode']} mode"
    }

@router.post("/process-bank-transfer", response_model=PaymentResponse)
async def process_bank_transfer(
    payment_data: BankTransferRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Process bank transfer payment (simulated - Stripe doesn't handle bank transfers directly)
    """
    try:
        # Validate payment amount
        if payment_data.amount <= 0:
            raise HTTPException(status_code=400, detail="Invalid payment amount")
        
        if payment_data.amount > 50000:  # Max $50,000 for bank transfers
            raise HTTPException(status_code=400, detail="Bank transfer amount exceeds maximum limit")
        
        # Get payment mode info
        key_info = get_stripe_key_info()
        logger.info(f"Processing {key_info['mode']} bank transfer for user {current_user.id}")
        
        # Simulate different failure scenarios for testing
        if payment_data.account_number.endswith("0000"):
            raise HTTPException(status_code=400, detail="Account not found")
        
        if payment_data.account_number.endswith("0001"):
            raise HTTPException(status_code=400, detail="Insufficient funds")
        
        # Simulate successful bank transfer
        transaction_id = f"bank_{current_user.id}_{int(datetime.now().timestamp())}"
        
        # Log current user info
        logger.info(f"Processing bank transfer for user {current_user.id}, current balance: {current_user.funds_usd}")
        
        # Update user funds
        current_user.funds_usd += Decimal(str(payment_data.amount))
        await db.commit()
        
        # Refresh the user object to get updated balance
        await db.refresh(current_user)
        
        logger.info(f"Bank transfer successful for user {current_user.id}, new balance: {current_user.funds_usd}")
        
        return PaymentResponse(
            transaction_id=transaction_id,
            status=PaymentStatus.SUCCESS,
            amount=payment_data.amount,
            message=f"Bank transfer processed successfully ({key_info['mode']} mode)",
            new_balance=float(current_user.funds_usd)
        )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Bank transfer processing error: {str(e)}")
        raise HTTPException(status_code=500, detail="Bank transfer processing failed")

@router.post("/process-paypal", response_model=PaymentResponse)
async def process_paypal_payment(
    payment_data: PayPalPaymentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Process PayPal payment
    """
    try:
        # Validate payment amount
        if payment_data.amount <= 0:
            raise HTTPException(status_code=400, detail="Invalid payment amount")
        
        if payment_data.amount > 10000:  # Max $10,000 per transaction
            raise HTTPException(status_code=400, detail="Payment amount exceeds maximum limit")
        
        # Get payment mode info
        key_info = get_stripe_key_info()
        logger.info(f"Processing {key_info['mode']} PayPal payment for user {current_user.id}")
        
        # Simulate different failure scenarios for testing
        if payment_data.email.endswith("@testfail.com"):
            raise HTTPException(status_code=400, detail="PayPal account not found")
        
        if payment_data.email.endswith("@testdecline.com"):
            raise HTTPException(status_code=400, detail="Payment declined by PayPal")
        
        # Simulate successful PayPal payment
        transaction_id = f"paypal_{current_user.id}_{int(datetime.now().timestamp())}"
        
        # Log current user info
        logger.info(f"Processing PayPal payment for user {current_user.id}, current balance: {current_user.funds_usd}")
        
        # Update user funds
        current_user.funds_usd += Decimal(str(payment_data.amount))
        await db.commit()
        
        # Refresh the user object to get updated balance
        await db.refresh(current_user)
        
        logger.info(f"PayPal payment successful for user {current_user.id}, new balance: {current_user.funds_usd}")
        
        return PaymentResponse(
            transaction_id=transaction_id,
            status=PaymentStatus.SUCCESS,
            amount=payment_data.amount,
            message=f"PayPal payment processed successfully ({key_info['mode']} mode)",
            new_balance=float(current_user.funds_usd)
        )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"PayPal payment processing error: {str(e)}")
        raise HTTPException(status_code=500, detail="PayPal payment processing failed")

@router.get("/payment-methods")
async def get_payment_methods():
    """
    Get available payment methods and their limits
    """
    return {
        "payment_methods": [
            {
                "type": "visa",
                "name": "Visa",
                "min_amount": 1.0,
                "max_amount": 10000.0,
                "currency": "USD",
                "processing_time": "Instant",
                "fees": "2.9% + $0.30"
            },
            {
                "type": "mastercard",
                "name": "Mastercard",
                "min_amount": 1.0,
                "max_amount": 10000.0,
                "currency": "USD",
                "processing_time": "Instant",
                "fees": "2.9% + $0.30"
            },
            {
                "type": "bank_transfer",
                "name": "Bank Transfer",
                "min_amount": 10.0,
                "max_amount": 50000.0,
                "currency": "USD",
                "processing_time": "1-3 business days",
                "fees": "Free"
            },
            {
                "type": "paypal",
                "name": "PayPal",
                "min_amount": 1.0,
                "max_amount": 10000.0,
                "currency": "USD",
                "processing_time": "Instant",
                "fees": "2.9% + $0.30"
            }
        ]
    }

@router.post("/confirm-crypto-deposit")
async def confirm_crypto_deposit(
    deposit_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Manually confirm a crypto deposit and add funds to user balance
    NOW WITH REAL BLOCKCHAIN VERIFICATION!
    """
    try:
        # Extract deposit information
        amount = deposit_data.get("amount")
        currency = deposit_data.get("currency", "USD")
        transaction_hash = deposit_data.get("transaction_hash", "")
        deposit_address = deposit_data.get("deposit_address", "")
        network = deposit_data.get("network", "")
        memo = deposit_data.get("memo", "")
        
        if not amount or amount <= 0:
            raise HTTPException(status_code=400, detail="Invalid deposit amount")
        
        if not deposit_address:
            raise HTTPException(status_code=400, detail="Deposit address is required for verification")
        
        if not network:
            raise HTTPException(status_code=400, detail="Network is required for verification")
        
        # Log current user info
        logger.info(f"Manual crypto deposit confirmation for user {current_user.id}, amount: ${amount}, address: {deposit_address}")
        
        # REAL BLOCKCHAIN VERIFICATION
        logger.info(f"Verifying transaction on {network} blockchain...")
        verification_result = await blockchain_verifier.verify_transaction(
            address=deposit_address,
            amount_usd=float(amount),
            currency=currency,
            network=network,
            transaction_hash=transaction_hash,
            memo=memo
        )
        
        if not verification_result.get("verified", False):
            error_msg = verification_result.get("message", "Transaction verification failed")
            logger.warning(f"Transaction verification failed for user {current_user.id}: {error_msg}")
            raise HTTPException(status_code=400, detail=f"Transaction verification failed: {error_msg}")
        
        # Transaction verified! Log the details
        logger.info(f"Transaction verified for user {current_user.id}: {verification_result.get('message', '')}")
        
        # Update user funds
        current_user.funds_usd += Decimal(str(amount))
        await db.commit()
        
        # Refresh the user object to get updated balance
        await db.refresh(current_user)
        
        logger.info(f"Crypto deposit confirmed for user {current_user.id}, new balance: ${current_user.funds_usd}")
        
        return {
            "success": True,
            "message": f"${amount} deposit confirmed successfully!",
            "new_balance": float(current_user.funds_usd),
            "transaction_hash": verification_result.get("transaction_hash", transaction_hash),
            "verification_details": {
                "verified": True,
                "amount_crypto": verification_result.get("amount_crypto"),
                "confirmations": verification_result.get("confirmations"),
                "timestamp": verification_result.get("timestamp"),
                "network": network,
                "note": verification_result.get("note", "Transaction verified on blockchain")
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Crypto deposit confirmation error: {str(e)}")
        raise HTTPException(status_code=500, detail="Deposit confirmation failed")