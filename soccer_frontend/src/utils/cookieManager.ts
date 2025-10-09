// Cookie Management Utility
export interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
}

export class CookieManager {
  private static readonly COOKIE_CONSENT_KEY = 'cookieConsent';
  private static readonly COOKIE_PREFERENCES_KEY = 'cookiePreferences';

  // Get user's cookie preferences
  static getPreferences(): CookiePreferences | null {
    try {
      const stored = localStorage.getItem(this.COOKIE_PREFERENCES_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  // Save user's cookie preferences
  static savePreferences(preferences: CookiePreferences): void {
    try {
      localStorage.setItem(this.COOKIE_PREFERENCES_KEY, JSON.stringify(preferences));
      localStorage.setItem(this.COOKIE_CONSENT_KEY, 'true');
    } catch (error) {
      console.error('Failed to save cookie preferences:', error);
    }
  }

  // Check if user has given consent
  static hasConsent(): boolean {
    return localStorage.getItem(this.COOKIE_CONSENT_KEY) === 'true';
  }

  // Check if specific cookie type is allowed
  static isAllowed(cookieType: keyof CookiePreferences): boolean {
    const preferences = this.getPreferences();
    return preferences ? preferences[cookieType] : false;
  }

  // Initialize analytics (Google Analytics, etc.)
  static initializeAnalytics(): void {
    if (!this.isAllowed('analytics')) {
      console.log('Analytics cookies not allowed');
      return;
    }

    // Example: Initialize Google Analytics
    // You can replace this with your actual analytics implementation
    console.log('Initializing analytics...');
    
    // Example Google Analytics implementation:
    /*
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('consent', 'update', {
        'analytics_storage': 'granted'
      });
    }
    */
  }

  // Initialize marketing cookies
  static initializeMarketing(): void {
    if (!this.isAllowed('marketing')) {
      console.log('Marketing cookies not allowed');
      return;
    }

    // Example: Initialize marketing tools
    console.log('Initializing marketing tools...');
    
    // Example Facebook Pixel implementation:
    /*
    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('consent', 'grant');
    }
    */
  }

  // Clear all non-essential cookies
  static clearNonEssentialCookies(): void {
    // Clear analytics cookies
    if (!this.isAllowed('analytics')) {
      // Clear Google Analytics cookies
      document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
      });
    }

    // Clear marketing cookies
    if (!this.isAllowed('marketing')) {
      // Clear marketing-related cookies
      console.log('Clearing marketing cookies...');
    }
  }

  // Reset cookie consent (for testing)
  static resetConsent(): void {
    localStorage.removeItem(this.COOKIE_CONSENT_KEY);
    localStorage.removeItem(this.COOKIE_PREFERENCES_KEY);
    console.log('Cookie consent reset');
  }
}

// Google Analytics helper (if you want to add GA)
export const initializeGoogleAnalytics = (trackingId: string) => {
  if (!CookieManager.isAllowed('analytics')) {
    return;
  }

  // Load Google Analytics script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${trackingId}`;
  document.head.appendChild(script);

  // Initialize gtag
  window.dataLayer = window.dataLayer || [];
  function gtag(...args: any[]) {
    window.dataLayer.push(args);
  }
  window.gtag = gtag;
  
  gtag('js', new Date());
  gtag('config', trackingId, {
    anonymize_ip: true,
    cookie_flags: 'SameSite=None;Secure'
  });
};

// Facebook Pixel helper (if you want to add Facebook Pixel)
export const initializeFacebookPixel = (pixelId: string) => {
  if (!CookieManager.isAllowed('marketing')) {
    return;
  }

  // Load Facebook Pixel script
  const script = document.createElement('script');
  script.innerHTML = `
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '${pixelId}');
    fbq('track', 'PageView');
  `;
  document.head.appendChild(script);
};

// Declare global types for TypeScript
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
    fbq: (...args: any[]) => void;
  }
}
