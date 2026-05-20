"use client";

import { Suspense } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import EmpresaForm from "../EmpresaForm";

export default function NovaEmpresaPage() {
  return (
    <AuthGuard role="cotador">
      <main className="mx-auto max-w-[760px] px-6 py-7">
        <Suspense fallback={null}>
          <EmpresaForm />
        </Suspense>
      </main>
    </AuthGuard>
  );
}
