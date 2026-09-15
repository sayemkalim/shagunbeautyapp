import apiRequest from './client';

// GET /api/card-banner/active — public, fetch active card banners
export function getActiveCardBanners(params = {}) {
  const query = new URLSearchParams();
  if (params.is_card !== undefined) query.append('is_card', params.is_card);
  if (params.is_banner !== undefined) query.append('is_banner', params.is_banner);
  const qs = query.toString();
  return apiRequest(`/api/card-banner/active${qs ? `?${qs}` : ''}`);
}
