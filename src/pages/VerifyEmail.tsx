import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { authService } from "../services/authService";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      handleVerification();
    } else {
      setError("No verification token provided");
    }
  }, [token]);

  const handleVerification = async () => {
    if (!token) return;

    setIsVerifying(true);
    setError("");
    setSuccess("");

    try {
      const response = await authService.verifyEmail(token);
      setIsVerified(true);
      setSuccess("Email verified successfully! You can now sign in to your account.");
      
      // Redirect to sign in page after 3 seconds
      setTimeout(() => {
        navigate("/signin?message=email_verified");
      }, 3000);
    } catch (error: any) {
      setError(error.message || "Email verification failed. The token may be invalid or expired.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendVerification = async () => {
    // This would need the user's email, which we don't have in this context
    // For now, redirect to forgot password or sign in page
    navigate("/signin");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Animation */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-72 h-72 bg-green-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute top-0 right-0 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-2000"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-4000"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-surface/80 backdrop-blur-xl border border-border rounded-xl p-8 shadow-2xl">
          <div className="text-center mb-6">
            {/* Success/Error Icon */}
            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
              isVerified ? 'bg-green-500' : error ? 'bg-red-500' : 'bg-yellow-500'
            }`}>
              {isVerified ? (
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : error ? (
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-8 h-8 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
            </div>

            <h1 className="text-2xl font-bold text-white mb-2">
              {isVerified ? "Email Verified!" : error ? "Verification Failed" : "Verifying Email..."}
            </h1>
            
            <p className="text-gray-300 text-sm">
              {isVerified 
                ? "Your email has been successfully verified. You can now sign in to your account."
                : error 
                ? "There was a problem verifying your email address."
                : "Please wait while we verify your email address..."
              }
            </p>
          </div>

          {/* Status Messages */}
          {success && (
            <div className="mb-6 p-4 bg-green-500/20 border border-green-500/30 rounded-lg">
              <p className="text-green-400 text-sm font-medium">{success}</p>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Loading State */}
          {isVerifying && (
            <div className="mb-6 p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-400 mr-3"></div>
                <p className="text-yellow-400 text-sm font-medium">Verifying your email...</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {isVerified ? (
              <Link
                to="/signin?message=email_verified"
                className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-300 text-center block"
              >
                Sign In to Your Account
              </Link>
            ) : error ? (
              <>
                <button
                  onClick={handleResendVerification}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-300"
                >
                  Try Again
                </button>
                <Link
                  to="/signin"
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-300 text-center block"
                >
                  Back to Sign In
                </Link>
              </>
            ) : null}
          </div>

          {/* Help Text */}
          <div className="mt-6 text-center">
            <p className="text-gray-400 text-xs">
              Having trouble?{" "}
              <Link to="/signin" className="text-blue-400 hover:text-blue-300 underline">
                Contact support
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
