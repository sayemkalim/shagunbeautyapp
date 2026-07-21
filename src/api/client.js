export const BASE_URL = 'https://shagunbeautybe.onrender.com';

export class ApiRequestError extends Error {
  constructor(message, { statusCode, status } = {}) {
    super(message);
    this.name = 'ApiRequestError';
    this.statusCode = statusCode;
    this.status = status;
  }
}

// Wraps fetch around the backend's standard envelope:
// { statusCode, data, message, success }. Many error paths return HTTP 200
// with success:false — always trust `success`, not the HTTP status.
export async function apiRequest(path, { method = 'GET', body, token, headers } = {}) {
  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new ApiRequestError('Network error — check your connection and try again.');
  }

  let json;
  try {
    json = await response.json();
  } catch (err) {
    throw new ApiRequestError('Unexpected response from server.', {
      status: response.status,
    });
  }

  if (!json.success) {
    throw new ApiRequestError(json.message || 'Something went wrong.', {
      statusCode: json.statusCode,
      status: response.status,
    });
  }

  return json.data;
}

export default apiRequest;
