import { useAuth } from "@/contexts/AuthContext";

const WRITE_NIVEIS = ["ESTOQUISTA", "ANALISTA", "GESTOR", "ADMIN"];

/**
 * Returns true if the current (effective) user can write in the given area.
 * Admin always can write everywhere.
 */
export function useCanWrite(area: string): boolean {
  const { user } = useAuth();
  if (!user) return false;
  return user.roles.some(
    (r) => r.nivel === "ADMIN" || (r.area === area && WRITE_NIVEIS.includes(r.nivel)),
  );
}

/**
 * Returns true if the user is a real admin (not view-as simulated).
 */
export function useIsAdmin(): boolean {
  const { realUser } = useAuth();
  return realUser?.roles.some((r) => r.nivel === "ADMIN") ?? false;
}
