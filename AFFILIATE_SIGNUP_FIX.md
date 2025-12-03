# Affiliate Referral Signup Fix

## Problem Identified
The affiliate system generates referral links like `https://jackpotx.net?ref=AFFMIMV2C5GZVBQEN`, but the frontend signup page doesn't:
1. Read the `ref` query parameter from the URL
2. Pre-fill the referral code input field
3. Send the referral code to the backend registration API

## Backend Status
✅ Backend is fully functional and ready to accept referral codes:
- `RegisterSchema` has optional `referral_code` field (src/api/auth/auth.schema.ts:39-42)
- `registerService` processes referral codes (src/services/auth/auth.service.ts:322-340)
- `AffiliateService.recordConversion()` tracks referrals

## Frontend Fixes Required

### 1. Update Signup.tsx to Read URL Parameters

Add this to your Signup component:

```tsx
import { useLocation } from 'react-router-dom';

const Signup = () => {
  const location = useLocation();
  // ... existing state ...

  // Extract referral code from URL on component mount
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const refCodeFromURL = params.get('ref');
    const refCodeFromStorage = localStorage.getItem('referral_code');

    const finalRefCode = refCodeFromURL || refCodeFromStorage || '';

    if (finalRefCode) {
      setSignUpForm((prev) => ({
        ...prev,
        referralCode: finalRefCode
      }));

      // Clear from localStorage after using
      if (refCodeFromStorage) {
        localStorage.removeItem('referral_code');
      }
    }
  }, [location]);

  // ... rest of component
};
```

### 2. Update Homepage to Redirect with Referral Code

Add to your homepage/landing component:

```tsx
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if URL has ?ref= parameter
    const params = new URLSearchParams(location.search);
    const refCode = params.get('ref');

    if (refCode) {
      // Store in localStorage for persistence
      localStorage.setItem('referral_code', refCode);
      // Redirect to signup with ref parameter
      navigate(`/signup?ref=${refCode}`);
    }
  }, [location, navigate]);

  return (
    // ... your homepage content
  );
}
```

### 3. Fix Registration API Call

Ensure `referral_code` is sent to backend:

```tsx
const handleSignUpSubmit = async (e) => {
  e.preventDefault();
  setIsSignUpLoading(true);
  try {
    const response = await register({
      username: signUpForm.username,
      email: signUpForm.email,
      password: signUpForm.password,
      captcha_id: signUpForm.captcha_id,
      captcha_text: signUpForm.captcha_text,
      type: "Player",
      referral_code: signUpForm.referralCode || undefined, // ← ADD THIS
    });
    // ... rest
  } catch (error) {
    // ... error handling
  }
};
```

### 4. Enhance Referral Input Field (Optional)

Make it clear when a referral code is applied:

```tsx
<div className="bg-white rounded-lg w-full border border-gray-300 focus-within:border-orange-500 transition-colors flex items-center"
     style={{ height: '52px' }}>
  <input
    type="text"
    name="referralCode"
    placeholder="Referral Code (Optional)"
    className="w-full px-4 bg-transparent outline-none text-gray-900 text-base"
    style={{ fontFamily: 'DM Sans, sans-serif' }}
    value={signUpForm.referralCode}
    onChange={handleSignUpChange}
    readOnly={!!new URLSearchParams(location.search).get('ref')} // Lock if from URL
  />
  {signUpForm.referralCode && (
    <span className="mr-3 text-xs text-green-600 font-semibold">
      ✓ Applied
    </span>
  )}
</div>
```

## Expected Flow After Fix

1. Affiliate shares: `https://jackpotx.net?ref=AFFMIMV2C5GZVBQEN`
2. User clicks link → lands on homepage with `?ref=` parameter
3. Homepage detects `ref` → stores in localStorage → redirects to `/signup?ref=AFFMIMV2C5GZVBQEN`
4. Signup page reads `ref` from URL → pre-fills referral code field
5. User completes registration → backend receives `referral_code`
6. Backend calls `AffiliateService.recordConversion()` → commission tracked
7. Affiliate earns commission ✅

## Testing Checklist

- [ ] Click affiliate link `https://jackpotx.net?ref=TEST123`
- [ ] Verify redirect to `/signup?ref=TEST123`
- [ ] Verify referral code field is pre-filled with `TEST123`
- [ ] Complete registration
- [ ] Check backend logs for: `[AFFILIATE] Referral conversion recorded`
- [ ] Verify commission appears in affiliate dashboard

## API Verification

Check if referral tracking works:

```bash
# Check affiliate_conversions table
PGPASSWORD='12358Voot#' psql -h localhost -U postgres -d jackpotx-db -c "SELECT * FROM affiliate_conversions ORDER BY created_at DESC LIMIT 5;"

# Check affiliate_commissions table
PGPASSWORD='12358Voot#' psql -h localhost -U postgres -d jackpotx-db -c "SELECT * FROM affiliate_commissions ORDER BY created_at DESC LIMIT 5;"
```
