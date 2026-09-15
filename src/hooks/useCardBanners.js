import { useQuery } from '@tanstack/react-query';
import { getActiveCardBanners } from '../api/cardBanner';

export function useCardBanners(params = {}) {
  return useQuery({
    queryKey: ['cardBanners', params],
    queryFn: () => getActiveCardBanners(params),
    select: (data) => (Array.isArray(data) ? data : data?.banners || data?.data || []),
    staleTime: 1000 * 60 * 5,
  });
}
