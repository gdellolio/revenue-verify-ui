// Dashboard auth for MVP: the lender's API key, held in sessionStorage and used
// as the Bearer token. The dashboard is a plain client of the public API —
// no privileged backdoors. Auth0 + lender_users replaces this when teams/roles land.

import { createContext, useContext, useState, type ReactNode } from "react";

const STORAGE_KEY = "revenue_verify_api_key";

interface DashboardAuth {
  apiKey: string | null;
  signIn: (apiKey: string) => void;
  signOut: () => void;
}

const AuthContext = createContext<DashboardAuth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKey] = useState<string | null>(() => sessionStorage.getItem(STORAGE_KEY));

  const signIn = (key: string) => {
    sessionStorage.setItem(STORAGE_KEY, key);
    setApiKey(key);
  };
  const signOut = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setApiKey(null);
  };

  return <AuthContext.Provider value={{ apiKey, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export function useDashboardAuth(): DashboardAuth {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("useDashboardAuth must be used inside AuthProvider");
  return auth;
}
