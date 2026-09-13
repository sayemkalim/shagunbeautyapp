import { useQuery } from '@tanstack/react-query';
import { getProducts, getProductById } from '../api/product';

export function useProducts({ category = '', sub_category = '', brand = '', per_page = 50, search = '' } = {}) {
  return useQuery({
    queryKey: ['products', category, sub_category, brand, per_page, search],
    queryFn: () => getProducts({ category, sub_category, brand, per_page, search }),
    select: (data) => data.data || [],
  });
}

export function useProductDetail(productId, initialData = null) {
  return useQuery({
    queryKey: ['product', productId],
    queryFn: () => getProductById(productId),
    enabled: !!productId,
    initialData: initialData ? { data: initialData } : undefined,
    select: (res) => res?.data || res,
  });
}
