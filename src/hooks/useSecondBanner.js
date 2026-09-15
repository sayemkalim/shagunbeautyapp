import { useQuery } from '@tanstack/react-query';
import { getActiveSecondBanner } from '../api/banner';

export function useSecondBanner() {
  return useQuery({
    queryKey: ['secondBanner', 'active'],
    queryFn: getActiveSecondBanner,
    staleTime: 1000 * 60 * 5,
  });
}
