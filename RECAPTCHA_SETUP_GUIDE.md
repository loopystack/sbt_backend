# 🔐 Google reCAPTCHA v2 Setup Guide

This guide will help you set up Google reCAPTCHA v2 in your sports betting application.

## 🚀 Quick Setup

### 1. Get reCAPTCHA Keys

1. Go to [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin/)
2. Click **"Create"** to create a new site
3. Fill in the form:
   - **Label**: "Sports Betting App"
   - **reCAPTCHA type**: Select **"reCAPTCHA v2"** → **"I'm not a robot" Checkbox**
   - **Domains**: Add your domain(s):
     - `localhost` (for development)
     - `127.0.0.1` (for local development)
     - Your production domain (e.g., `yourdomain.com`)
4. Accept terms and click **"Submit"**
5. Copy your **Site Key** and **Secret Key**

### 2. Configure Environment Variables

#### Frontend (.env file in your project root)
```env
# Google reCAPTCHA Configuration
VITE_RECAPTCHA_SITE_KEY=your_site_key_here
```

#### Backend (.env file in soccer_backend folder)
```env
# Google reCAPTCHA Configuration
RECAPTCHA_SITE_KEY=your_site_key_here
RECAPTCHA_SECRET_KEY=your_secret_key_here
```

### 3. Test Keys (Development Only)

For development, you can use Google's test keys:
- **Site Key**: `6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI`
- **Secret Key**: `6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe`

⚠️ **Note**: Test keys only work for `localhost` and will always pass verification.

## 📋 Implementation Details

### Frontend Integration

The reCAPTCHA is integrated into the sign-in/sign-up forms:

```tsx
import ReCaptchaComponent from '../components/ReCaptcha';
import { recaptchaService } from '../services/recaptchaService';

// In your component
<ReCaptchaComponent
  siteKey={recaptchaService.getSiteKey()}
  onVerify={handleRecaptchaVerify}
  onExpire={handleRecaptchaExpire}
  onError={handleRecaptchaError}
  theme="dark"
  size="normal"
/>
```

### Backend Verification

The backend automatically verifies reCAPTCHA tokens:

```python
# Endpoint: POST /api/auth/verify-recaptcha
{
  "recaptcha_token": "token_from_frontend"
}

# Response:
{
  "success": true,
  "message": "reCAPTCHA verification successful",
  "score": 1.0,
  "hostname": "localhost"
}
```

## 🎨 Customization Options

### reCAPTCHA Themes
- `light`: Light theme
- `dark`: Dark theme (automatically used)

### reCAPTCHA Sizes
- `normal`: Standard size (default)
- `compact`: Smaller size
- `invisible`: Hidden verification

### Component Styling
The reCAPTCHA component includes:
- Beautiful glassmorphism container
- Hover animations
- Responsive scaling
- Dark mode support
- Drop shadow effects

## 🔄 User Experience Flow

1. User opens sign-up/sign-in form
2. reCAPTCHA widget appears automatically
3. User clicks "I'm not a robot"
4. If Google detects suspicious activity, additional challenges appear:
   - Image puzzles
   - Text challenges
5. Upon verification, form becomes enabled
6. User can submit the form

## 🛡️ Security Features

### Backend Verification
- ✅ Server-side token validation
- ✅ IP address tracking
- ✅ Response time validation
- ✅ Hostname verification

### Protection Against
- ✅ Bot attacks
- ✅ Automated registrations
- ✅ Brute force attempts
- ✅ Spam submissions

## 🚨 Troubleshooting

### Common Issues

#### "reCAPTCHA verification failed"
- ✅ Ensure secret key is correct
- ✅ Check if site key matches domain
- ✅ Verify token hasn't expired

#### reCAPTCHA not loading
- ✅ Check internet connection
- ✅ Ensure site key is configured
- ✅ Verify domain is whitelisted

#### "missing-input-response"
- ✅ User must complete the challenge
- ✅ Check if widget is properly loaded

### Debug Mode
Enable debug logging:

```javascript
// Frontend
localStorage.setItem('recaptcha_debug', 'true');

// Check browser console for detailed logs
```

#### Backend Debug
Set environment variable:
```env
DEBUG=True
```

### Network Issues
If reCAPTCHA API is unreachable:
- ✅ Check firewall settings
- ✅ Verify proxy configuration
- ✅ Ensure Google services are accessible

## 🌐 Production Deployment

### Domain Configuration
1. Add production domain to reCAPTCHA admin
2. Update environment variables with production keys
3. Test on staging environment first

### Monitoring
Monitor reCAPTCHA verification success rates:
- Failed verifications
- Challenge completion rates
- Response times

## 📱 Mobile Optimization

The reCAPTCHA component is fully responsive:
- Automatically scales on mobile devices
- Touch-friendly interface
- Optimized for mobile browsers
- Works with mobile data connections

## 🎯 Advanced Configuration

### Multiple reCAPTCHAs
You can use different reCAPTCHA configs for different forms:

```tsx
// Contact form - compact size
<ReCaptchaComponent
  siteKey={recaptchaService.getSiteKey()}
  size="compact"
  onVerify={handleContactVerify}
/>

// Registration form - normal size
<ReCaptchaComponent
  siteKey={recaptchaService.getSiteKey()}
  size="normal"
  onVerify={handleRegisterVerify}
/>
```

### Custom Styling
Override default styles:

```css
.recaptcha-container .g-recaptcha {
  border-radius: 12px;
  transform: scale(1.1);
}
```

## ✅ Checklist

Before going live:

- [ ] Get production reCAPTCHA keys
- [ ] Configure environment variables
- [ ] Add production domain to reCAPTCHA admin
- [ ] Test with different browsers
- [ ] Test on mobile devices
- [ ] Monitor verification success rates
- [ ] Set up error logging

## 🎉 You're All Set!

Your sports betting app now has enterprise-grade bot protection with Google's advanced reCAPTCHA system. Users will have a smooth, secure verification experience that feels natural and trustworthy.

---

**Need help?** Check the troubleshooting section or refer to [Google's reCAPTCHA documentation](https://developers.google.com/recaptcha/docs/v2).
