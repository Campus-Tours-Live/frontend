"use client";

import { useQuery } from "@tanstack/react-query";
import { participantProfileOptions } from "../queries/participant-profile.query";

/** Cached read of the current user's participant profile. `enabled` (default true) lets a caller
 *  that only sometimes needs it (e.g. a nav that renders for both roles) skip the fetch entirely. */
export function useParticipantProfile(enabled = true) {
  return useQuery({ ...participantProfileOptions(), enabled });
}
