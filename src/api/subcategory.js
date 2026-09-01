import apiRequest from './client';

// GET /api/sub-category/ — public, paginated list of sub-categories
export function getSubCategories({ page = 1, per_page = 1000, category = '', search = '' } = {}) {
  const params = new URLSearchParams();
  params.append('page', String(page));
  params.append('per_page', String(per_page));
  if (category) params.append('category', category);
  if (search) params.append('search', search);

  return apiRequest(`/api/sub-category/?${params.toString()}`);
}

export function getSubCategoryById(id) {
  return apiRequest(`/api/sub-category/${id}`);
}
