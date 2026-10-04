export const BASE_URL = 'https://shagunbeautybe.onrender.com';

export class ApiRequestError extends Error {
  constructor(message, { statusCode, status, data, outOfStockItems } = {}) {
    super(message);
    this.name = 'ApiRequestError';
    this.statusCode = statusCode;
    this.status = status;
    this.data = data;
    this.outOfStockItems = outOfStockItems;
  }
}

// Wraps fetch around the backend's standard envelope:
// { statusCode, data, message, success }. Many error paths return HTTP 200
// with success:false — always trust `success`, not the HTTP status.
export async function apiRequest(path, { method = 'GET', body, token, headers } = {}) {
  const fullUrl = `${BASE_URL}${path}`;

  let response;
  try {
    response = await fetch(fullUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    console.error(`🔴 [API_NETWORK_ERROR] ${method} ${fullUrl}:`, err);
    throw new ApiRequestError('Network error — check your connection and try again.');
  }

  let json;
  try {
    json = await response.json();
  } catch (err) {
    console.error(`🔴 [API_PARSE_ERROR] HTTP ${response.status} ${fullUrl}:`, err);
    throw new ApiRequestError('Unexpected response from server.', {
      status: response.status,
    });
  }

  if (!json.success) {
    console.warn(`⚠️ [API_SERVER_FAIL] ${json.message || 'Unknown server error'} (HTTP ${response.status})`);
    throw new ApiRequestError(json.message || 'Something went wrong.', {
      statusCode: json.statusCode,
      status: response.status,
      data: json,
      outOfStockItems: json.outOfStockItems,
    });
  }

  return json.data;
}

export default apiRequest;
