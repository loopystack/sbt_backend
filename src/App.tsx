import React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import "./styles/theme.css";
import { routes } from "./app/routes";
import { ThemeProvider } from "./contexts/ThemeContext";
import { CountryProvider } from "./contexts/CountryContext";
import { AuthProvider } from "./contexts/AuthContext";
import { PreferencesProvider } from "./contexts/PreferencesContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import ReduxProvider from "./contexts/ReduxContext";
import CookieConsent from "./components/CookieConsent";
import { CookieManager, CookiePreferences } from "./utils/cookieManager";
import "./utils/testNotificationSystem"; // Load test utilities

const router = createBrowserRouter(routes);

const App: React.FC = () => {
  const handleCookieAccept = (preferences: CookiePreferences) => {
    console.log('Cookie preferences accepted:', preferences);
    
    // Save preferences
    CookieManager.savePreferences(preferences);
    
    // Initialize services based on preferences
    if (preferences.analytics) {
      CookieManager.initializeAnalytics();
      // Uncomment and add your Google Analytics tracking ID:
      // initializeGoogleAnalytics('GA_TRACKING_ID');
    }
    
    if (preferences.marketing) {
      CookieManager.initializeMarketing();
      // Uncomment and add your Facebook Pixel ID:
      // initializeFacebookPixel('FACEBOOK_PIXEL_ID');
    }
    
    // Clear non-essential cookies if user declined them
    CookieManager.clearNonEssentialCookies();
  };

  const handleCookieDecline = () => {
    console.log('Non-essential cookies declined');
    
    // Save preferences with only essential cookies
    const preferences: CookiePreferences = {
      essential: true,
      analytics: false,
      marketing: false
    };
    
    CookieManager.savePreferences(preferences);
    CookieManager.clearNonEssentialCookies();
  };

  return (
    <React.StrictMode>
      <ReduxProvider>
        <ThemeProvider>
          <CountryProvider>
            <AuthProvider>
              <NotificationProvider>
                <PreferencesProvider>
                  <RouterProvider router={router} />
                  <CookieConsent 
                    onAccept={handleCookieAccept}
                    onDecline={handleCookieDecline}
                  />
                </PreferencesProvider>
              </NotificationProvider>
            </AuthProvider>
          </CountryProvider>
        </ThemeProvider>
      </ReduxProvider>
    </React.StrictMode>
  );
};

export default App;
