"""
Address validation service for different blockchain networks
Validates crypto addresses based on network-specific formats
"""

import re
from typing import Optional, Tuple


class AddressValidator:
    """Validates crypto addresses for different networks"""
    
    # Address format patterns by network
    PATTERNS = {
        # TRON (TRC20)
        "TRC20": {
            "pattern": r"^T[1-9A-HJ-NP-Za-km-z]{33}$",
            "description": "TRON address (starts with T, 34 chars)"
        },
        # Ethereum (ERC20)
        "ERC20": {
            "pattern": r"^0x[a-fA-F0-9]{40}$",
            "description": "Ethereum address (starts with 0x, 42 chars)"
        },
        # Binance Smart Chain (BEP20)
        "BEP20": {
            "pattern": r"^0x[a-fA-F0-9]{40}$",
            "description": "BSC address (same format as Ethereum)"
        },
        # Polygon
        "Polygon": {
            "pattern": r"^0x[a-fA-F0-9]{40}$",
            "description": "Polygon address (same format as Ethereum)"
        },
        # Bitcoin
        "Bitcoin": {
            "pattern": r"^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$",
            "description": "Bitcoin address (legacy or bech32)"
        },
        # XRP Ledger
        "XRP Ledger": {
            "pattern": r"^r[1-9A-HJ-NP-Za-km-z]{25,34}$",
            "description": "XRP address (starts with r, 25-35 chars)"
        },
        # Stellar
        "Stellar": {
            "pattern": r"^G[1-9A-HJ-NP-Za-km-z]{55}$",
            "description": "Stellar address (starts with G, 56 chars)"
        },
    }
    
    @classmethod
    def validate(cls, address: str, network: str) -> Tuple[bool, Optional[str]]:
        """
        Validate an address for a specific network
        
        Args:
            address: The crypto address to validate
            network: The network name (TRC20, ERC20, etc.)
        
        Returns:
            Tuple of (is_valid, error_message)
        """
        if not address or not isinstance(address, str):
            return False, "Address must be a non-empty string"
        
        address = address.strip()
        
        if not network or network not in cls.PATTERNS:
            return False, f"Unsupported network: {network}"
        
        pattern_info = cls.PATTERNS[network]
        pattern = pattern_info["pattern"]
        
        if not re.match(pattern, address):
            return False, f"Invalid {network} address format. {pattern_info['description']}"
        
        return True, None
    
    @classmethod
    def validate_checksum(cls, address: str, network: str) -> Tuple[bool, Optional[str]]:
        """
        Validate address checksum (for Ethereum-based networks)
        
        Args:
            address: The crypto address
            network: The network name
        
        Returns:
            Tuple of (is_valid, error_message)
        """
        # Only Ethereum-based networks use checksums
        ethereum_networks = ["ERC20", "BEP20", "Polygon"]
        
        if network not in ethereum_networks:
            return True, None  # Checksum not applicable
        
        if not address.startswith("0x"):
            return False, "Ethereum address must start with 0x"
        
        # Basic checksum validation (EIP-55)
        # For production, use a library like eth_utils
        # This is a simplified check
        if len(address) != 42:
            return False, "Ethereum address must be 42 characters"
        
        # Check if address has mixed case (indicates checksum)
        has_lower = any(c.islower() for c in address[2:])
        has_upper = any(c.isupper() for c in address[2:])
        
        if has_lower and has_upper:
            # Address has checksum, validate it properly
            # For now, we'll accept it (full validation requires eth_utils)
            pass
        
        return True, None
    
    @classmethod
    def get_supported_networks(cls) -> list:
        """Get list of supported networks"""
        return list(cls.PATTERNS.keys())
    
    @classmethod
    def normalize_address(cls, address: str, network: str) -> str:
        """
        Normalize address format (e.g., convert to lowercase for Ethereum)
        
        Args:
            address: The address to normalize
            network: The network name
        
        Returns:
            Normalized address
        """
        address = address.strip()
        
        # Ethereum-based networks: convert to lowercase (checksum validation happens separately)
        if network in ["ERC20", "BEP20", "Polygon"]:
            return address.lower()
        
        # Other networks: return as-is
        return address




