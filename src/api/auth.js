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
