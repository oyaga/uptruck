"use client";

import { useState } from "react";
import type { CotacaoApi } from "@/lib/api";
import { api } from "@/lib/api";
import QuoteCard from "@/components/cotacao/QuoteCard";

type Tab = "pending" | "all";

interface Stat {
  label: string;
  value: number;
  color: string;
  bg: string;
  border: string;
}

export default function AdminPanel({
  initialQuotes,
}: {
  initialQuotes: CotacaoApi[];
}) {
  const [quotes, setQuotes] = useState(initialQuotes);
  const [tab, setTab] = useState<Tab>("pending");
  const [err, setErr] = useState("");

  const pending = quotes.filter((q) => q.status === "Aguardando");
  const approved = quotes.filter((q) => q.status === "Aprovada");
  const rejected = quotes.filter((q) => q.status === "Reprovada");

  const stats: Stat[] = [
    { label: "Total",      value: quotes.length,   color: "#374151", bg: "#f9fafb", border: "#e5e7eb" },
    { label: "Aguardando", value: pending.length,  color: "#92400e", bg: "#fffbeb", border: "#fde68a" },
    { label: "Aprovadas",  value: approved.length, color: "#065f46", bg: "#f0fdf4", border: "#bbf7d0" },
    { label: "Reprovadas", value: rejected.length, color: "#991b1b", bg: "#fff5f5", border: "#fecdd3" },
  ];

  const shown = tab === "pending" ? pending : quotes;

  const decide = async (
    id: number,
    action: "aprovar" | "reprovar",
    comment: string,
  ) => {
    setErr("");
    try {
      const updated = action === "aprovar"
        ? await api.aprovar(id, comment)
        : await api.reprovar(id, comment);
      setQuotes((prev) => prev.map((q) => (q.id === id ? updated : q)));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Falha ao atualizar cotação.");
    }
  };

  return (
    <div>
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border px-4 py-3"
            style={{ background: s.bg, borderColor: s.border }}
          >
            <div
              className="text-[11px] font-bold uppercase tracking-wider opacity-70"
              style={{ color: s.color }}
            >
              {s.label}
            </div>
            <div
              className="mt-0.5 text-2xl font-extrabold"
              style={{ color: s.color }}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div className="mb-4 flex gap-1 border-b border-gray-200">
        {[
          { k: "pending" as Tab, l: `Pendentes (${pending.length})` },
          { k: "all" as Tab, l: "Todas" },
        ].map(({ k, l }) => {
          const active = tab === k;
          return (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`-mb-px border-b-2 px-4 py-2 text-sm ${
                active
                  ? "border-gray-900 font-bold text-gray-900"
                  : "border-transparent font-medium text-gray-500 hover:text-gray-700"
              }`}
            >
              {l}
            </button>
          );
        })}
      </div>

      {err && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {err}
        </div>
      )}

      {shown.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-400">
          {tab === "pending"
            ? "Nenhuma cotação aguardando."
            : "Nenhuma cotação registrada."}
        </div>
      ) : (
        shown.map((q) => (
          <QuoteCard
            key={q.id}
            q={q}
            isAdmin
            onApprove={(id, c) => decide(id, "aprovar", c)}
            onReject={(id, c) => decide(id, "reprovar", c)}
          />
        ))
      )}
    </div>
  );
}
