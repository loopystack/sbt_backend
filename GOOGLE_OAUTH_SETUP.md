# Test Google OAuth Setup Instructions

## Current Issue
- Error 401: invalid_client
- "The OAuth client was not found"
- This happens because GOOGLE_CLIENT_ID is set to placeholder value

## Solution Steps

### Option 1: Real Google OAuth Setup
1. Go to https://console.cloud.google.com/
2. Create new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 Client ID:
   - Type: Web application
   - Redirect URI: http://localhost:5001/api/auth/google/callback
5. Copy Client ID and Secret to .env file
6. Restart backend server

### Option 2: Quick Test (Skip Google OAuth)
If you want to test the flow without Google OAuth setup, I can create a mock version that simulates the Google login process.

## Current .env Values (Need to be updated)
```
GOOGLE_CLIENT_ID=your-google-client-id  # ← Replace with real value
GOOGLE_CLIENT_SECRET=your-google-client-secret  # ← Replace with real value
```

## After updating .env:
1. Restart backend: `python main.py`
2. Test Google login button
3. Should redirect to Google OAuth instead of showing error
