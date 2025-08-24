
import { Suspense } from 'react';
import { LoginForm } from '@/app/(auth)/login/login-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Note: We are reusing the client-side login form component for now.
// In the future, this can be replaced with a dedicated operator login form (e.g., email/password).
export default function OpsLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
        <Suspense fallback={<div>Loading...</div>}>
            <LoginForm />
        </Suspense>
    </div>
  );
}
