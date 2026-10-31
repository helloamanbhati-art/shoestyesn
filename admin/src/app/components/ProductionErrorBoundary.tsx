import { Component, type ErrorInfo, type ReactNode, useEffect, useState } from 'react';
import { AlertTriangle, House, RefreshCw, WifiOff } from 'lucide-react';

interface BoundaryProps {
  children: ReactNode;
}

interface BoundaryState {
  failed: boolean;
}

export function ProductionErrorScreen() {
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <main className="grid min-h-svh place-items-center bg-[#f6f5f0] px-5 py-10 text-[#18201c]" role="alert">
      <section className="w-full max-w-md border border-[#dfe2de] bg-white p-6 shadow-sm sm:p-8" aria-labelledby="recovery-title">
        <span className="grid size-11 place-items-center rounded-full bg-[#eef4ef] text-[#176b45]">
          {online ? <AlertTriangle className="size-5" aria-hidden="true" /> : <WifiOff className="size-5" aria-hidden="true" />}
        </span>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-[#168451]">Shoe Style Admin</p>
        <h1 id="recovery-title" className="mt-2 font-serif text-3xl font-normal tracking-tight">
          {online ? 'Something went wrong' : 'You appear to be offline'}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#66716a]">
          {online
            ? 'The admin panel could not finish loading. Your data is safe. Refresh the page to continue.'
            : 'Check your connection. When the network returns, refresh the page to continue.'}
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={() => window.location.reload()} className="inline-flex min-h-11 items-center justify-center gap-2 bg-[#168451] px-4 text-sm font-bold text-white">
            <RefreshCw className="size-4" aria-hidden="true" /> Try again
          </button>
          <a href="/admin" className="inline-flex min-h-11 items-center justify-center gap-2 border border-[#d8dcd8] px-4 text-sm font-bold text-[#27322c]">
            <House className="size-4" aria-hidden="true" /> Back to dashboard
          </a>
        </div>
      </section>
    </main>
  );
}

export class ProductionErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  componentDidCatch(caught: Error, details: ErrorInfo) {
    if (import.meta.env.DEV) console.error('Admin render failure', caught, details);
  }

  render() {
    return this.state.failed ? <ProductionErrorScreen /> : this.props.children;
  }
}
