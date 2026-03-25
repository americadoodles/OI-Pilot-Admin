"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { getProfile, login as apiLogin, logout as apiLogout } from "./api";

interface AdminUser {
  id: string;
  email: string;
  business_name: string;
  contact_name: string;
  role: string;
}

interface AuthContextValue {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = useCallback(async () => {
    try {
      const profile = await getProfile();
      if (profile.role !== "admin") {
        apiLogout();
        setUser(null);
        return;
      }
      setUser(profile);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      setIsLoading(false);
      return;
    }
    loadUser().finally(() => setIsLoading(false));
  }, [loadUser]);

  const login = async (email: string, password: string) => {
    await apiLogin(email, password);
    const profile = await getProfile();
    if (profile.role !== "admin") {
      apiLogout();
      throw new Error("Access denied. Admin role required.");
    }
    setUser(profile);
  };

  const logout = () => {
    apiLogout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
