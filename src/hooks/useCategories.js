import { useQuery } from '@tanstack/react-query';
import { getCategories } from '../api/category';

export function useCategories({ per_page = 1000 } = {}) {
  return useQuery({
    queryKey: ['categories', per_page],
    queryFn: () => getCategories({ per_page }),
    select: (data) => data.categories || [],
  });
}
