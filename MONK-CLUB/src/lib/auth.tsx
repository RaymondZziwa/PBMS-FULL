import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, getToken, setToken, setUnauthorizedHandler } from "./api";
import type { Member } from "./types";

type AuthState = {
  member: Member | null;
  loading: boolean;
  /** Store a new token + member (after sign-in or password change). */
  signedIn: (token: string, member: Member) => void;
  signOut: () => void;
  refresh: () => Promise<Member | null>;
  setMember: (m: Member) => void;
};

const Ctx = createContext<AuthState | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(!!getToken());

  const signOut = useCallback(() => {
    setToken(null);
    setMember(null);
  }, []);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setLoading(false);
      return null;
    }
    try {
      const m = await api<Member>("/api/club/me");
      setMember(m);
      return m;
    } catch {
      signOut();
      return null;
    } finally {
      setLoading(false);
    }
  }, [signOut]);

  useEffect(() => {
    setUnauthorizedHandler(signOut);
    void refresh();
  }, [refresh, signOut]);

  const signedIn = useCallback((token: string, m: Member) => {
    setToken(token);
    setMember(m);
    setLoading(false);
  }, []);

  return <Ctx.Provider value={{ member, loading, signedIn, signOut, refresh, setMember }}>{children}</Ctx.Provider>;
};

export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth outside AuthProvider");
  return c;
};
