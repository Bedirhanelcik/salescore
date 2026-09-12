"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { api, ApiError, clearToken, getToken, setToken } from "@/lib/api-client";
import type { User } from "@/lib/types";

interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  /** True for the remainder of this session immediately after a successful self-registration
   * (not login). Drives the one-time first-run onboarding in OnboardingProvider; consume it
   * with `acknowledgeRegistration()` once onboarding has started so a later logout/login by
   * the same user in the same tab doesn't re-trigger it. */
  justRegistered: boolean;
  acknowledgeRegistration: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [justRegistered, setJustRegistered] = useState(false);

  const loadUser = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const me = await api.get<User>("/auth/me");
      setUser(me);
    } catch (error) {
      if (error instanceof ApiError) {
        clearToken();
      }
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetches /auth/me once on mount to restore the session from a stored token.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async session restore on mount, not a synchronous state derivation
    loadUser();
  }, [loadUser]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.post<LoginResponse>("/auth/login", { email, password }, undefined);
    setToken(response.access_token);
    setUser(response.user);
  }, []);

  const register = useCallback(async (email: string, password: string, fullName: string) => {
    const response = await api.post<LoginResponse>(
      "/auth/register",
      { email, password, full_name: fullName },
      undefined
    );
    setToken(response.access_token);
    setUser(response.user);
    setJustRegistered(true);
  }, []);

  const acknowledgeRegistration = useCallback(() => setJustRegistered(false), []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    // Full reload (not router.push) is deliberate: it also clears the TanStack Query
    // cache and any other in-memory state left over from the previous session.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/login";
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      login,
      register,
      logout,
      refreshUser: loadUser,
      justRegistered,
      acknowledgeRegistration,
    }),
    [user, isLoading, login, register, logout, loadUser, justRegistered, acknowledgeRegistration]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
