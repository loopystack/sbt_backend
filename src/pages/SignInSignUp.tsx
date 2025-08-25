import React, { useState } from "react";
import { Link } from "react-router-dom";

export default function SignInSignUp() {
  const [isSignIn, setIsSignIn] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      // Handle success/error here
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-xl max-w-md w-full p-8">
        {/* Header Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            {isSignIn ? "Welcome Back" : "Create Account"}
          </h1>
          <p className="text-gray-300 text-sm">
            {isSignIn 
              ? "Sign in to access your account and continue betting" 
              : "Quick, Free, and Full of Perks. Sign up in seconds!"
            }
          </p>
        </div>

        {/* Toggle Buttons */}
        <div className="flex bg-slate-700 rounded-lg p-1 mb-6">
          <button
            onClick={() => setIsSignIn(true)}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              isSignIn
                ? "bg-accent text-gray-900"
                : "text-gray-300 hover:text-white"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setIsSignIn(false)}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              !isSignIn
                ? "bg-accent text-gray-900"
                : "text-gray-300 hover:text-white"
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 mb-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors"
              placeholder="Enter your email address"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors"
              placeholder="Enter your password"
            />
          </div>

          {!isSignIn && (
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors"
                placeholder="Confirm your password"
              />
            </div>
          )}

          {/* Forgot Password Link - Only show on Sign In */}
          {isSignIn && (
            <div className="text-right">
              <Link
                to="/forgot-password"
                className="text-sm text-accent hover:text-accent/80 transition-colors"
              >
                Forgot Password?
              </Link>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !email || !password || (!isSignIn && !confirmPassword)}
            className="w-full bg-accent hover:bg-accent/80 disabled:bg-slate-600 disabled:cursor-not-allowed text-gray-900 py-3 px-4 rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {isSignIn ? "Signing In..." : "Creating Account..."}
              </>
            ) : (
              isSignIn ? "Sign In" : "Create Account"
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-600" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-slate-800 text-gray-400">Or continue with</span>
          </div>
        </div>

        {/* Social Login Options */}
        <div className="space-y-3 mb-6">
          <button className="w-full bg-white hover:bg-gray-100 text-gray-900 py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-3 font-medium">
            <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">G</div>
            Continue with Google
          </button>
          
          <button className="w-full bg-white hover:bg-gray-100 text-gray-900 py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-3 font-medium">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-2.04 2.32-3.54 3.12-1.5.8-3.22 1.2-5.04 1.2-1.8 0-3.48-.4-4.96-1.2-1.48-.8-2.68-1.88-3.5-3.12-1.24-1.84-1.88-3.96-1.88-6.3 0-2.34.64-4.46 1.88-6.3.82-1.24 2.02-2.32 3.5-3.12 1.48-.8 3.16-1.2 4.96-1.2 1.82 0 3.54.4 5.04 1.2 1.5.8 2.71 1.88 3.54 3.12.82 1.24 1.24 2.66 1.24 4.18 0 1.52-.42 2.94-1.24 4.18z"/>
            </svg>
            Continue with Apple
          </button>
          
          <button className="w-full bg-white hover:bg-gray-100 text-gray-900 py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-3 font-medium">
            <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">f</div>
            Continue with Facebook
          </button>
        </div>

        {/* Legal Disclaimer */}
        <p className="text-gray-400 text-xs text-center leading-relaxed mb-6">
          By clicking on any "Continue with" button or submitting the form, you agree to the{" "}
          <a href="#" className="text-accent hover:underline">Terms of Use</a>{" "}
          and acknowledge our{" "}
          <a href="#" className="text-accent hover:underline">Privacy Policy</a>{" "}
          on our website.
        </p>

        {/* Back to Home Link */}
        <div className="text-center">
          <Link 
            to="/" 
            className="text-gray-400 hover:text-white text-sm transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}