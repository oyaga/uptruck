"use client";

import AuthGuard from "@/components/auth/AuthGuard";
import EmpresasList from "./EmpresasList";

export default function EmpresasPage() {
  return (
    <AuthGuard>
      <main className="mx-auto max-w-[1100px] px-6 py-6">
        <EmpresasList />
      </main>
    </AuthGuard>
  );
}
