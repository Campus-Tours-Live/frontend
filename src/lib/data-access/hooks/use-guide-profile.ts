"use client";

import { useQuery } from "@tanstack/react-query";
import { guideProfileOptions } from "../queries/guide-profile.query";

/** Cached read of the current user's guide profile. `enabled` (default true) lets a caller that
 *  only sometimes needs it (e.g. a nav that renders for both roles) skip the fetch entirely. */
export function useGuideProfile(enabled = true) {
  return useQuery({ ...guideProfileOptions(), enabled });
}
