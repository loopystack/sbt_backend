from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from datetime import datetime, timedelta
import secrets
import qrcode
import io
import base64
import json
import hmac
import hashlib

from app.core.database import get_db
from app.core.deps import get_current_user, get_current_superuser
from app.models.deposit import DepositIntent, CryptoInventory, UserCryptoBalance
from app.schemas.deposit import (
    DepositIntentCreate, 
    DepositIntentResponse, 
    DepositStatusResponse,
    CryptoAsset,
    DepositConfirmRequest
)
from app.services.address_generator import AddressGenerator
from app.services.compliance_service import compliance_service
from app.services.deposit_service import deposit_service
from decimal import Decimal
from pydantic import BaseModel

router = APIRouter(prefix="/api/deposits", tags=["deposits"])

# Supported crypto assets and their networks
SUPPORTED_ASSETS = {
    "USDT": {
        "networks": ["TRC20"],  # Only TRC20 is supported for USDT deposits
        "required_confirmations": 2,  # TRC20 requires 2 confirmations
        "memo_required": False
    },
    "USDC": {
        "networks": ["Ethereum", "Polygon", "Base", "BSC"],
        "required_confirmations": 12,
        "memo_required": False
    },
    "BNB": {
        "networks": ["BSC"],
        "required_confirmations": 1,
        "memo_required": False
    },
    "TRX": {
        "networks": ["TRC20"],  # TRX uses TRC20 network (TRON blockchain)
        "required_confirmations": 1,
        "memo_required": False
    },
    "BTC": {
        "networks": ["Bitcoin"],
        "required_confirmations": 1,
        "memo_required": False
    }
}

@router.post("/initiate", response_model=DepositIntentResponse)
async def initiate_deposit(
    deposit_data: DepositIntentCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Create a new deposit intent with a unique address for the user
    """
    # Validate asset and network
    if deposit_data.asset not in SUPPORTED_ASSETS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported asset: {deposit_data.asset}"
        )
    
    if deposit_data.network not in SUPPORTED_ASSETS[deposit_data.asset]["networks"]:
        raise HTTPException(
            status_code=400,
            detail=f"Network {deposit_data.network} not supported for {deposit_data.asset}"
        )
    
    # Check compliance limits
    compliance_check = await compliance_service.check_deposit_limits(
        user_id=current_user.id,
        deposit_amount=deposit_data.amount_usd,
        db=db
    )
    
    if not compliance_check.get("allowed"):
        raise HTTPException(
            status_code=403,
            detail=compliance_check.get("reason", "Deposit limit exceeded")
        )
    
    # Generate unique address and memo if needed
    address_generator = AddressGenerator()
    generated_address, memo = await address_generator.generate_address(
        asset=deposit_data.asset,
        network=deposit_data.network,
        user_id=current_user.id,
        db=db
    )
    
    # Create deposit intent
    deposit_intent = DepositIntent(
        user_id=current_user.id,
        asset=deposit_data.asset,
        network=deposit_data.network,
        amount_quote_fiat=deposit_data.amount_usd,
        generated_address=generated_address,
        memo=memo,
        expires_at=datetime.utcnow() + timedelta(hours=24),  # 24 hour expiry
        required_confirmations=SUPPORTED_ASSETS[deposit_data.asset]["required_confirmations"],
        status="pending"
    )
    
    db.add(deposit_intent)
    await db.commit()
    await db.refresh(deposit_intent)
    
    # Generate QR code
    qr_data = f"{generated_address}"
    if memo:
        qr_data += f"?memo={memo}"
    
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(qr_data)
    qr.make(fit=True)
    
    qr_image = qr.make_image(fill_color="black", back_color="white")
    qr_buffer = io.BytesIO()
    qr_image.save(qr_buffer, format='PNG')
    qr_base64 = base64.b64encode(qr_buffer.getvalue()).decode()
    
    # Get explorer URL
    explorer_url = get_explorer_url(deposit_data.asset, deposit_data.network, generated_address)
    
    return DepositIntentResponse(
        id=deposit_intent.id,
        asset=deposit_intent.asset,
        network=deposit_intent.network,
        address=generated_address,
        memo=memo,
        amount_usd=deposit_data.amount_usd,
        qr_code=qr_base64,
        explorer_url=explorer_url,
        required_confirmations=deposit_intent.required_confirmations,
        expires_at=deposit_intent.expires_at,
        status=deposit_intent.status
    )


@router.post("/confirm")
async def confirm_deposit(
    confirm_data: DepositConfirmRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_superuser)  # Admin/internal endpoint
):
    """
    Confirm a deposit and credit user balance
    Internal/admin endpoint for testing or manual confirmation
    Idempotent: same tx_hash will not credit twice
    
    Expected JSON body:
    {
        "deposit_id": 1,
        "tx_hash": "abc123...",
        "amount_crypto": 100.00,
        "amount_usd": 100.00
    }
    """
    try:
        result = await deposit_service.confirm_deposit(
            deposit_intent_id=confirm_data.deposit_id,
            tx_hash=confirm_data.tx_hash,
            amount_crypto=confirm_data.amount_crypto,
            amount_usd=confirm_data.amount_usd,
            db=db
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to confirm deposit: {str(e)}"
        )


@router.get("/status/{deposit_id}", response_model=DepositStatusResponse)
async def get_deposit_status(
    deposit_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get the current status of a deposit intent
    """
    deposit_intent = db.query(DepositIntent).filter(
        DepositIntent.id == deposit_id,
        DepositIntent.user_id == current_user.id
    ).first()
    
    if not deposit_intent:
        raise HTTPException(
            status_code=404,
            detail="Deposit intent not found"
        )
    
    return DepositStatusResponse(
        id=deposit_intent.id,
        status=deposit_intent.status,
        confirmations=deposit_intent.confirmations,
        required_confirmations=deposit_intent.required_confirmations,
        tx_hash=deposit_intent.tx_hash,
        expires_at=deposit_intent.expires_at,
        settled_at=deposit_intent.settled_at
    )

@router.get("/supported-assets", response_model=List[CryptoAsset])
async def get_supported_assets():
    """
    Get list of supported crypto assets and their networks
    """
    assets = []
    for asset, config in SUPPORTED_ASSETS.items():
        assets.append(CryptoAsset(
            asset=asset,
            networks=config["networks"],
            memo_required=config["memo_required"]
        ))
    
    return assets

@router.get("/history")
async def get_deposit_history(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
    limit: int = 50,
    offset: int = 0
):
    """
    Get user's deposit history
    Returns: amount, tx_hash, status, created_at, updated_at, network, address
    """
    from sqlalchemy import select, and_
    
    stmt = select(DepositIntent).where(
        DepositIntent.user_id == current_user.id
    ).order_by(DepositIntent.created_at.desc()).offset(offset).limit(limit)
    
    result = await db.execute(stmt)
    deposits = result.scalars().all()
    
    return [
        {
            "id": deposit.id,
            "asset": deposit.asset,
            "network": deposit.network,
            "address": deposit.generated_address,
            "amount_usd": float(deposit.amount_quote_fiat),
            "amount_crypto": float(deposit.amount_crypto) if deposit.amount_crypto else None,
            "status": deposit.status,
            "confirmations": deposit.confirmations,
            "required_confirmations": deposit.required_confirmations,
            "tx_hash": deposit.tx_hash,
            "created_at": deposit.created_at.isoformat() if deposit.created_at else None,
            "updated_at": deposit.updated_at.isoformat() if deposit.updated_at else None,
            "detected_at": deposit.detected_at.isoformat() if deposit.detected_at else None,
            "confirmed_at": deposit.confirmed_at.isoformat() if deposit.confirmed_at else None,
            "settled_at": deposit.settled_at.isoformat() if deposit.settled_at else None,
            "expires_at": deposit.expires_at.isoformat() if deposit.expires_at else None
        }
        for deposit in deposits
    ]

def get_explorer_url(asset: str, network: str, address: str) -> str:
    """
    Get blockchain explorer URL for the given address
    """
    explorer_urls = {
        "USDT": {
            "Ethereum": f"https://etherscan.io/address/{address}",
            "TRON": f"https://tronscan.org/#/address/{address}",
            "Polygon": f"https://polygonscan.com/address/{address}",
            "BSC": f"https://bscscan.com/address/{address}"
        },
        "USDC": {
            "Ethereum": f"https://etherscan.io/address/{address}",
            "Polygon": f"https://polygonscan.com/address/{address}",
            "Base": f"https://basescan.org/address/{address}",
            "BSC": f"https://bscscan.com/address/{address}"
        },
        "BNB": {
            "BSC": f"https://bscscan.com/address/{address}"
        },
        "TRX": {
            "TRON": f"https://tronscan.org/#/address/{address}"
        },
        "BTC": {
            "Bitcoin": f"https://blockstream.info/address/{address}"
        }
    }
    
    return explorer_urls.get(asset, {}).get(network, "")

# Cryptomus Integration
CRYPTOMUS_API_KEY = "Qbrsscrs0n3TXxb66HdluJNGKa3dslIXn8tFjzjrxBGIJ4MO4epbuKq6nXFhyHgbYiZd3R1PPO9Jp4pdPUREG68DEgByxB8rDRlIfYEslxpCkvpmNNf62WKEK1vjuO7E"

# Coinbase Commerce Configuration
COINBASE_API_KEY = "2c840e42-be66-4f1f-9d75-ea9861a56bdd"
COINBASE_BASE_URL = "https://api.commerce.coinbase.com"
COINBASE_IS_TEST_MODE = True  # Test mode for safe development


def verify_cryptomus_signature(payload: str, signature: str) -> bool:
    """
    Verify Cryptomus webhook signature
    """
    try:
        expected_signature = hmac.new(
            CRYPTOMUS_API_KEY.encode(),
            payload.encode(),
            hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(signature, expected_signature)
    except Exception:
        return False

@router.post("/cryptomus/create-payment")
async def create_cryptomus_payment(
    request_data: dict,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Create a Cryptomus payment via backend proxy (to avoid CORS issues)
    """
    try:
        import requests
        
        # Extract payment data
        amount = request_data.get("amount")
        currency = request_data.get("currency")
        order_id = request_data.get("order_id")
        url_return = request_data.get("url_return")
        url_callback = request_data.get("url_callback")
        lifetime = request_data.get("lifetime", 3600)
        additional_data = request_data.get("additional_data", "")
        
        # Prepare payload for Cryptomus
        payload = {
            "amount": str(amount),
            "currency": currency,
            "order_id": order_id,
            "url_return": url_return,
            "url_callback": url_callback,
            "lifetime": lifetime,
            "additional_data": additional_data
        }
        
        # Convert to JSON and encode
        json_data = json.dumps(payload, separators=(',', ':'))
        encoded_data = base64.b64encode(json_data.encode()).decode()
        
        # Generate signature
        sign = hashlib.md5((encoded_data + CRYPTOMUS_API_KEY).encode()).hexdigest()
        
        # Set headers
        headers = {
            'merchant': '323420be-657e-49b8-b061-128344a29bd6',
            'sign': sign,
            'Content-Type': 'application/json'
        }
        
        # Debug logging
        print(f"DEBUG: Sending to Cryptomus API:")
        print(f"URL: https://api.cryptomus.com/v1/payment")
        print(f"Headers: {headers}")
        print(f"Payload: {json_data}")
        print(f"Encoded data: {encoded_data}")
        print(f"Signature: {sign}")
        
        # Use real Cryptomus API (account is active!)
        response = requests.post(
            'https://api.cryptomus.com/v1/payment',
            headers=headers,
            data=json_data,
            timeout=30
        )
        
        print(f"DEBUG: Cryptomus response status: {response.status_code}")
        print(f"DEBUG: Cryptomus response text: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            return data
        else:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Cryptomus API error: {response.text}"
            )
            
    except Exception as e:
        print(f"Cryptomus payment creation error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create payment: {str(e)}"
        )

# Coinbase Commerce Integration
@router.post("/coinbase/create-payment")
async def create_coinbase_payment(
    request_data: dict,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Create a Coinbase Commerce payment via backend proxy
    """
    try:
        import requests
        
        # Extract payment data
        name = request_data.get("name", "Deposit Payment")
        description = request_data.get("description", "Deposit Payment")
        local_price = request_data.get("local_price", {})
        metadata = request_data.get("metadata", {})
        redirect_url = request_data.get("redirect_url")
        cancel_url = request_data.get("cancel_url")
        
        # Prepare payload for Coinbase Commerce
        payload = {
            "name": name,
            "description": description,
            "local_price": local_price,
            "pricing_type": "fixed_price",
            "metadata": metadata,
            "redirect_url": redirect_url,
            "cancel_url": cancel_url
        }
        
        # Set headers for Coinbase Commerce
        headers = {
            'X-CC-Api-Key': COINBASE_API_KEY,
            'Content-Type': 'application/json'
        }
        
        print(f"DEBUG: Coinbase Commerce request URL: {COINBASE_BASE_URL}/charges")
        print(f"DEBUG: Coinbase Commerce headers: {headers}")
        print(f"DEBUG: Coinbase Commerce payload: {payload}")
        print(f"DEBUG: Coinbase Commerce API Key: {COINBASE_API_KEY}")
        print(f"DEBUG: Coinbase Commerce API Key length: {len(COINBASE_API_KEY)}")
        
        # Send request to Coinbase Commerce
        response = requests.post(
            f'{COINBASE_BASE_URL}/charges',
            headers=headers,
            json=payload,
            timeout=30
        )
        
        print(f"DEBUG: Coinbase Commerce response status: {response.status_code}")
        print(f"DEBUG: Coinbase Commerce response text: {response.text}")
        
        if response.status_code == 201:
            data = response.json()
            return data
        else:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Coinbase Commerce API error: {response.text}"
            )
            
    except Exception as e:
        print(f"Coinbase Commerce payment creation error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create Coinbase Commerce payment: {str(e)}"
        )

@router.get("/coinbase/payment-status/{payment_id}")
async def get_coinbase_payment_status(
    payment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get Coinbase Commerce payment status
    """
    try:
        import requests
        
        # Set headers for Coinbase Commerce
        headers = {
            'X-CC-Api-Key': COINBASE_API_KEY,
            'Content-Type': 'application/json'
        }
        
        # Get payment status from Coinbase Commerce
        response = requests.get(
            f'{COINBASE_BASE_URL}/charges/{payment_id}',
            headers=headers,
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            return data
        else:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Coinbase Commerce API error: {response.text}"
            )
            
    except Exception as e:
        print(f"Coinbase Commerce payment status error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get Coinbase Commerce payment status: {str(e)}"
        )

@router.post("/coinbase/webhook")
async def coinbase_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Handle Coinbase Commerce webhook notifications
    """
    try:
        body = await request.body()
        data = json.loads(body.decode())
        
        print(f"DEBUG: Coinbase Commerce webhook received: {data}")
        
        # Extract payment information
        charge_id = data.get("id")
        event_type = data.get("type")
        amount = data.get("pricing", {}).get("local", {}).get("amount")
        currency = data.get("pricing", {}).get("local", {}).get("currency")
        
        if event_type == "charge:confirmed":
            # Payment completed - update user balance
            print(f"Payment completed: {charge_id}, Amount: {amount} {currency}")
            
            # TODO: Update user balance in database
            # TODO: Create transaction record
            
        return {"status": "success"}
        
    except Exception as e:
        print(f"Coinbase Commerce webhook error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process Coinbase Commerce webhook: {str(e)}"
        )

@router.post("/cryptomus/callback")
async def cryptomus_callback(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Handle Cryptomus payment callback/webhook
    """
    try:
        # Get raw body and signature
        body = await request.body()
        signature = request.headers.get("sign", "")
        
        # Verify signature
        if not verify_cryptomus_signature(body.decode(), signature):
            raise HTTPException(status_code=400, detail="Invalid signature")
        
        # Parse payload
        payload = json.loads(body.decode())
        
        # Extract payment data
        payment_data = payload.get("result", {})
        order_id = payment_data.get("order_id", "")
        payment_status = payment_data.get("payment_status", "")
        amount = float(payment_data.get("payment_amount_usd", 0))
        currency = payment_data.get("currency", "")
        tx_hash = payment_data.get("txid", "")
        
        # Extract user info from additional_data
        additional_data = payment_data.get("additional_data", "")
        try:
            user_data = json.loads(additional_data) if additional_data else {}
            user_id = user_data.get("user_id")
        except:
            user_id = None
        
        if not user_id:
            raise HTTPException(status_code=400, detail="User ID not found in payment data")
        
        # Check if payment is completed
        if payment_status == "paid":
            # Find user by ID
            from app.models.user import User
            user = db.query(User).filter(User.id == user_id).first()
            
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            # Add funds to user account
            from app.models.wallet import UserWallet
            wallet = db.query(UserWallet).filter(UserWallet.user_id == user_id).first()
            
            if wallet:
                wallet.balance += amount
                wallet.updated_at = datetime.utcnow()
            else:
                # Create wallet if it doesn't exist
                wallet = UserWallet(
                    user_id=user_id,
                    balance=amount,
                    currency="USD",
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                db.add(wallet)
            
            # Create deposit record
            deposit_intent = DepositIntent(
                user_id=user_id,
                asset=currency,
                network="Cryptomus",  # Using Cryptomus as network
                amount_quote_fiat=amount,
                generated_address="",  # Not applicable for Cryptomus
                memo="",
                tx_hash=tx_hash,
                status="completed",
                confirmations=1,  # Cryptomus handles confirmations
                required_confirmations=1,
                settled_at=datetime.utcnow(),
                created_at=datetime.utcnow()
            )
            db.add(deposit_intent)
            
            db.commit()
            
            return {"status": "success", "message": "Payment processed successfully"}
        
        elif payment_status == "failed":
            # Handle failed payment
            return {"status": "failed", "message": "Payment failed"}
        
        else:
            # Handle other statuses (pending, etc.)
            return {"status": "pending", "message": f"Payment status: {payment_status}"}
    
    except Exception as e:
        print(f"Cryptomus callback error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")
