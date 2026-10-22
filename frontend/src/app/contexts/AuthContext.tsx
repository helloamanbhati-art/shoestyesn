import { useAuth as useClerkAuth, useUser } from '@clerk/react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getCurrentCustomer, type AuthCustomer } from '../auth/authApi';
import { setAuthTokenProvider } from '../api/client';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';
interface AuthContextValue {
  customer: AuthCustomer | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  isLoginOpen: boolean;
  sessionError: string | null;
  openLogin: () => void;
  closeLogin: () => void;
  logout: () => Promise<void>;
}
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, getToken, signOut } = useClerkAuth();
  const { user } = useUser();
  const [customer, setCustomer] = useState<AuthCustomer | null>(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    setAuthTokenProvider(() => getToken());
    return () => setAuthTokenProvider(null);
  }, [getToken]);
  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setCustomer(null);
      setSessionError(null);
      return;
    }
    getCurrentCustomer().then((value) => {
      setCustomer(value);
      setSessionError(null);
      setIsLoginOpen(false);
    }).catch(() => setSessionError('We could not load your account. Please try again.'));
  }, [isLoaded, isSignedIn, user?.id]);

  const openLogin = useCallback(() => setIsLoginOpen(true), []);
  const closeLogin = useCallback(() => setIsLoginOpen(false), []);
  const logout = useCallback(async () => { await signOut(); setCustomer(null); }, [signOut]);
  const status: AuthStatus = !isLoaded || (isSignedIn && !customer) ? 'loading' : isSignedIn ? 'authenticated' : 'unauthenticated';
  const value = useMemo(() => ({ customer, status, isAuthenticated: status === 'authenticated', isLoginOpen, sessionError, openLogin, closeLogin, logout }), [customer, status, isLoginOpen, sessionError, openLogin, closeLogin, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
