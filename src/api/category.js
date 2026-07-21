import apiRequest from './client';

// GET /api/category/ — public, paginated list of categories.
export function getCategories({ page = 1, per_page = 1000, search = '', sort = 'latest' } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(per_page),
    search,
    sort,
  });
  return apiRequest(`/api/category/?${params.toString()}`);
}
