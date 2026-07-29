import { apiRequest } from './client';
import { getToken } from './authStorage';

export async function getActiveCoupons() {
  const token = await getToken();
  const res = await apiRequest('/api/coupon/active', {
    method: 'GET',
    token,
  });
  console.log('getActiveCoupons response:', JSON.stringify(res, null, 2));
  return res;
}

