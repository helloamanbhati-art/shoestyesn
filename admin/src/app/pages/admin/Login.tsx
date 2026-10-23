import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';
import { Mail, Lock, Eye, EyeOff, Loader2, ShieldCheck, ArrowRight } from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { getAdminLoginErrorMessage } from '../../api/client';

export function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { admin, loading: authLoading, login } = useAdminAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }

    setLoading(true);

    try {
      await login(email.trim(), password);
      toast.success('Login successful!');
      navigate('/admin', { replace: true });
    } catch (error) {
      console.error('[Login] Exception:', error);
      toast.error(getAdminLoginErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <main className="min-h-screen grid place-items-center bg-[#f8f8f5] text-sm text-gray-600" aria-live="polite">
        Restoring your administrator session…
      </main>
    );
  }

  if (admin) return <Navigate to="/admin" replace />;

  return (
    <main className="admin-login">
      <section className="admin-login-story" aria-label="Shoe Fashion administration portal">
        <div className="admin-login-story-top">
          <img
            src="/shoe-style-logo.svg"
            alt="Shoe Fashion"
            className="admin-login-story-logo"
          />
          <span>Admin workspace</span>
        </div>
        <div className="admin-login-story-copy">
          <p className="admin-login-kicker">Curated commerce, thoughtfully managed.</p>
          <h1>Everything behind your storefront, in one place.</h1>
          <p>Manage footwear, sizes, orders, customers, and every detail behind the Shoe Fashion storefront.</p>
        </div>
        <div className="admin-login-story-footer">
          <span>SHOE</span>
          <span>FASHION</span>
          <span>ADMIN</span>
        </div>
      </section>

      <section className="admin-login-panel">
        <div className="admin-login-card">
          <div className="admin-login-mobile-brand">
            <img src="/shoe-style-logo.svg" alt="Shoe Fashion" />
            <span>Admin workspace</span>
          </div>

          <header className="admin-login-heading">
            <p>Welcome back</p>
            <h2>Sign in to your workspace</h2>
            <span>Enter your administrator credentials to continue.</span>
          </header>

          <form onSubmit={handleLogin} className="admin-login-form">
            <div className="admin-login-field">
              <label htmlFor="email">Email address</label>
              <div className="admin-login-input-wrap">
                <Mail aria-hidden="true" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@shoefashion.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>
            <div className="admin-login-field">
              <label htmlFor="password">Password</label>
              <div className="admin-login-input-wrap">
                <Lock aria-hidden="true" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="admin-login-password-toggle"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              className="admin-login-submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight aria-hidden="true" />
                </>
              )}
            </Button>
          </form>

          <div className="admin-login-security">
            <ShieldCheck aria-hidden="true" />
            <p><strong>Secure administrator access</strong><span>Only active team accounts can enter this workspace.</span></p>
          </div>

          <p className="admin-login-help">Having trouble signing in? Contact your account owner.</p>
        </div>
      </section>
    </main>
  );
}
