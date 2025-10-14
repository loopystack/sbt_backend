import requests
from typing import Optional
from fastapi import HTTPException, status
from app.core.config import settings


class RecaptchaService:
    """Service for Google reCAPTCHA v2 verification"""
    
    def __init__(self):
        self.verify_url = "https://www.google.com/recaptcha/api/siteverify"
        self.secret_key = getattr(settings, 'RECAPTCHA_SECRET_KEY', None)
        
    async def verify_recaptcha(self, response_token: str, remote_ip: Optional[str] = None) -> dict:
        """
        Verify reCAPTCHA response token with Google's API
        
        Args:
            response_token: The reCAPTCHA response token from frontend
            remote_ip: Optional IP address of the user
            
        Returns:
            dict: Verification result from Google
            
        Raises:
            HTTPException: If verification fails or secret key is missing
        """
        if not self.secret_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="reCAPTCHA secret key not configured"
            )
        
        if not response_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="reCAPTCHA response token is required"
            )
        
        # Prepare verification data
        data = {
            'secret': self.secret_key,
            'response': response_token,
        }
        
        if remote_ip:
            data['remoteip'] = remote_ip
            
        try:
            # Verify with Google's reCAPTCHA API
            response = requests.post(self.verify_url, data=data, timeout=10)
            response.raise_for_status()
            
            result = response.json()
            
            # Check if verification was successful
            if not result.get('success', False):
                error_codes = result.get('error-codes', [])
                error_message = f"reCAPTCHA verification failed. Errors: {', '.join(error_codes)}"
                
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=error_message
                )
            
            return {
                'success': True,
                'score': result.get('score', 1.0),  # For v2 this is typically 1.0 or 0.0
                'action': result.get('action'),
                'hostname': result.get('hostname'),
                'challenge_ts': result.get('challenge_ts')
            }
            
        except requests.exceptions.RequestException as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Failed to verify reCAPTCHA: {str(e)}"
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"reCAPTCHA verification error: {str(e)}"
            )
    
    def is_valid_score(self, score: float, threshold: float = 0.5) -> bool:
        """
        Check if the reCAPTCHA score meets the minimum threshold
        
        Args:
            score: The reCAPTCHA score (0.0 to 1.0)
            threshold: Minimum score threshold
            
        Returns:
            bool: True if score meets threshold
        """
        return score >= threshold
    
    def get_error_code_message(self, error_code: str) -> str:
        """
        Convert reCAPTCHA error codes to user-friendly messages
        
        Args:
            error_code: reCAPTCHA error code
            
        Returns:
            str: User-friendly error message
        """
        error_messages = {
            'missing-input-secret': 'reCAPTCHA secret key is missing',
            'invAlid-input-secret': 'reCAPTCHA secret key is invalid',
            'missing-input-response': 'reCAPTCHA response token is missing',
            'invalid-input-response': 'reCAPTCHA response token is invalid or expired',
            'bad-request': 'Invalid request to reCAPTCHA service',
            'timeout-or-duplicate': 'reCAPTCHA response token has expired or been used'
        }
        
        return error_messages.get(error_code, f'Unknown reCAPTCHA error: {error_code}')

# Global service instance
recaptcha_service = RecaptchaService()
