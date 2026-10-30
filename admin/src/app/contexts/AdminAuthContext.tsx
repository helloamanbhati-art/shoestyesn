import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { adminRequest, setAdminUnauthorizedHandler } from '../api/client';

export interface AdminUser {
  id: string;
  firstName: string;
  lastName?: string | null;
  email: string;
  role: string;
  avatar?: string | null;
}

interface AdminAuthValue {
  admin: AdminUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthValue | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setAdminUnauthorizedHandler(() => setAdmin(null));
    void adminRequest<{ admin: AdminUser }>('/api/v1/admin/auth/me')
      .then((result) => setAdmin(result.admin))
      .catch(() => setAdmin(null))
      .finally(() => setLoading(false));
    return () => setAdminUnauthorizedHandler(null);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    await adminRequest<{ admin: AdminUser }>('/api/v1/admin/auth/login', {
      method: 'POST', body: JSON.stringify({ email, password }),
    });
    const verified = await adminRequest<{ admin: AdminUser }>('/api/v1/admin/auth/me');
    setAdmin(verified.admin);
  }, []);

  const logout = useCallback(async () => {
    await adminRequest('/api/v1/admin/auth/logout', { method: 'POST' }).catch(() => undefined);
    setAdmin(null);
  }, []);

  const value = useMemo(() => ({ admin, loading, login, logout }), [admin, loading, login, logout]);
  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const value = useContext(AdminAuthContext);
  if (!value) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return value;
}
