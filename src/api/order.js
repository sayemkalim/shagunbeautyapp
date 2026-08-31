import { apiRequest } from './client';
import { getToken } from './authStorage';

export async function createOrder({ cartId, addressId, couponCode, paymentMode, utr_number, utrNumber }) {
  const token = await getToken();
  return apiRequest('/api/order/', {
    method: 'POST',
    body: {
      cartId,
      addressId,
      ...(couponCode ? { couponCode } : {}),
      ...(paymentMode ? { paymentMode } : {}),
      ...(utr_number || utrNumber ? { utr_number: utr_number || utrNumber } : {}),
    },
    token,
  });
}

export async function getOrderHistory() {
  const token = await getToken();
  return apiRequest('/api/order/history', {
    method: 'GET',
    token,
  });
}

export async function getOrderDetails(orderId) {
  const token = await getToken();
  return apiRequest(`/api/order/user/${orderId}`, {
    method: 'GET',
    token,
  });
}

export async function cancelOrder(orderId) {
  const token = await getToken();
  console.log('cancelOrder request:', orderId);
  const res = await apiRequest(`/api/order/payment/${orderId}/cancel`, {
    method: 'PATCH',
    token,
  });
  console.log('cancelOrder response:', JSON.stringify(res, null, 2));
  return res;
}
