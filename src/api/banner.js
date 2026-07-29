import apiRequest from './client';

// GET /api/banner/active — public, list of currently active banner slides.
export function getActiveBanners() {
  return apiRequest('/api/banner/active');
}
