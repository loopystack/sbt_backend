# ⚽ Soccer Betting Platform - Backend API

A comprehensive FastAPI-based backend for a soccer betting platform with AI-powered odds prediction, crypto payment processing, user management, and real-time betting features.

## 📋 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Project Structure](#project-structure)
- [Setup Instructions](#setup-instructions)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [API Endpoints](#api-endpoints)
- [Database Models](#database-models)
- [Services](#services)
- [AI/ML Components](#aiml-components)
- [Development](#development)

---

## 🎯 Overview

This backend provides a complete REST API for a soccer betting platform, including:

- **User Authentication & Authorization** - JWT-based auth with Google OAuth support
- **Betting System** - Place bets, track records, automatic settlement
- **Crypto Payments** - USDT deposits/withdrawals with multi-network support (TRC20, ERC20, BEP20)
- **AI Odds Prediction** - XGBoost model for predicting match outcomes
- **Analytics & Tracking** - User behavior, click tracking, conversion events
- **Affiliate System** - Referral tracking and commission management
- **Admin Panel** - User management, compliance monitoring, system administration

---

## 🛠 Tech Stack

- **Framework**: FastAPI 0.115.0
- **Database**: PostgreSQL (via SQLAlchemy 2.0 + psycopg)
- **ORM**: SQLAlchemy (async/await)
- **Authentication**: JWT tokens (access + refresh)
- **ML/AI**: XGBoost for odds prediction
- **Error Tracking**: Rollbar
- **Migrations**: Alembic
- **Email**: SMTP (Gmail)
- **Validation**: Pydantic v2

---

## ✨ Features

### 🔐 Authentication & Security
- JWT-based authentication (access + refresh tokens)
- Google OAuth integration
- Email verification
- Password reset functionality
- reCAPTCHA protection
- Role-based access control (admin/user)

### 💰 Payment & Wallet
- **Crypto Deposits**: USDT via TRC20, ERC20, BEP20, Polygon
- **Crypto Withdrawals**: Multi-network support with admin approval
- **Address Generation**: Unique deposit addresses per user
- **Balance Management**: Real-time balance tracking with locked balances
- **Transaction History**: Complete audit trail

### 🎲 Betting System
- Place bets on matches
- Real-time odds updates
- Automatic bet settlement
- Betting history tracking
- Win/loss calculations

### 🤖 AI Odds Prediction
- XGBoost model trained on historical match data
- Feature engineering (Elo ratings, team form, head-to-head)
- Real-time probability predictions
- Model training and retraining capabilities

### 📊 Analytics & Tracking
- User click events
- Page view tracking
- Conversion event monitoring
- Regional restrictions
- Compliance monitoring

### 👥 Affiliate System
- Referral code generation
- Commission tracking
- Affiliate dashboard
- Performance analytics

---

## 📁 Project Structure

```
sbt_backend/
├── app/
│   ├── core/                    # Core configuration & dependencies
│   │   ├── config.py           # Settings (env vars, JWT, DB, etc.)
│   │   ├── database.py         # Database connection & session management
│   │   ├── deps.py             # FastAPI dependencies (auth, DB sessions)
│   │   ├── security.py         # Password hashing, JWT token generation
│   │   └── admin_deps.py       # Admin-only dependencies
│   │
│   ├── models/                  # SQLAlchemy ORM models
│   │   ├── user.py             # User model
│   │   ├── odds.py             # Match/odds data model
│   │   ├── deposit.py          # Crypto deposit models (DepositIntent, WithdrawalIntent, etc.)
│   │   ├── user_limits.py      # Daily limits tracking
│   │   ├── platform_wallet.py  # Platform wallet management
│   │   ├── betting_record.py   # Betting records
│   │   ├── transaction.py      # Transaction ledger
│   │   ├── affiliate.py        # Affiliate models
│   │   └── analytics.py         # Analytics models
│   │
│   ├── routers/                 # API route handlers (FastAPI routers)
│   │   ├── auth.py             # Authentication endpoints
│   │   ├── social_auth.py      # Google OAuth
│   │   ├── odds.py             # Odds data endpoints
│   │   ├── deposits.py          # Crypto deposit handling
│   │   ├── betting_records.py   # Betting operations
│   │   ├── transactions.py     # Transaction history
│   │   ├── betting_settlement.py # Bet settlement
│   │   ├── admin.py            # Admin panel endpoints
│   │   ├── analytics.py        # Analytics endpoints
│   │   └── affiliates.py       # Affiliate endpoints
│   │
│   ├── schemas/                 # Pydantic models (request/response validation)
│   │   ├── auth.py
│   │   ├── deposit.py
│   │   ├── withdrawal.py
│   │   ├── betting_record.py
│   │   └── ...
│   │
│   └── services/                # Business logic layer
│       ├── crypto_service.py      # Crypto payment processing
│       ├── address_generator.py    # Generate crypto addresses
│       ├── address_validator.py    # Validate crypto addresses
│       ├── email_service.py       # Email sending
│       ├── blockchain_watcher.py  # Monitor blockchain transactions
│       ├── compliance_service.py  # KYC/AML compliance
│       └── ...
│
├── dataanalytics/               # AI/ML odds prediction
│   ├── train.py                # Train XGBoost model
│   ├── predict.py              # Generate AI odds predictions
│   ├── engine.py               # Orchestrates training & prediction
│   └── models/artifacts/       # Saved ML models
│
├── alembic/                    # Database migrations
│   └── versions/               # Migration files
│
├── main.py                     # FastAPI app entry point
├── requirements.txt            # Python dependencies
└── .env                        # Environment variables (not in git)
```

---

## 🚀 Setup Instructions

### Prerequisites

- Python 3.12+
- PostgreSQL database
- Virtual environment (recommended)

### Installation

1. **Clone the repository** (if applicable)
   ```bash
   git clone <repository-url>
   cd sbt_backend
   ```

2. **Create virtual environment**
   ```bash
   # Windows
   python -m venv venv
   .\venv\Scripts\Activate.ps1

   # Linux/Mac
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   ```bash
   # Copy .env.example to .env (if exists)
   # Or create .env file with required variables (see below)
   ```

5. **Run database migrations**
   ```bash
   alembic upgrade head
   ```

6. **Run the application**
   ```bash
   python main.py
   # Or
   uvicorn main:app --reload --host 0.0.0.0 --port 5001
   ```

---

## 🔧 Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database
DATABASE_URL=postgresql+psycopg://user:password@host:5432/dbname

# JWT Authentication
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
REFRESH_TOKEN_EXPIRE_DAYS=30

# Email SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=your-email@gmail.com
SMTP_FROM_NAME=Soccer Betting App

# Server Configuration
LOCALHOST_IP=localhost
BACKEND_PORT=5001
FRONTEND_URL=http://localhost:5173
DEBUG=True

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5001/api/auth/google/callback

# Payment Configuration
PAYMENT_MODE=test  # 'test' or 'live'

# Blockchain Verification
BLOCKCHAIN_TEST_MODE=false  # 'true' or 'false'

# Rollbar Error Tracking (optional)
ROLLBAR_ACCESS_TOKEN=your-rollbar-token
ROLLBAR_ENVIRONMENT=development
```

---

## 🏃 Running the Application

### Development Mode

```bash
# Activate virtual environment
.\venv\Scripts\Activate.ps1  # Windows
source venv/bin/activate      # Linux/Mac

# Run with auto-reload
python main.py

# Or with uvicorn directly
uvicorn main:app --reload --host 0.0.0.0 --port 5001
```

### Production Mode

```bash
uvicorn main:app --host 0.0.0.0 --port 5001 --workers 4
```

The API will be available at:
- **Local**: `http://localhost:5001`
- **API Docs**: `http://localhost:5001/docs` (Swagger UI)
- **ReDoc**: `http://localhost:5001/redoc`

---

## 📡 API Endpoints

### Authentication (`/api/auth`)
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `POST /api/auth/verify-email` - Verify email address
- `GET /api/auth/google` - Google OAuth login
- `GET /api/auth/google/callback` - Google OAuth callback

### Odds (`/api/odds`)
- `GET /api/odds` - Get match odds
- `GET /api/odds/{match_id}` - Get specific match odds

### Deposits (`/api/deposits`)
- `POST /api/deposits/initiate` - Create deposit intent
- `GET /api/deposits/status/{intent_id}` - Check deposit status
- `GET /api/deposits/history` - Get deposit history
- `GET /api/deposits/supported-assets` - Get supported crypto assets

### Withdrawals (`/api/withdrawals`) - *Coming Soon*
- `POST /api/withdrawals/initiate` - Create withdrawal request
- `GET /api/withdrawals/{id}` - Get withdrawal status
- `GET /api/withdrawals` - List user withdrawals

### Betting (`/api/betting`)
- `POST /api/betting/place-bet` - Place a bet
- `GET /api/betting/records` - Get betting history
- `POST /api/betting/settle` - Settle bets (admin)

### Transactions (`/api/transactions`)
- `GET /api/transactions` - Get transaction history
- `GET /api/transactions/{id}` - Get specific transaction

### Admin (`/api/admin`)
- `GET /api/admin/users` - List all users
- `PUT /api/admin/users/{id}` - Update user
- `GET /api/admin/withdrawals` - List all withdrawals
- `POST /api/admin/withdrawals/{id}/approve` - Approve withdrawal
- `POST /api/admin/withdrawals/{id}/reject` - Reject withdrawal

### Analytics (`/api/analytics`)
- `GET /api/analytics/dashboard` - Analytics dashboard
- `GET /api/analytics/events` - Get tracking events

### Affiliates (`/api/affiliates`)
- `GET /api/affiliates/dashboard` - Affiliate dashboard
- `GET /api/affiliates/commissions` - Commission history

---

## 🗄 Database Models

### Core Models
- **User** - User accounts, authentication, profile
- **Odds** - Match data, bookmaker odds, AI predictions
- **BettingRecord** - User bets, stakes, outcomes
- **Transaction** - Financial transaction ledger

### Crypto Payment Models
- **DepositIntent** - Crypto deposit requests
- **WithdrawalIntent** - Crypto withdrawal requests
- **CryptoTransaction** - Blockchain transaction tracking
- **CryptoInventory** - Platform crypto addresses/keys
- **UserCryptoBalance** - User crypto balances
- **PlatformWallet** - Hot/cold wallet management
- **UserDailyLimits** - Daily deposit/withdrawal/bet limits

### Analytics Models
- **ClickEvent** - User click tracking
- **PageView** - Page view analytics
- **ConversionEvent** - Conversion tracking
- **UserCompliance** - KYC/AML compliance data

### Affiliate Models
- **Affiliate** - Affiliate accounts
- **Referral** - Referral tracking
- **AffiliateCommission** - Commission records

---

## 🔧 Services

### Crypto Services
- **crypto_service.py** - Crypto asset information, minimums, confirmations
- **address_generator.py** - Generate unique crypto addresses
- **address_validator.py** - Validate addresses per network (TRC20, ERC20, etc.)
- **blockchain_watcher.py** - Monitor blockchain for transactions
- **blockchain_verifier.py** - Verify blockchain transactions

### Business Services
- **email_service.py** - Send emails (verification, password reset, etc.)
- **compliance_service.py** - KYC/AML checks, limit validation
- **transaction_service.py** - Transaction processing
- **affiliate_service.py** - Affiliate commission calculations
- **recaptcha_service.py** - reCAPTCHA validation

---

## 🤖 AI/ML Components

### Training (`dataanalytics/train.py`)
- Loads historical match data from database
- Computes features (Elo ratings, team form, head-to-head)
- Trains XGBoost model
- Saves model artifacts

**Usage:**
```bash
python dataanalytics/train.py --retrain
python dataanalytics/train.py --recent-days 7
```

### Prediction (`dataanalytics/predict.py`)
- Generates AI odds predictions for matches
- Calculates true probabilities
- Provides confidence scores

**Usage:**
```python
from dataanalytics.predict import predict_true_odds

result = predict_true_odds(
    home_team="Manchester United",
    away_team="Liverpool",
    league="Premier League",
    country="England",
    match_date=date.today()
)
```

### Engine (`dataanalytics/engine.py`)
- Orchestrates training and prediction
- Batch prediction for upcoming matches
- Saves predictions to database

---

## 🗃 Database Migrations

### Create Migration
```bash
alembic revision --autogenerate -m "Description of changes"
```

### Apply Migrations
```bash
alembic upgrade head
```

### Rollback Migration
```bash
alembic downgrade -1
```

### Check Current Version
```bash
alembic current
```

---

## 🧪 Development

### Code Structure Guidelines

1. **Use async/await** - All database operations should be async
2. **Dependency Injection** - Use FastAPI's `Depends()` for auth, DB sessions
3. **Pydantic Schemas** - Always validate request/response with schemas
4. **Error Handling** - Use HTTPException with proper status codes
5. **Type Hints** - Use Python type hints throughout

### Testing

```bash
# Run tests (if test suite exists)
pytest

# With coverage
pytest --cov=app
```

### Code Quality

```bash
# Format code
black app/

# Lint code
flake8 app/

# Type checking
mypy app/
```

---

## 📝 Key Features Details

### Crypto Payment Flow

1. **Deposit**:
   - User requests deposit → System generates unique address
   - User sends crypto → System monitors blockchain
   - Confirmations reached → Balance credited

2. **Withdrawal**:
   - User requests withdrawal → System validates limits
   - Admin approves → System sends crypto from hot wallet
   - Transaction confirmed → Status updated

### Betting Flow

1. User selects match and stake
2. System checks balance and locks amount
3. Bet placed → Record created
4. Match result known → Automatic settlement
5. Win → Balance increased | Loss → Balance decreased

### AI Prediction Flow

1. Load historical match data
2. Compute features (Elo, form, H2H)
3. Train XGBoost model
4. Predict probabilities for upcoming matches
5. Store predictions in database

---

## 🔒 Security Features

- JWT token authentication
- Password hashing (bcrypt)
- CORS protection
- Input validation (Pydantic)
- SQL injection protection (SQLAlchemy ORM)
- Error tracking (Rollbar)
- Rate limiting (can be added)

---

## 📚 Additional Resources

- **FastAPI Docs**: https://fastapi.tiangolo.com/
- **SQLAlchemy Docs**: https://docs.sqlalchemy.org/
- **Alembic Docs**: https://alembic.sqlalchemy.org/
- **XGBoost Docs**: https://xgboost.readthedocs.io/

---

## 🐛 Troubleshooting

### Database Connection Issues
- Check `DATABASE_URL` in `.env`
- Verify PostgreSQL is running
- Check network/firewall settings

### Migration Issues
- Ensure all models are imported in `app/models/__init__.py`
- Check for syntax errors in migration files
- Verify database permissions

### Crypto Payment Issues
- Check blockchain network connectivity
- Verify address generation service
- Check wallet balances

---

## 📄 License

[Your License Here]

---

## 👥 Contributors

[Your Team/Contributors]

---

## 📞 Support

For issues and questions, please [create an issue](link-to-issues) or contact the development team.
