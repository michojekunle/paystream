import { getLocalStorage } from "@stacks/connect";

export function getUserAddress(): string | null {
  if (typeof window === "undefined") return null;
  
  try {
    const ls = getLocalStorage() as any;
    if (ls && ls.addresses && ls.addresses.stx && ls.addresses.stx.length > 0) {
      return ls.addresses.stx[0].address;
    }
  } catch (err) {
    // Ignore access errors
  }
  
  return null;
}

// We don't need userSession or getSession anymore for connect v8!
export const userSession = null;
export const getSession = () => null;
