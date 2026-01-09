"""
TRON API Client
Handles communication with TronGrid API for USDT TRC20 deposit detection
"""
import httpx
import logging
import asyncio
from typing import Optional, List, Dict, Any
from decimal import Decimal
from app.core.config import settings

logger = logging.getLogger(__name__)


class TronClient:
    """Client for interacting with TRON blockchain via TronGrid API"""
    
    def __init__(self):
        self.base_url = settings.TRON_API_BASE_URL.rstrip('/')
        self.api_key = settings.TRON_API_KEY
        self.usdt_contract = settings.TRON_USDT_CONTRACT
        self.timeout = 30  # seconds
        self.max_retries = 5
        self.retry_delays = [1, 2, 4, 8, 16]  # Exponential backoff delays in seconds
        self._client: Optional[httpx.AsyncClient] = None  # Reusable HTTP client
    
    def _get_headers(self) -> Dict[str, str]:
        """Get request headers with optional API key"""
        headers = {
            "Content-Type": "application/json",
            "TRON-PRO-API-KEY": self.api_key
        } if self.api_key else {
            "Content-Type": "application/json"
        }
        return headers
    
    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create reusable HTTP client"""
        if self._client is None:
            self._client = httpx.AsyncClient(
                timeout=self.timeout,
                headers=self._get_headers()
            )
        return self._client
    
    async def _close_client(self):
        """Close HTTP client if it exists"""
        if self._client is not None:
            await self._client.aclose()
            self._client = None
    
    async def _make_request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        retry_count: int = 0
    ) -> Dict[str, Any]:
        """
        Make HTTP request with retry logic and exponential backoff
        Uses reusable HTTP client for better performance
        """
        url = f"{self.base_url}{endpoint}"
        client = await self._get_client()
        
        try:
            if method.upper() == "GET":
                response = await client.get(url, params=params)
            elif method.upper() == "POST":
                response = await client.post(url, json=params)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
            
            response.raise_for_status()
            return response.json()
            
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error {e.response.status_code} for {endpoint}: {e.response.text}")
            if retry_count < self.max_retries and e.response.status_code >= 500:
                # Retry on server errors
                delay = self.retry_delays[min(retry_count, len(self.retry_delays) - 1)]
                logger.warning(f"Retrying {endpoint} after {delay}s (attempt {retry_count + 1}/{self.max_retries})")
                await asyncio.sleep(delay)
                return await self._make_request(method, endpoint, params, retry_count + 1)
            raise
        except httpx.RequestError as e:
            logger.error(f"Request error for {endpoint}: {str(e)}")
            if retry_count < self.max_retries:
                delay = self.retry_delays[min(retry_count, len(self.retry_delays) - 1)]
                logger.warning(f"Retrying {endpoint} after {delay}s (attempt {retry_count + 1}/{self.max_retries})")
                await asyncio.sleep(delay)
                return await self._make_request(method, endpoint, params, retry_count + 1)
            raise
        except Exception as e:
            logger.error(f"Unexpected error for {endpoint}: {str(e)}")
            raise
    
    async def get_usdt_transfers_to_address(
        self,
        to_address: str,
        since_ts: Optional[int] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Get USDT TRC20 transfer events to a specific address
        
        Args:
            to_address: TRON address to check (base58 format)
            since_ts: Unix timestamp (milliseconds) to filter transfers since
            limit: Maximum number of transfers to return
            
        Returns:
            List of normalized transfer dictionaries with:
            - tx_hash: Transaction hash
            - from: Sender address
            - to: Receiver address
            - amount: Transfer amount (Decimal)
            - block_number: Block number (0 if not available, will be fetched later if needed)
            - timestamp: Unix timestamp (milliseconds)
        """
        try:
            # Use TronGrid's TRC20 transfer events endpoint (most reliable)
            transfers_endpoint = f"/v1/accounts/{to_address}/transactions/trc20"
            transfers_params = {
                "limit": limit,
                "only_confirmed": False,  # Set to False for early detection, then track confirmations ourselves
                "contract_address": self.usdt_contract
            }
            
            if since_ts:
                transfers_params["min_timestamp"] = since_ts
            
            logger.info(f"Fetching TRC20 transfers for {to_address} (since_ts={since_ts}, limit={limit})")
            response = await self._make_request("GET", transfers_endpoint, transfers_params)
            
            transfers = []
            if "data" in response:
                for tx in response["data"]:
                    # Normalize TronGrid response
                    tx_hash = tx.get("transaction_id", "")
                    from_addr = tx.get("from", "")
                    to_addr = tx.get("to", "")
                    amount_str = tx.get("value", "0")
                    block_timestamp = tx.get("block_timestamp", 0)
                    
                    # Validate USDT contract address (if token_info is present)
                    token_info = tx.get("token_info", {})
                    if token_info:
                        token_address = token_info.get("address", "")
                        if token_address and token_address != self.usdt_contract:
                            logger.debug(f"Skipping non-USDT transfer: token_address={token_address}")
                            continue
                    
                    # Convert amount from string (with decimals) to Decimal
                    # USDT has 6 decimals on TRON
                    try:
                        amount = Decimal(amount_str) / Decimal(10 ** 6)
                    except Exception as e:
                        logger.warning(f"Failed to parse amount {amount_str} for tx {tx_hash}: {e}")
                        amount = Decimal(0)
                    
                    # Address normalization: TronGrid returns base58, ensure comparison is case-insensitive
                    # Both addresses should be base58 format from TronGrid API
                    to_addr_normalized = to_addr.lower() if to_addr else ""
                    to_address_normalized = to_address.lower()
                    
                    # Only include transfers TO the address
                    if to_addr_normalized == to_address_normalized:
                        # Note: block_number is not always in the TRC20 transfer response
                        # We'll fetch it only when needed (for the matched transfer in deposit_monitor)
                        transfers.append({
                            "tx_hash": tx_hash,
                            "from": from_addr,
                            "to": to_addr,
                            "amount": amount,
                            "block_number": 0,  # Will be fetched later if needed via get_tx_info()
                            "timestamp": block_timestamp
                        })
            
            logger.info(f"Found {len(transfers)} USDT transfers to {to_address}")
            return transfers
            
        except Exception as e:
            logger.error(f"Error fetching USDT transfers to {to_address}: {str(e)}")
            raise
    
    async def get_tx_info(self, tx_hash: str) -> Dict[str, Any]:
        """
        Get transaction metadata
        
        Args:
            tx_hash: Transaction hash
            
        Returns:
            Dictionary with:
            - block_number: Block number
            - timestamp: Unix timestamp (milliseconds)
            - success: Transaction success status
            - confirmations: Number of confirmations (calculated)
        """
        try:
            endpoint = f"/v1/transactions/{tx_hash}"
            
            logger.info(f"Fetching transaction info for {tx_hash}")
            response = await self._make_request("GET", endpoint)
            
            if "data" not in response or not response["data"]:
                raise ValueError(f"Transaction {tx_hash} not found")
            
            tx_data = response["data"][0] if isinstance(response["data"], list) else response["data"]
            
            block_number = tx_data.get("blockNumber", 0)
            timestamp = tx_data.get("block_timestamp", 0)
            ret = tx_data.get("ret", [])
            
            # Check contract execution result
            # For TRC20 transfers, we need to verify contractRet == "SUCCESS"
            # This ensures the contract call (USDT transfer) actually succeeded
            # Not just that the transaction was included in a block
            success = False
            if ret:
                # Check if any contract result is SUCCESS
                # For TRC20 transfers, there should be one ret entry with contractRet
                success = any(r.get("contractRet", "") == "SUCCESS" for r in ret)
                
                # Additional validation: If ret exists but no SUCCESS, log for debugging
                if not success:
                    contract_rets = [r.get("contractRet", "UNKNOWN") for r in ret]
                    logger.warning(
                        f"Transaction {tx_hash} has contractRet values: {contract_rets}. "
                        f"None are SUCCESS. Transaction may have failed."
                    )
            else:
                # No ret field - this is unusual, might be a non-contract transaction
                logger.warning(f"Transaction {tx_hash} has no 'ret' field. Cannot verify contract execution.")
            
            # Get current block to calculate confirmations
            current_block = await self.get_current_block()
            confirmations = max(0, current_block - block_number + 1) if block_number > 0 else 0
            
            return {
                "block_number": block_number,
                "timestamp": timestamp,
                "success": success,
                "confirmations": confirmations
            }
            
        except Exception as e:
            logger.error(f"Error fetching transaction info for {tx_hash}: {str(e)}")
            raise
    
    async def get_current_block(self) -> int:
        """
        Get the latest block number
        
        Returns:
            Latest block number
        """
        try:
            endpoint = "/wallet/getnowblock"
            
            response = await self._make_request("POST", endpoint)
            
            block_number = response.get("block_header", {}).get("raw_data", {}).get("number", 0)
            
            logger.debug(f"Current TRON block: {block_number}")
            return block_number
            
        except Exception as e:
            logger.error(f"Error fetching current block: {str(e)}")
            raise


# Singleton instance
tron_client = TronClient()

