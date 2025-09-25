import React, { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { authService } from "../services/authService";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      setError("Invalid reset link. Please request a new password reset.");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      setError("Invalid reset token");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await authService.resetPassword(token, password);
      setSuccess(true);
      
      // Redirect to sign in after 3 seconds
      setTimeout(() => {
        navigate('/signin?message=password_reset_success');
      }, 3000);
    } catch (error: any) {
      setError(error.message || "Failed to reset password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { strength: 0, label: "", color: "" };
    if (password.length < 6) return { strength: 1, label: "Too short", color: "from-red-500 to-red-600" };
    if (password.length < 8) return { strength: 2, label: "Weak", color: "from-orange-500 to-red-500" };
    if (password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)) 
      return { strength: 4, label: "Strong", color: "from-green-500 to-emerald-500" };
    return { strength: 3, label: "Good", color: "from-yellow-500 to-orange-500" };
  };

  const passwordStrength = getPasswordStrength(password);

  if (!tokenValid) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-red-900 to-slate-900 flex items-center justify-center p-4">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-400/20 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-400/20 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-pink-400/15 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-4000"></div>
        </div>

        <div className="relative z-10 bg-white/10 backdrop-blur-xl rounded-3xl max-w-lg w-full p-8 sm:p-12 border border-white/20 shadow-2xl">
          <div className="text-center">
            {/* Error Animation */}
            <div className="relative mb-8">
              <div className="w-24 h-24 bg-gradient-to-r from-red-400 to-pink-500 rounded-full flex items-center justify-center mx-auto shadow-2xl animate-pulse">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div className="absolute inset-0 bg-red-400/30 rounded-full animate-ping"></div>
            </div>
            
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-red-200 bg-clip-text text-transparent mb-6">
              ⚠️ Invalid Reset Link
            </h1>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-white/20">
              <p className="text-white/90 text-lg">
                This password reset link is invalid or has expired. Please request a new one.
              </p>
            </div>
            
            <div className="space-y-4">
              <Link
                to="/forgot-password"
                className="block w-full bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 hover:from-orange-400 hover:via-red-400 hover:to-pink-400 text-white py-4 px-8 rounded-2xl transition-all duration-500 font-bold text-lg shadow-2xl hover:shadow-3xl transform hover:scale-105 flex items-center justify-center gap-3"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                🔄 Request New Reset Link
              </Link>
              
              <Link
                to="/signin"
                className="block w-full bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white py-4 px-8 rounded-2xl transition-all duration-300 font-semibold text-center border border-white/30 hover:border-white/50 transform hover:scale-105"
              >
                ← Back to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-green-900 to-slate-900 flex items-center justify-center p-4">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-400/20 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-400/20 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-blue-400/15 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-4000"></div>
        </div>

        <div className="relative z-10 bg-white/10 backdrop-blur-xl rounded-3xl max-w-lg w-full p-8 sm:p-12 border border-white/20 shadow-2xl">
          <div className="text-center">
            {/* Success Animation */}
            <div className="relative mb-8">
              <div className="w-24 h-24 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-2xl animate-bounce">
                <svg className="w-12 h-12 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="absolute inset-0 bg-green-400/30 rounded-full animate-ping"></div>
            </div>
            
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-green-200 bg-clip-text text-transparent mb-6">
              🎉 Password Reset Successful!
            </h1>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-white/20">
              <p className="text-white/90 text-lg mb-4">
                Your password has been reset successfully! You can now sign in with your new password.
              </p>
              <div className="flex items-center justify-center gap-3 text-white/80">
                <svg className="w-5 h-5 text-blue-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm">Redirecting in 3 seconds...</span>
              </div>
            </div>
            
            <Link
              to="/signin"
              className="block w-full bg-gradient-to-r from-green-500 via-emerald-500 to-blue-500 hover:from-green-400 hover:via-emerald-400 hover:to-blue-400 text-white py-4 px-8 rounded-2xl transition-all duration-500 font-bold text-lg shadow-2xl hover:shadow-3xl transform hover:scale-105 flex items-center justify-center gap-3"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              🚀 Sign In Now
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/20 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400/20 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-cyan-400/15 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-4000"></div>
        <div className="absolute top-1/4 right-1/4 w-40 h-40 bg-indigo-400/20 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-1000"></div>
        <div className="absolute bottom-1/4 left-1/4 w-32 h-32 bg-teal-400/25 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-3000"></div>
      </div>

      <div className="relative z-10 bg-white/10 backdrop-blur-xl rounded-3xl max-w-lg w-full p-8 sm:p-12 border border-white/20 shadow-2xl">
        <div className="text-center mb-10">
          {/* Icon Animation */}
          <div className="relative mb-8">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center mx-auto shadow-2xl animate-pulse">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div className="absolute inset-0 bg-blue-400/30 rounded-full animate-ping"></div>
          </div>
          
          <h1 className="text-5xl font-bold bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent mb-4">
            🔐 Reset Password
          </h1>
          <p className="text-white/80 text-lg leading-relaxed">
            Create a new, secure password for your account ✨
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {error && (
            <div className="bg-red-500/20 border border-red-400/50 rounded-2xl p-4 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-300 text-sm font-medium">{error}</p>
              </div>
            </div>
          )}
          
          <div className="space-y-3">
            <label htmlFor="password" className="block text-sm font-semibold text-white/90 mb-3">
              🔑 New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-6 py-4 bg-white/10 backdrop-blur-sm border border-white/30 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-4 focus:ring-blue-400/50 focus:border-blue-400 transition-all duration-300 text-lg pr-14"
                placeholder="Enter your new password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/70 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {showPassword ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.464 8.464M9.878 9.878a3 3 0 00-.007 4.243m5.657-5.657L16.95 6.05M14.121 14.121a3 3 0 01-4.243 0m4.243 0L16.95 16.95M14.121 14.121l-2.829-2.828m-2.829 2.828L6.05 16.95" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  )}
                </svg>
              </button>
            </div>
            
            {/* Password Strength Indicator */}
            {password && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/70">Password Strength</span>
                  <span className="text-sm font-semibold text-white">{passwordStrength.label}</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full bg-gradient-to-r ${passwordStrength.color} transition-all duration-500`}
                    style={{ width: `${(passwordStrength.strength / 4) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <label htmlFor="confirmPassword" className="block text-sm font-semibold text-white/90 mb-3">
              🔐 Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-6 py-4 bg-white/10 backdrop-blur-sm border border-white/30 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-4 focus:ring-purple-400/50 focus:border-purple-400 transition-all duration-300 text-lg pr-14"
                placeholder="Confirm your new password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/70 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {showConfirmPassword ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.464 8.464M9.878 9.878a3 3 0 00-.007 4.243m5.657-5.657L16.95 6.05M14.121 14.121a3 3 0 01-4.243 0m4.243 0L16.95 16.95M14.121 14.121l-2.829-2.828m-2.829 2.828L6.05 16.95" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  )}
                </svg>
              </button>
            </div>
            
            {/* Password Match Indicator */}
            {confirmPassword && (
              <div className="flex items-center gap-2">
                {password === confirmPassword ? (
                  <>
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-green-400 font-medium">Passwords match!</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="text-sm text-red-400 font-medium">Passwords don't match</span>
                  </>
                )}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || !password || !confirmPassword || password !== confirmPassword}
            className="group relative w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-400 hover:via-purple-400 hover:to-pink-400 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white py-5 px-8 rounded-2xl transition-all duration-500 font-bold text-lg shadow-2xl hover:shadow-3xl transform hover:scale-105 disabled:transform-none disabled:shadow-lg flex items-center justify-center gap-4 overflow-hidden"
          >
            {/* Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-2xl opacity-0 group-hover:opacity-30 transition-opacity duration-500"></div>
            
            {isLoading ? (
              <>
                <div className="relative">
                  <svg className="animate-spin h-7 w-7 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
                <span className="relative">🔄 Resetting Password...</span>
              </>
            ) : (
              <>
                <div className="relative">
                  <svg className="w-7 h-7 text-white group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <span className="relative">🚀 Reset Password</span>
              </>
            )}
          </button>
        </form>

        <div className="text-center mt-8">
          <Link 
            to="/signin" 
            className="group text-white/70 hover:text-white text-lg transition-all duration-300 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}