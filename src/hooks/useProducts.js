import { useQuery } from '@tanstack/react-query';
import { getProducts, getProductById } from '../api/product';

export function useProducts({ category = '', sub_category = '', brand = '', per_page = 1000, search = '' } = {}) {
  return useQuery({
    queryKey: ['products', category, sub_category, brand, per_page, search],
    queryFn: () => getProducts({ category, sub_category, brand, per_page, search }),
    select: (data) => {
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.data)) return data.data;
      if (Array.isArray(data?.products)) return data.products;
      return [];
    },
  });
}

export function useProductDetail(productId, initialData = null) {
  return useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      const res = await getProductById(productId);
      return res?.data !== undefined ? res.data : res;
    },
    enabled: !!productId,
    placeholderData: initialData || undefined,
    staleTime: 0,
    refetchOnMount: 'always',
  });
}
