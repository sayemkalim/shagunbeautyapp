import { useQuery } from '@tanstack/react-query';
import { getBrands } from '../api/brand';

export function useBrands({ per_page = 1000 } = {}) {
  return useQuery({
    queryKey: ['brands', per_page],
    queryFn: () => getBrands({ per_page }),
    select: (data) => {
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.brands)) return data.brands;
      if (Array.isArray(data?.data)) return data.data;
      return [];
    },
  });
}
