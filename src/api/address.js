import apiRequest from './client';
import { getToken } from './authStorage';

// GET /api/address/user/:id
export async function getUserAddresses(userId) {
  const token = await getToken();
  return apiRequest(`/api/address/user/${userId}`, {
    method: 'GET',
    token,
  });
}

// GET /api/address/:id
export async function getAddressById(id) {
  const token = await getToken();
  return apiRequest(`/api/address/${id}`, {
    method: 'GET',
    token,
  });
}

// POST /api/address/
export async function createAddress({ name, mobile, pincode, address, city, state, isPrimary = false }) {
  const token = await getToken();
  const body = {
    name,
    mobile,
    pincode,
    address,
    city,
    state,
    isPrimary,
  };
  return apiRequest('/api/address/', {
    method: 'POST',
    body,
    token,
  });
}

// PUT /api/address/:id
export async function updateAddress(id, { name, mobile, pincode, address, city, state, isPrimary }) {
  const token = await getToken();
  const body = {
    ...(name !== undefined ? { name } : {}),
    ...(mobile !== undefined ? { mobile } : {}),
    ...(pincode !== undefined ? { pincode } : {}),
    ...(address !== undefined ? { address } : {}),
    ...(city !== undefined ? { city } : {}),
    ...(state !== undefined ? { state } : {}),
    ...(isPrimary !== undefined ? { isPrimary } : {}),
  };
  return apiRequest(`/api/address/${id}`, {
    method: 'PUT',
    body,
    token,
  });
}

// DELETE /api/address/:id
export async function deleteAddress(id) {
  const token = await getToken();
  return apiRequest(`/api/address/${id}`, {
    method: 'DELETE',
    token,
  });
}
