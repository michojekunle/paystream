import { AppConfig, UserSession } from "@stacks/connect";

// Lazy singletons — never instantiated on the server (no window/localStorage there)
let _appConfig: AppConfig | null = null;
let _userSession: UserSession | null = null;

function getSession(): UserSession | null {
  if (typeof window === "undefined") return null;
  if (!_userSession) {
    _appConfig = new AppConfig(["store_write", "publish_data"]);
    _userSession = new UserSession({ appConfig: _appConfig });
  }
  return _userSession;
}

/** @deprecated prefer getSession() – exported for legacy call-sites */
export const userSession = new Proxy({} as UserSession, {
  get(_target, prop) {
    const s = getSession();
    if (!s) return () => null; // safe no-op on server
    return (s as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export function getUserAddress(): string | null {
  const s = getSession();
  if (!s?.isUserSignedIn()) return null;
  const userData = s.loadUserData();
  return userData.profile.stxAddress.testnet || userData.profile.stxAddress.mainnet;
}

export { getSession };
