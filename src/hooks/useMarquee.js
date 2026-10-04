import { useQuery } from "@tanstack/react-query";
import { getActiveMarquees } from "../api/marquee";

export function useMarquee() {
  return useQuery({
    queryKey: ['marquee', 'active'],
    queryFn: getActiveMarquees,
    select: (data) => {
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.marquees)) return data.marquees;
      if (Array.isArray(data?.data)) return data.data;
      return [];
    },
  });
}
