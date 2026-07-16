import { createContext, useContext } from "react";

/** Card padding scale, shared by the compound sub-components via context. */
export type CardSize = "small" | "large";

export const CardSizeContext = createContext<CardSize>("small");

export function useCardSize(): CardSize {
  return useContext(CardSizeContext);
}
