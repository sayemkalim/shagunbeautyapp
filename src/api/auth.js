import apiRequest from './client';

// Step 1 of the phone+PIN flow — tells the caller whether to continue to
// register() (new/incomplete signup) or verifyLogin() (existing account).
export function loginWithPhone(phoneNumber) {
  return apiRequest('/api/auth/user/login', {
    method: 'POST',
    body: { phoneNumber },
  });
}

// Step 2, existing user (is_new_user: false from loginWithPhone).
export function verifyLogin(phoneNumber, pin) {
  return apiRequest('/api/auth/user/verify-login', {
    method: 'POST',
    body: { phoneNumber, pin },
  });
}

// Step 2, new user (is_new_user: true from loginWithPhone).
export function registerUser({ phoneNumber, pin, name, email }) {
  return apiRequest('/api/auth/user/register', {
    method: 'POST',
    body: { phoneNumber, pin, name, email },
  });
}

// Google OAuth login/registration — idToken comes from a client-side Google
export function googleLogin(idToken) {
  return apiRequest('/api/auth/user/google', {
    method: 'POST',
    body: { idToken },
  });
}

// Forgot PIN Flow — Step 1: Request OTP to registered email
export async function requestForgotPinOtp(phoneNumber) {
  const cleanPhone = String(phoneNumber || '').replace(/[^0-9+]/g, '').trim();
  const digits = cleanPhone.replace(/^\+91/, '');
  const formattedWithPrefix = cleanPhone.startsWith('+') ? cleanPhone : `+91${digits}`;

  console.log('📌 [FORGOT_PIN] Requesting OTP for input:', phoneNumber);
  console.log('📌 [FORGOT_PIN] Primary format (+91):', formattedWithPrefix);

  // Primary attempt with +91 (backend database standard)
  try {
    console.log('🚀 [FORGOT_PIN] Calling /api/auth/user/forgot-pin with body:', { phoneNumber: formattedWithPrefix });
    const res1 = await apiRequest('/api/auth/user/forgot-pin', {
      method: 'POST',
      body: { phoneNumber: formattedWithPrefix },
    });
    console.log('✅ [FORGOT_PIN] SUCCESS:', JSON.stringify(res1, null, 2));
    return res1;
  } catch (err1) {
    console.warn('⚠️ [FORGOT_PIN] Attempt with +91 failed:', err1?.message || err1);
    
    // Fallback to raw 10 digits
    try {
      console.log('🚀 [FORGOT_PIN] Fallback: Calling /api/auth/user/forgot-pin with raw digits:', { phoneNumber: digits });
      const res2 = await apiRequest('/api/auth/user/forgot-pin', {
        method: 'POST',
        body: { phoneNumber: digits },
      });
      console.log('✅ [FORGOT_PIN] Fallback SUCCESS:', JSON.stringify(res2, null, 2));
      return res2;
    } catch (err2) {
      console.error('❌ [FORGOT_PIN] Fallback failed:', err2?.message || err2);
      throw (err1?.message && !err2?.message) ? err1 : err2;
    }
  }
}

// Forgot PIN Flow — Step 2: Verify 6-digit OTP
export async function verifyResetOtp(phoneNumber, otp) {
  const cleanPhone = String(phoneNumber || '').replace(/[^0-9+]/g, '').trim();
  const digits = cleanPhone.replace(/^\+91/, '');
  const formattedWithPrefix = cleanPhone.startsWith('+') ? cleanPhone : `+91${digits}`;
  const cleanOtp = String(otp || '').trim();

  console.log('📌 [VERIFY_RESET_OTP] Verifying OTP for:', formattedWithPrefix, 'OTP:', cleanOtp);

  try {
    console.log('🚀 [VERIFY_RESET_OTP] Calling /api/auth/user/verify-reset-otp with:', { phoneNumber: formattedWithPrefix, otp: cleanOtp });
    const res1 = await apiRequest('/api/auth/user/verify-reset-otp', {
      method: 'POST',
      body: { phoneNumber: formattedWithPrefix, otp: cleanOtp },
    });
    console.log('✅ [VERIFY_RESET_OTP] SUCCESS:', JSON.stringify(res1, null, 2));
    return res1;
  } catch (err1) {
    console.warn('⚠️ [VERIFY_RESET_OTP] Attempt with +91 failed:', err1?.message || err1);
    try {
      console.log('🚀 [VERIFY_RESET_OTP] Fallback with raw digits:', { phoneNumber: digits, otp: cleanOtp });
      const res2 = await apiRequest('/api/auth/user/verify-reset-otp', {
        method: 'POST',
        body: { phoneNumber: digits, otp: cleanOtp },
      });
      console.log('✅ [VERIFY_RESET_OTP] Fallback SUCCESS:', JSON.stringify(res2, null, 2));
      return res2;
    } catch (err2) {
      console.error('❌ [VERIFY_RESET_OTP] Fallback failed:', err2?.message || err2);
      throw (err1?.message && !err2?.message) ? err1 : err2;
    }
  }
}

// Forgot PIN Flow — Step 3: Reset PIN using resetToken & auto-login
export async function resetPin({ resetToken, newPin }) {
  console.log('🚀 [RESET_PIN] Calling /api/auth/user/reset-pin with resetToken and newPin length:', String(newPin || '').length);
  try {
    const res = await apiRequest('/api/auth/user/reset-pin', {
      method: 'POST',
      body: { resetToken, newPin: String(newPin || '').trim() },
    });
    console.log('✅ [RESET_PIN] SUCCESS:', JSON.stringify(res, null, 2));
    return res;
  } catch (err) {
    console.error('❌ [RESET_PIN] FAILED:', err?.message || err);
    throw err;
  }
}

