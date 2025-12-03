# 🚨 FRONTEND REFERRAL CODE FIX - CRITICAL

## Problem Verified

**Database Evidence:**
- Users `gguser` (#81) and `rruser` (#82) were registered but **NO affiliate relationships created**
- Their `user_activity_logs` show: `"referral_code": null`
- Backend logs show registration requests **do NOT include referral_code field**

**Backend Status:** ✅ WORKING (existing referrals prove it works)
**Frontend Status:** ❌ NOT SENDING referral_code to API

---

## Required Frontend Fixes

### 1. Fix Signup.tsx - Extract Referral Code from URL

```tsx
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const Signup = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [signUpForm, setSignUpForm] = useState({
    username: '',
    email: '',
    password: '',
    captcha_id: '',
    captcha_text: '',
    referralCode: ''  // Make sure this field exists
  });

  // ✅ ADD THIS: Extract referral code on mount
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const refCode = params.get('ref');

    if (refCode) {
      console.log('[Signup] Referral code detected:', refCode);
      setSignUpForm(prev => ({
        ...prev,
        referralCode: refCode
      }));

      // Store in localStorage as backup
      localStorage.setItem('pending_referral_code', refCode);
    } else {
      // Check localStorage for pending referral
      const storedCode = localStorage.getItem('pending_referral_code');
      if (storedCode) {
        console.log('[Signup] Using stored referral code:', storedCode);
        setSignUpForm(prev => ({
          ...prev,
          referralCode: storedCode
        }));
      }
    }
  }, [location.search]);

  // ... rest of component
};
```

### 2. Fix Registration API Call - SEND referral_code

**CRITICAL FIX:** Update the `handleSignUpSubmit` or wherever you call the register API:

```tsx
const handleSignUpSubmit = async (e) => {
  e.preventDefault();
  setIsSignUpLoading(true);

  try {
    console.log('[Signup] Submitting registration with referral code:', signUpForm.referralCode);

    const response = await register({
      username: signUpForm.username,
      email: signUpForm.email,
      password: signUpForm.password,
      captcha_id: signUpForm.captcha_id,
      captcha_text: signUpForm.captcha_text,
      type: "Player",
      referral_code: signUpForm.referralCode || undefined  // ✅ ADD THIS LINE
    });

    // Clear stored referral code on success
    localStorage.removeItem('pending_referral_code');

    // ... rest of success handling
  } catch (error) {
    console.error('[Signup] Registration failed:', error);
    // ... error handling
  } finally {
    setIsSignUpLoading(false);
  }
};
```

### 3. Fix register() API Function

Make sure your API service function includes referral_code:

```tsx
// In your API service file (e.g., api/auth.js or services/auth.js)
export const register = async (data) => {
  console.log('[API] Register payload:', data);  // Debug log

  const response = await axios.post('/api/auth/register', {
    username: data.username,
    email: data.email,
    password: data.password,
    type: data.type,
    captcha_id: data.captcha_id,
    captcha_text: data.captcha_text,
    referral_code: data.referral_code  // ✅ MUST INCLUDE THIS
  });

  return response.data;
};
```

### 4. Fix Homepage Redirect (Soon/index.js or Home component)

```tsx
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const HomePage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const refCode = params.get('ref');

    if (refCode) {
      console.log('[Home] Referral link detected, redirecting to signup with code:', refCode);

      // Store in localStorage
      localStorage.setItem('pending_referral_code', refCode);

      // Redirect to signup with ref parameter
      navigate(`/signup?ref=${refCode}`, { replace: true });
    }
  }, [location.search, navigate]);

  // ... rest of component
};
```

---

## Testing Checklist

After implementing these fixes, test the complete flow:

### Test 1: Direct Referral Link
1. Open browser in incognito mode
2. Visit: `https://jackpotx.net?ref=AFFNEWUSER1`
3. Should redirect to: `https://jackpotx.net/signup?ref=AFFNEWUSER1`
4. Referral code field should be pre-filled with "AFFNEWUSER1"
5. Complete registration with a test user (e.g., "testuser999")
6. Check browser console - should see logs:
   ```
   [Home] Referral link detected, redirecting to signup with code: AFFNEWUSER1
   [Signup] Referral code detected: AFFNEWUSER1
   [Signup] Submitting registration with referral code: AFFNEWUSER1
   [API] Register payload: { ..., referral_code: "AFFNEWUSER1" }
   ```

### Test 2: Backend Verification
After registration, run this on the backend:

```bash
# Check if referral was tracked
PGPASSWORD='12358Voot#' psql -h localhost -U postgres -d jackpotx-db -c "
SELECT
    ar.id,
    ar.affiliate_id,
    ar.referred_user_id,
    ar.referral_code,
    u.username as referred_username,
    ar.created_at
FROM affiliate_relationships ar
LEFT JOIN users u ON u.id = ar.referred_user_id
WHERE u.username = 'testuser999';
"

# Check if AFFNEWUSER1's total_referrals increased
PGPASSWORD='12358Voot#' psql -h localhost -U postgres -d jackpotx-db -c "
SELECT
    referral_code,
    display_name,
    total_referrals,
    total_commission_earned
FROM affiliate_profiles
WHERE referral_code = 'AFFNEWUSER1';
"
```

Expected results:
- ✅ New row in `affiliate_relationships` table
- ✅ `total_referrals` increased from 5 to 6
- ✅ User activity log shows: `"referral_code": "AFFNEWUSER1"`

### Test 3: Check Backend Logs
```bash
pm2 logs backend --lines 50 | grep -i "AFFILIATE"
```

Should see:
```
[AFFILIATE] Referral conversion recorded for user 83 with code AFFNEWUSER1
```

---

## Common Issues & Solutions

### Issue 1: "referral_code field not showing in form state"
**Solution:** Make sure signUpForm initial state includes `referralCode: ''`

### Issue 2: "URL parameter not being read"
**Solution:** Verify you're using `react-router-dom` v6+ syntax with `useLocation()`

### Issue 3: "Field is populated but not sent to API"
**Solution:** Add console.log() before the API call to verify the payload includes referral_code

### Issue 4: "localStorage not persisting across redirect"
**Solution:** Set localStorage BEFORE the navigate() call

---

## Debug Checklist

If referrals still not working after fixes:

1. ✅ Open browser DevTools Network tab
2. ✅ Register with referral link
3. ✅ Find the POST request to `/api/auth/register`
4. ✅ Check Request Payload - must include:
   ```json
   {
     "username": "...",
     "email": "...",
     "password": "...",
     "type": "Player",
     "captcha_id": "...",
     "captcha_text": "...",
     "referral_code": "AFFNEWUSER1"  ← THIS MUST BE PRESENT
   }
   ```

5. ✅ Check Response - backend should return success
6. ✅ Check backend PM2 logs - should see `[AFFILIATE]` log
7. ✅ Check database - run verification queries above

---

## Summary

**The backend is 100% ready and working.** The ONLY issue is that the frontend is not sending the `referral_code` parameter in the registration API request.

**Required changes:**
1. Read `ref` parameter from URL in Signup component
2. Store in component state (`signUpForm.referralCode`)
3. **CRITICALLY:** Include `referral_code` in the API request payload
4. Add homepage redirect logic for referral links

**Expected outcome:**
When users register via `https://jackpotx.net?ref=AFFNEWUSER1`, the affiliate relationship will be automatically tracked and the affiliate's dashboard will show the new referral immediately.
