import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authService, User } from "../services/authService";

interface ProfileData extends User {
  member_since?: string;
  total_bets?: number;
  win_rate?: number;
  favorite_sport?: string;
}

export default function Profile() {
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
  const [userFunds, setUserFunds] = useState(0.5); // Mock current funds
  
  // Payment method states
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("crypto");
  const [selectedCurrency, setSelectedCurrency] = useState("BTC");
  const [selectedNetwork, setSelectedNetwork] = useState("BTC");
  const [depositAddress, setDepositAddress] = useState("bc1q3laqdp2wkjfanngavx5rp92w09sggkdjeesu0t");

  const navigate = useNavigate();

  useEffect(() => {
    fetchUserProfile();
  }, []);

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
      
      // Here you would typically call an API to update the user profile
      // For now, we'll just simulate a successful update
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (user) {
        setUser({
          ...user,
          full_name: editForm.full_name,
          username: editForm.username,
        });
      }
      
      setSuccessMessage("Profile updated successfully!");
      setIsEditing(false);
    } catch (err) {
      setError("Failed to update profile. Please try again.");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate("/");
    // Add a small delay before refresh to ensure navigation completes
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  // Add Fund functions
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

  const getMinDeposit = (currency: string) => {
    const minimums: { [key: string]: string } = {
      BTC: "0.00001",
      ETH: "0.001",
      USDT: "10",
      BNB: "0.01"
    };
    return minimums[currency] || "0.00001";
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
            {/* Account Stats */}
            <div className="bg-surface border border-border rounded-xl p-6">
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
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-muted">Available Funds</p>
                      <p className="font-semibold text-text">{userFunds.toFixed(4)} B</p>
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
                  {/* Popular Cryptocurrencies */}
                  <div className="mb-4">
                    <div className="flex gap-2 mb-3">
                      {["BTC", "ETH", "USDT", "BNB"].map((currency) => (
                        <button
                          key={currency}
                          onClick={() => setSelectedCurrency(currency)}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded-lg font-medium transition-colors text-sm ${
                            selectedCurrency === currency
                              ? "bg-yellow-500 text-black"
                              : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                          }`}
                        >
                          <img 
                            src={`/assets/deposit_ico/${currency}.svg`} 
                            alt={currency}
                            className="w-5 h-5"
                          />
                          <span>{currency}</span>
                        </button>
                      ))}
                    </div>

                    {/* Currency and Network Dropdowns */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Choose Currency</label>
                        <div className="relative">
                          <select
                            value={selectedCurrency}
                            onChange={(e) => setSelectedCurrency(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                          >
                            <option value="BTC">BTC</option>
                            <option value="ETH">ETH</option>
                            <option value="USDT">USDT</option>
                            <option value="BNB">BNB</option>
                          </select>
                          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
                            <img 
                              src={`/assets/deposit_ico/${selectedCurrency}.svg`} 
                              alt={selectedCurrency}
                              className="w-4 h-4"
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
                          <option value="BTC">BTC</option>
                          <option value="ETH">Ethereum</option>
                          <option value="TRC20">TRC20</option>
                          <option value="BSC">BSC</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Deposit Address Section */}
                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-4">
                    <div className="grid grid-cols-1 gap-4">
                      {/* QR Code */}
                      <div className="flex flex-col items-center">
                        <div className="w-32 h-32 bg-white rounded-lg flex items-center justify-center mb-3 border border-gray-200">
                          <div className="w-28 h-28 bg-gray-100 rounded flex items-center justify-center">
                            <div className="grid grid-cols-8 gap-0.5">
                              {Array.from({ length: 64 }).map((_, i) => (
                                <div 
                                  key={i} 
                                  className={`w-1.5 h-1.5 rounded-sm ${Math.random() > 0.5 ? 'bg-black' : 'bg-white'}`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Deposit Address */}
                      <div>
                        <h4 className="text-sm font-semibold text-white mb-2">Deposit Address</h4>
                        <div className="bg-gray-900 border border-gray-600 rounded-lg p-2 mb-2">
                          <p className="text-xs text-blue-400 break-all font-mono">{depositAddress}</p>
                        </div>
                        <button
                          onClick={copyAddress}
                          className="w-full py-2 px-3 bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copy address
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Warnings and Info */}
                  <div className="space-y-3 mb-4">
                    {/* Minimum Deposit Warning */}
                    <div className="flex items-center gap-2 p-2 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
                      <img src="/assets/deposit_ico/alarm.svg" alt="Warning" className="w-4 h-4" />
                      <p className="text-yellow-400 text-xs">
                        Minimum Deposit {selectedCurrency} {getMinDeposit(selectedCurrency)}
                      </p>
                    </div>

                    {/* Generate New Address Button */}
                    <button
                      onClick={generateNewAddress}
                      className="w-full py-2 px-3 bg-gray-800 border border-gray-600 text-gray-300 rounded-lg font-medium hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Generate new address
                    </button>

                    {/* Transaction Info */}
                    <div className="flex items-center gap-2 p-2 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                      <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">i</span>
                      </div>
                      <p className="text-blue-400 text-xs">
                        {selectedCurrency} transaction requires 2 confirmations on blockchain.
                      </p>
                    </div>
                  </div>

                  {/* Confirm Button */}
                  <button
                    onClick={() => {
                      setFundSuccess("Deposit address generated successfully!");
                      setTimeout(() => {
                        setShowAddFundModal(false);
                        setFundSuccess("");
                      }, 2000);
                    }}
                    className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
                  >
                    Confirm Deposit
                  </button>
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
                          className="flex items-center gap-2 px-2 py-1.5 rounded-lg font-medium transition-colors text-sm bg-gray-800 text-gray-300 hover:bg-gray-700"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                          <span>{method}</span>
                        </button>
                      ))}
                    </div>

                    {/* Payment Method Selection */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Payment Method</label>
                        <select className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                          <option value="visa">VISA</option>
                          <option value="mastercard">Mastercard</option>
                          <option value="paypal">PayPal</option>
                          <option value="bank">Bank Transfer</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Amount (USD)</label>
                        <input
                          type="number"
                          placeholder="0.00"
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Payment Details Section */}
                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-4">
                    <h4 className="text-sm font-semibold text-white mb-3">Payment Details</h4>
                    
                    {/* Card Details */}
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Card Number</label>
                        <input
                          type="text"
                          placeholder="1234 5678 9012 3456"
                          className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-400 mb-1">Expiry Date</label>
                          <input
                            type="text"
                            placeholder="MM/YY"
                            className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-400 mb-1">CVV</label>
                          <input
                            type="text"
                            placeholder="123"
                            className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Info */}
                  <div className="space-y-3 mb-4">
                    {/* Processing Fee Info */}
                    <div className="flex items-center gap-2 p-2 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                      <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">i</span>
                      </div>
                      <p className="text-blue-400 text-xs">
                        Processing fee: 2.5% + $0.30 per transaction
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

                  {/* Confirm Payment Button */}
                  <button
                    onClick={() => {
                      setFundSuccess("Payment processed successfully!");
                      setTimeout(() => {
                        setShowAddFundModal(false);
                        setFundSuccess("");
                      }, 2000);
                    }}
                    className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors text-sm"
                  >
                    Process Payment
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
