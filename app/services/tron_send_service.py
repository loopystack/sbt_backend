"""
TRON USDT TRC20 Transfer Service
Handles building, signing, and broadcasting USDT transfers on TRON network
"""
import logging
from decimal import Decimal
from typing import TypedDict, Optional
from tronpy import Tron
from tronpy.keys import PrivateKey
from tronpy.providers.http import HTTPProvider
from app.core.config import settings
from app.services.address_validator import AddressValidator

logger = logging.getLogger(__name__)


class TronSendResult(TypedDict):
    """Result of a TRON transfer operation"""
    tx_hash: str
    raw: dict  # Raw transaction data


class TronSendService:
    """Service for sending USDT TRC20 transfers on TRON network"""

    # Circuit breaker configuration
    FAILURE_THRESHOLD = 5  # Number of consecutive failures before entering degraded mode
    RECOVERY_TIMEOUT_SECONDS = 300  # Time to wait before trying to recover (5 minutes)
    BACKOFF_MULTIPLIER = 2  # Exponential backoff multiplier

    def __init__(self):
        self.hot_wallet_address = settings.TRON_HOT_WALLET_ADDRESS
        self.hot_wallet_private_key = settings.TRON_HOT_WALLET_PRIVATE_KEY
        self.usdt_contract = settings.TRON_USDT_CONTRACT
        self._tron = None
        self._private_key = None
        self._initialized = False

        # Circuit breaker state
        self._consecutive_failures = 0
        self._last_failure_time = None
        self._degraded_until = None
        self._backoff_level = 0
    
    def _ensure_initialized(self):
        """Lazy initialization - only initialize when actually needed"""
        if self._initialized:
            return
        
        # Validate configuration
        if not self.hot_wallet_address:
            raise ValueError("TRON_HOT_WALLET_ADDRESS is not configured")
        if not self.hot_wallet_private_key:
            raise ValueError("TRON_HOT_WALLET_PRIVATE_KEY is not configured")
        
        # Initialize TRON client
        # Use TronGrid API endpoint
        provider = HTTPProvider(settings.TRON_API_BASE_URL)
        self._tron = Tron(provider)
        
        # Load private key (never log this!)
        try:
            # Private key must be hex (64 chars). Strip whitespace and optional 0x prefix.
            key_str = (self.hot_wallet_private_key or "").strip()
            if key_str.lower().startswith("0x"):
                key_str = key_str[2:]
            if not key_str or not all(c in "0123456789abcdefABCDEF" for c in key_str):
                raise ValueError(
                    "TRON_HOT_WALLET_PRIVATE_KEY must be a 64-character hex string "
                    "(optionally with 0x prefix). Check for extra spaces, quotes, or wrong format."
                )
            self._private_key = PrivateKey(bytes.fromhex(key_str))
            # Verify the address matches
            expected_address = self._private_key.public_key.to_base58check_address()
            if expected_address != self.hot_wallet_address:
                logger.warning(
                    f"Private key address ({expected_address}) doesn't match "
                    f"configured address ({self.hot_wallet_address})"
                )
        except Exception as e:
            logger.error(f"Failed to initialize TRON account: {e}")
            raise ValueError(f"Invalid TRON hot wallet configuration: {e}")
        
        self._initialized = True

    def _is_degraded(self) -> bool:
        """Check if service is in degraded mode due to circuit breaker"""
        import time
        current_time = time.time()

        # Check if we're still in degraded state
        if self._degraded_until and current_time < self._degraded_until:
            return True

        # Check if we should attempt recovery
        if self._consecutive_failures >= self.FAILURE_THRESHOLD:
            # Calculate backoff time
            backoff_seconds = min(
                self.RECOVERY_TIMEOUT_SECONDS * (self.BACKOFF_MULTIPLIER ** self._backoff_level),
                3600  # Max 1 hour backoff
            )

            if self._last_failure_time and (current_time - self._last_failure_time) < backoff_seconds:
                return True

            # Attempt recovery - reset degraded state
            self._degraded_until = None
            logger.info("Circuit breaker: Attempting recovery from degraded mode")

        return False

    def _record_failure(self):
        """Record a failure for circuit breaker logic"""
        import time
        current_time = time.time()

        self._consecutive_failures += 1
        self._last_failure_time = current_time

        if self._consecutive_failures >= self.FAILURE_THRESHOLD:
            # Enter degraded mode
            backoff_seconds = min(
                self.RECOVERY_TIMEOUT_SECONDS * (self.BACKOFF_MULTIPLIER ** self._backoff_level),
                3600  # Max 1 hour
            )
            self._degraded_until = current_time + backoff_seconds
            self._backoff_level += 1

            logger.warning(
                f"Circuit breaker: Entering degraded mode after {self._consecutive_failures} "
                f"consecutive failures. Backoff: {backoff_seconds}s"
            )

    def _record_success(self):
        """Record a success to reset circuit breaker state"""
        if self._consecutive_failures > 0:
            logger.info(f"Circuit breaker: Recovered after {self._consecutive_failures} failures")
            self._consecutive_failures = 0
            self._backoff_level = 0
            self._degraded_until = None
            self._last_failure_time = None

    async def send_usdt_trc20(
        self,
        to_address: str,
        amount_usdt: Decimal
    ) -> TronSendResult:
        """
        Sends USDT TRC20 from hot wallet to destination address.
        
        Args:
            to_address: Destination TRON address (base58 format)
            amount_usdt: Amount in USDT (will be converted to smallest unit with 6 decimals)
            
        Returns:
            TronSendResult with tx_hash and raw transaction data
            
        Raises:
            ValueError: If address is invalid or amount is invalid
            Exception: If transaction fails
        """
        # Validate destination address
        is_valid, error_msg = AddressValidator.validate(to_address, "TRC20")
        if not is_valid:
            raise ValueError(f"Invalid TRC20 address: {error_msg}")
        
        # Normalize address
        to_address = AddressValidator.normalize_address(to_address, "TRC20")
        
        # Validate amount
        if amount_usdt <= 0:
            raise ValueError("Amount must be greater than zero")
        
        # Convert amount to smallest unit (USDT on TRON has 6 decimals)
        amount_smallest_unit = int(amount_usdt * Decimal(1_000_000))
        if amount_smallest_unit <= 0:
            raise ValueError("Amount is too small (minimum 0.000001 USDT)")
        
        # Ensure service is initialized
        self._ensure_initialized()

        # Check circuit breaker
        if self._is_degraded():
            logger.warning("Circuit breaker: Service is in degraded mode, rejecting transaction")
            raise Exception("TRON API service is temporarily unavailable (circuit breaker)")

        logger.info(
            f"Sending {amount_usdt} USDT from {self.hot_wallet_address} to {to_address} "
            f"(smallest unit: {amount_smallest_unit})"
        )

        try:
            # Get USDT contract
            contract = self._tron.get_contract(self.usdt_contract)
            
            # Build transfer transaction
            # USDT TRC20 transfer function signature: transfer(address,uint256)
            txn = (
                contract.functions.transfer(to_address, amount_smallest_unit)
                .with_owner(self.hot_wallet_address)
                .fee_limit(10_000_000)  # 10 TRX fee limit (in sun, 1 TRX = 1,000,000 sun)
                .build()
                .sign(self._private_key)
            )
            
            # Broadcast transaction
            result = txn.broadcast()
            
            # Extract transaction hash
            tx_hash = result.get('txid', '')
            if not tx_hash:
                # Try alternative field name
                tx_hash = result.get('txID', '')
            
            if not tx_hash:
                raise ValueError("Transaction broadcasted but no tx_hash returned")
            
            logger.info(f"Successfully broadcasted USDT transfer: tx_hash={tx_hash}")

            # Record success for circuit breaker
            self._record_success()

            return TronSendResult(
                tx_hash=tx_hash,
                raw=result
            )

        except Exception as e:
            # Record failure for circuit breaker
            self._record_failure()

            logger.error(
                f"Failed to send USDT transfer to {to_address}: {e}",
                exc_info=True
            )
            raise Exception(f"Failed to send USDT transfer: {str(e)}")
    
    def get_hot_wallet_balance(self) -> Decimal:
        """
        Get USDT balance of the hot wallet (synchronous - uses sync tronpy API)
        
        Returns:
            USDT balance as Decimal
        
        Note: This is synchronous because tronpy's contract.functions.balanceOf()
        is synchronous. In production, consider implementing async version or
        running in thread pool if needed.
        """
        # Ensure service is initialized
        self._ensure_initialized()

        # Check circuit breaker - in degraded mode, return cached/zero balance
        if self._is_degraded():
            logger.warning("Circuit breaker: Service degraded, returning zero balance for safety")
            return Decimal("0")

        try:
            contract = self._tron.get_contract(self.usdt_contract)
            balance = contract.functions.balanceOf(self.hot_wallet_address)
            
            # Convert from smallest unit to USDT (6 decimals)
            balance_usdt = Decimal(balance) / Decimal(1_000_000)

            # Record success for circuit breaker
            self._record_success()

            return balance_usdt

        except Exception as e:
            # Record failure for circuit breaker
            self._record_failure()

            logger.error(f"Failed to get hot wallet balance: {e}")
            raise Exception(f"Failed to get hot wallet balance: {str(e)}")
    
    def check_hot_wallet_trx_balance(self) -> Optional[Decimal]:
        """
        Check TRX balance of the hot wallet for energy/bandwidth
        
        Returns:
            TRX balance as Decimal, or None if check fails
        
        Note: TRON transactions require TRX for:
        - Bandwidth (consumed per transaction)
        - Energy (if using frozen TRX model)
        This is a basic check - should be enhanced in production.
        """
        try:
            self._ensure_initialized()
            account = self._tron.get_account(self.hot_wallet_address)
            trx_balance = Decimal(account.get('balance', 0)) / Decimal(1_000_000)  # TRX has 6 decimals
            return trx_balance
        except Exception as e:
            logger.warning(f"Failed to check hot wallet TRX balance: {e}")
            return None


# Singleton instance (will raise error on first use if config is missing)
tron_send_service = TronSendService()

