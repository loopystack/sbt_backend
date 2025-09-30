import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { authService, tokenManager } from "../services/authService";
import ReCaptchaComponent, { ReCaptchaRef } from "../components/ReCaptcha";
import RecaptchaDebug from "../components/RecaptchaDebug";
import { recaptchaService } from "../services/recaptchaService";
export default function SignInSignUp() {
  const [searchParams] = useSearchParams();
  const [isSignIn, setIsSignIn] = useState(true);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // reCAPTCHA state management
  const [recaptchaVerified, setRecaptchaVerified] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [recaptchaError, setRecaptchaError] = useState("");
  const recaptchaRef = React.useRef<ReCaptchaRef>(null);
  
  const { theme } = useTheme();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect authenticated users away from login page
    if (!authLoading && isAuthenticated) {
      console.log('User is authenticated, redirecting to dashboard');
      navigate('/dashboard');
      return;
    }
    
    // Debug logging
    console.log('SignInSignUp auth state:', { 
      authLoading, 
      isAuthenticated, 
      hasToken: !!localStorage.getItem('access_token'),
      hasReduxToken: !!localStorage.getItem('token')
    });
  }, [isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    const message = searchParams.get('message');
    const googleAuth = searchParams.get('google_auth');
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    
    if (message === 'password_reset_success') {
      setSuccess('Password reset successful! You can now sign in with your new password.');
      setIsSignIn(true); // Switch to sign in mode
    } else if (message === 'session_expired') {
      setError('Your session has expired. Please sign in again.');
      setIsSignIn(true); // Switch to sign in mode
    } else if (message === 'email_verified') {
      setSuccess('Email verified successfully! You can now sign in to your account.');
      setIsSignIn(true); // Switch to sign in mode
    }
    
    // Handle Google OAuth success
    if (googleAuth === 'success' && accessToken && refreshToken) {
      // Store tokens
      tokenManager.setTokens(accessToken, refreshToken);
      setSuccess('Successfully signed in with Google!');
      
      // Redirect to dashboard immediately - no delay!
      navigate('/dashboard');
    }
    
    // Handle Google OAuth error
    const error = searchParams.get('error');
    if (error === 'google_auth_failed') {
      setError('Google authentication failed. Please try again.');
    }
  }, [searchParams, navigate]);

  const clearForm = () => {
    setEmail("");
    setUsername("");
    setFullName("");
    setPassword("");
    setConfirmPassword("");
    setError("");
    setSuccess("");
    
    // Reset reCAPTCHA state
    setRecaptchaVerified(false);
    setRecaptchaToken(null);
    setRecaptchaError("");
    recaptchaRef.current?.reset();
  };

  // reCAPTCHA success handler
  const handleRecaptchaVerify = async (token: string) => {
    try {
      // Verify token with backend
      const response = await recaptchaService.verifyToken(token);
      
      if (response.success) {
        setRecaptchaToken(token);
        setRecaptchaVerified(true);
        setRecaptchaError("");
        console.log('✅ reCAPTCHA verified successfully');
      } else {
        setRecaptchaVerified(false);
        setRecaptchaError(response.message || 'reCAPTCHA verification failed');
      }
    } catch (error: any) {
      console.error('reCAPTCHA verification error:', error);
      setRecaptchaVerified(false);
      setRecaptchaError(error.message || 'reCAPTCHA verification failed');
    }
  };

  // reCAPTCHA expiration handler
  const handleRecaptchaExpire = () => {
    setRecaptchaVerified(false);
    setRecaptchaToken(null);
    setRecaptchaError("reCAPTCHA has expired. Please verify again.");
  };

  // reCAPTCHA error handler
  const handleRecaptchaError = (error: string) => {
    setRecaptchaVerified(false);
    setRecaptchaToken(null);
    setRecaptchaError(error);
  };


  const handleGoogleLogin = () => {
    console.log('🚀 Google login button clicked');
    
    setIsLoading(true);
    setError("");
    
    // Get current domain dynamically
    const currentOrigin = window.location.origin;
    
    // Determine backend URL based on current domain
    let backendUrl;
    if (currentOrigin.includes('localhost')) {
      backendUrl = 'http://localhost:5001';
    } else {
      // For production and any other domain, use production backend
      backendUrl = 'https://sportsbetting-seiw.onrender.com';
    }
    
    // TEMPORARY WORKAROUND: Force production backend for testing
    // Uncomment the line below to test with production backend
    // backendUrl = 'https://sportsbetting-seiw.onrender.com';
    
    // Direct redirect to Google OAuth - dynamic redirect URI
    const googleOAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=700550723594-eepho7l9d04n0im6qs04jb03gpqivk97.apps.googleusercontent.com&` +
      `redirect_uri=${encodeURIComponent(`${backendUrl}/api/auth/google/callback`)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent('openid email profile')}&` +
      `access_type=offline&` +
      `prompt=select_account`; // This allows users to select email
    
    console.log('🔍 Frontend OAuth Debug:');
    console.log('   Current Origin:', currentOrigin);
    console.log('   Backend URL:', backendUrl);
    console.log('   Redirect URI:', `${backendUrl}/api/auth/google/callback`);
    console.log('✅ Redirecting to Google OAuth with dynamic redirect:', `${backendUrl}/api/auth/google/callback`);
    window.location.href = googleOAuthUrl;
  };

  const handleModeChange = (signIn: boolean) => {
    setIsSignIn(signIn);
    clearForm();
  };

  const handleResendVerification = async () => {
    if (!email) {
      setError("Please enter your email address first");
      return;
    }

    setIsResendingVerification(true);
    setError("");
    setVerificationSent(false);

    try {
      await authService.resendVerification(email);
      setVerificationSent(true);
      setSuccess("Verification email sent! Please check your inbox.");
    } catch (error: any) {
      setError(error.message || "Failed to send verification email. Please try again.");
    } finally {
      setIsResendingVerification(false);
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");
    setRecaptchaError("");

    // Check reCAPTCHA verification
    if (!recaptchaVerified) {
      setError("Please complete the reCAPTCHA verification first");
      setIsLoading(false);
      return;
    }

    try {
      if (isSignIn) {
        // Sign in using AuthContext
        await login(email, password);
        setSuccess("Successfully signed in!");
        
        setTimeout(() => {
          navigate("/");
        }, 1000);
      } else {
        // Sign up - Frontend validation with specific error messages
        if (!username.trim()) {
          setError("Username is required");
          setIsLoading(false);
          return;
        }
        
        if (username.trim().length < 3) {
          setError("Username must be at least 3 characters long");
          setIsLoading(false);
          return;
        }
        
        if (!fullName.trim()) {
          setError("Full name is required");
          setIsLoading(false);
          return;
        }
        
        if (fullName.trim().length < 5) {
          setError("Full name must be at least 5 characters long");
          setIsLoading(false);
          return;
        }
        
        // Password strength validation
        const passwordErrors = [];
        
        if (password.length < 8) {
          passwordErrors.push("at least 8 characters");
        }
        
        if (!/[A-Z]/.test(password)) {
          passwordErrors.push("one uppercase letter");
        }
        
        if (!/[a-z]/.test(password)) {
          passwordErrors.push("one lowercase letter");
        }
        
        if (!/\d/.test(password)) {
          passwordErrors.push("one number");
        }
        
        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
          passwordErrors.push("one special character");
        }
        
        if (passwordErrors.length > 0) {
          setError(`Password must contain ${passwordErrors.join(", ")}`);
          setIsLoading(false);
          return;
        }
        
        if (password !== confirmPassword) {
          setError("Passwords do not match");
          setIsLoading(false);
          return;
        }

        await authService.register({ email, username, password, full_name: fullName });
        setSuccess("Account created successfully! Please check your email for verification.");
        setTimeout(() => {
          // Navigate to home page instead of reloading
          navigate("/");
        }, 2000);
      }
    } catch (error: any) {
      // Handle backend validation errors with specific messages
      const errorMessage = error.message || "An error occurred. Please try again.";
      
      // Map generic backend errors to specific field errors
      if (errorMessage.includes("String should have at least 3 characters")) {
        setError("Username must be at least 3 characters long");
      } else if (errorMessage.includes("String should have at least 8 characters")) {
        setError("Password must be at least 8 characters long");
      } else if (errorMessage.includes("String should have at least 5 characters")) {
        setError("Full name must be at least 5 characters long");
      } else if (errorMessage.includes("password") && errorMessage.includes("weak")) {
        setError("Password is too weak. Please include uppercase, lowercase, numbers, and special characters.");
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-white text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-72 h-72 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute top-0 right-0 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-2000"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-4000"></div>
      </div>
      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl mb-3 shadow-lg">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">
            {isSignIn ? "Welcome Back" : "Join the Game"}
          </h1>
          <p className="text-gray-300 text-xs leading-relaxed">
            {isSignIn 
              ? "Sign in to access your account and continue your winning streak" 
              : "Quick, Free, and Full of Perks. Start betting in seconds!"
            }
          </p>
        </div>
        <div className="bg-surface/80 backdrop-blur-xl border border-border rounded-xl p-6 shadow-2xl">
          <div className="flex bg-bg/50 rounded-lg p-1 mb-6">
            <button
              onClick={() => handleModeChange(true)}
              className={`flex-1 py-2 px-4 rounded-md text-xs font-semibold transition-all duration-300 ${
                isSignIn
                  ? "bg-yellow-500 text-black shadow-lg transform scale-105"
                  : "text-muted hover:text-text"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => handleModeChange(false)}
              className={`flex-1 py-2 px-4 rounded-md text-xs font-semibold transition-all duration-300 ${
                !isSignIn
                  ? "bg-yellow-500 text-black shadow-lg transform scale-105"
                  : "text-muted hover:text-text"
              }`}
            >
              Sign Up
            </button>
          </div>
          {/* Error/Success Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-xs font-medium">{error}</p>
              {error.includes("Email not verified") && (
                <button
                  onClick={handleResendVerification}
                  disabled={isResendingVerification}
                  className="mt-2 text-blue-400 hover:text-blue-300 text-xs underline disabled:opacity-50"
                >
                  {isResendingVerification ? "Sending..." : "Resend verification email"}
                </button>
              )}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
              <p className="text-green-400 text-xs font-medium">{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-text mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-3 bg-bg/50 border border-border rounded-lg text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition-all duration-300 text-sm"
                  placeholder="Enter your email address"
                />
              </div>
            </div>
            
            {!isSignIn && (
              <>
                <div>
                  <label htmlFor="username" className="block text-xs font-semibold text-text mb-2">
                    Username
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-4 w-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      className="w-full pl-9 pr-3 py-3 bg-bg/50 border border-border rounded-lg text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition-all duration-300 text-sm"
                      placeholder="Choose a username"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="fullName" className="block text-xs font-semibold text-text mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-4 w-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="w-full pl-9 pr-3 py-3 bg-bg/50 border border-border rounded-lg text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition-all duration-300 text-sm"
                      placeholder="Enter your full name"
                    />
                  </div>
                </div>
              </>
            )}
            
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-text mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-3 bg-bg/50 border border-border rounded-lg text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition-all duration-300 text-sm"
                  placeholder="Enter your password"
                />
              </div>
              {!isSignIn && password.length > 0 && (
                <div className="mt-2 text-xs text-gray-400">
                  <p className="mb-1">Password must contain:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li className={password.length >= 8 ? "text-green-400" : "text-gray-400"}>
                      At least 8 characters
                    </li>
                    <li className={/[A-Z]/.test(password) ? "text-green-400" : "text-gray-400"}>
                      One uppercase letter (A-Z)
                    </li>
                    <li className={/[a-z]/.test(password) ? "text-green-400" : "text-gray-400"}>
                      One lowercase letter (a-z)
                    </li>
                    <li className={/\d/.test(password) ? "text-green-400" : "text-gray-400"}>
                      One number (0-9)
                    </li>
                    <li className={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? "text-green-400" : "text-gray-400"}>
                      One special character (!@#$%^&*)
                    </li>
                  </ul>
                </div>
              )}
            </div>
            {!isSignIn && (
              <div>
                <label htmlFor="confirmPassword" className="block text-xs font-semibold text-text mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-4 w-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-3 bg-bg/50 border border-border rounded-lg text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition-all duration-300 text-sm"
                    placeholder="Confirm your password"
                  />
                </div>
              </div>
            )}
            {isSignIn && (
              <div className="text-right">
                <Link
                  to="/forgot-password"
                  className="text-xs text-yellow-500 hover:text-yellow-400 transition-colors font-medium"
                >
                  Forgot Password?
                </Link>
              </div>
            )}
            
            {/* Google reCAPTCHA */}
            <ReCaptchaComponent
              ref={recaptchaRef}
              siteKey={recaptchaService.getSiteKey()}
              onVerify={handleRecaptchaVerify}
              onExpire={handleRecaptchaExpire}
              onError={handleRecaptchaError}
              theme="dark"
              size="normal"
              className="mb-6"
            />
            
            {/* reCAPTCHA Error Display */}
            {recaptchaError && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                <p className="text-red-400 text-xs font-medium">{recaptchaError}</p>
              </div>
            )}
            
            <button
              type="submit"
              disabled={isLoading || !email || !password || (!isSignIn && (!confirmPassword || !username)) || !recaptchaVerified}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-black py-3 px-4 rounded-lg transition-all duration-300 font-bold text-sm shadow-lg hover:shadow-xl transform hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {isSignIn ? "Signing In..." : "Creating Account..."}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  {isSignIn ? "Sign In" : "Create Account"}
                </>
              )}
            </button>
          </form>
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-surface text-muted font-medium">Or continue with</span>
            </div>
          </div>
          <div className="space-y-3">
            <button 
              onClick={(e) => {
                e.preventDefault();
                console.log('🔘 Google button clicked!');
                handleGoogleLogin();
              }}
              disabled={isLoading}
              className="w-full bg-white hover:bg-gray-50 text-gray-900 py-3 px-4 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 font-semibold shadow-md hover:shadow-lg transform hover:scale-[1.02] text-sm disabled:opacity-50 disabled:cursor-not-allowed">
              <div className="w-5 h-5 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">G</div>
              {isLoading ? 'Connecting...' : 'Continue with Google'}
            </button>
            <button className="w-full bg-white hover:bg-gray-50 text-gray-900 py-3 px-4 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 font-semibold shadow-md hover:shadow-lg transform hover:scale-[1.02] text-sm">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-2.04 2.32-3.54 3.12-1.5.8-3.22 1.2-5.04 1.2-1.8 0-3.48-.4-4.96-1.2-1.48-.8-2.68-1.88-3.5-3.12-1.24-1.84-1.88-3.96-1.88-6.3 0-2.34.64-4.46 1.88-6.3.82-1.24 2.02-2.32 3.5-3.12 1.48-.8 3.16-1.2 4.96-1.2 1.82 0 3.54.4 5.04 1.2 1.5.8 2.71 1.88 3.54 3.12.82 1.24 1.24 2.66 1.24 4.18 0 1.52-.42 2.94-1.24 4.18z"/>
              </svg>
              Continue with Apple
            </button> 
            <button className="w-full bg-white hover:bg-gray-50 text-gray-900 py-3 px-4 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 font-semibold shadow-md hover:shadow-lg transform hover:scale-[1.02] text-sm">
              <div className="w-5 h-5 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white text-xs font-bold">f</div>
              Continue with Facebook
            </button>
          </div>
          <p className="text-muted text-xs text-center leading-relaxed mt-6">
            By clicking on any "Continue with" button or submitting the form, you agree to the{" "}
            <a href="#" className="text-yellow-500 hover:text-yellow-400 font-medium">Terms of Use</a>{" "}
            and acknowledge our{" "}
            <a href="#" className="text-yellow-500 hover:text-yellow-400 font-medium">Privacy Policy</a>{" "}
            on our website.
          </p>
        </div>
        <div className="text-center mt-4">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-muted hover:text-white text-xs transition-colors font-medium"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
        </div>
      </div>
      
      {/* Debug component - remove after fixing */}
      <RecaptchaDebug />
    </div>
  );
}
