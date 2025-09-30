import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';

interface ReCaptchaProps {
  siteKey: string;
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: (error: string) => void;
  theme?: 'light' | 'dark';
  size?: 'normal' | 'compact' | 'invisible';
  className?: string;
}

export interface ReCaptchaRef {
  reset: () => void;
  execute: () => void;
  getResponse: () => string | null;
}

const ReCaptchaComponent = forwardRef<ReCaptchaRef, ReCaptchaProps>(({
  siteKey,
  onVerify,
  onExpire,
  onError,
  theme = 'dark',
  size = 'normal',
  className = ""
}, ref) => {
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  useImperativeHandle(ref, () => ({
    reset: () => {
      recaptchaRef.current?.reset();
    },
    execute: () => {
      recaptchaRef.current?.execute();
    },
    getResponse: () => {
      return recaptchaRef.current?.getValue() || null;
    }
  }));

  const handleChange = (token: string | null) => {
    if (token) {
      onVerify(token);
    }
  };

  const handleExpired = () => {
    onExpire?.();
  };

  const handleError = () => {
    onError?.('reCAPTCHA verification failed');
  };

  return (
    <div className={`recaptcha-container ${className}`}>
      <div className="recaptcha-wrapper">
        <ReCAPTCHA
          ref={recaptchaRef}
          sitekey={siteKey}
          onChange={handleChange}
          onErrored={handleError}
          onExpired={handleExpired}
          theme={theme}
          size={size}
        />
      </div>
      
      {/* Custom styling overlay */}
      <style>{`
        .recaptcha-container {
          display: flex;
          justify-content: center;
          margin: 1rem 0;
        }
        
        .recaptcha-wrapper {
          transform: scale(1.05);
          filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.15));
          transition: all 0.3s ease;
        }
        
        .recaptcha-wrapper:hover {
          transform: scale(1.07);
          filter: drop-shadow(0 6px 20px rgba(0, 0, 0, 0.25));
        }
        
        .recaptcha-wrapper .g-recaptcha {
          border-radius: 8px;
          overflow: hidden;
        }
        
        /* Dark theme support */
        @media (prefers-color-scheme: dark) {
          .recaptcha-wrapper {
            filter: drop-shadow(0 4px 12px rgba(255, 255, 255, 0.1));
          }
          
          .recaptcha-wrapper:hover {
            filter: drop-shadow(0 6px 20px rgba(255, 255, 255, 0.15));
          }
        }
        
        /* Responsive adjustments */
        @media (max-width: 640px) {
          .recaptcha-wrapper {
            transform: scale(0.9);
          }
          
          .recaptcha-wrapper:hover {
            transform: scale(0.92);
          }
        }
      `}</style>
    </div>
  );
});

ReCaptchaComponent.displayName = 'ReCaptchaComponent';

export default ReCaptchaComponent;
