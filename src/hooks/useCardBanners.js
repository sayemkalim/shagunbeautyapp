import { useQuery } from '@tanstack/react-query';
import { getActiveCardBanners } from '../api/cardBanner';

export function useCardBanners(params = {}) {
  return useQuery({
    queryKey: ['cardBanners', params],
    queryFn: () => getActiveCardBanners(params),
    select: (data) => {
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.banners)) return data.banners;
      if (Array.isArray(data?.data)) return data.data;
      return [];
    },
  });
}
