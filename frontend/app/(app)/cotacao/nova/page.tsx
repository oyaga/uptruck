"use client";

import { BarChart3 } from "lucide-react";
import NovaCotacaoForm from "./NovaCotacaoForm";
import AuthGuard from "@/components/auth/AuthGuard";

export default function NovaCotacaoPage() {
  return (
    <AuthGuard role="cotador">
      <main className="mx-auto max-w-[1100px] px-8 py-7">
        <div className="mb-5 flex items-center gap-2">
          <BarChart3 size={18} className="text-gray-700" />
          <h1 className="text-lg font-extrabold text-gray-900">
            Nova Cotação de Frete
          </h1>
        </div>
        <NovaCotacaoForm />
      </main>
    </AuthGuard>
  );
}
