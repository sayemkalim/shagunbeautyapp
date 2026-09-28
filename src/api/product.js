import apiRequest from './client';

// GET /api/product/ — public storefront catalog
export function getProducts({ page = 1, per_page = 1000, category = '', sub_category = '', brand = '', search = '', sort_by = 'created_at' } = {}) {
  const params = new URLSearchParams();
  params.append('page', String(page));
  params.append('per_page', String(per_page));
  if (category) {
    params.append('category', category);
  }
  if (sub_category) {
    params.append('sub_category', sub_category);
  }
  if (brand) {
    params.append('brand', brand);
  }
  if (search) {
    params.append('search', search);
  }
  if (sort_by) {
    params.append('sort_by', sort_by);
  }
  return apiRequest(`/api/product/?${params.toString()}`);
}

export function getProductById(id) {
  return apiRequest(`/api/product/${id}`);
}

