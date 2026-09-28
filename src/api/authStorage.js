import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export async function saveSession(token, user) {
  try {
    if (token) {
      await AsyncStorage.setItem(TOKEN_KEY, String(token));
    }
    if (user) {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  } catch (e) {
    console.warn('saveSession storage error:', e);
  }
}

export async function getToken() {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch (e) {
    return null;
  }
}

export async function getUser() {
  try {
    const raw = await AsyncStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export async function clearSession() {
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY);
  } catch (e) {
    console.warn('clearSession storage error:', e);
  }
}
