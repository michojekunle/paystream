import { AppConfig, UserSession } from "@stacks/connect";

export const appConfig = new AppConfig(["store_write", "publish_data"]);
export const userSession = new UserSession({ appConfig });

export function getUserAddress() {
  if (userSession.isUserSignedIn()) {
    const userData = userSession.loadUserData();
    // Use testnet address by default for this example
    return userData.profile.stxAddress.testnet || userData.profile.stxAddress.mainnet;
  }
  return null;
}
