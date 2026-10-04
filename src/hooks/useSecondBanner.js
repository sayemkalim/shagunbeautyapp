import { useQuery } from '@tanstack/react-query';
import { getActiveSecondBanner } from '../api/banner';

export function useSecondBanner() {
  return useQuery({
    queryKey: ['secondBanner', 'active'],
    queryFn: getActiveSecondBanner,
    select: (data) => (data?.data !== undefined ? data.data : data),
  });
}
