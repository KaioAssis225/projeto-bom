import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { authApi, type MeResponse } from "@/api/auth";
import { client } from "@/api/client";
import { ForcePasswordChange } from "@/components/ForcePasswordChange";

export interface AuthContextValue {
  user: MeResponse | null;        // effective user (real or simulated)
  realUser: MeResponse | null;    // always the authenticated admin
  isAuthenticated: boolean;
  isLoading: boolean;
  viewingAs: MeResponse | null;
  setViewingAs: (u: MeResponse | null) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_ACCESS = "bom_access_token";
const STORAGE_REFRESH = "bom_refresh_token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [realUser, setRealUser] = useState<MeResponse | null>(null);
  const [viewingAs, setViewingAs] = useState<MeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshingRef = useRef(false);

  // user exposed to the rest of the app — simulated when viewingAs is set
  const user = viewingAs ?? realUser;

  useEffect(() => {
    const token = localStorage.getItem(STORAGE_ACCESS);
    if (!token) { setIsLoading(false); return; }
    authApi.me()
      .then(setRealUser)
      .catch(() => {
        const refreshToken = localStorage.getItem(STORAGE_REFRESH);
        if (!refreshToken) { localStorage.removeItem(STORAGE_ACCESS); return; }
        return authApi.refresh(refreshToken)
          .then(({ access_token }) => {
            localStorage.setItem(STORAGE_ACCESS, access_token);
            return authApi.me().then(setRealUser);
          })
          .catch(() => {
            localStorage.removeItem(STORAGE_ACCESS);
            localStorage.removeItem(STORAGE_REFRESH);
          });
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    const reqId = client.interceptors.request.use((config) => {
      const token = localStorage.getItem(STORAGE_ACCESS);
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });

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
              setRealUser(null);
              setViewingAs(null);
            }
          } else {
            localStorage.removeItem(STORAGE_ACCESS);
            localStorage.removeItem(STORAGE_REFRESH);
            setRealUser(null);
            setViewingAs(null);
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
    setRealUser(me);
    setViewingAs(null);
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem(STORAGE_REFRESH);
    try {
      if (refreshToken) await authApi.logout(refreshToken);
    } finally {
      localStorage.removeItem(STORAGE_ACCESS);
      localStorage.removeItem(STORAGE_REFRESH);
      setRealUser(null);
      setViewingAs(null);
    }
  }, []);

  const handlePasswordChanged = useCallback(() => {
    setRealUser((prev) => prev ? { ...prev, must_change_password: false } : prev);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      realUser,
      isAuthenticated: !!realUser,
      isLoading,
      viewingAs,
      setViewingAs,
      login,
      logout,
    }}>
      {children}
      {realUser?.must_change_password && !viewingAs && (
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
