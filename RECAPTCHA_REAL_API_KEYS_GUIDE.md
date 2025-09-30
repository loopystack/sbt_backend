# 🔑 How to Get Real reCAPTCHA API Keys

This guide will help you get real reCAPTCHA API keys for production use.

## 🚀 Quick Setup (5 minutes)

### Step 1: Go to Google reCAPTCHA Admin

1. Visit: [https://www.google.com/recaptcha/admin](https://www.google.com/recaptcha/admin)
2. Sign in with your Google account (or create one if needed)

### Step 2: Create a New Site

1. Click **"+ Create"** button
2. Fill in the form:

   **Label**: `Sports Betting App` (or any name you prefer)
   
   **reCAPTCHA type**: Select **"reCAPTCHA v2"** → **"I'm not a robot" Checkbox**
   
   **Domains**: Add your domains:
   - `localhost` (for development)
   - `127.0.0.1` (for development)
   - `yourdomain.com` (your production domain)

3. Accept the Terms of Service
4. Click **"Submit"**

### Step 3: Get Your API Keys

After creating the site, you'll see:

- **Site Key** (Public Key) - for frontend
- **Secret Key** (Private Key) - for backend

Copy both keys immediately!

## 📝 Configure Your Application

### Step 4: Add Keys to Environment Variables

Create a `.env` file in your project root:

```env
# Google reCAPTCHA Configuration
VITE_RECAPTCHA_SITE_KEY=your_real_site_key_here
```

And in your backend `.env` file (soccer_backend folder):

```env
# Google reCAPTCHA Configuration  
RECAPTCHA_SITE_KEY=your_real_site_key_here
RECAPTCHA_SECRET_KEY=your_real_secret_key_here
```

### Step 5: Test Your Setup

1. Restart your development server
2. Go to your sign-in/sign-up page
3. You should see the reCAPTCHA widget working
4. Test the verification process

## 🔒 Security Notes

### Keep Your Keys Safe

- **Never commit** your real API keys to Git
- **Never share** your secret key publicly
- **Use different keys** for development and production
- **Add `.env` to `.gitignore`** to prevent accidental commits

### Production Deployment

For production, set these as environment variables on your hosting platform:

```bash
# Frontend (Vite)
VITE_RECAPTCHA_SITE_KEY=your_production_site_key

# Backend
RECAPTCHA_SITE_KEY=your_production_site_key
RECAPTCHA_SECRET_KEY=your_production_secret_key
```

## 🎯 Domain Configuration

### Development Domains
- `localhost`
- `127.0.0.1`
- `localhost:5173` (if using specific port)

### Production Domains
- `yourdomain.com`
- `www.yourdomain.com`
- `app.yourdomain.com` (if using subdomains)

## 🚨 Common Issues & Solutions

### "This site key is not authorized for this domain"

**Solution**: Add your domain to the reCAPTCHA admin panel:
1. Go to [reCAPTCHA Admin](https://www.google.com/recaptcha/admin)
2. Click on your site
3. Add your domain to the "Domains" list
4. Save changes

### reCAPTCHA not loading

**Possible causes**:
- Wrong site key
- Domain not authorized
- Network issues
- Ad blockers blocking reCAPTCHA

**Solutions**:
- Verify your site key is correct
- Check domain authorization
- Disable ad blockers for testing
- Check browser console for errors

### "Invalid site key" error

**Solution**: 
- Double-check you copied the correct site key
- Make sure there are no extra spaces or characters
- Verify the key is for reCAPTCHA v2 (not v3)

## 📊 Monitoring & Analytics

### Check Usage in Admin Panel

1. Go to [reCAPTCHA Admin](https://www.google.com/recaptcha/admin)
2. Click on your site
3. View statistics:
   - Successful verifications
   - Failed attempts
   - Challenge rates

### Backend Verification Logs

Monitor your backend logs for:
- Successful verifications
- Failed verifications
- Error messages

## 🔄 Updating Keys

If you need to regenerate keys:

1. Go to reCAPTCHA Admin
2. Select your site
3. Click "Settings" (gear icon)
4. Click "Regenerate Key Pair"
5. Update your `.env` files
6. Restart your applications

## ✅ Testing Checklist

Before going live:

- [ ] Real API keys configured
- [ ] Development domain working
- [ ] Production domain added to reCAPTCHA admin
- [ ] Backend verification working
- [ ] Error handling working
- [ ] Mobile devices tested
- [ ] Different browsers tested

## 🎉 You're All Set!

Your sports betting app now has production-ready reCAPTCHA protection! 

### What You Get:
- ✅ **Bot Protection**: Blocks automated attacks
- ✅ **User-Friendly**: Simple "I'm not a robot" checkbox
- ✅ **Mobile Optimized**: Works on all devices
- ✅ **Free**: No cost for standard usage
- ✅ **Reliable**: Google's proven technology

### Next Steps:
1. Deploy to production with your real keys
2. Monitor verification success rates
3. Adjust security settings if needed

---

**Need help?** Check the [Google reCAPTCHA documentation](https://developers.google.com/recaptcha/docs/v2) or your backend verification logs.
