// Test Cookie Consent System
// Run this in your browser console to test the cookie consent

console.log('🍪 Testing Cookie Consent System');

// Test 1: Check if cookie consent is working
const testCookieConsent = () => {
  console.log('=== Cookie Consent Test ===');
  
  // Check if consent has been given
  const hasConsent = localStorage.getItem('cookieConsent');
  console.log('Has consent:', hasConsent);
  
  // Check preferences
  const preferences = localStorage.getItem('cookiePreferences');
  console.log('Preferences:', preferences ? JSON.parse(preferences) : 'None');
  
  // Test cookie manager functions
  if (typeof CookieManager !== 'undefined') {
    console.log('CookieManager available:', true);
    console.log('Analytics allowed:', CookieManager.isAllowed('analytics'));
    console.log('Marketing allowed:', CookieManager.isAllowed('marketing'));
  } else {
    console.log('CookieManager not available - make sure to import it');
  }
};

// Test 2: Reset consent (for testing)
const resetCookieConsent = () => {
  console.log('=== Resetting Cookie Consent ===');
  localStorage.removeItem('cookieConsent');
  localStorage.removeItem('cookiePreferences');
  console.log('Cookie consent reset! Refresh the page to see the banner again.');
};

// Test 3: Simulate accepting all cookies
const acceptAllCookies = () => {
  console.log('=== Accepting All Cookies ===');
  const preferences = {
    essential: true,
    analytics: true,
    marketing: true
  };
  localStorage.setItem('cookieConsent', 'true');
  localStorage.setItem('cookiePreferences', JSON.stringify(preferences));
  console.log('All cookies accepted!');
};

// Test 4: Simulate declining non-essential cookies
const declineNonEssentialCookies = () => {
  console.log('=== Declining Non-Essential Cookies ===');
  const preferences = {
    essential: true,
    analytics: false,
    marketing: false
  };
  localStorage.setItem('cookieConsent', 'true');
  localStorage.setItem('cookiePreferences', JSON.stringify(preferences));
  console.log('Non-essential cookies declined!');
};

// Make functions available globally for testing
window.testCookieConsent = testCookieConsent;
window.resetCookieConsent = resetCookieConsent;
window.acceptAllCookies = acceptAllCookies;
window.declineNonEssentialCookies = declineNonEssentialCookies;

console.log('🍪 Cookie Consent Test Functions Available:');
console.log('- testCookieConsent() - Check current status');
console.log('- resetCookieConsent() - Reset consent (refresh page to see banner)');
console.log('- acceptAllCookies() - Accept all cookies');
console.log('- declineNonEssentialCookies() - Decline non-essential cookies');

// Run initial test
testCookieConsent();
