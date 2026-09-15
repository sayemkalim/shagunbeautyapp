import apiRequest from './client';

// GET /api/banner/active — public, list of currently active banner slides.
export function getActiveBanners() {
  return apiRequest('/api/banner/active');
}

// GET /api/second-banner/active — public, active second banner
export function getActiveSecondBanner() {
  return apiRequest('/api/second-banner/active');
}
