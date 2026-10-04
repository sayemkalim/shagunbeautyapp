import { apiRequest } from './client';
import { getToken } from './authStorage';

export async function getActiveCoupons() {
  const token = await getToken();
  const res = await apiRequest('/api/coupon/active', {
    method: 'GET',
    token,
  });
  return res;
}

