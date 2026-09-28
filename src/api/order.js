import { apiRequest } from './client';
import { getToken } from './authStorage';

export async function createOrder({ cartId, addressId, couponCode, paymentMode, utr_number, utrNumber, selectedItemIds }) {
  const token = await getToken();
  return apiRequest('/api/order/', {
    method: 'POST',
    body: {
      cartId,
      addressId,
      ...(couponCode ? { couponCode } : {}),
      ...(paymentMode ? { paymentMode } : {}),
      ...(utr_number || utrNumber ? { utr_number: utr_number || utrNumber } : {}),
      ...(Array.isArray(selectedItemIds) && selectedItemIds.length > 0 ? { selectedItemIds } : {}),
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
  return apiRequest(`/api/order/${orderId}/cancel`, {
    method: 'PATCH',
    token,
  });
}

export async function returnOrder(orderId, reason) {
  const token = await getToken();
  return apiRequest(`/api/order/${orderId}/return`, {
    method: 'POST',
    body: { reason },
    token,
  });
}

export async function getRazorpayConfig() {
  const token = await getToken();
  return apiRequest('/api/order/razorpay/config', {
    method: 'GET',
    token,
  });
}

export async function createRazorpayOrder(params) {
  const token = await getToken();
  // Accepts either an object { cartId, addressId, couponCode, selectedItemIds } OR string orderId
  const body = typeof params === 'string' ? { orderId: params } : params;
  return apiRequest('/api/order/razorpay/create-order', {
    method: 'POST',
    body,
    token,
  });
}

export async function verifyRazorpayPayment({
  orderId,
  cartId,
  addressId,
  couponCode,
  selectedItemIds,
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
}) {
  const token = await getToken();
  return apiRequest('/api/order/razorpay/verify-payment', {
    method: 'POST',
    body: {
      ...(orderId ? { orderId } : {}),
      ...(cartId ? { cartId } : {}),
      ...(addressId ? { addressId } : {}),
      ...(couponCode ? { couponCode } : {}),
      ...(Array.isArray(selectedItemIds) && selectedItemIds.length > 0 ? { selectedItemIds } : {}),
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    },
    token,
  });
}
