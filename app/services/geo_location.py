"""
Geo-Location Service
Handles IP-based country detection for regional restrictions
"""
import httpx
from typing import Optional, Dict, Any
from fastapi import Request
from app.core.config import settings


class GeoLocationService:
    """Service to detect user location from IP address"""
    
    # Free IP geolocation services
    FREE_SERVICES = [
        "http://ip-api.com/json/{ip}?fields=status,message,countryCode,country,query",
        "https://ipapi.co/{ip}/json/",
    ]
    
    @staticmethod
    async def get_country_from_ip(ip_address: str, test_country: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Get country information from IP address using free APIs
        Returns: {"country_code": "US", "country_name": "United States", "ip": "1.2.3.4"}
        
        Args:
            ip_address: IP address to check
            test_country: If provided, return this country code for testing (for localhost)
        """
        if not ip_address or ip_address == settings.LOCALHOST_IP or ip_address.startswith("192.168"):
            # Localhost or private IP - return test country if specified, otherwise None
            if test_country:
                # Map of test country codes to names
                test_countries = {
                    "PH": "Philippines",
                    "CN": "China",
                    "DE": "Germany",
                    "NL": "Netherlands",
                    "US": "United States",
                    "GB": "United Kingdom"
                }
                return {
                    "country_code": test_country.upper(),
                    "country_name": test_countries.get(test_country.upper(), "Test Country"),
                    "ip": settings.LOCALHOST_IP
                }
            return None
        
        country_info = None
        
        # Try ip-api.com first (free, no key required)
        try:
            url = f"http://ip-api.com/json/{ip_address}?fields=status,message,countryCode,country,query"
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(url)
                data = response.json()
                
                if data.get("status") == "success":
                    country_info = {
                        "country_code": data.get("countryCode", "").upper(),
                        "country_name": data.get("country", ""),
                        "ip": data.get("query", ip_address)
                    }
                    return country_info
        except Exception as e:
            print(f"Error with ip-api.com: {str(e)}")
        
        # Try ipapi.co as fallback
        try:
            url = f"https://ipapi.co/{ip_address}/json/"
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(url)
                data = response.json()
                
                if not data.get("error"):
                    country_info = {
                        "country_code": data.get("country_code", "").upper(),
                        "country_name": data.get("country_name", ""),
                        "ip": data.get("ip", ip_address)
                    }
                    return country_info
        except Exception as e:
            print(f"Error with ipapi.co: {str(e)}")
        
        return country_info
    
    @staticmethod
    def get_client_ip(request: Request) -> str:
        """
        Extract client IP address from request
        Handles proxy/load balancer scenarios
        """
        # Check for forwarded IP (when behind proxy/load balancer)
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            # Get first IP in chain
            ip = forwarded_for.split(",")[0].strip()
            return ip
        
        # Check X-Real-IP header
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        # Fallback to direct client IP
        if hasattr(request.client, "host"):
            return request.client.host
        
        return settings.LOCALHOST_IP
    
    @staticmethod
    async def detect_user_country(request: Request, test_country: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Main method to detect user country from request
        Returns country info or None if detection fails
        
        Args:
            request: FastAPI request object
            test_country: Country code for testing on localhost (e.g., "PH" for Philippines)
        """
        ip_address = GeoLocationService.get_client_ip(request)
        country_info = await GeoLocationService.get_country_from_ip(ip_address, test_country=test_country)
                
        return country_info


geo_location_service = GeoLocationService()

