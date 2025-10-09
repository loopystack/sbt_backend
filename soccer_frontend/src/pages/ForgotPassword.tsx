import React, { useState } from "react";
import { Link } from "react-router-dom";
import { authService } from "../services/authService";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
  
    try {
      await authService.forgotPassword(email);
      setIsSubmitted(true);
    } catch (error: any) {
      setError(error.message || "Failed to send reset email. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-yellow-400/20 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-400/20 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-green-400/15 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-4000"></div>
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
              🎉 Check Your Email!
            </h1>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-white/20">
              <p className="text-white/90 text-lg mb-4">
                We've sent a password reset link to
              </p>
              <div className="bg-gradient-to-r from-yellow-400 to-orange-400 text-black font-bold text-lg px-4 py-2 rounded-xl inline-block">
                {email}
              </div>
            </div>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-center justify-center gap-3 text-white/80">
                <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm">Link expires in 1 hour</span>
              </div>
              <div className="flex items-center justify-center gap-3 text-white/80">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <span className="text-sm">Check your spam folder too</span>
              </div>
            </div>
            
            <div className="space-y-4">
              <button
                onClick={() => setIsSubmitted(false)}
                className="group w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-400 hover:via-purple-400 hover:to-pink-400 text-white py-4 px-8 rounded-2xl transition-all duration-500 font-bold text-lg shadow-2xl hover:shadow-3xl transform hover:scale-105 flex items-center justify-center gap-3"
              >
                <svg className="w-6 h-6 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Resend Email
              </button>
              
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

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-yellow-400/20 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-400/20 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-purple-400/15 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-4000"></div>
        <div className="absolute top-1/4 right-1/4 w-40 h-40 bg-pink-400/20 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-1000"></div>
        <div className="absolute bottom-1/4 left-1/4 w-32 h-32 bg-cyan-400/25 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-3000"></div>
      </div>

      <div className="relative z-10 bg-white/10 backdrop-blur-xl rounded-3xl max-w-lg w-full p-8 sm:p-12 border border-white/20 shadow-2xl">
        <div className="text-center mb-10">
          {/* Icon Animation */}
          <div className="relative mb-8">
            <div className="w-20 h-20 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto shadow-2xl animate-pulse">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <div className="absolute inset-0 bg-yellow-400/30 rounded-full animate-ping"></div>
          </div>
          
          <h1 className="text-5xl font-bold bg-gradient-to-r from-white via-yellow-200 to-orange-200 bg-clip-text text-transparent mb-4">
            🔑 Forgot Password?
          </h1>
          <p className="text-white/80 text-lg leading-relaxed">
            No worries! Enter your email and we'll send you a magical reset link ✨
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
            <label htmlFor="email" className="block text-sm font-semibold text-white/90 mb-3">
              📧 Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-6 py-4 bg-white/10 backdrop-blur-sm border border-white/30 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-4 focus:ring-yellow-400/50 focus:border-yellow-400 transition-all duration-300 text-lg"
                placeholder="Enter your email address"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/10 to-orange-400/10 rounded-2xl opacity-0 focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !email}
            className="group relative w-full bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 hover:from-yellow-300 hover:via-orange-400 hover:to-red-400 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-black py-5 px-8 rounded-2xl transition-all duration-500 font-bold text-lg shadow-2xl hover:shadow-3xl transform hover:scale-105 disabled:transform-none disabled:shadow-lg flex items-center justify-center gap-4 overflow-hidden"
          >
            {/* Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-300 to-orange-400 rounded-2xl opacity-0 group-hover:opacity-30 transition-opacity duration-500"></div>
            
            {isLoading ? (
              <>
                <div className="relative">
                  <svg className="animate-spin h-7 w-7 text-black" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
                <span className="relative">🚀 Sending Request Link...</span>
              </>
            ) : (
              <>
                <div className="relative">
                  <svg className="w-7 h-7 text-black group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="relative">✨ Send Reset Link</span>
                <div className="absolute right-6 opacity-60 group-hover:opacity-100 transition-opacity">
                  <svg className="w-6 h-6 text-black transform group-hover:translate-x-2 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
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