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

  // Primary attempt with +91 (backend database standard)
  try {
    const res1 = await apiRequest('/api/auth/user/forgot-pin', {
      method: 'POST',
      body: { phoneNumber: formattedWithPrefix },
    });
    return res1;
  } catch (err1) {
    // Fallback to raw 10 digits
    try {
      const res2 = await apiRequest('/api/auth/user/forgot-pin', {
        method: 'POST',
        body: { phoneNumber: digits },
      });
      return res2;
    } catch (err2) {
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

  try {
    const res1 = await apiRequest('/api/auth/user/verify-reset-otp', {
      method: 'POST',
      body: { phoneNumber: formattedWithPrefix, otp: cleanOtp },
    });
    return res1;
  } catch (err1) {
    try {
      const res2 = await apiRequest('/api/auth/user/verify-reset-otp', {
        method: 'POST',
        body: { phoneNumber: digits, otp: cleanOtp },
      });
      return res2;
    } catch (err2) {
      throw (err1?.message && !err2?.message) ? err1 : err2;
    }
  }
}

// Forgot PIN Flow — Step 3: Reset PIN using resetToken & auto-login
export async function resetPin({ resetToken, newPin }) {
  try {
    const res = await apiRequest('/api/auth/user/reset-pin', {
      method: 'POST',
      body: { resetToken, newPin: String(newPin || '').trim() },
    });
    return res;
  } catch (err) {
    throw err;
  }
}

