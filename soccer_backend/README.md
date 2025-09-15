# Soccer Betting API

A comprehensive FastAPI application with authentication features including user registration, login, email verification, password reset, and Google OAuth integration.

## Features

- **User Authentication**
  - User registration with email verification
  - User login with JWT tokens
  - Password reset functionality
  - Email verification system
  - Google OAuth integration
  - Token refresh mechanism

- **Security**
  - JWT-based authentication
  - Password hashing with bcrypt
  - Email verification tokens
  - Password reset tokens
  - CORS middleware

- **Database**
  - PostgreSQL with async SQLAlchemy
  - Alembic for database migrations
  - User, EmailVerification, and PasswordReset models

- **Email Service**
  - SMTP email configuration
  - HTML email templates
  - Email verification emails
  - Password reset emails

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd soccer_backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Setup environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` file with your configuration:
   - Database URL
   - JWT secret key
   - SMTP email configuration
   - Google OAuth credentials

5. **Setup PostgreSQL database**
   ```bash
   # Create database
   createdb soccer_betting
   ```

6. **Run database migrations**
   ```bash
   # Initialize alembic (if not done)
   alembic init alembic
   
   # Create initial migration
   alembic revision --autogenerate -m "Initial migration"
   
   # Apply migrations
   alembic upgrade head
   ```

7. **Run the application**
   ```bash
   python main.py
   ```
   
   Or using uvicorn directly:
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

## API Endpoints

### Authentication Endpoints

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/verify-email` - Verify email address
- `POST /api/auth/resend-verification` - Resend verification email
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `POST /api/auth/change-password` - Change password (authenticated)
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/google` - Google OAuth authentication

### Other Endpoints

- `GET /` - Root endpoint
- `GET /health` - Health check

## Environment Variables

Create a `.env` file with the following variables:

```env
# Database
DATABASE_URL=postgresql://username:password@localhost/soccer_betting

# JWT
SECRET_KEY=your-super-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Email SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=your-email@gmail.com
SMTP_FROM_NAME=Soccer Betting App

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5001/api/auth/google/callback

# Frontend URL
FRONTEND_URL=http://localhost:3000

# App Configuration
APP_NAME=Soccer Betting API
APP_VERSION=1.0.0
DEBUG=True
```

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create credentials (OAuth 2.0 Client ID)
5. Add authorized redirect URIs
6. Copy Client ID and Client Secret to your `.env` file

## SMTP Email Setup

For Gmail:
1. Enable 2-factor authentication
2. Generate an App Password
3. Use your Gmail address as SMTP_USERNAME
4. Use the App Password as SMTP_PASSWORD

## Development

The application includes:
- Auto-reload during development
- Comprehensive error handling
- Input validation with Pydantic
- Async/await throughout
- Type hints
- Structured logging

## Testing

To test the API endpoints, you can:
1. Use the automatic interactive API docs at `http://localhost:5001/docs`
2. Use ReDoc documentation at `http://localhost:5001/redoc`
3. Use tools like Postman or curl

## Project Structure

```
soccer_backend/
├── app/
│   ├── core/
│   │   ├── config.py          # Configuration settings
│   │   ├── database.py        # Database setup
│   │   ├── deps.py            # Dependencies
│   │   └── security.py        # Security utilities
│   ├── models/
│   │   ├── __init__.py
│   │   └── user.py            # User models
│   ├── routers/
│   │   ├── __init__.py
│   │   └── auth.py            # Authentication routes
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── auth.py            # Auth schemas
│   │   └── user.py            # User schemas
│   ├── services/
│   │   ├── __init__.py
│   │   └── email_service.py   # Email service
│   └── templates/
│       └── email/             # Email templates
├── alembic/                   # Database migrations
├── main.py                    # FastAPI application
├── requirements.txt           # Dependencies
├── alembic.ini               # Alembic configuration
├── env.example               # Environment variables example
└── README.md                 # This file
```
