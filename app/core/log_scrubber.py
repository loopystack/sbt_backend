"""
Log Scrubber
Filters out sensitive information from log messages
"""
import logging
import re
from typing import Optional


class SensitiveDataFilter(logging.Filter):
    """Filter that masks sensitive data in log records"""

    # Patterns for sensitive data that should be masked
    SENSITIVE_PATTERNS = [
        # Private keys (hex strings, typically 64+ characters)
        (r'private[_-]?key.*[:=]\s*([a-fA-F0-9]{32,})', '***PRIVATE_KEY_MASKED***'),
        (r'([a-fA-F0-9]{64,})', '***PRIVATE_KEY_MASKED***'),  # Fallback for bare keys
        # Wallet addresses (TRC20, ETH style)
        (r'address.*[:=]\s*(T[A-Za-z0-9]{25,})', '***ADDRESS_MASKED***'),
        (r'address.*[:=]\s*(0x[a-fA-F0-9]{40})', '***ADDRESS_MASKED***'),
        (r'\b(T[A-Za-z0-9]{25,})\b', '***ADDRESS_MASKED***'),  # Bare TRC20 addresses
        (r'\b(0x[a-fA-F0-9]{40})\b', '***ADDRESS_MASKED***'),  # Bare ETH addresses
        # Transaction hashes (show only last 6 chars)
        (r'tx[_-]?hash.*[:=]\s*([a-fA-F0-9]{40,})', lambda m: f"***TX_HASH_MASKED_...{m.group(1)[-6:]}***"),
        (r'\b([a-fA-F0-9]{40,})\b(?!\*\*\*)', lambda m: f"***TX_HASH_MASKED_...{m.group(1)[-6:]}***"),  # Bare tx hashes
        # API keys and secrets
        (r'api[_-]?key.*[:=]\s*([A-Za-z0-9_-]{20,})', '***API_KEY_MASKED***'),
        (r'\b(sk_live_[A-Za-z0-9_-]{20,})\b', '***API_KEY_MASKED***'),  # Stripe keys
        (r'\b(sk_test_[A-Za-z0-9_-]{20,})\b', '***API_KEY_MASKED***'),  # Stripe test keys
        (r'secret.*[:=]\s*([A-Za-z0-9_-]{20,})', '***SECRET_MASKED***'),
        # JWT tokens
        (r'token.*[:=]\s*(eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)', '***JWT_MASKED***'),
        (r'\b(eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)\b', '***JWT_MASKED***'),  # Bare JWTs
    ]

    def filter(self, record: logging.LogRecord) -> bool:
        """Filter log record to mask sensitive data"""
        if hasattr(record, 'getMessage'):
            # Get the formatted message
            try:
                message = record.getMessage()
                # Apply masking patterns
                for pattern, mask in self.SENSITIVE_PATTERNS:
                    if callable(mask):
                        # Handle callable masks (like for tx_hash)
                        message = re.sub(pattern, mask, message, flags=re.IGNORECASE)
                    else:
                        # Handle string masks
                        message = re.sub(pattern, mask, message, flags=re.IGNORECASE)

                # Update the record with masked message
                record.msg = message
                record.args = ()  # Clear args since we modified the message

            except Exception:
                # If masking fails, log a warning but don't block the log
                pass

        return True


def setup_log_scrubbing():
    """Setup log scrubbing for all loggers"""
    # Create the filter
    sensitive_filter = SensitiveDataFilter()

    # Apply to root logger (affects all loggers)
    root_logger = logging.getLogger()
    root_logger.addFilter(sensitive_filter)

    # Also apply to specific loggers that might handle sensitive data
    sensitive_loggers = [
        'app.services.tron_send_service',
        'app.services.wallet_service',
        'app.services.withdrawal_execution_service',
        'app.core.config',
    ]

    for logger_name in sensitive_loggers:
        logger = logging.getLogger(logger_name)
        logger.addFilter(sensitive_filter)