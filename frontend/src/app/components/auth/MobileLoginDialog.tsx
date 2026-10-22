import { SignIn } from '@clerk/react';
import { useAuth } from '../../contexts/AuthContext';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';

export function MobileLoginDialog() {
  const { isLoginOpen, closeLogin } = useAuth();
  return (
    <Dialog open={isLoginOpen} onOpenChange={(open) => !open && closeLogin()}>
      <DialogContent className="w-auto max-w-[calc(100vw-2rem)] border-0 bg-transparent p-0 shadow-none sm:max-w-md">
        <DialogHeader className="sr-only">
          <DialogTitle>Sign in or create an account</DialogTitle>
          <DialogDescription>Continue with Google, email, or phone number.</DialogDescription>
        </DialogHeader>
        <SignIn routing="virtual" />
      </DialogContent>
    </Dialog>
  );
}
