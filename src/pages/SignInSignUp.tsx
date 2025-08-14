import React from "react";
import { Link } from "react-router-dom";

export default function SignInSignUp() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-xl max-w-md w-full p-8">
        {/* Header Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Unlock the Full Experience
          </h1>
          <p className="text-gray-300 text-sm">
            Quick, Free, and Full of Perks. Sign up in seconds!
          </p>
        </div>

        {/* Benefits Section */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="text-center">
            <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center mx-auto mb-2 border border-slate-600">
              <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
            <p className="text-gray-300 text-xs">Save your favorite teams</p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center mx-auto mb-2 border border-slate-600">
              <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <p className="text-gray-300 text-xs">Save your favorite matches</p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center mx-auto mb-2 border border-slate-600">
              <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-gray-300 text-xs">Favorites on all devices</p>
          </div>
        </div>

        {/* Sign Up/Login Options */}
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
          
          <button className="w-full bg-white hover:bg-gray-100 text-gray-900 py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-3 font-medium">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Continue with email
          </button>
        </div>

        {/* Legal Disclaimer */}
        <p className="text-gray-400 text-xs text-center leading-relaxed mb-6">
          By clicking on any "Continue with" button, you agree to the{" "}
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