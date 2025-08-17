// src/app/account/layout.tsx
import * as React from 'react';

// Этот layout может быть использован для добавления навигации
// внутри личного кабинета (например, "Мои бронирования", "Профиль" и т.д.)
export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Настройки аккаунта</h2>
        <p className="text-muted-foreground">
          Управляйте настройками вашего аккаунта и просматривайте историю.
        </p>
      </div>
      <div className="border-t border-border" />
      {children}
    </div>
  );
}
