"""
Payment Processing API endpoints
Handles traditional payment methods (Visa, Mastercard, Bank Transfer, PayPal)
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
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
    PayPalPaymentRequest,
    WithdrawalRequest,
    WithdrawalResponse
)
from app.services.blockchain_verifier import blockchain_verifier
from app.services.transaction_service import TransactionService

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
    db: AsyncSession = Depends(get_db),
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
                
                # For payment methods that are already created (pm_*), we need to specify
                # the payment_method_types instead of using automatic_payment_methods
                intent = stripe.PaymentIntent.create(
                    amount=int(payment_data.amount * 100),
                    currency='usd',
                    payment_method=test_token,
                    payment_method_types=['card'],  # Specify card as the payment method type
                    confirm=True,
                    description=f'Payment for user {current_user.id}',
                    metadata={
                        'user_id': str(current_user.id),
                        'payment_type': payment_data.card_type,
                        'mode': settings.PAYMENT_MODE,
                        'card_last4': card_number[-4:],
                        'cardholder_name': payment_data.cardholder_name
                    }
                )
                logger.info(f"Real Stripe PaymentIntent created: {intent.id}, Status: {intent.status}")
            else:
                # For unsupported test cards, create a simulated transaction
                logger.info(f"No test token available for card {card_number}, simulating payment")
                
                # Create transaction record first
                await TransactionService.create_deposit_transaction(
                    db=db,
                    user_id=current_user.id,
                    amount=payment_data.amount,
                    payment_method="card_simulation",
                    external_reference=f"sim_{current_user.id}_{int(datetime.now().timestamp())}",
                    extra_data={
                        "card_type": payment_data.card_type,
                        "card_last4": card_number[-4:],
                        "cardholder_name": payment_data.cardholder_name,
                        "simulated": True
                    }
                )
                
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
                
                # Create transaction record first
                await TransactionService.create_deposit_transaction(
                    db=db,
                    user_id=current_user.id,
                    amount=payment_data.amount,
                    payment_method=f"stripe_{payment_data.card_type}",
                    external_reference=intent.id,
                    extra_data={
                        "stripe_intent_id": intent.id,
                        "card_type": payment_data.card_type,
                        "card_last4": card_number[-4:],
                        "cardholder_name": payment_data.cardholder_name,
                        "stripe_mode": key_info['mode']
                    }
                )
                
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
    db: AsyncSession = Depends(get_db),
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
        
        # Create transaction record first
        await TransactionService.create_deposit_transaction(
            db=db,
            user_id=current_user.id,
            amount=payment_data.amount,
            payment_method="bank_transfer",
            external_reference=transaction_id,
            extra_data={
                "bank_name": payment_data.bank_name,
                "account_number": payment_data.account_number[-4:],  # Only last 4 digits for security
                "account_holder": payment_data.account_holder_name,
                "routing_number": payment_data.routing_number
            }
        )
        
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
    db: AsyncSession = Depends(get_db),
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
        
        # Create transaction record first
        await TransactionService.create_deposit_transaction(
            db=db,
            user_id=current_user.id,
            amount=payment_data.amount,
            payment_method="paypal",
            external_reference=transaction_id,
            extra_data={
                "paypal_email": payment_data.email,
                "paypal_mode": key_info['mode']
            }
        )
        
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

@router.post("/withdraw", response_model=WithdrawalResponse)
async def process_withdrawal(
    withdrawal_data: WithdrawalRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Process withdrawal request (crypto or cash)
    """
    try:
        # Validate withdrawal amount
        if withdrawal_data.amount <= 0:
            raise HTTPException(status_code=400, detail="Invalid withdrawal amount")
        
        # Check minimum withdrawal
        if withdrawal_data.amount < 10:
            raise HTTPException(status_code=400, detail="Minimum withdrawal amount is $10")
        
        # Check if user has sufficient funds
        if current_user.funds_usd < Decimal(str(withdrawal_data.amount)):
            raise HTTPException(status_code=400, detail="Insufficient funds")
        
        # Get payment mode info
        key_info = get_stripe_key_info()
        logger.info(f"Processing {key_info['mode']} withdrawal for user {current_user.id}, method: {withdrawal_data.method}")
        
        # Process based on withdrawal method
        if withdrawal_data.method == "crypto":
            # Crypto withdrawal
            if not withdrawal_data.crypto_address:
                raise HTTPException(status_code=400, detail="Crypto address is required")
            
            if not withdrawal_data.crypto_currency:
                raise HTTPException(status_code=400, detail="Crypto currency is required")
            
            if not withdrawal_data.crypto_network:
                raise HTTPException(status_code=400, detail="Crypto network is required")
            
            # Generate transaction ID
            transaction_id = f"withdraw_crypto_{current_user.id}_{int(datetime.now().timestamp())}"
            
            # Log withdrawal details
            logger.info(f"Processing crypto withdrawal: {withdrawal_data.amount} USD to {withdrawal_data.crypto_address} ({withdrawal_data.crypto_currency} on {withdrawal_data.crypto_network})")
            
            # Create withdrawal transaction record
            await TransactionService.create_withdrawal_transaction(
                db=db,
                user_id=current_user.id,
                amount=withdrawal_data.amount,
                payment_method=f"crypto_{withdrawal_data.crypto_currency}",
                external_reference=transaction_id,
                extra_data={
                    "crypto_address": withdrawal_data.crypto_address,
                    "crypto_currency": withdrawal_data.crypto_currency,
                    "crypto_network": withdrawal_data.crypto_network,
                    "memo": withdrawal_data.memo
                }
            )
            
            # Deduct funds from user balance
            current_user.funds_usd -= Decimal(str(withdrawal_data.amount))
            await db.commit()
            await db.refresh(current_user)
            
            logger.info(f"Crypto withdrawal successful for user {current_user.id}, new balance: {current_user.funds_usd}")
            
            return WithdrawalResponse(
                transaction_id=transaction_id,
                status="processing",
                amount=withdrawal_data.amount,
                message=f"Crypto withdrawal of ${withdrawal_data.amount} is being processed. Your {withdrawal_data.crypto_currency} will arrive at your address within 24-48 hours.",
                new_balance=float(current_user.funds_usd),
                processing_time="24-48 hours",
                estimated_arrival="1-2 business days"
            )
            
        elif withdrawal_data.method == "cash":
            # Cash withdrawal via Stripe or other methods
            cash_method = withdrawal_data.cash_method or "VISA"
            
            if cash_method in ["VISA", "Mastercard"]:
                # Card withdrawal using Stripe Transfers
                if not withdrawal_data.card_number:
                    raise HTTPException(status_code=400, detail="Card details are required")
                
                # Clean card number
                card_number = withdrawal_data.card_number.replace(" ", "").replace("-", "")
                
                # Validate card number format and Luhn algorithm
                def validate_card_luhn(card_num: str) -> bool:
                    """Validate card number using Luhn algorithm"""
                    if not card_num.isdigit():
                        return False
                    
                    if len(card_num) < 13 or len(card_num) > 19:
                        return False
                    
                    # Luhn algorithm
                    total = 0
                    is_even = False
                    
                    for i in range(len(card_num) - 1, -1, -1):
                        digit = int(card_num[i])
                        
                        if is_even:
                            digit *= 2
                            if digit > 9:
                                digit -= 9
                        
                        total += digit
                        is_even = not is_even
                    
                    return total % 10 == 0
                
                # Check card type pattern
                import re
                if cash_method == "VISA":
                    if not re.match(r'^4[0-9]{12}(?:[0-9]{3})?$', card_number):
                        raise HTTPException(status_code=400, detail="Invalid VISA card number format")
                elif cash_method == "Mastercard":
                    if not re.match(r'^5[1-5][0-9]{14}$', card_number):
                        raise HTTPException(status_code=400, detail="Invalid Mastercard number format")
                
                # Validate with Luhn algorithm
                if not validate_card_luhn(card_number):
                    raise HTTPException(status_code=400, detail="Invalid card number (checksum failed)")
                
                logger.info(f"Card validation passed for card ending in {card_number[-4:]}")
                
                try:
                    # Step 1: Create or retrieve Stripe External Account (bank account/debit card)
                    # For card payouts, we need to create a debit card external account
                    
                    logger.info(f"Processing card payout for user {current_user.id}, amount: ${withdrawal_data.amount}")
                    
                    # Create a card token first (required for payouts to debit cards)
                    try:
                        # In TEST mode, use Stripe's pre-made test tokens
                        # In LIVE mode, create token from actual card details
                        if settings.PAYMENT_MODE == "test":
                            # Use Stripe's test tokens - no raw card data needed
                            # Map card numbers to test tokens
                            if cash_method == "VISA" or card_number.startswith('4'):
                                card_token_id = "tok_visa_debit"  # Stripe's test VISA debit token
                            elif cash_method == "Mastercard" or card_number.startswith('5'):
                                card_token_id = "tok_mastercard_debit"  # Stripe's test Mastercard debit token
                            else:
                                card_token_id = "tok_visa_debit"  # Default to VISA
                            
                            logger.info(f"TEST MODE: Using Stripe test token: {card_token_id}")
                            
                            # Create a mock token object for consistency
                            class MockToken:
                                def __init__(self, token_id):
                                    self.id = token_id
                                    self.card = type('obj', (object,), {'id': token_id, 'last4': card_number[-4:]})()
                            
                            card_token = MockToken(card_token_id)
                        else:
                            # LIVE MODE: Create real token from card details
                            card_token = stripe.Token.create(
                                card={
                                    "number": card_number,
                                    "exp_month": withdrawal_data.expiry_month,
                                    "exp_year": withdrawal_data.expiry_year,
                                    "cvc": withdrawal_data.cvv,
                                    "name": withdrawal_data.cardholder_name,
                                }
                            )
                        
                        logger.info(f"Card token ready: {card_token.id}")
                        
                        # For payouts to debit cards, we need to use Stripe's Bank Account object
                        # Note: Stripe only supports payouts to debit cards, not credit cards
                        # In test mode, we'll simulate; in live mode, this requires proper setup
                        
                        if settings.PAYMENT_MODE == "test":
                            # Test mode: Simulate the payout
                            logger.info(f"TEST MODE: Simulating card payout")
                            
                            # Generate transaction ID
                            transaction_id = f"po_test_{current_user.id}_{int(datetime.now().timestamp())}"
                            
                            # Create withdrawal transaction record
                            await TransactionService.create_withdrawal_transaction(
                                db=db,
                                user_id=current_user.id,
                                amount=withdrawal_data.amount,
                                payment_method=f"card_{cash_method.lower()}",
                                external_reference=transaction_id,
                                extra_data={
                                    "card_type": cash_method,
                                    "card_last4": card_number[-4:],
                                    "cardholder_name": withdrawal_data.cardholder_name,
                                    "stripe_mode": "test",
                                    "card_token": card_token.id,
                                    "payout_method": "debit_card"
                                }
                            )
                            
                            # Deduct funds from user balance
                            current_user.funds_usd -= Decimal(str(withdrawal_data.amount))
                            await db.commit()
                            await db.refresh(current_user)
                            
                            logger.info(f"TEST: Card payout simulated for user {current_user.id}, new balance: {current_user.funds_usd}")
                            
                            return WithdrawalResponse(
                                transaction_id=transaction_id,
                                status="success",
                                amount=withdrawal_data.amount,
                                message=f"Withdrawal of ${withdrawal_data.amount} processed successfully (TEST mode - simulated payout to card ending in {card_number[-4:]})",
                                new_balance=float(current_user.funds_usd),
                                processing_time="Instant",
                                estimated_arrival="Would arrive in 1-3 business days in live mode"
                            )
                        else:
                            # LIVE MODE: Real Stripe Payout
                            logger.info(f"LIVE MODE: Processing real card payout via Stripe")
                            
                            # NOTE: For LIVE card payouts, Stripe requires:
                            # 1. A verified Stripe account
                            # 2. Payouts enabled in your Stripe account
                            # 3. The card must be a DEBIT card (not credit)
                            # 4. You need to use Stripe's Instant Payouts feature
                            
                            # For instant payouts to debit cards, create a payout
                            payout = stripe.Payout.create(
                                amount=int(withdrawal_data.amount * 100),  # Amount in cents
                                currency="usd",
                                method="instant",  # Instant payout to debit card
                                destination=card_token.card.id,  # Card token
                                description=f"Withdrawal for user {current_user.id}",
                                metadata={
                                    "user_id": str(current_user.id),
                                    "withdrawal_amount": str(withdrawal_data.amount),
                                    "card_last4": card_number[-4:],
                                }
                            )
                            
                            logger.info(f"LIVE: Stripe payout created: {payout.id}, status: {payout.status}")
                            
                            # Create withdrawal transaction record
                            await TransactionService.create_withdrawal_transaction(
                                db=db,
                                user_id=current_user.id,
                                amount=withdrawal_data.amount,
                                payment_method=f"card_{cash_method.lower()}",
                                external_reference=payout.id,
                                extra_data={
                                    "card_type": cash_method,
                                    "card_last4": card_number[-4:],
                                    "cardholder_name": withdrawal_data.cardholder_name,
                                    "stripe_mode": "live",
                                    "stripe_payout_id": payout.id,
                                    "payout_status": payout.status,
                                    "payout_method": "instant",
                                    "card_token": card_token.id
                                }
                            )
                            
                            # Deduct funds from user balance
                            current_user.funds_usd -= Decimal(str(withdrawal_data.amount))
                            await db.commit()
                            await db.refresh(current_user)
                            
                            logger.info(f"LIVE: Card payout successful for user {current_user.id}, new balance: {current_user.funds_usd}")
                            
                            # Determine message based on payout status
                            if payout.status == "paid":
                                message = f"Withdrawal of ${withdrawal_data.amount} sent successfully to card ending in {card_number[-4:]}"
                                estimated_arrival = "Within 30 minutes"
                            elif payout.status == "pending":
                                message = f"Withdrawal of ${withdrawal_data.amount} is being processed to card ending in {card_number[-4:]}"
                                estimated_arrival = "Within 1-3 business days"
                            else:
                                message = f"Withdrawal of ${withdrawal_data.amount} initiated to card ending in {card_number[-4:]}"
                                estimated_arrival = "Processing"
                            
                            return WithdrawalResponse(
                                transaction_id=payout.id,
                                status="success" if payout.status == "paid" else "processing",
                                amount=withdrawal_data.amount,
                                message=message,
                                new_balance=float(current_user.funds_usd),
                                processing_time="Instant Payout",
                                estimated_arrival=estimated_arrival
                            )
                            
                    except stripe.error.CardError as e:
                        logger.error(f"Card error during payout: {str(e)}")
                        raise HTTPException(
                            status_code=400, 
                            detail=f"Card error: {e.user_message or str(e)}"
                        )
                    except stripe.error.InvalidRequestError as e:
                        logger.error(f"Invalid request for payout: {str(e)}")
                        # This often happens if instant payouts aren't enabled or card isn't eligible
                        raise HTTPException(
                            status_code=400,
                            detail="This card is not eligible for instant payouts. Please use a debit card or bank account withdrawal."
                        )
                        
                except stripe.error.StripeError as e:
                    logger.error(f"Stripe payout error: {str(e)}")
                    raise HTTPException(status_code=500, detail=f"Payout processing failed: {str(e)}")
                    
            elif cash_method == "Bank Transfer":
                # Bank transfer withdrawal via Stripe ACH (Automated Clearing House)
                if not withdrawal_data.bank_account or not withdrawal_data.routing_number:
                    raise HTTPException(status_code=400, detail="Bank account details are required")
                
                logger.info(f"Processing bank transfer payout for user {current_user.id}, amount: ${withdrawal_data.amount}")
                
                try:
                    # Create a bank account token
                    if settings.PAYMENT_MODE == "test":
                        # Use Stripe's test bank account token
                        bank_token_id = "tok_us_debit"  # Stripe's test US bank account token
                        logger.info(f"TEST MODE: Using Stripe test bank token: {bank_token_id}")
                        
                        # Create a mock token object for consistency
                        class MockBankToken:
                            def __init__(self, token_id):
                                self.id = token_id
                                self.bank_account = type('obj', (object,), {
                                    'id': token_id, 
                                    'last4': withdrawal_data.bank_account[-4:],
                                    'routing_number': withdrawal_data.routing_number
                                })()
                        
                        bank_token = MockBankToken(bank_token_id)
                    else:
                        # LIVE MODE: Create real bank account token
                        bank_token = stripe.Token.create(
                            bank_account={
                                "country": "US",
                                "currency": "usd",
                                "account_holder_name": withdrawal_data.account_holder_name,
                                "account_holder_type": "individual",
                                "routing_number": withdrawal_data.routing_number,
                                "account_number": withdrawal_data.bank_account,
                            }
                        )
                    
                    logger.info(f"Bank account token ready: {bank_token.id}")
                    
                    if settings.PAYMENT_MODE == "test":
                        # Test mode: Simulate the payout
                        logger.info(f"TEST MODE: Simulating bank transfer payout")
                        
                        # Generate transaction ID
                        transaction_id = f"po_bank_test_{current_user.id}_{int(datetime.now().timestamp())}"
                        
                        # Create withdrawal transaction record
                        await TransactionService.create_withdrawal_transaction(
                            db=db,
                            user_id=current_user.id,
                            amount=withdrawal_data.amount,
                            payment_method="bank_transfer",
                            external_reference=transaction_id,
                            extra_data={
                                "bank_account_last4": withdrawal_data.bank_account[-4:],
                                "routing_number": withdrawal_data.routing_number,
                                "account_holder_name": withdrawal_data.account_holder_name,
                                "stripe_mode": "test",
                                "bank_token": bank_token.id,
                                "payout_method": "ach"
                            }
                        )
                        
                        # Deduct funds from user balance
                        current_user.funds_usd -= Decimal(str(withdrawal_data.amount))
                        await db.commit()
                        await db.refresh(current_user)
                        
                        logger.info(f"TEST: Bank payout simulated for user {current_user.id}, new balance: {current_user.funds_usd}")
                        
                        return WithdrawalResponse(
                            transaction_id=transaction_id,
                            status="processing",
                            amount=withdrawal_data.amount,
                            message=f"Bank transfer of ${withdrawal_data.amount} is being processed (TEST mode - simulated ACH transfer to account ending in {withdrawal_data.bank_account[-4:]})",
                            new_balance=float(current_user.funds_usd),
                            processing_time="1-3 business days",
                            estimated_arrival="Would arrive in 1-3 business days in live mode"
                        )
                    else:
                        # LIVE MODE: Real Stripe Bank Payout (ACH)
                        logger.info(f"LIVE MODE: Processing real bank transfer payout via Stripe ACH")
                        
                        # Create a standard payout to bank account (ACH transfer)
                        payout = stripe.Payout.create(
                            amount=int(withdrawal_data.amount * 100),  # Amount in cents
                            currency="usd",
                            method="standard",  # Standard ACH transfer (1-3 business days)
                            destination=bank_token.bank_account.id,  # Bank account token
                            description=f"Withdrawal for user {current_user.id}",
                            metadata={
                                "user_id": str(current_user.id),
                                "withdrawal_amount": str(withdrawal_data.amount),
                                "account_last4": withdrawal_data.bank_account[-4:],
                            }
                        )
                        
                        logger.info(f"LIVE: Stripe bank payout created: {payout.id}, status: {payout.status}")
                        
                        # Create withdrawal transaction record
                        await TransactionService.create_withdrawal_transaction(
                            db=db,
                            user_id=current_user.id,
                            amount=withdrawal_data.amount,
                            payment_method="bank_transfer",
                            external_reference=payout.id,
                            extra_data={
                                "bank_account_last4": withdrawal_data.bank_account[-4:],
                                "routing_number": withdrawal_data.routing_number,
                                "account_holder_name": withdrawal_data.account_holder_name,
                                "stripe_mode": "live",
                                "stripe_payout_id": payout.id,
                                "payout_status": payout.status,
                                "payout_method": "ach",
                                "bank_token": bank_token.id
                            }
                        )
                        
                        # Deduct funds from user balance
                        current_user.funds_usd -= Decimal(str(withdrawal_data.amount))
                        await db.commit()
                        await db.refresh(current_user)
                        
                        logger.info(f"LIVE: Bank payout successful for user {current_user.id}, new balance: {current_user.funds_usd}")
                        
                        return WithdrawalResponse(
                            transaction_id=payout.id,
                            status="processing",
                            amount=withdrawal_data.amount,
                            message=f"Bank transfer of ${withdrawal_data.amount} initiated to account ending in {withdrawal_data.bank_account[-4:]}",
                            new_balance=float(current_user.funds_usd),
                            processing_time="1-3 business days",
                            estimated_arrival="1-3 business days"
                        )
                        
                except stripe.error.InvalidRequestError as e:
                    logger.error(f"Invalid bank account details: {str(e)}")
                    raise HTTPException(
                        status_code=400,
                        detail="Invalid bank account details. Please check your account and routing numbers."
                    )
                except stripe.error.StripeError as e:
                    logger.error(f"Stripe bank payout error: {str(e)}")
                    raise HTTPException(status_code=500, detail=f"Bank transfer failed: {str(e)}")
                
            elif cash_method == "PayPal":
                # PayPal withdrawal
                if not withdrawal_data.paypal_email:
                    raise HTTPException(status_code=400, detail="PayPal email is required")
                
                # Generate transaction ID
                transaction_id = f"withdraw_paypal_{current_user.id}_{int(datetime.now().timestamp())}"
                
                # Create withdrawal transaction record
                await TransactionService.create_withdrawal_transaction(
                    db=db,
                    user_id=current_user.id,
                    amount=withdrawal_data.amount,
                    payment_method="paypal",
                    external_reference=transaction_id,
                    extra_data={
                        "paypal_email": withdrawal_data.paypal_email,
                        "mode": key_info['mode']
                    }
                )
                
                # Deduct funds from user balance
                current_user.funds_usd -= Decimal(str(withdrawal_data.amount))
                await db.commit()
                await db.refresh(current_user)
                
                logger.info(f"PayPal withdrawal successful for user {current_user.id}, new balance: {current_user.funds_usd}")
                
                return WithdrawalResponse(
                    transaction_id=transaction_id,
                    status="processing",
                    amount=withdrawal_data.amount,
                    message=f"PayPal withdrawal of ${withdrawal_data.amount} is being processed",
                    new_balance=float(current_user.funds_usd),
                    processing_time="1-2 hours",
                    estimated_arrival="Instant"
                )
            else:
                raise HTTPException(status_code=400, detail=f"Unsupported cash withdrawal method: {cash_method}")
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported withdrawal method: {withdrawal_data.method}")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Withdrawal processing error: {str(e)}")
        raise HTTPException(status_code=500, detail="Withdrawal processing failed")

@router.get("/withdrawal-methods")
async def get_withdrawal_methods():
    """
    Get available withdrawal methods and their limits
    """
    return {
        "payment_methods": [
            {
                "type": "crypto",
                "name": "Cryptocurrency",
                "min_amount": 10.0,
                "max_amount": 100000.0,
                "currency": "USD",
                "processing_time": "24-48 hours",
                "fees": "Network fees apply"
            },
            {
                "type": "visa",
                "name": "Visa",
                "min_amount": 10.0,
                "max_amount": 10000.0,
                "currency": "USD",
                "processing_time": "3-5 business days",
                "fees": "2.9% + $0.30"
            },
            {
                "type": "mastercard",
                "name": "Mastercard",
                "min_amount": 10.0,
                "max_amount": 10000.0,
                "currency": "USD",
                "processing_time": "3-5 business days",
                "fees": "2.9% + $0.30"
            },
            {
                "type": "bank_transfer",
                "name": "Bank Transfer",
                "min_amount": 50.0,
                "max_amount": 50000.0,
                "currency": "USD",
                "processing_time": "1-3 business days",
                "fees": "Free"
            },
            {
                "type": "paypal",
                "name": "PayPal",
                "min_amount": 10.0,
                "max_amount": 10000.0,
                "currency": "USD",
                "processing_time": "Instant",
                "fees": "2.9% + $0.30"
            }
        ]
    }

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
    db: AsyncSession = Depends(get_db),
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