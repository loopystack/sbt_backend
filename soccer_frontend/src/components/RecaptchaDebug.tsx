import React from 'react';
import { recaptchaService } from '../services/recaptchaService';

const RecaptchaDebug: React.FC = () => {
  const [isVisible, setIsVisible] = React.useState(false);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-gray-800 text-white p-2 rounded-full shadow-lg hover:bg-gray-700 transition-colors z-50"
        title="Debug reCAPTCHA Configuration"
      >
        🐛
      </button>
    );
  }

  const siteKey = recaptchaService.getSiteKey();
  const isConfigured = recaptchaService.isConfigured();
  const envVar = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-4 rounded-lg shadow-xl border border-gray-700 z-50 max-w-sm">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold">🐛 reCAPTCHA Debug</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white text-lg"
        >
          ×
        </button>
      </div>
      
      <div className="space-y-3 text-xs">
        <div>
          <h4 className="font-medium text-yellow-400 mb-1">Environment Variables</h4>
          <div className="bg-gray-800 p-2 rounded text-xs">
            <div>VITE_RECAPTCHA_SITE_KEY: {envVar || 'NOT SET'}</div>
            <div>Length: {envVar ? envVar.length : 0} characters</div>
          </div>
        </div>

        <div>
          <h4 className="font-medium text-yellow-400 mb-1">Service Status</h4>
          <div className="bg-gray-800 p-2 rounded text-xs">
            <div>Site Key Used: {siteKey.substring(0, 10)}...</div>
            <div>Is Configured: {isConfigured ? '✅ Yes' : '❌ No'}</div>
            <div>Using Test Key: {siteKey.includes('6LeIxAcT') ? '⚠️ Yes (Test Key)' : '✅ No (Real Key)'}</div>
          </div>
        </div>

        <div className="text-gray-400 text-xs">
          <div>Environment: {import.meta.env.DEV ? 'Development' : 'Production'}</div>
          <div>Current Domain: {window.location.hostname}</div>
          <div>Port: {window.location.port}</div>
        </div>
      </div>
    </div>
  );
};

export default RecaptchaDebug;
