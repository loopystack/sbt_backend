import React, { useState, useEffect } from 'react';
import './CookieConsent.css';

interface CookieConsentProps {
  onAccept?: (preferences: CookiePreferences) => void;
  onDecline?: () => void;
}

interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
}

const CookieConsent: React.FC<CookieConsentProps> = ({ onAccept, onDecline }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true, // Always true, can't be disabled
    analytics: false,
    marketing: false
  });

  useEffect(() => {
    // Check if user has already made a choice
    const cookieConsent = localStorage.getItem('cookieConsent');
    if (!cookieConsent) {
      setIsVisible(true);
    }
  }, []);

  const handleAcceptAll = () => {
    const allAccepted = {
      essential: true,
      analytics: true,
      marketing: true
    };
    localStorage.setItem('cookieConsent', JSON.stringify(allAccepted));
    setIsVisible(false);
    onAccept?.(allAccepted);
  };

  const handleAcceptSelected = () => {
    localStorage.setItem('cookieConsent', JSON.stringify(preferences));
    setIsVisible(false);
    onAccept?.(preferences);
  };

  const handleDecline = () => {
    const declined = {
      essential: true, // Essential cookies are always required
      analytics: false,
      marketing: false
    };
    localStorage.setItem('cookieConsent', JSON.stringify(declined));
    setIsVisible(false);
    onDecline?.();
  };

  const handlePreferenceChange = (type: keyof CookiePreferences) => {
    if (type === 'essential') return; // Can't change essential cookies
    
    setPreferences(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  if (!isVisible) return null;

  return (
    <div className="cookie-consent-overlay">
      <div className="cookie-consent-banner">
        <div className="cookie-consent-content">
          <div className="cookie-consent-header">
            <div className="cookie-icon">🍪</div>
            <h3>Cookie Preferences</h3>
          </div>
          
          <div className="cookie-consent-text">
            <p>
              🎯 We use cookies to enhance your betting experience, analyze site traffic, 
              and personalize content. By continuing to use our site, you consent to our use of cookies.
            </p>
          </div>

          {!showDetails ? (
            <div className="cookie-consent-actions">
              <button 
                className="btn-accept-all"
                onClick={handleAcceptAll}
              >
                Accept All Cookies
              </button>
              <button 
                className="btn-customize"
                onClick={() => setShowDetails(true)}
              >
                Customize
              </button>
              <button 
                className="btn-decline"
                onClick={handleDecline}
              >
                Decline Non-Essential
              </button>
            </div>
          ) : (
            <div className="cookie-consent-details">
              <div className="cookie-category">
                <div className="cookie-category-header">
                  <label className="cookie-category-label">
                    <input
                      type="checkbox"
                      checked={preferences.essential}
                      disabled
                      readOnly
                    />
                    <span className="cookie-category-title">🔒 Essential Cookies</span>
                    <span className="cookie-category-required">Required</span>
                  </label>
                </div>
                <p className="cookie-category-description">
                  🛡️ These cookies are necessary for the website to function properly. 
                  They include login sessions, security features, and basic functionality. 
                  These cannot be disabled.
                </p>
              </div>

              <div className="cookie-category">
                <div className="cookie-category-header">
                  <label className="cookie-category-label">
                    <input
                      type="checkbox"
                      checked={preferences.analytics}
                      onChange={() => handlePreferenceChange('analytics')}
                    />
                    <span className="cookie-category-title">📊 Analytics Cookies</span>
                  </label>
                </div>
                <p className="cookie-category-description">
                  📈 These cookies help us understand how you use our site, 
                  which pages are most popular, and how we can improve your betting experience. 
                  No personal data is collected.
                </p>
              </div>

              <div className="cookie-category">
                <div className="cookie-category-header">
                  <label className="cookie-category-label">
                    <input
                      type="checkbox"
                      checked={preferences.marketing}
                      onChange={() => handlePreferenceChange('marketing')}
                    />
                    <span className="cookie-category-title">🎯 Marketing Cookies</span>
                  </label>
                </div>
                <p className="cookie-category-description">
                  🚀 These cookies are used to deliver personalized betting offers, 
                  promotions, and track the effectiveness of our marketing campaigns. 
                  Helps us show you relevant content.
                </p>
              </div>

              <div className="cookie-consent-actions">
                <button 
                  className="btn-save-preferences"
                  onClick={handleAcceptSelected}
                >
                  Save Preferences
                </button>
                <button 
                  className="btn-back"
                  onClick={() => setShowDetails(false)}
                >
                  Back
                </button>
              </div>
            </div>
          )}

          <div className="cookie-consent-footer">
            <p>
              🔐 Learn more about our cookie policy in our{' '}
              <a href="/privacy-policy" target="_blank" rel="noopener noreferrer">
                Privacy Policy
              </a>
              {' '}and{' '}
              <a href="/terms-of-service" target="_blank" rel="noopener noreferrer">
                Terms of Service
              </a>
              . Your privacy matters to us! 🛡️
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
