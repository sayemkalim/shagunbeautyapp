import apiRequest from "./client";

// GET /api/marquee/active — public, list of currently active marquee announcement texts
export function getActiveMarquees() {
  return apiRequest("/api/marquee/active");
}
