"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BarChart3, FileText, Loader2, Plus } from "lucide-react";
import QuoteCard from "@/components/cotacao/QuoteCard";
import { api, type CotacaoApi } from "@/lib/api";
import { onNewNotification } from "@/lib/notify";

function MinhasCotacoes() {
  const sp = useSearchParams();
  const justCreated = sp.get("created") === "1";
  const [quotes, setQuotes] = useState<CotacaoApi[] | null>(null);
  const [err, setErr] = useState("");

  const load = useCallback(() => {
    api
      .listMine()
      .then(setQuotes)
      .catch((e: Error) => setErr(e.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-refresh quando a decisão (aprovada/reprovada) chegar via SSE
  useEffect(() => {
    return onNewNotification((n) => {
      if (n.type === "cotacao_aprovada" || n.type === "cotacao_reprovada") {
        load();
      }
    });
  }, [load]);

  return (
    <main className="mx-auto max-w-[1100px] px-8 py-7">
      <div className="mb-5 flex items-center gap-2">
        <BarChart3 size={18} className="text-gray-700" />
        <h1 className="text-lg font-extrabold text-gray-900">
          Minhas Cotações
        </h1>
      </div>

      {justCreated && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm font-medium text-green-800">
          Cotação enviada para aprovação com sucesso.
        </div>
      )}

      <div className="mb-5 flex items-center justify-between border-b border-gray-200">
        <div className="flex gap-1">
          <span className="-mb-px flex items-center gap-1.5 border-b-2 border-gray-900 px-4 py-2 text-sm font-bold text-gray-900">
            <FileText size={13} /> Minhas Cotações ({quotes?.length ?? 0})
          </span>
        </div>
        <Link
          href="/cotacao/nova"
          className="mb-2 inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
        >
          <Plus size={14} /> Nova Cotação
        </Link>
      </div>

      {err && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {err}
        </div>
      )}

      {quotes === null ? (
        <div className="flex justify-center py-12 text-gray-400">
          <Loader2 size={18} className="animate-spin-slow" />
        </div>
      ) : quotes.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-400">
          Nenhuma cotação enviada ainda.
        </div>
      ) : (
        quotes.map((q) => <QuoteCard key={q.id} q={q} />)
      )}
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <MinhasCotacoes />
    </Suspense>
  );
}
