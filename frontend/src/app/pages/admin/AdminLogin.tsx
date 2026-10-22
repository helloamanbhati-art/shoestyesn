import { useEffect } from 'react';

const ADMIN_LOGIN_URL = import.meta.env.VITE_ADMIN_URL || 'http://localhost:5174/admin/login';

/**
 * Legacy storefront route kept only as a safe bridge to the separate admin app.
 * Authentication is handled exclusively by the backend-backed admin portal.
 */
export function AdminLogin() {
  useEffect(() => {
    window.location.replace(ADMIN_LOGIN_URL);
  }, []);

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <p>
        Opening the secure admin sign-in page…{' '}
        <a className="underline" href={ADMIN_LOGIN_URL}>Continue to admin sign-in</a>
      </p>
    </main>
  );
}
