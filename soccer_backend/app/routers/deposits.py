from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
import secrets
import qrcode
import io
import base64

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.deposit import DepositIntent, CryptoInventory, UserCryptoBalance
from app.schemas.deposit import (
    DepositIntentCreate, 
    DepositIntentResponse, 
    DepositStatusResponse,
    CryptoAsset
)
from app.services.address_generator import AddressGenerator

router = APIRouter(prefix="/api/deposits", tags=["deposits"])

# Supported crypto assets and their networks
SUPPORTED_ASSETS = {
    "BTC": {
        "networks": ["Bitcoin"],
        "required_confirmations": 1,
        "memo_required": False
    },
    "ETH": {
        "networks": ["Ethereum"],
        "required_confirmations": 12,
        "memo_required": False
    },
    "USDC": {
        "networks": ["Ethereum", "Polygon", "Base"],
        "required_confirmations": 12,
        "memo_required": False
    },
    "USDT": {
        "networks": ["Ethereum", "TRON", "Polygon"],
        "required_confirmations": 12,
        "memo_required": False
    },
    "XRP": {
        "networks": ["XRP Ledger"],
        "required_confirmations": 1,
        "memo_required": True
    },
    "XLM": {
        "networks": ["Stellar"],
        "required_confirmations": 1,
        "memo_required": True
    },
    "BNB": {
        "networks": ["BNB Beacon Chain"],
        "required_confirmations": 1,
        "memo_required": True
    }
}

@router.post("/initiate", response_model=DepositIntentResponse)
async def initiate_deposit(
    deposit_data: DepositIntentCreate,
    db: Session = Depends(get_db),
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
    
    # Generate unique address and memo if needed
    address_generator = AddressGenerator()
    generated_address, memo = await address_generator.generate_address(
        asset=deposit_data.asset,
        network=deposit_data.network,
        user_id=current_user.id
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
    db.commit()
    db.refresh(deposit_intent)
    
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

@router.get("/status/{deposit_id}", response_model=DepositStatusResponse)
async def get_deposit_status(
    deposit_id: int,
    db: Session = Depends(get_db),
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
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
    limit: int = 50,
    offset: int = 0
):
    """
    Get user's deposit history
    """
    deposits = db.query(DepositIntent).filter(
        DepositIntent.user_id == current_user.id
    ).order_by(DepositIntent.created_at.desc()).offset(offset).limit(limit).all()
    
    return [
        {
            "id": deposit.id,
            "asset": deposit.asset,
            "network": deposit.network,
            "amount_usd": float(deposit.amount_quote_fiat),
            "status": deposit.status,
            "confirmations": deposit.confirmations,
            "required_confirmations": deposit.required_confirmations,
            "tx_hash": deposit.tx_hash,
            "created_at": deposit.created_at,
            "settled_at": deposit.settled_at
        }
        for deposit in deposits
    ]

def get_explorer_url(asset: str, network: str, address: str) -> str:
    """
    Get blockchain explorer URL for the given address
    """
    explorer_urls = {
        "BTC": {
            "Bitcoin": f"https://blockstream.info/address/{address}"
        },
        "ETH": {
            "Ethereum": f"https://etherscan.io/address/{address}"
        },
        "USDC": {
            "Ethereum": f"https://etherscan.io/address/{address}",
            "Polygon": f"https://polygonscan.com/address/{address}",
            "Base": f"https://basescan.org/address/{address}"
        },
        "USDT": {
            "Ethereum": f"https://etherscan.io/address/{address}",
            "TRON": f"https://tronscan.org/#/address/{address}",
            "Polygon": f"https://polygonscan.com/address/{address}"
        },
        "XRP": {
            "XRP Ledger": f"https://xrpscan.com/account/{address}"
        },
        "XLM": {
            "Stellar": f"https://stellar.expert/explorer/public/account/{address}"
        },
        "BNB": {
            "BNB Beacon Chain": f"https://explorer.bnbchain.org/address/{address}"
        }
    }
    
    return explorer_urls.get(asset, {}).get(network, "")
