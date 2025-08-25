import React, { useState } from "react";
import { Link } from "react-router-dom";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setIsSubmitted(true);
    }, 1500);
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-xl max-w-md w-full p-8">
          <div className="text-center">
            {/* Success Icon */}
            <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h1 className="text-2xl font-bold text-white mb-4">
              Check Your Email
            </h1>
            
            <p className="text-gray-300 mb-6">
              We've sent a password reset link to <span className="text-accent font-medium">{email}</span>
            </p>
            
            <p className="text-gray-400 text-sm mb-8">
              If you don't see the email, check your spam folder. The link will expire in 1 hour.
            </p>
            
            <div className="space-y-3">
              <button
                onClick={() => setIsSubmitted(false)}
                className="w-full bg-accent hover:bg-accent/80 text-gray-900 py-3 px-4 rounded-lg transition-colors font-medium"
              >
                Resend Email
              </button>
              
              <Link
                to="/signin"
                className="block w-full bg-slate-700 hover:bg-slate-600 text-white py-3 px-4 rounded-lg transition-colors font-medium text-center"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-xl max-w-md w-full p-8">
        {/* Header Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Forgot Password?
          </h1>
          <p className="text-gray-300 text-sm">
            No worries! Enter your email and we'll send you reset instructions.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
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

          <button
            type="submit"
            disabled={isLoading || !email}
            className="w-full bg-accent hover:bg-accent/80 disabled:bg-slate-600 disabled:cursor-not-allowed text-gray-900 py-3 px-4 rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Sending...
              </>
            ) : (
              "Send Reset Link"
            )}
          </button>
        </form>

        {/* Back to Sign In Link */}
        <div className="text-center mt-6">
          <Link 
            to="/signin" 
            className="text-gray-400 hover:text-white text-sm transition-colors"
          >
            ← Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
