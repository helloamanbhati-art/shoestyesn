import React, { Component, ReactNode, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State { hasError: boolean; }

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
    <main className="min-h-screen flex items-center justify-center bg-[#f7f3ee] p-5" role="alert">
      <Card className="max-w-md w-full">
        <CardHeader><CardTitle className="flex items-center gap-2 text-black"><AlertCircle className="size-5" />{online ? 'Something went wrong' : 'You appear to be offline'}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{online ? 'We could not finish loading this page. Your information is safe.' : 'Check your connection, then refresh the page.'}</p>
          <Button onClick={() => window.location.reload()} className="w-full">Refresh page</Button>
          <a href="/" className="flex min-h-10 items-center justify-center text-sm font-semibold underline">Return to the store</a>
        </CardContent>
      </Card>
    </main>
  );
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (import.meta.env.DEV) console.error('Storefront render failure:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <ProductionErrorScreen />;
    }

    return this.props.children;
  }
}
