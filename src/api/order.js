import { apiRequest } from './client';
import { getToken } from './authStorage';

export async function createOrder({ cartId, addressId }) {
  const token = await getToken();
  return apiRequest('/api/order/', {
    method: 'POST',
    body: { cartId, addressId },
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
