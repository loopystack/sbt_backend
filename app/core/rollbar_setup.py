"""
Rollbar error tracking setup for FastAPI backend
"""
import rollbar
from app.core.config import settings


def init_rollbar():
    """Initialize Rollbar for error tracking"""
    if not settings.ROLLBAR_ENABLED:
        return
    
    if not settings.ROLLBAR_ACCESS_TOKEN:
        print("⚠️  Rollbar is enabled but ROLLBAR_ACCESS_TOKEN is not set. Skipping Rollbar initialization.")
        return
    
    try:
        rollbar.init(
            access_token=settings.ROLLBAR_ACCESS_TOKEN,
            environment=settings.ROLLBAR_ENVIRONMENT,
            code_version=settings.APP_VERSION,
            enabled=settings.ROLLBAR_ENABLED,
            capture_locals=True,
            root=settings.APP_NAME,
            exception_level='error',
        )
        print("✅ Rollbar initialized successfully")
    except Exception as e:
        print(f"⚠️  Failed to initialize Rollbar: {e}")


def report_error(error: Exception, request=None, extra_data: dict = None):
    """
    Report an error to Rollbar
    
    Args:
        error: The exception/error to report
        request: The FastAPI request object (optional)
        extra_data: Additional context data (optional)
    """
    if not settings.ROLLBAR_ENABLED or not settings.ROLLBAR_ACCESS_TOKEN:
        return
    
    try:
        payload = extra_data or {}
        
        if request:
            payload['request_url'] = str(request.url)
            payload['request_method'] = request.method
            payload['request_path'] = str(request.url.path)
            if hasattr(request, 'query_params'):
                payload['query_params'] = dict(request.query_params)
        
        import sys
        
        exc_info = sys.exc_info()
        
        # report_exc_info expects (exc_info=None, request=None, ...); pass exc_info as one tuple
        exc_tuple = (exc_info[0], exc_info[1], exc_info[2]) if exc_info[0] else None
        if exc_info[0] and exc_info[1] == error:
            rollbar.report_exc_info(exc_info=exc_tuple, request=request, level='error', extra_data=payload)
        else:
            try:
                raise error
            except Exception:
                exc_info = sys.exc_info()
                exc_tuple = (exc_info[0], exc_info[1], exc_info[2]) if exc_info[0] else None
                rollbar.report_exc_info(exc_info=exc_tuple, request=request, level='error', extra_data=payload)
    except Exception as e:
        print(f"⚠️  Failed to report error to Rollbar: {e}")


def report_message(message: str, level: str = 'info', request=None, extra_data: dict = None):
   
    if not settings.ROLLBAR_ENABLED or not settings.ROLLBAR_ACCESS_TOKEN:
        return
    
    try:
        payload = extra_data or {}
        
        if request:
            payload['request_url'] = str(request.url)
            payload['request_method'] = request.method
        
        rollbar.report_message(message, level=level, request=request, extra_data=payload)
    except Exception as e:
        print(f"⚠️  Failed to report message to Rollbar: {e}")

