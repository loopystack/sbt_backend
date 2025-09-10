# Crypto Deposit Aggregation System

## 🏦 Overview

This system allows you to collect all user crypto deposits into your own main wallet automatically. Each user gets a unique deposit address, but all funds are automatically swept to your centralized wallet.

## 🔄 How It Works

### 1. **User Deposit Flow**
```
User → Generates Unique Address → Sends Crypto → System Detects → Credits User Account
```

### 2. **Fund Aggregation Flow**
```
Detected Transaction → Wait for Confirmations → Auto-Sweep to Main Wallet → Update Records
```

## 🛠️ Implementation Details

### **Backend Components**

#### **1. Wallet Sweeper Service** (`soccer_backend/app/services/wallet_sweeper.py`)
- **Purpose**: Handles automatic transfer of user deposits to main wallet
- **Features**:
  - Sweeps deposits for each asset/network combination
  - Respects minimum sweep amounts
  - Tracks sweep transactions
  - Handles multiple blockchain networks

#### **2. Wallet Management API** (`soccer_backend/app/routers/wallet.py`)
- **Endpoints**:
  - `POST /api/wallet/sweep/{asset}/{network}` - Manual sweep for specific asset
  - `POST /api/wallet/sweep-all` - Sweep all assets
  - `GET /api/wallet/sweep-summary` - Get pending/completed sweep stats
  - `GET /api/wallet/pending-deposits` - List deposits awaiting sweep
  - `GET /api/wallet/main-wallets` - View main wallet addresses
  - `PUT /api/wallet/main-wallets` - Update main wallet addresses

#### **3. Scheduled Tasks** (`soccer_backend/app/services/scheduler.py`)
- **Automatic Operations**:
  - Sweeps deposits every 5 minutes
  - Monitors blockchain every 1 minute
  - Runs in background during server uptime

### **Frontend Components**

#### **Wallet Management Dashboard** (`src/pages/WalletManagement.tsx`)
- **Features**:
  - View pending sweeps summary
  - Manual sweep triggers
  - Pending deposits table
  - Real-time status updates

## ⚙️ Configuration

### **Main Wallet Addresses**
Update these in `wallet_sweeper.py`:

```python
self.main_wallets = {
    "BTC": "bc1qyour_main_bitcoin_wallet_address_here",
    "ETH": "0xYourMainEthereumWalletAddressHere",
    "USDC": "0xYourMainEthereumWalletAddressHere",  # Same as ETH for ERC-20
    "USDT": "0xYourMainEthereumWalletAddressHere",  # Same as ETH for ERC-20
    "XRP": "rYourMainXRPWalletAddressHere",
    "XLM": "GYourMainStellarWalletAddressHere",
    "BNB": "bnbYourMainBNBWalletAddressHere"
}
```

### **Minimum Sweep Amounts**
Configure minimum amounts before sweeping:

```python
self.minimum_sweep_amounts = {
    "BTC": Decimal("0.001"),  # Minimum 0.001 BTC
    "ETH": Decimal("0.01"),   # Minimum 0.01 ETH
    "USDC": Decimal("10"),    # Minimum $10 USDC
    "USDT": Decimal("10"),    # Minimum $10 USDT
    "XRP": Decimal("10"),     # Minimum 10 XRP
    "XLM": Decimal("10"),     # Minimum 10 XLM
    "BNB": Decimal("0.1")     # Minimum 0.1 BNB
}
```

## 🔧 Setup Instructions

### **1. Configure Main Wallets**
```bash
# Edit the main wallet addresses
nano soccer_backend/app/services/wallet_sweeper.py
```

### **2. Set Up Blockchain Services**
You'll need to integrate with blockchain service providers:

- **Bitcoin**: BlockCypher, BitGo, or your own Bitcoin node
- **Ethereum**: Infura, Alchemy, or your own Ethereum node
- **XRP**: XRP Ledger API
- **Stellar**: Stellar Horizon API
- **BNB**: BNB Chain API

### **3. Start the Backend**
```bash
cd soccer_backend
python main.py
```

### **4. Access Wallet Management**
Navigate to `/wallet-management` in your frontend application.

## 📊 Monitoring & Management

### **Dashboard Features**
- **Real-time Stats**: Pending/completed sweeps
- **Asset Breakdown**: Deposits by cryptocurrency
- **Manual Controls**: Trigger sweeps on demand
- **Transaction History**: View completed sweeps

### **API Endpoints**
```bash
# Get sweep summary
curl http://localhost:8000/api/wallet/sweep-summary

# Trigger sweep for Bitcoin
curl -X POST http://localhost:8000/api/wallet/sweep/BTC/Bitcoin

# Get pending deposits
curl http://localhost:8000/api/wallet/pending-deposits
```

## 🔒 Security Considerations

### **Wallet Security**
- **Main Wallets**: Use hardware wallets or secure cold storage
- **Private Keys**: Never store in code or database
- **Multi-signature**: Consider multi-sig for main wallets
- **Backup**: Regular backups of wallet configurations

### **Operational Security**
- **Access Control**: Limit wallet management access
- **Audit Logs**: Track all sweep operations
- **Monitoring**: Set up alerts for failed sweeps
- **Testing**: Test with small amounts first

## 📈 Benefits

### **For You (Platform Owner)**
- **Centralized Control**: All funds in your wallets
- **Automated Process**: No manual intervention needed
- **Cost Efficiency**: Reduced transaction fees
- **Scalability**: Handles thousands of users

### **For Users**
- **Unique Addresses**: Each user gets their own address
- **Fast Processing**: Automatic detection and crediting
- **Transparency**: Can track their deposits
- **Security**: Funds are safely aggregated

## 🚀 Advanced Features

### **Future Enhancements**
- **Multi-wallet Support**: Distribute funds across multiple wallets
- **Fee Optimization**: Batch transactions to reduce fees
- **Analytics**: Detailed reporting and analytics
- **Alerts**: Email/SMS notifications for large deposits
- **API Integration**: Third-party wallet service integration

## 📝 Example Workflow

1. **User deposits 0.1 BTC** to their unique address
2. **System detects** the transaction after 1 confirmation
3. **Waits for required confirmations** (1 for BTC)
4. **Credits user account** with $4,500 (0.1 BTC × $45,000)
5. **Auto-sweeps** the BTC to your main wallet
6. **Records transaction** in sweep history
7. **Updates dashboard** with new statistics

## 🛡️ Risk Management

### **Potential Risks**
- **Blockchain Congestion**: High fees during network congestion
- **Failed Transactions**: Network issues causing failed sweeps
- **Price Volatility**: Crypto price changes during processing
- **Regulatory Compliance**: Ensure compliance with local laws

### **Mitigation Strategies**
- **Fee Monitoring**: Track and optimize transaction fees
- **Retry Logic**: Automatic retry for failed transactions
- **Price Hedging**: Consider hedging strategies for large amounts
- **Legal Compliance**: Consult with legal experts

This system provides a robust, automated solution for crypto deposit aggregation while maintaining security and user experience.
