import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { authService, User } from "../services/authService";
import { paymentService, CardPaymentRequest, BankTransferRequest, PayPalPaymentRequest } from "../services/paymentService";
import { useAuth } from "../contexts/AuthContext";

interface ProfileData extends User {
  member_since?: string;
  total_bets?: number;
  win_rate?: number;
  favorite_sport?: string;
}

export default function Profile() {
  const { user: authUser, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const [user, setUser] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: "",
    username: "",
  });
  const [saveLoading, setSaveLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  
  // Add Fund states
  const [showAddFundModal, setShowAddFundModal] = useState(false);
  const [fundAmount, setFundAmount] = useState("");
  const [fundLoading, setFundLoading] = useState(false);
  const [fundError, setFundError] = useState("");
  const [fundSuccess, setFundSuccess] = useState("");
  const [userFunds, setUserFunds] = useState(0.00); // Real funds from backend
  
  // Payment method states
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("crypto");
  const [selectedCurrency, setSelectedCurrency] = useState("BTC");
  const [selectedNetwork, setSelectedNetwork] = useState("Bitcoin");
  const [depositAddress, setDepositAddress] = useState("");
  const [depositMemo, setDepositMemo] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [explorerUrl, setExplorerUrl] = useState("");
  const [requiredConfirmations, setRequiredConfirmations] = useState(1);
  const [currentConfirmations, setCurrentConfirmations] = useState(0);
  const [depositStatus, setDepositStatus] = useState("pending");
  const [depositId, setDepositId] = useState<number | null>(null);
  const [supportedAssets, setSupportedAssets] = useState<any[]>([
    { asset: "BTC", networks: ["Bitcoin"], memo_required: false },
    { asset: "ETH", networks: ["Ethereum"], memo_required: false },
    { asset: "USDC", networks: ["Ethereum", "Polygon", "Base"], memo_required: false },
    { asset: "USDT", networks: ["Ethereum", "TRON", "Polygon"], memo_required: false },
    { asset: "XRP", networks: ["XRP Ledger"], memo_required: true },
    { asset: "XLM", networks: ["Stellar"], memo_required: true },
    { asset: "BNB", networks: ["BNB Beacon Chain"], memo_required: true }
  ]);
  
  // Test mode states
  const [isTestMode, setIsTestMode] = useState(true);
  const [testApiKey, setTestApiKey] = useState("test_api_key_12345");
  const [testAddresses, setTestAddresses] = useState<any>({});
  
  // Cash payment states
  const [selectedCashMethod, setSelectedCashMethod] = useState("VISA");
  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [amount, setAmount] = useState("");
  const [email, setEmail] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  
  // Payment validation states
  const [paymentErrors, setPaymentErrors] = useState<any>({});
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  
  // Confirm deposit states
  const [confirmDepositAmount, setConfirmDepositAmount] = useState("");
  const [isConfirmingDeposit, setIsConfirmingDeposit] = useState(false);
  
  // API call protection
  const [isApiCallInProgress, setIsApiCallInProgress] = useState(false);
  const apiCallInProgressRef = useRef(false);

  const navigate = useNavigate();

  useEffect(() => {
    // Don't redirect if auth is still loading
    if (authLoading) {
      return;
    }
    
    if (isAuthenticated) {
      fetchUserProfile();
      fetchSupportedAssets();
      generateTestAddresses();
    } else {
      navigate("/signin");
    }
  }, [isAuthenticated, authLoading, navigate]);

  const generateTestAddresses = () => {
    const testAddrs = {
      "BTC": {
        "Bitcoin": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
      },
      "ETH": {
        "Ethereum": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6"
      },
      "USDC": {
        "Ethereum": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
        "Polygon": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
        "Base": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6"
      },
      "USDT": {
        "Ethereum": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
        "TRON": "TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE",
        "Polygon": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6"
      },
      "XRP": {
        "XRP Ledger": "rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH"
      },
      "XLM": {
        "Stellar": "GDUKMGUGDZQK6YHYA5Z6AY2G4XDSZPSZ3SW5UN3ARVMO6QSRDWP5Y32Z"
      },
      "BNB": {
        "BNB Beacon Chain": "bnb1grpf0955h0ykzq3ar5nmum7y6gdfl6lxfn46h2"
      }
    };
    setTestAddresses(testAddrs);
  };

  // Poll for deposit status updates
  useEffect(() => {
    if (depositId && depositStatus === "pending") {
      const interval = setInterval(() => {
        checkDepositStatus(depositId);
      }, 5000); // Check every 5 seconds

      return () => clearInterval(interval);
    }
  }, [depositId, depositStatus]);

  // Show loading while authentication is being checked
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      setError("");
      
      const userData = await authService.getCurrentUser();
      
      // Format the user data with additional computed fields
      const profileData: ProfileData = {
        ...userData,
        member_since: new Date(userData.created_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long'
        }),
        total_bets: Math.floor(Math.random() * 100) + 10, // Mock data for now
        win_rate: Math.floor(Math.random() * 30) + 60, // Mock data for now
        favorite_sport: "Football", // Mock data for now
      };
      
      setUser(profileData);
      setUserFunds(userData.funds_usd || 0.00); // Set real funds from backend
      setEditForm({
        full_name: profileData.full_name || "",
        username: profileData.username,
      });
    } catch (err) {
      console.error("Error fetching user profile:", err);
      setError("Failed to load profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    try {
      setSaveLoading(true);
      setError("");
      setSuccessMessage("");
      
      // Call the actual API to update the user profile
      const token = localStorage.getItem('access_token');
      if (!token) {
        setError("You must be logged in to update your profile");
        return;
      }

      const response = await fetch('http://localhost:8000/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          username: editForm.username,
          full_name: editForm.full_name
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update profile');
      }

      const updatedUser = await response.json();
      
      // Update local state with the response from server
      if (user) {
        setUser({
          ...user,
          full_name: updatedUser.full_name,
          username: updatedUser.username,
        });
      }
      
      // Also update the edit form with the new values
      setEditForm({
        full_name: updatedUser.full_name || "",
        username: updatedUser.username,
      });
      
      setSuccessMessage("Profile updated successfully!");
      setIsEditing(false);
      
      // Refresh user data to ensure we have the latest from database
      setTimeout(() => {
        fetchUserProfile();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile. Please try again.");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleLogout = () => {
    logout(); // Use the logout function from useAuth hook
    navigate("/");
  };

  // Add Fund functions1
  const handleAddFund = async () => {
    try {
      setFundLoading(true);
      setFundError("");
      setFundSuccess("");
      
      const amount = parseFloat(fundAmount);
      
      if (!amount || amount <= 0) {
        setFundError("Please enter a valid amount");
        return;
      }
      
      if (amount > 1000) {
        setFundError("Maximum deposit amount is 1000 B");
        return;
      }
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update user funds
      setUserFunds(prev => prev + amount);
      setFundSuccess(`Successfully added ${amount} B to your account!`);
      setFundAmount("");
      
      // Close modal after 2 seconds
      setTimeout(() => {
        setShowAddFundModal(false);
        setFundSuccess("");
      }, 2000);
      
    } catch (err) {
      setFundError("Failed to add funds. Please try again.");
    } finally {
      setFundLoading(false);
    }
  };

  const handleFundAmountClick = (amount: string) => {
    setFundAmount(amount);
    setFundError("");
  };

  // Payment method functions
  const generateNewAddress = () => {
    // Generate a new random address (mock)
    const newAddress = "bc1q" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    setDepositAddress(newAddress);
  };

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(depositAddress);
      setFundSuccess("Address copied to clipboard!");
      setTimeout(() => setFundSuccess(""), 2000);
    } catch (err) {
      setFundError("Failed to copy address");
    }
  };

  const getCurrencyLogo = (currency: string) => {
    const logos: { [key: string]: string } = {
      BTC: "₿",
      ETH: "Ξ", 
      USDT: "$",
      BNB: "B"
    };
    return logos[currency] || "₿";
  };

  const fetchSupportedAssets = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/deposits/supported-assets');
      if (response.ok) {
        const assets = await response.json();
        setSupportedAssets(assets);
      } else {
        // Fallback data if API is not available
        setSupportedAssets([
          { asset: "BTC", networks: ["Bitcoin"], memo_required: false },
          { asset: "ETH", networks: ["Ethereum"], memo_required: false },
          { asset: "USDC", networks: ["Ethereum", "Polygon", "Base"], memo_required: false },
          { asset: "USDT", networks: ["Ethereum", "TRON", "Polygon"], memo_required: false },
          { asset: "XRP", networks: ["XRP Ledger"], memo_required: true },
          { asset: "XLM", networks: ["Stellar"], memo_required: true },
          { asset: "BNB", networks: ["BNB Beacon Chain"], memo_required: true }
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch supported assets:', error);
      // Fallback data if API is not available
      setSupportedAssets([
        { asset: "BTC", networks: ["Bitcoin"], memo_required: false },
        { asset: "ETH", networks: ["Ethereum"], memo_required: false },
        { asset: "USDC", networks: ["Ethereum", "Polygon", "Base"], memo_required: false },
        { asset: "USDT", networks: ["Ethereum", "TRON", "Polygon"], memo_required: false },
        { asset: "XRP", networks: ["XRP Ledger"], memo_required: true },
        { asset: "XLM", networks: ["Stellar"], memo_required: true },
        { asset: "BNB", networks: ["BNB Beacon Chain"], memo_required: true }
      ]);
    }
  };

  const initiateCryptoDeposit = async () => {
    try {
      setFundLoading(true);
      setFundError("");
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      let depositAddress = "";
      let depositMemo = "";
      
      if (isTestMode) {
        // Use predefined test addresses
        depositAddress = testAddresses[selectedCurrency]?.[selectedNetwork] || generateMockAddress(selectedCurrency);
        depositMemo = (selectedCurrency === "XRP" || selectedCurrency === "XLM" || selectedCurrency === "BNB") 
          ? `TEST_MEMO_${Math.random().toString(36).substring(2, 8).toUpperCase()}` 
          : "";
      } else {
        // Generate random addresses for production
        depositAddress = generateMockAddress(selectedCurrency);
        depositMemo = (selectedCurrency === "XRP" || selectedCurrency === "XLM" || selectedCurrency === "BNB") 
          ? `MEMO${Math.random().toString(36).substring(2, 8).toUpperCase()}` 
          : "";
      }
      
      setDepositAddress(depositAddress);
      setDepositMemo(depositMemo);
      setQrCode(generateSimpleQRCode(depositAddress, depositMemo));
      setExplorerUrl(getMockExplorerUrl(selectedCurrency, selectedNetwork, depositAddress));
      setRequiredConfirmations(getRequiredConfirmations(selectedCurrency));
      setDepositId(Math.floor(Math.random() * 10000));
      setDepositStatus("pending");
      
      const modeText = isTestMode ? " (Test Mode)" : "";
      setFundSuccess(`Deposit address generated successfully!${modeText}`);
      
    } catch (error) {
      console.error('Deposit initiation error:', error);
      setFundError("Failed to generate deposit address. Please try again.");
    } finally {
      setFundLoading(false);
    }
  };

  const generateMockAddress = (currency: string) => {
    const addresses: { [key: string]: string } = {
      "BTC": `bc1q${Math.random().toString(36).substring(2, 22)}`,
      "ETH": `0x${Math.random().toString(36).substring(2, 22)}`,
      "USDC": `0x${Math.random().toString(36).substring(2, 22)}`,
      "USDT": `0x${Math.random().toString(36).substring(2, 22)}`,
      "XRP": `r${Math.random().toString(36).substring(2, 22)}`,
      "XLM": `G${Math.random().toString(36).substring(2, 22)}`,
      "BNB": `bnb${Math.random().toString(36).substring(2, 22)}`
    };
    return addresses[currency] || `0x${Math.random().toString(36).substring(2, 22)}`;
  };

  const getMockExplorerUrl = (currency: string, network: string, address: string) => {
    const explorers: { [key: string]: string } = {
      "BTC": "https://blockstream.info/address/",
      "ETH": "https://etherscan.io/address/",
      "USDC": network === "Ethereum" ? "https://etherscan.io/address/" : "https://polygonscan.com/address/",
      "USDT": network === "TRON" ? "https://tronscan.org/#/address/" : "https://etherscan.io/address/",
      "XRP": "https://xrpscan.com/account/",
      "XLM": "https://stellar.expert/explorer/public/account/",
      "BNB": "https://explorer.bnbchain.org/address/"
    };
    return `${explorers[currency] || "https://etherscan.io/address/"}${address}`;
  };

  const getRequiredConfirmations = (currency: string) => {
    const confirmations: { [key: string]: number } = {
      "BTC": 1,
      "ETH": 12,
      "USDC": 12,
      "USDT": 12,
      "XRP": 1,
      "XLM": 1,
      "BNB": 1
    };
    return confirmations[currency] || 12;
  };

  const generateSimpleQRCode = (address: string, memo?: string) => {
    // Create a simple QR code data URL for demonstration
    // In production, you'd use a proper QR code library
    const qrData = memo ? `${address}?memo=${memo}` : address;
    
    // Create a simple pattern that looks like a QR code
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Fill with white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 200, 200);
      
      // Create a simple pattern
      ctx.fillStyle = '#000000';
      for (let i = 0; i < 200; i += 10) {
        for (let j = 0; j < 200; j += 10) {
          if (Math.random() > 0.5) {
            ctx.fillRect(i, j, 8, 8);
          }
        }
      }
    }
    
    return canvas.toDataURL();
  };

  const simulateTestTransaction = async () => {
    if (!isTestMode || !depositId) return;
    
    if (!isAuthenticated) {
      setFundError("You must be logged in to simulate transactions");
      return;
    }

    // Prevent multiple simultaneous calls
    if (fundLoading || isApiCallInProgress || apiCallInProgressRef.current) {
      console.log("Simulation or API call already in progress, skipping...");
      return;
    }
    
    try {
      setFundLoading(true);
      setFundError("");
      setFundSuccess("");
      
      console.log(`Starting test transaction simulation for $${amount}`);
      
      // Simulate transaction detection
      await new Promise(resolve => setTimeout(resolve, 2000));
      setCurrentConfirmations(1);
      setDepositStatus("pending");
      
      // Simulate confirmations building up
      const confirmationInterval = setInterval(() => {
        setCurrentConfirmations(prev => {
          const newConfirmations = prev + 1;
          if (newConfirmations >= requiredConfirmations) {
            clearInterval(confirmationInterval);
            setDepositStatus("confirmed");
            setFundSuccess(`Test transaction confirmed! ${requiredConfirmations} confirmations reached.`);
            
            // Credit user account through API
            setTimeout(async () => {
              // Check if API call is already in progress using ref (more reliable)
              if (apiCallInProgressRef.current) {
                console.log("API call already in progress, skipping duplicate call");
                return;
              }
              
              try {
                apiCallInProgressRef.current = true;
                setIsApiCallInProgress(true);
                // Clear any previous error messages
                setFundError("");
                
                const callId = Math.random().toString(36).substr(2, 9);
                console.log(`[${callId}] Adding $${amount} to user funds via API`);
                const response = await authService.addFunds(parseFloat(amount));
                console.log(`[${callId}] API response:`, response);
                
                setUserFunds(response.new_balance);
                setFundSuccess(response.message);
                
                // Also update the user object if it exists
                if (user) {
                  setUser({
                    ...user,
                    funds_usd: response.new_balance
                  });
                }
              } catch (error) {
                console.error('Funds API error:', error);
                
                // If API is not available, simulate the success for testing
                if (error instanceof Error && error.message.includes('404')) {
                  console.log('API not available, simulating success for testing');
                  const simulatedBalance = userFunds + parseFloat(amount);
                  setUserFunds(simulatedBalance);
                  setFundSuccess(`Test transaction completed! Added $${amount} to your account. (Simulated)`);
                  
                  // Also update the user object if it exists
                  if (user) {
                    setUser({
                      ...user,
                      funds_usd: simulatedBalance
                    });
                  }
                } else {
                  setFundError(`Failed to credit account: ${error instanceof Error ? error.message : 'Unknown error'}`);
                  // Clear success message if there's an error
                  setFundSuccess("");
                }
              } finally {
                apiCallInProgressRef.current = false;
                setIsApiCallInProgress(false);
              }
            }, 1000);
          }
          return newConfirmations;
        });
      }, 3000);
      
    } catch (error) {
      console.error('Test transaction simulation error:', error);
      setFundError("Failed to simulate test transaction.");
    } finally {
      setFundLoading(false);
    }
  };

  const confirmCryptoDeposit = async () => {
    if (!confirmDepositAmount || parseFloat(confirmDepositAmount) <= 0) {
      setFundError("Please enter a valid deposit amount");
      return;
    }

    if (!depositAddress) {
      setFundError("Please generate a deposit address first");
      return;
    }

    if (!isAuthenticated) {
      setFundError("You must be logged in to confirm deposits");
      return;
    }

    try {
      setIsConfirmingDeposit(true);
      setFundError("");
      setFundSuccess("");

      // Call the confirm deposit API
      const response = await paymentService.confirmCryptoDeposit({
        amount: parseFloat(confirmDepositAmount),
        currency: "USD",
        transaction_hash: `manual_${Date.now()}`,
        deposit_address: depositAddress,
        network: selectedNetwork,
        memo: depositMemo
      });

      if (response.success) {
        setFundSuccess(response.message);
        setUserFunds(response.new_balance);
        
        // Also update the user object if it exists
        if (user) {
          setUser({
            ...user,
            funds_usd: response.new_balance
          });
        }
        
        // Clear the deposit amount input
        setConfirmDepositAmount("");
      } else {
        setFundError("Deposit confirmation failed");
      }
    } catch (error) {
      console.error('Confirm deposit error:', error);
      setFundError(error instanceof Error ? error.message : "Failed to confirm deposit");
    } finally {
      setIsConfirmingDeposit(false);
    }
  };

  // Payment validation functions
  const validateCardNumber = (cardNumber: string) => {
    const cleaned = cardNumber.replace(/\s/g, '');
    const visaRegex = /^4[0-9]{12}(?:[0-9]{3})?$/;
    const mastercardRegex = /^5[1-5][0-9]{14}$/;
    
    if (selectedCashMethod === "VISA") {
      return visaRegex.test(cleaned);
    } else if (selectedCashMethod === "Mastercard") {
      return mastercardRegex.test(cleaned);
    }
    return cleaned.length >= 13 && cleaned.length <= 19;
  };

  const validateExpiryDate = (expiry: string) => {
    const regex = /^(0[1-9]|1[0-2])\/([0-9]{2})$/;
    if (!regex.test(expiry)) return false;
    
    const [month, year] = expiry.split('/');
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear() % 100;
    const currentMonth = currentDate.getMonth() + 1;
    
    const expYear = parseInt(year);
    const expMonth = parseInt(month);
    
    if (expYear < currentYear) return false;
    if (expYear === currentYear && expMonth < currentMonth) return false;
    
    return true;
  };

  const validateCVV = (cvv: string) => {
    const regex = /^[0-9]{3,4}$/;
    return regex.test(cvv);
  };

  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const validateBankAccount = (accountNumber: string, routingNumber: string) => {
    return accountNumber.length >= 8 && routingNumber.length === 9;
  };

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '');
    const groups = cleaned.match(/.{1,4}/g) || [];
    return groups.join(' ');
  };

  const formatExpiryDate = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.substring(0, 2) + '/' + cleaned.substring(2, 4);
    }
    return cleaned;
  };

  const processCashPayment = async () => {
    try {
      setIsProcessingPayment(true);
      setPaymentErrors({});
      setFundError("");
      
      // Validate based on selected method
      const errors: any = {};
      
      if (!amount || parseFloat(amount) <= 0) {
        errors.amount = "Please enter a valid amount";
      }
      
      if (selectedCashMethod === "VISA" || selectedCashMethod === "Mastercard") {
        if (!cardholderName.trim()) errors.cardholderName = "Cardholder name is required";
        if (!validateCardNumber(cardNumber)) errors.cardNumber = "Invalid card number";
        if (!validateExpiryDate(expiryDate)) errors.expiryDate = "Invalid expiry date";
        if (!validateCVV(cvv)) errors.cvv = "Invalid CVV";
      } else if (selectedCashMethod === "PayPal") {
        if (!validateEmail(email)) errors.email = "Invalid email address";
      } else if (selectedCashMethod === "Bank Transfer") {
        if (!cardholderName.trim()) errors.accountHolderName = "Account holder name is required";
        if (!validateBankAccount(accountNumber, routingNumber)) {
          errors.accountNumber = "Invalid account or routing number";
        }
      }
      
      if (Object.keys(errors).length > 0) {
        setPaymentErrors(errors);
        return;
      }
      
      // Process payment through real API
      const paymentAmount = parseFloat(amount);
      let paymentResponse;
      
      try {
        if (selectedCashMethod === "VISA") {
          const cardData: CardPaymentRequest = {
            card_type: 'visa',
            card_number: cardNumber.replace(/\s/g, ''), // Remove spaces
            expiry_month: parseInt(expiryDate.split('/')[0]),
            expiry_year: parseInt('20' + expiryDate.split('/')[1]),
            cvv: cvv,
            cardholder_name: cardholderName,
            amount: paymentAmount
          };
          paymentResponse = await paymentService.processVisaPayment(cardData);
        } else if (selectedCashMethod === "Mastercard") {
          const cardData: CardPaymentRequest = {
            card_type: 'mastercard',
            card_number: cardNumber.replace(/\s/g, ''), // Remove spaces
            expiry_month: parseInt(expiryDate.split('/')[0]),
            expiry_year: parseInt('20' + expiryDate.split('/')[1]),
            cvv: cvv,
            cardholder_name: cardholderName,
            amount: paymentAmount
          };
          paymentResponse = await paymentService.processMastercardPayment(cardData);
        } else if (selectedCashMethod === "Bank Transfer") {
          const bankData: BankTransferRequest = {
            account_number: accountNumber,
            routing_number: routingNumber,
            account_holder_name: cardholderName,
            amount: paymentAmount
          };
          paymentResponse = await paymentService.processBankTransfer(bankData);
        } else if (selectedCashMethod === "PayPal") {
          const paypalData: PayPalPaymentRequest = {
            email: email,
            amount: paymentAmount
          };
          paymentResponse = await paymentService.processPayPalPayment(paypalData);
        } else {
          throw new Error("Unsupported payment method");
        }

        if (paymentResponse.status === 'success') {
          // Update user funds with real data from backend
          setUserFunds(paymentResponse.new_balance);
          setFundSuccess(paymentResponse.message);

          // Also update the user object if it exists
          if (user) {
            setUser({
              ...user,
              funds_usd: paymentResponse.new_balance
            });
          }
        } else {
          throw new Error(paymentResponse.message || 'Payment failed');
        }

      } catch (apiError) {
        console.error('Payment API error:', apiError);
        if (apiError instanceof Error) {
          setFundError(apiError.message);
        } else {
          setFundError("Payment failed. Please try again.");
        }
        return;
      }
      
      // Clear form
      setCardNumber("");
      setExpiryDate("");
      setCvv("");
      setCardholderName("");
      setAmount("");
      setEmail("");
      setAccountNumber("");
      setRoutingNumber("");
      
    } catch (error) {
      console.error('Payment processing error:', error);
      setFundError("Payment failed. Please try again.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const checkDepositStatus = async (id: number) => {
    try {
      const response = await fetch(`/api/deposits/status/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to check deposit status');
      }

      const statusData = await response.json();
      
      setDepositStatus(statusData.status);
      setCurrentConfirmations(statusData.confirmations);
      
      if (statusData.status === "settled") {
        setFundSuccess("Deposit confirmed and funds added to your account!");
        setTimeout(() => {
          setShowAddFundModal(false);
          setFundSuccess("");
          // Reset form
          setDepositAddress("");
          setDepositMemo("");
          setQrCode("");
          setDepositId(null);
          setDepositStatus("pending");
          setCurrentConfirmations(0);
        }, 3000);
      }
      
    } catch (error) {
      console.error('Failed to check deposit status:', error);
    }
  };

  const getMinDeposit = (currency: string) => {
    const minimums: { [key: string]: string } = {
      BTC: "0.00001",
      ETH: "0.001",
      USDT: "10",
      USDC: "10",
      XRP: "1",
      XLM: "1",
      BNB: "0.01"
    };
    return minimums[currency] || "0.00001";
  };

  const getNetworksForAsset = (asset: string) => {
    const assetData = supportedAssets.find(a => a.asset === asset);
    return assetData ? assetData.networks : [];
  };

  const isMemoRequired = (asset: string) => {
    const assetData = supportedAssets.find(a => a.asset === asset);
    return assetData ? assetData.memo_required : false;
  };

  const getInitials = (name: string, username: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    return username.charAt(0).toUpperCase();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text text-lg">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-text mb-2">Unable to Load Profile</h2>
          <p className="text-muted mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={fetchUserProfile}
              className="w-full px-6 py-3 bg-accent text-button-text rounded-lg font-medium hover:bg-accent/90 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => navigate("/")}
              className="w-full px-6 py-3 bg-surface border border-border text-text rounded-lg font-medium hover:bg-white/5 transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-text mb-2">My Profile</h1>
              <p className="text-muted">Manage your account settings and view your betting statistics</p>
            </div>
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-lg hover:bg-white/5 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Home
            </button>
          </div>
        </div>

        {/* Profile Overview Card */}
        <div className="bg-surface border border-border rounded-xl p-6 mb-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 bg-gradient-to-br from-accent to-accent/70 rounded-full flex items-center justify-center text-button-text text-2xl font-bold shadow-lg">
                {getInitials(user.full_name || "", user.username)}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-text mb-1">
                  {user.full_name || user.username}
                </h2>
                <p className="text-muted mb-2">@{user.username}</p>
                <p className="text-muted mb-3">{user.email}</p>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    user.is_verified 
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                      : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                  }`}>
                    {user.is_verified ? '✓ Verified' : '⚠ Unverified'}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    user.is_active 
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}>
                    {user.is_active ? '🟢 Active' : '🔴 Inactive'}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-6 py-3 bg-accent text-button-text rounded-lg font-medium hover:bg-accent/90 transition-colors shadow-lg"
            >
              {isEditing ? "Cancel Editing" : "Edit Profile"}
            </button>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <p className="text-red-400 font-medium">{error}</p>
            </div>
          </div>
        )}
        
        {successMessage && (
          <div className="mb-6 p-4 bg-green-500/20 border border-green-500/30 rounded-lg">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-green-400 font-medium">{successMessage}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Information */}
          <div className="lg:col-span-2">
            <div className="bg-surface border border-border rounded-xl p-6">
              <h3 className="text-xl font-semibold text-text mb-6">Profile Information</h3>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-text mb-2">Full Name</label>
                    <input
                      type="text"
                      name="full_name"
                      value={editForm.full_name}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="w-full px-4 py-3 bg-bg border border-border rounded-lg text-text disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors"
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text mb-2">Username</label>
                    <input
                      type="text"
                      name="username"
                      value={editForm.username}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="w-full px-4 py-3 bg-bg border border-border rounded-lg text-text disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors"
                      placeholder="Enter your username"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-text mb-2">Email Address</label>
                  <input
                    type="email"
                    value={user.email}
                    disabled
                    className="w-full px-4 py-3 bg-bg border border-border rounded-lg text-muted cursor-not-allowed"
                  />
                  <p className="text-sm text-muted mt-2">Email cannot be changed. Contact support if needed.</p>
                </div>

                {isEditing && (
                  <div className="flex gap-4 pt-4">
                    <button
                      onClick={handleSave}
                      disabled={saveLoading}
                      className="px-6 py-3 bg-green-500 hover:bg-green-400 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {saveLoading && (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      )}
                      {saveLoading ? "Saving..." : "Save Changes"}
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-6 py-3 bg-surface border border-border text-text rounded-lg font-medium hover:bg-white/5 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-surface border border-border rounded-xl p-6 mt-6">
              <h3 className="text-xl font-semibold text-text mb-6">Recent Activity</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-bg/50 rounded-lg border border-border/50">
                  <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-text font-medium">Deposit Successful</p>
                    <p className="text-sm text-muted">Added 0.5000 B to your account</p>
                    <p className="text-xs text-muted">2 hours ago</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-bg/50 rounded-lg border border-border/50">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-text font-medium">Profile Updated</p>
                    <p className="text-sm text-muted">Changed username to @hitech</p>
                    <p className="text-xs text-muted">1 day ago</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-bg/50 rounded-lg border border-border/50">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-text font-medium">Bet Placed</p>
                    <p className="text-sm text-muted">Football match - Arsenal vs Chelsea</p>
                    <p className="text-xs text-muted">3 days ago</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-bg/50 rounded-lg border border-border/50">
                  <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-text font-medium">Account Verified</p>
                    <p className="text-sm text-muted">Email verification completed</p>
                    <p className="text-xs text-muted">1 week ago</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Settings */}
            <div className="bg-surface border border-border rounded-xl p-6 mt-6">
              <h3 className="text-xl font-semibold text-text mb-6">Security Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-bg/50 rounded-lg border border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-text font-medium">Two-Factor Authentication</p>
                      <p className="text-sm text-muted">Add an extra layer of security</p>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-green-500 hover:bg-green-400 text-white rounded-lg text-sm font-medium transition-colors">
                    Enable
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-bg/50 rounded-lg border border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-text font-medium">Login Notifications</p>
                      <p className="text-sm text-muted">Get notified of new logins</p>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-blue-500 hover:bg-blue-400 text-white rounded-lg text-sm font-medium transition-colors">
                    Enable
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-bg/50 rounded-lg border border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-text font-medium">Session Management</p>
                      <p className="text-sm text-muted">Manage active sessions</p>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-purple-500 hover:bg-purple-400 text-white rounded-lg text-sm font-medium transition-colors">
                    Manage
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Statistics Sidebar */}
          <div className="space-y-6">
            {/* Available Funds - Prominent Display */}
            <div className="bg-gradient-to-br from-emerald-500/20 via-green-500/10 to-emerald-600/20 border border-emerald-500/30 rounded-xl p-6 mb-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-emerald-400">Available Funds</h3>
                </div>
                
                <div className="mb-4">
                  <div className="text-4xl font-bold text-emerald-400 mb-2">
                    {userFunds.toFixed(4)}
                  </div>
                  <div className="text-lg font-semibold text-emerald-300">
                    B (Balance)
                  </div>
                </div>
                
                <div className="flex gap-2 justify-center">
                  <button 
                    onClick={() => setShowAddFundModal(true)}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg font-medium transition-colors text-sm flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Funds
                  </button>
                  <button className="px-4 py-2 bg-surface border border-border text-text rounded-lg font-medium hover:bg-white/5 transition-colors text-sm flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    Withdraw
                  </button>
                </div>
              </div>
            </div>

            {/* Account Stats */}
            <div className="bg-surface border border-border rounded-xl p-6 mb-6">
              <h3 className="text-lg font-semibold text-text mb-4">Account Statistics</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-muted">Member Since</p>
                      <p className="font-semibold text-text">{user.member_since}</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-muted">Last Login</p>
                      <p className="font-semibold text-text">
                        {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Today'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Betting Stats */}
            <div className="bg-surface border border-border rounded-xl p-6">
              <h3 className="text-lg font-semibold text-text mb-4">Betting Statistics</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-muted">Total Bets</p>
                      <p className="font-semibold text-text">{user.total_bets}</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-muted">Win Rate</p>
                      <p className="font-semibold text-text">{user.win_rate}%</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-muted">Favorite Sport</p>
                      <p className="font-semibold text-text">{user.favorite_sport}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-surface border border-border rounded-xl p-6">
              <h3 className="text-lg font-semibold text-text mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button 
                  onClick={() => setShowAddFundModal(true)}
                  className="w-full flex items-center gap-3 p-3 bg-green-500/20 border border-green-500/30 rounded-lg hover:bg-green-500/30 transition-colors text-left"
                >
                  <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-green-400">Add Funds</p>
                    <p className="text-sm text-green-400/70">Deposit money to your account</p>
                  </div>
                </button>
                
                <button className="w-full flex items-center gap-3 p-3 bg-bg border border-border rounded-lg hover:bg-white/5 transition-colors text-left">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-text">Change Password</p>
                    <p className="text-sm text-muted">Update your password</p>
                  </div>
                </button>
                
                <button className="w-full flex items-center gap-3 p-3 bg-bg border border-border rounded-lg hover:bg-white/5 transition-colors text-left">
                  <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-text">Privacy Settings</p>
                    <p className="text-sm text-muted">Manage privacy</p>
                  </div>
                </button>
                
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 p-3 bg-red-500/20 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors text-left"
                >
                  <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-red-400">Sign Out</p>
                    <p className="text-sm text-red-400/70">Sign out of account</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Deposit Modal - Compact Dark Theme */}
      {showAddFundModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100000] p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAddFundModal(false);
              setFundError("");
              setFundSuccess("");
              setFundAmount("");
            }
          }}
        >
          <div 
            className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md mx-auto max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">Deposit</h3>
              <button
                onClick={() => {
                  setShowAddFundModal(false);
                  setFundError("");
                  setFundSuccess("");
                  setFundAmount("");
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4">
              {/* Payment Method Tabs */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setSelectedPaymentMethod("crypto")}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors text-sm ${
                    selectedPaymentMethod === "crypto"
                      ? "bg-yellow-500 text-black"
                      : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  <span>Crypto</span>
                  <span className="px-1.5 py-0.5 bg-black/20 text-black text-xs rounded-full">+12</span>
                </button>
                <button
                  onClick={() => setSelectedPaymentMethod("cash")}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors text-sm ${
                    selectedPaymentMethod === "cash"
                      ? "bg-yellow-500 text-black"
                      : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  <span>Cash</span>
                </button>
              </div>

              {selectedPaymentMethod === "crypto" && (
                <>
                  {/* Test Mode Toggle */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-xs font-medium text-gray-400">Test Mode</label>
                        <button
                        onClick={() => setIsTestMode(!isTestMode)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          isTestMode ? 'bg-yellow-500' : 'bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transfo rm rounded-full bg-white transition-transform ${
                            isTestMode ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                    {isTestMode && (
                      <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3 mb-3">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-yellow-400 text-xs font-semibold">Test Mode Active</span>
                        </div>
                        <p className="text-yellow-300 text-xs mb-2">
                          Using predefined test addresses for safe testing
                        </p>
                        <div className="text-xs text-yellow-300">
                          <strong>Test API Key:</strong> {testApiKey}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Popular Cryptocurrencies */}
                  <div className="mb-4">
                    <div className="flex gap-2 mb-3 flex-wrap">
                      {supportedAssets.slice(0, 6).map((asset) => (
                        <button
                          key={asset.asset}
                          onClick={() => {
                            setSelectedCurrency(asset.asset);
                            setSelectedNetwork(asset.networks[0]); // Set first network as default
                          }}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded-lg font-medium transition-colors text-sm ${
                            selectedCurrency === asset.asset
                              ? "bg-yellow-500 text-black"
                              : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                          }`}
                        >
                          <img 
                            src={`/assets/deposit_ico/${asset.asset}.svg`} 
                            alt={asset.asset}
                            className="w-5 h-5"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                          <span>{asset.asset}</span>
                        </button>
                      ))}
                    </div>

                    {/* Amount Input */}
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-gray-400 mb-1">Amount (USD)</label>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          paymentErrors.amount ? 'border-red-500' : 'border-gray-600'
                        }`}
                      />
                      {paymentErrors.amount && (
                        <p className="text-red-400 text-xs mt-1">{paymentErrors.amount}</p>
                      )}
                    </div>

                    {/* Currency and Network Dropdowns */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Choose Currency</label>
                        <div className="relative">
                          <select
                            value={selectedCurrency}
                            onChange={(e) => {
                              setSelectedCurrency(e.target.value);
                              const networks = getNetworksForAsset(e.target.value);
                              if (networks.length > 0) {
                                setSelectedNetwork(networks[0]);
                              }
                            }}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                          >
                            {supportedAssets.map((asset) => (
                              <option key={asset.asset} value={asset.asset}>
                                {asset.asset}
                              </option>
                            ))}
                          </select>
                          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
                            <img 
                              src={`/assets/deposit_ico/${selectedCurrency}.svg`} 
                              alt={selectedCurrency}
                              className="w-4 h-4"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Choose Network</label>
                        <select
                          value={selectedNetwork}
                          onChange={(e) => setSelectedNetwork(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          {getNetworksForAsset(selectedCurrency).map((network: string) => (
                            <option key={network} value={network}>
                              {network}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Deposit Address Section */}
                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-4">
                    {!depositAddress ? (
                      <div className="text-center py-8">
                        <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                          <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                          </svg>
                        </div>
                        <h4 className="text-sm font-semibold text-white mb-1">Generate Deposit Address</h4>
                        <p className="text-gray-400 text-xs">Click "Generate Address" to create your unique deposit address</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4">
                      {/* QR Code */}
                      <div className="flex flex-col items-center">
                          <div className="w-32 h-32 bg-white rounded-lg flex items-center justify-center mb-3 border border-gray-200">
                            {qrCode ? (
                              <img 
                                src={qrCode} 
                                alt="QR Code" 
                                className="w-28 h-28"
                              />
                            ) : (
                              <div className="w-28 h-28 bg-gray-100 rounded flex items-center justify-center">
                            <span className="text-gray-500 text-xs">QR Code</span>
                          </div>
                            )}
                        </div>
                      </div>

                      {/* Deposit Address */}
                      <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-semibold text-white">Deposit Address</h4>
                            {isTestMode && (
                              <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full border border-yellow-500/30">
                                TEST
                              </span>
                            )}
                        </div>
                          <div className="bg-gray-900 border border-gray-600 rounded-lg p-2 mb-2">
                            <p className="text-xs text-blue-400 break-all font-mono">{depositAddress}</p>
                          </div>
                          
                          {/* Memo/Tag if required */}
                          {depositMemo && (
                            <div className="mb-2">
                              <label className="block text-xs font-medium text-yellow-400 mb-1">
                                {isMemoRequired(selectedCurrency) ? "Memo/Tag (Required)" : "Memo"}
                              </label>
                              <div className="bg-gray-900 border border-yellow-500/50 rounded-lg p-2 mb-2">
                                <p className="text-xs text-yellow-400 break-all font-mono">{depositMemo}</p>
                              </div>
                            </div>
                          )}
                          
                          <div className="flex gap-2">
                        <button
                              onClick={() => navigator.clipboard.writeText(depositAddress)}
                              className="flex-1 py-2 px-3 bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm"
                        >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                              Copy Address
                        </button>
                            {explorerUrl && (
                              <button
                                onClick={() => window.open(explorerUrl, '_blank')}
                                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors text-sm"
                              >
                                View
                              </button>
                            )}
                      </div>
                    </div>
                      </div>
                    )}
                  </div>

                  {/* Warnings and Info */}
                  <div className="space-y-3 mb-4">
                    {/* Network Warning */}
                    <div className="flex items-center gap-2 p-2 bg-red-500/20 border border-red-500/30 rounded-lg">
                      <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <p className="text-red-400 text-xs">
                        <strong>Important:</strong> Only send {selectedCurrency} on {selectedNetwork} network. Wrong network deposits may be lost!
                      </p>
                    </div>

                    {/* Minimum Deposit Warning */}
                    <div className="flex items-center gap-2 p-2 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
                      <img src="/assets/deposit_ico/alarm.svg" alt="Warning" className="w-4 h-4" />
                      <p className="text-yellow-400 text-xs">
                        Minimum Deposit {selectedCurrency} {getMinDeposit(selectedCurrency)}
                      </p>
                    </div>

                    {/* Confirmation Status */}
                    {depositStatus === "pending" && currentConfirmations > 0 && (
                      <div className="flex items-center gap-2 p-2 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                        <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">i</span>
                        </div>
                        <p className="text-blue-400 text-xs">
                          Confirmations: {currentConfirmations}/{requiredConfirmations}
                        </p>
                      </div>
                    )}

                    {/* Transaction Info */}
                    <div className="flex items-center gap-2 p-2 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                      <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">i</span>
                      </div>
                      <p className="text-blue-400 text-xs">
                        {selectedCurrency} transaction requires {requiredConfirmations} confirmation{requiredConfirmations > 1 ? 's' : ''} on blockchain.
                      </p>
                    </div>
                  </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            {!depositAddress ? (
                    <button
                onClick={initiateCryptoDeposit}
                disabled={fundLoading || !amount}
                className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors text-sm"
                    >
                {fundLoading ? "Generating..." : "Generate Deposit Address"}
                    </button>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setDepositAddress("");
                    setDepositMemo("");
                    setQrCode("");
                    setDepositId(null);
                    setDepositStatus("pending");
                    setCurrentConfirmations(0);
                  }}
                  className="w-full py-2 px-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors text-sm"
                >
                  Generate New Address
                </button>
                
                {/* Confirm Deposit Section */}
                <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <h4 className="text-green-400 text-sm font-medium mb-2">Confirm Deposit</h4>
                  <p className="text-gray-400 text-xs mb-3">
                    After you've sent crypto to the address above, enter the amount and confirm your deposit.
                    <br />
                    <span className="text-yellow-400 font-medium">⚠️ This will verify the transaction on the blockchain before adding funds.</span>
                  </p>
                  <div className="space-y-2">
                    <input
                      type="number"
                      value={confirmDepositAmount}
                      onChange={(e) => setConfirmDepositAmount(e.target.value)}
                      placeholder="Enter deposit amount (USD)"
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      step="0.01"
                      min="0.01"
                    />
                    <button
                      onClick={confirmCryptoDeposit}
                      disabled={isConfirmingDeposit || !confirmDepositAmount || !depositAddress}
                      className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors text-sm flex items-center justify-center gap-2"
                    >
                      {isConfirmingDeposit ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Confirming...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Confirm Deposit
                        </>
                      )}
                    </button>
                  </div>
                </div>
                {isTestMode && (
                  <button
                    onClick={simulateTestTransaction}
                    disabled={fundLoading || isApiCallInProgress}
                    className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors text-sm"
                  >
                    {fundLoading ? "Simulating..." : isApiCallInProgress ? "Adding Funds..." : "Simulate Test Transaction"}
                  </button>
                )}
              </div>
            )}
          </div>
                </>
              )}

              {selectedPaymentMethod === "cash" && (
                <>
                  {/* Cash Payment Methods */}
                  <div className="mb-4">
                    <div className="flex gap-2 mb-3">
                      {["VISA", "Mastercard", "PayPal", "Bank Transfer"].map((method) => (
                        <button
                          key={method}
                          onClick={() => setSelectedCashMethod(method)}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded-lg font-medium transition-colors text-sm ${
                            selectedCashMethod === method
                              ? "bg-yellow-500 text-black"
                              : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                          }`}
                        >
                          {method === "VISA" && (
                            <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center">
                              <span className="text-white text-xs font-bold">V</span>
                            </div>
                          )}
                          {method === "Mastercard" && (
                            <div className="w-5 h-5 bg-red-600 rounded flex items-center justify-center">
                              <span className="text-white text-xs font-bold">M</span>
                            </div>
                          )}
                          {method === "PayPal" && (
                            <div className="w-5 h-5 bg-blue-500 rounded flex items-center justify-center">
                              <span className="text-white text-xs font-bold">P</span>
                            </div>
                          )}
                          {method === "Bank Transfer" && (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                          )}
                          <span>{method}</span>
                        </button>
                      ))}
                    </div>

                    {/* Amount Input */}
                    <div className="mb-4">
                      <label className="block text-xs font-medium text-gray-400 mb-1">Amount (USD)</label>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Payment Details Section - Dynamic based on selected method */}
                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-4">
                    <h4 className="text-sm font-semibold text-white mb-3">
                      {selectedCashMethod} Payment Details
                    </h4>
                    
                    {/* VISA/Mastercard Form */}
                    {(selectedCashMethod === "VISA" || selectedCashMethod === "Mastercard") && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-400 mb-1">Cardholder Name</label>
                          <input
                            type="text"
                            value={cardholderName}
                            onChange={(e) => setCardholderName(e.target.value)}
                            placeholder="John Doe"
                            className={`w-full px-3 py-2 bg-gray-900 border rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                              paymentErrors.cardholderName ? 'border-red-500' : 'border-gray-600'
                            }`}
                          />
                          {paymentErrors.cardholderName && (
                            <p className="text-red-400 text-xs mt-1">{paymentErrors.cardholderName}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-400 mb-1">Card Number</label>
                          <input
                            type="text"
                            value={cardNumber}
                            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                            placeholder="1234 5678 9012 3456"
                            maxLength={19}
                            className={`w-full px-3 py-2 bg-gray-900 border rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                              paymentErrors.cardNumber ? 'border-red-500' : 'border-gray-600'
                            }`}
                          />
                          {paymentErrors.cardNumber && (
                            <p className="text-red-400 text-xs mt-1">{paymentErrors.cardNumber}</p>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Expiry Date</label>
                            <input
                              type="text"
                              value={expiryDate}
                              onChange={(e) => setExpiryDate(formatExpiryDate(e.target.value))}
                              placeholder="MM/YY"
                              maxLength={5}
                              className={`w-full px-3 py-2 bg-gray-900 border rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                paymentErrors.expiryDate ? 'border-red-500' : 'border-gray-600'
                              }`}
                            />
                            {paymentErrors.expiryDate && (
                              <p className="text-red-400 text-xs mt-1">{paymentErrors.expiryDate}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">CVV</label>
                            <input
                              type="text"
                              value={cvv}
                              onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                              placeholder="123"
                              maxLength={4}
                              className={`w-full px-3 py-2 bg-gray-900 border rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                paymentErrors.cvv ? 'border-red-500' : 'border-gray-600'
                              }`}
                            />
                            {paymentErrors.cvv && (
                              <p className="text-red-400 text-xs mt-1">{paymentErrors.cvv}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* PayPal Form */}
                    {selectedCashMethod === "PayPal" && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-400 mb-1">PayPal Email</label>
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your.email@example.com"
                            className={`w-full px-3 py-2 bg-gray-900 border rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                              paymentErrors.email ? 'border-red-500' : 'border-gray-600'
                            }`}
                          />
                          {paymentErrors.email && (
                            <p className="text-red-400 text-xs mt-1">{paymentErrors.email}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                          <p className="text-blue-400 text-xs">
                            You will be redirected to PayPal to complete the payment
                      </p>
                    </div>
                  </div>
                    )}

                    {/* Bank Transfer Form */}
                    {selectedCashMethod === "Bank Transfer" && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-400 mb-1">Account Holder Name</label>
                          <input
                            type="text"
                            value={cardholderName}
                            onChange={(e) => setCardholderName(e.target.value)}
                            placeholder="John Doe"
                            className={`w-full px-3 py-2 bg-gray-900 border rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                              paymentErrors.accountHolderName ? 'border-red-500' : 'border-gray-600'
                            }`}
                          />
                          {paymentErrors.accountHolderName && (
                            <p className="text-red-400 text-xs mt-1">{paymentErrors.accountHolderName}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-400 mb-1">Account Number</label>
                          <input
                            type="text"
                            value={accountNumber}
                            onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                            placeholder="1234567890"
                            className={`w-full px-3 py-2 bg-gray-900 border rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                              paymentErrors.accountNumber ? 'border-red-500' : 'border-gray-600'
                            }`}
                          />
                          {paymentErrors.accountNumber && (
                            <p className="text-red-400 text-xs mt-1">{paymentErrors.accountNumber}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-400 mb-1">Routing Number</label>
                          <input
                            type="text"
                            value={routingNumber}
                            onChange={(e) => setRoutingNumber(e.target.value.replace(/\D/g, ''))}
                            placeholder="021000021"
                            maxLength={9}
                            className={`w-full px-3 py-2 bg-gray-900 border rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                              paymentErrors.accountNumber ? 'border-red-500' : 'border-gray-600'
                            }`}
                          />
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
                          <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                          <p className="text-yellow-400 text-xs">
                            Bank transfers may take 1-3 business days to process
                          </p>
                  </div>
                </div>
                    )}
                  </div>

                  {/* Payment Info */}
                  <div className="space-y-3 mb-4">
                    {/* Processing Fee Info */}
                    <div className="flex items-center gap-2 p-2 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                      <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">i</span>
                      </div>
                      <p className="text-blue-400 text-xs">
                        Processing fee: {selectedCashMethod === "Bank Transfer" ? "1.5%" : "2.5%"} + $0.30 per transaction
                      </p>
                    </div>

                    {/* Security Info */}
                    <div className="flex items-center gap-2 p-2 bg-green-500/20 border border-green-500/30 rounded-lg">
                      <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <p className="text-green-400 text-xs">
                        Your payment is secured with 256-bit SSL encryption
                      </p>
                    </div>
                  </div>

                  {/* Test Information */}
                  <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <p className="text-blue-400 text-xs font-medium mb-2">Test Information:</p>
                    <div className="text-xs text-blue-300 space-y-1">
                      {selectedCashMethod === "VISA" || selectedCashMethod === "Mastercard" ? (
                        <>
                          <div>• Any card ending in 0000 = Card declined</div>
                          <div>• Any card ending in 0001 = Insufficient funds</div>
                          <div>• Any other card = Payment successful</div>
                        </>
                      ) : selectedCashMethod === "Bank Transfer" ? (
                        <>
                          <div>• Account ending in 0000 = Account not found</div>
                          <div>• Account ending in 0001 = Insufficient funds</div>
                          <div>• Any other account = Transfer successful</div>
                        </>
                      ) : selectedCashMethod === "PayPal" ? (
                        <>
                          <div>• Email ending in @testfail.com = Account not found</div>
                          <div>• Email ending in @testdecline.com = Payment declined</div>
                          <div>• Any other email = Payment successful</div>
                        </>
                      ) : null}
                    </div>
                  </div>

                  {/* Confirm Payment Button */}
                  <button
                    onClick={processCashPayment}
                    disabled={isProcessingPayment || !amount}
                    className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors text-sm"
                  >
                    {isProcessingPayment ? "Processing..." : `Confirm ${selectedCashMethod} Payment`}
                  </button>
                </>
              )}

              {/* Error/Success Messages */}
              {fundError && (
                <div className="mb-3 p-2 bg-red-500/20 border border-red-500/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <p className="text-red-400 text-xs">{fundError}</p>
                  </div>
                </div>
              )}

              {fundSuccess && (
                <div className="mb-3 p-2 bg-green-500/20 border border-green-500/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-green-400 text-xs">{fundSuccess}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
