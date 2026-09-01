import { useQuery } from '@tanstack/react-query';
import { getSubCategories } from '../api/subcategory';

export function useSubCategories({ per_page = 1000, category = '' } = {}) {
  return useQuery({
    queryKey: ['subcategories', category, per_page],
    queryFn: () => getSubCategories({ category, per_page }),
    select: (data) => {
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.data?.subCategories)) return data.data.subCategories;
      if (Array.isArray(data?.subCategories)) return data.subCategories;
      if (Array.isArray(data?.data)) return data.data;
      return [];
    },
  });
}
