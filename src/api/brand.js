import apiRequest from './client';

// GET /api/brand/ — public, paginated, searchable list of brands.
export function getBrands({ page = 1, per_page = 1000, search = '', sort = 'latest' } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(per_page),
    search,
    sort,
  });
  return apiRequest(`/api/brand/?${params.toString()}`);
}
