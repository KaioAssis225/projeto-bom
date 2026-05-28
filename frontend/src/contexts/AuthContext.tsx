import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { authApi, type MeResponse } from "@/api/auth";
import { client } from "@/api/client";
import { ForcePasswordChange } from "@/components/ForcePasswordChange";

interface AuthContextValue {
  user: MeResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_ACCESS = "bom_access_token";
const STORAGE_REFRESH = "bom_refresh_token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshingRef = useRef(false);

  // On mount, try to restore session from localStorage
  useEffect(() => {
    const token = localStorage.getItem(STORAGE_ACCESS);
    if (!token) {
      setIsLoading(false);
      return;
    }
    authApi.me()
      .then(setUser)
      .catch(() => {
        // token is invalid/expired — try refresh
        const refreshToken = localStorage.getItem(STORAGE_REFRESH);
        if (!refreshToken) {
          localStorage.removeItem(STORAGE_ACCESS);
          return;
        }
        return authApi.refresh(refreshToken)
          .then(({ access_token }) => {
            localStorage.setItem(STORAGE_ACCESS, access_token);
            return authApi.me().then(setUser);
          })
          .catch(() => {
            localStorage.removeItem(STORAGE_ACCESS);
            localStorage.removeItem(STORAGE_REFRESH);
          });
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Axios request interceptor: inject Bearer token
  useEffect(() => {
    const reqId = client.interceptors.request.use((config) => {
      const token = localStorage.getItem(STORAGE_ACCESS);
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });

    // Axios response interceptor: auto-refresh on 401
    const resId = client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (
          error.response?.status === 401 &&
          !originalRequest._retry &&
          !originalRequest.url?.includes("/auth/")
        ) {
          originalRequest._retry = true;
          const refreshToken = localStorage.getItem(STORAGE_REFRESH);
          if (refreshToken && !refreshingRef.current) {
            refreshingRef.current = true;
            try {
              const { access_token } = await authApi.refresh(refreshToken);
              localStorage.setItem(STORAGE_ACCESS, access_token);
              originalRequest.headers.Authorization = `Bearer ${access_token}`;
              refreshingRef.current = false;
              return client(originalRequest);
            } catch {
              refreshingRef.current = false;
              localStorage.removeItem(STORAGE_ACCESS);
              localStorage.removeItem(STORAGE_REFRESH);
              setUser(null);
            }
          } else {
            localStorage.removeItem(STORAGE_ACCESS);
            localStorage.removeItem(STORAGE_REFRESH);
            setUser(null);
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      client.interceptors.request.eject(reqId);
      client.interceptors.response.eject(resId);
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { access_token, refresh_token } = await authApi.login(email, password);
    localStorage.setItem(STORAGE_ACCESS, access_token);
    localStorage.setItem(STORAGE_REFRESH, refresh_token);
    const me = await authApi.me();
    setUser(me);
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem(STORAGE_REFRESH);
    try {
      if (refreshToken) await authApi.logout(refreshToken);
    } finally {
      localStorage.removeItem(STORAGE_ACCESS);
      localStorage.removeItem(STORAGE_REFRESH);
      setUser(null);
    }
  }, []);

  const handlePasswordChanged = useCallback(() => {
    setUser((prev) => prev ? { ...prev, must_change_password: false } : prev);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
      {user?.must_change_password && (
        <ForcePasswordChange onSuccess={handlePasswordChanged} />
      )}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
