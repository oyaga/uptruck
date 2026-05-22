"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FileText, Loader2, Plus, Truck, X } from "lucide-react";
import QuoteCard from "@/components/cotacao/QuoteCard";
import { api, type CotacaoApi } from "@/lib/api";
import { COTACAO_STATUS } from "@/lib/cotacaoStatus";
import { onNewNotification } from "@/lib/notify";
import AuthGuard from "@/components/auth/AuthGuard";

type StatusFilter = "all" | (typeof COTACAO_STATUS)[number];

const UF_LIST = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA",
  "MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN",
  "RS","RO","RR","SC","SP","SE","TO",
];

const STATUS_OPTIONS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "Todos os status" },
  ...COTACAO_STATUS.map((s) => ({ key: s as StatusFilter, label: s })),
];

function MinhasCotacoes() {
  const sp = useSearchParams();
  const justCreated = sp.get("created") === "1";
  const [quotes, setQuotes] = useState<CotacaoApi[] | null>(null);
  const [err, setErr]       = useState("");

  const [statusFilter, setStatus] = useState<StatusFilter>("all");
  const [ufOri, setUfOri]         = useState("");
  const [ufDes, setUfDes]         = useState("");
  const [dateFrom, setDateFrom]   = useState("");
  const [dateTo, setDateTo]       = useState("");

  const load = useCallback(() => {
    api
      .listMine()
      .then(setQuotes)
      .catch((e: Error) => setErr(e.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    return onNewNotification((n) => {
      // Recarrega quando o admin responde/recusa uma cotação minha.
      if (n.cotacao_id) load();
    });
  }, [load]);

  const onCotadorAction = async (id: number, acao: string) => {
    setErr("");
    try {
      const updated = await api.transicao(id, acao);
      setQuotes((prev) =>
        prev ? prev.map((q) => (q.id === id ? updated : q)) : prev,
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Falha ao atualizar a cotação.");
    }
  };

  const shown = useMemo(() => {
    if (!quotes) return [];
    return quotes.filter((q) => {
      if (statusFilter !== "all" && q.status !== statusFilter) return false;
      if (ufOri && q.uf_ori !== ufOri) return false;
      if (ufDes && q.uf_des !== ufDes) return false;
      if (dateFrom && q.created_at < dateFrom) return false;
      if (dateTo && q.created_at > dateTo + "T23:59:59") return false;
      return true;
    });
  }, [quotes, statusFilter, ufOri, ufDes, dateFrom, dateTo]);

  const hasFilters = statusFilter !== "all" || ufOri || ufDes || dateFrom || dateTo;

  return (
    <main className="mx-auto max-w-[1100px] px-6 py-6">
      {/* Page header */}
      <div className="mb-5 flex items-center justify-between">
        <h1
          style={{
            fontSize: "var(--ut-fs-lg)",
            fontWeight: 800,
            color: "var(--ut-fg)",
            letterSpacing: "-0.02em",
          }}
        >
          Minhas Cotações
        </h1>
        <Link href="/cotacao/nova" className="ut-btn ut-btn-primary">
          <Plus size={14} />
          Nova Cotação
        </Link>
      </div>

      {/* Success toast */}
      {justCreated && (
        <div
          className="mb-4 flex items-center gap-2 rounded-lg px-4 py-2.5"
          style={{
            background: "var(--ut-success-bg)",
            border: "1px solid var(--ut-success-line)",
            fontSize: "var(--ut-fs-sm)",
            fontWeight: 600,
            color: "var(--ut-success-fg)",
          }}
        >
          Cotação enviada para aprovação com sucesso.
        </div>
      )}

      {/* Tab bar + count */}
      <div
        className="mb-4 flex items-center"
        style={{ borderBottom: "1px solid var(--ut-border)" }}
      >
        <span
          className="-mb-px flex items-center gap-1.5 px-4 py-2"
          style={{
            borderBottom: "2px solid var(--ut-black)",
            fontSize: "var(--ut-fs-sm)",
            fontWeight: 700,
            color: "var(--ut-fg)",
          }}
        >
          <FileText size={12} />
          Minhas Cotações ({quotes?.length ?? 0})
        </span>
      </div>

      {/* Filters */}
      <div
        className="mb-4 flex flex-wrap items-end gap-3 rounded-xl px-4 py-3"
        style={{
          background: "var(--ut-bg-elevated)",
          border: "1px solid var(--ut-border)",
        }}
      >
        <div>
          <label className="ut-label" style={{ display: "block", marginBottom: 4 }}>
            Status
          </label>
          <select
            className="ut-select"
            value={statusFilter}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            style={{ minWidth: 150 }}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="ut-label" style={{ display: "block", marginBottom: 4 }}>
            UF Coleta
          </label>
          <select
            className="ut-select"
            value={ufOri}
            onChange={(e) => setUfOri(e.target.value)}
            style={{ minWidth: 90 }}
          >
            <option value="">Todas</option>
            {UF_LIST.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
          </select>
        </div>

        <div>
          <label className="ut-label" style={{ display: "block", marginBottom: 4 }}>
            UF Entrega
          </label>
          <select
            className="ut-select"
            value={ufDes}
            onChange={(e) => setUfDes(e.target.value)}
            style={{ minWidth: 90 }}
          >
            <option value="">Todas</option>
            {UF_LIST.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
          </select>
        </div>

        <div>
          <label className="ut-label" style={{ display: "block", marginBottom: 4 }}>
            Data de
          </label>
          <input
            className="ut-input"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            style={{ width: 140 }}
          />
        </div>

        <div>
          <label className="ut-label" style={{ display: "block", marginBottom: 4 }}>
            Data até
          </label>
          <input
            className="ut-input"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            style={{ width: 140 }}
          />
        </div>

        {hasFilters && (
          <button
            type="button"
            className="ut-btn ut-btn-ghost ut-btn-sm"
            style={{ alignSelf: "flex-end" }}
            onClick={() => {
              setStatus("all");
              setUfOri("");
              setUfDes("");
              setDateFrom("");
              setDateTo("");
            }}
          >
            <X size={12} />
            Limpar
          </button>
        )}

        {quotes !== null && (
          <div
            style={{
              marginLeft: "auto",
              alignSelf: "flex-end",
              fontSize: "var(--ut-fs-xs)",
              color: "var(--ut-fg-faint)",
              paddingBottom: 2,
            }}
          >
            {shown.length} resultado{shown.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Error */}
      {err && (
        <div
          className="mb-3 rounded-lg px-3 py-2"
          style={{
            background: "var(--ut-danger-bg)",
            border: "1px solid var(--ut-danger-line)",
            fontSize: "var(--ut-fs-sm)",
            color: "var(--ut-danger-fg)",
          }}
        >
          {err}
        </div>
      )}

      {/* Loading */}
      {quotes === null ? (
        <div
          className="flex justify-center py-14"
          style={{ color: "var(--ut-fg-faint)" }}
        >
          <Loader2 size={18} className="animate-spin-slow" />
        </div>
      ) : shown.length === 0 ? (
        <div
          className="overflow-hidden rounded-xl"
          style={{ border: "1px solid var(--ut-border)" }}
        >
          <div className="ut-hazard" style={{ height: 6 }} />
          <div
            className="flex flex-col items-center gap-4 py-14 text-center"
            style={{ background: "var(--ut-bg-elevated)" }}
          >
            <div
              className="ut-logo-plaque"
              style={{ width: 48, height: 48, opacity: 0.5 }}
            >
              <Truck size={22} color="var(--ut-black)" strokeWidth={2} />
            </div>
            <div>
              <div
                style={{
                  fontSize: "var(--ut-fs-md)",
                  fontWeight: 700,
                  color: "var(--ut-fg)",
                  marginBottom: 4,
                }}
              >
                {hasFilters
                  ? "Nenhuma cotação encontrada"
                  : "Nenhuma cotação enviada ainda"}
              </div>
              <div style={{ fontSize: "var(--ut-fs-sm)", color: "var(--ut-fg-muted)" }}>
                {hasFilters
                  ? "Tente ajustar os filtros."
                  : "Crie sua primeira cotação para iniciar o processo de aprovação."}
              </div>
            </div>
            {!hasFilters && (
              <Link
                href="/cotacao/nova"
                className="ut-btn ut-btn-yellow"
                style={{ marginTop: 4 }}
              >
                <Plus size={14} />
                Nova Cotação
              </Link>
            )}
          </div>
        </div>
      ) : (
        shown.map((q) => (
          <QuoteCard
            key={q.id}
            q={q}
            role="cotador"
            onCotadorAction={onCotadorAction}
          />
        ))
      )}
    </main>
  );
}

export default function Page() {
  return (
    <AuthGuard role="cotador">
      <Suspense fallback={null}>
        <MinhasCotacoes />
      </Suspense>
    </AuthGuard>
  );
}
