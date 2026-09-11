import { useQuery } from "@tanstack/react-query";
import { getActiveMarquees } from "../api/marquee";

export function useMarquee() {
  return useQuery({
    queryKey: ["marquee", "active"],
    queryFn: getActiveMarquees,
    select: (data) => (Array.isArray(data) ? data : data?.marquees || []),
  });
}
