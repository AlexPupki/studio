import { Suspense } from 'react';
import { VerifyForm } from './verify-form';

export default function VerifyPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center">
      <Suspense fallback={<div>Загрузка...</div>}>
        <VerifyForm />
      </Suspense>
    </div>
  );
}
