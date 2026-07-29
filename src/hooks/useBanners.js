import { useQuery } from '@tanstack/react-query';
import { getActiveBanners } from '../api/banner';

export function useBanners() {
  return useQuery({
    queryKey: ['banners', 'active'],
    queryFn: getActiveBanners,
    select: (data) => (Array.isArray(data) ? data : data?.banners || []),
  });
}
