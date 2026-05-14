import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, setToken, getToken, USER_KEY } from "../lib/api";

function readStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export type Role = "Admin" | "Consul" | "Press Attaché";

export type AuthUser = {
  id: string;
  email: string;
  role: Role;
  displayName?: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  can: (roles: Role[]) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setTok] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api<{ token: string; user: AuthUser }>("/api/auth/login", {
      method: "POST",
      json: { email, password },
    });
    setToken(res.token);
    setTok(res.token);
    setUser(res.user);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setTok(null);
    setUser(null);
    localStorage.removeItem(USER_KEY);
  }, []);

  useEffect(() => {
    const t = getToken();
    setTok(t);
    if (t) setUser(readStoredUser());
    else {
      setUser(null);
      localStorage.removeItem(USER_KEY);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    function onSessionExpired() {
      logout();
    }
    window.addEventListener("emb-admin-session-expired", onSessionExpired);
    return () => window.removeEventListener("emb-admin-session-expired", onSessionExpired);
  }, [logout]);

  const can = useCallback(
    (roles: Role[]) => {
      if (!user) return false;
      return roles.includes(user.role);
    },
    [user]
  );

  const value = useMemo(
    () => ({ user, token, ready, login, logout, can }),
    [user, token, ready, login, logout, can]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
