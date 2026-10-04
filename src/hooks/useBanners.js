import { useQuery } from '@tanstack/react-query';
import { getActiveBanners } from '../api/banner';

export function useBanners() {
  return useQuery({
    queryKey: ['banners', 'active'],
    queryFn: getActiveBanners,
    select: (data) => {
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.banners)) return data.banners;
      if (Array.isArray(data?.data)) return data.data;
      return [];
    },
  });
}
