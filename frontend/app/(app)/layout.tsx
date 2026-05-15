"use client";

// Layout compartilhado das páginas autenticadas.
// Mantém o Topbar (que segura a conexão SSE via NotificationBell) montado
// durante toda a navegação interna — evita reconexão a cada page change.

import AuthGuard from "@/components/auth/AuthGuard";
import Topbar from "@/components/layout/Topbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <Topbar />
      {children}
    </AuthGuard>
  );
}
