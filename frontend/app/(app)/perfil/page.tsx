"use client";

import AuthGuard from "@/components/auth/AuthGuard";
import PerfilForm from "./PerfilForm";

export default function PerfilPage() {
  return (
    <AuthGuard>
      <main className="mx-auto max-w-[560px] px-6 py-7">
        <PerfilForm />
      </main>
    </AuthGuard>
  );
}
