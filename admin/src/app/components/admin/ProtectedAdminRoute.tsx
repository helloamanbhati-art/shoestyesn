import { Navigate } from 'react-router';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { AdminLayout } from './AdminLayout';

export function ProtectedAdminRoute() {
  const { admin, loading } = useAdminAuth();

  if (loading) {
    return (
      <main className="min-h-screen grid place-items-center bg-[#f8f8f5] text-sm text-gray-600" aria-live="polite">
        Verifying secure administrator session…
      </main>
    );
  }

  if (!admin) return <Navigate to="/admin/login" replace />;

  return <AdminLayout />;
}
