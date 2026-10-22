import { useEffect, useRef, type ReactNode } from 'react';
import { Loader2, LogIn, ShieldCheck } from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';

interface AuthGateProps {
  children: ReactNode;
  title?: string;
  description?: string;
  autoOpen?: boolean;
}

export function AuthGate({
  children,
  title = 'Sign in to continue',
  description = 'Verify your mobile number to securely continue.',
  autoOpen = true,
}: AuthGateProps) {
  const { status, isAuthenticated, openLogin, sessionError } = useAuth();
  const hasAutoOpened = useRef(false);

  useEffect(() => {
    if (status === 'unauthenticated' && autoOpen && !hasAutoOpened.current) {
      hasAutoOpened.current = true;
      openLogin();
    }
  }, [autoOpen, openLogin, status]);

  if (status === 'loading') {
    return (
      <Card className="mx-auto max-w-xl" aria-busy="true" aria-label="Checking your sign-in status">
        <CardContent className="flex items-center justify-center gap-3 py-12 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          Checking your secure session…
        </CardContent>
      </Card>
    );
  }

  if (isAuthenticated) return children;

  return (
    <Card className="mx-auto max-w-xl">
      <CardContent className="flex flex-col items-center py-10 text-center">
        <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ShieldCheck className="size-6" />
        </div>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
        {sessionError && (
          <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive" role="alert">
            {sessionError}
          </p>
        )}
        <Button type="button" size="lg" className="mt-6" onClick={openLogin}>
          <LogIn className="size-4" />
          Sign in with mobile
        </Button>
      </CardContent>
    </Card>
  );
}
