import { apiRequest } from './client';
import { getToken } from './authStorage';

export async function getCart(addressId) {
  const token = await getToken();
  const query = addressId ? `?addressId=${addressId}` : '';
  return apiRequest(`/api/cart/${query}`, {
    method: 'GET',
    token,
  });
}

export async function addToCartApi({ productId, bundleId, quantity, type = 'product', variantSku }) {
  const token = await getToken();
  const body = {
    type,
    quantity,
    ...(productId ? { product_id: productId } : {}),
    ...(bundleId ? { bundle_id: bundleId } : {}),
    ...(variantSku ? { variant_sku: variantSku } : {}),
  };
  return apiRequest('/api/cart/', {
    method: 'POST',
    body,
    token,
  });
}

export async function removeFromCartApi({ productId, bundleId, type = 'product', variantSku }) {
  const token = await getToken();
  const body = {
    type,
    quantity: 0,
    ...(productId ? { product_id: productId } : {}),
    ...(bundleId ? { bundle_id: bundleId } : {}),
    ...(variantSku ? { variant_sku: variantSku } : {}),
  };
  return apiRequest('/api/cart/', {
    method: 'POST',
    body,
    token,
  });
}

export async function deleteCartApi(userId) {
  const token = await getToken();
  return apiRequest(`/api/cart/${userId}`, {
    method: 'DELETE',
    token,
  });
}
