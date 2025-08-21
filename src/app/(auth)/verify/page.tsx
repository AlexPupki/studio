import { Suspense } from 'react';
import { VerifyForm } from './verify-form';

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="text-white">Загрузка...</div>}>
      <VerifyForm />
    </Suspense>
  );
}
