"use client";

import { useMemo, useState } from "react";
import { ShieldCheck, Truck, X } from "lucide-react";
import type { CotacaoApi } from "@/lib/api";
import { api } from "@/lib/api";
import QuoteCard from "@/components/cotacao/QuoteCard";

type StatusFilter = "all" | "Aguardando" | "Aprovada" | "Reprovada";

const UF_LIST = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA",
  "MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN",
  "RS","RO","RR","SC","SP","SE","TO",
];

export default function AdminPanel({
  initialQuotes,
}: {
  initialQuotes: CotacaoApi[];
}) {
  const [quotes, setQuotes]       = useState(initialQuotes);
  const [statusFilter, setStatus] = useState<StatusFilter>("all");
  const [ufOri, setUfOri]         = useState("");
  const [ufDes, setUfDes]         = useState("");
  const [dateFrom, setDateFrom]   = useState("");
  const [dateTo, setDateTo]       = useState("");
  const [err, setErr]             = useState("");

  const pending  = quotes.filter((q) => q.status === "Aguardando");
  const approved = quotes.filter((q) => q.status === "Aprovada");
  const rejected = quotes.filter((q) => q.status === "Reprovada");

  const statButtons = [
    {
      key: "all" as StatusFilter,
      label: "Todos",
      value: quotes.length,
      bg: "var(--ut-info-bg)",
      fg: "var(--ut-info-fg)",
      border: "var(--ut-info-line)",
    },
    {
      key: "Aguardando" as StatusFilter,
      label: "Aguardando",
      value: pending.length,
      bg: "var(--ut-pending-bg)",
      fg: "var(--ut-pending-fg)",
      border: "var(--ut-pending-line)",
    },
    {
      key: "Aprovada" as StatusFilter,
      label: "Aprovadas",
      value: approved.length,
      bg: "var(--ut-success-bg)",
      fg: "var(--ut-success-fg)",
      border: "var(--ut-success-line)",
    },
    {
      key: "Reprovada" as StatusFilter,
      label: "Reprovadas",
      value: rejected.length,
      bg: "var(--ut-danger-bg)",
      fg: "var(--ut-danger-fg)",
      border: "var(--ut-danger-line)",
    },
  ];

  const shown = useMemo(() => {
    return quotes.filter((q) => {
      if (statusFilter !== "all" && q.status !== statusFilter) return false;
      if (ufOri && q.uf_ori !== ufOri) return false;
      if (ufDes && q.uf_des !== ufDes) return false;
      if (dateFrom && q.created_at < dateFrom) return false;
      if (dateTo && q.created_at > dateTo + "T23:59:59") return false;
      return true;
    });
  }, [quotes, statusFilter, ufOri, ufDes, dateFrom, dateTo]);

  const hasSecondaryFilters = ufOri || ufDes || dateFrom || dateTo;

  const decide = async (
    id: number,
    action: "aprovar" | "reprovar",
    comment: string,
  ) => {
    setErr("");
    try {
      const updated =
        action === "aprovar"
          ? await api.aprovar(id, comment)
          : await api.reprovar(id, comment);
      setQuotes((prev) => prev.map((q) => (q.id === id ? updated : q)));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Falha ao atualizar cotação.");
    }
  };

  return (
    <div>
      {/* Interactive stat / status filter buttons */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statButtons.map((s) => {
          const active = statusFilter === s.key;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setStatus(active && s.key !== "all" ? "all" : s.key)}
              className="rounded-xl border px-4 py-3 text-left"
              style={{
                background: s.bg,
                borderColor: active ? s.fg : s.border,
                cursor: "pointer",
                outline: active ? `2px solid ${s.fg}` : "none",
                outlineOffset: 2,
                transition: "outline var(--ut-dur-fast) var(--ut-ease), border-color var(--ut-dur-fast) var(--ut-ease)",
                fontFamily: "var(--ut-font-sans)",
              }}
            >
              <div className="ut-eyebrow mb-1" style={{ color: s.fg }}>
                {s.label}
              </div>
              <div
                style={{
                  fontSize: "var(--ut-fs-2xl)",
                  fontWeight: 800,
                  color: s.fg,
                  lineHeight: 1,
                  letterSpacing: "-0.03em",
                }}
              >
                {s.value}
              </div>
              {active && s.key !== "all" && (
                <div
                  style={{
                    fontSize: "var(--ut-fs-eyebrow)",
                    color: s.fg,
                    marginTop: 4,
                    opacity: 0.7,
                  }}
                >
                  filtro ativo · clique para limpar
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Secondary filters: UF + date */}
      <div
        className="mb-4 flex flex-wrap items-end gap-3 rounded-xl px-4 py-3"
        style={{
          background: "var(--ut-bg-elevated)",
          border: "1px solid var(--ut-border)",
        }}
      >
        <div>
          <label
            className="ut-label"
            style={{ display: "block", marginBottom: 4 }}
          >
            UF Coleta
          </label>
          <select
            className="ut-select"
            value={ufOri}
            onChange={(e) => setUfOri(e.target.value)}
            style={{ minWidth: 90 }}
          >
            <option value="">Todas</option>
            {UF_LIST.map((uf) => (
              <option key={uf} value={uf}>{uf}</option>
            ))}
          </select>
        </div>

        <div>
          <label
            className="ut-label"
            style={{ display: "block", marginBottom: 4 }}
          >
            UF Entrega
          </label>
          <select
            className="ut-select"
            value={ufDes}
            onChange={(e) => setUfDes(e.target.value)}
            style={{ minWidth: 90 }}
          >
            <option value="">Todas</option>
            {UF_LIST.map((uf) => (
              <option key={uf} value={uf}>{uf}</option>
            ))}
          </select>
        </div>

        <div>
          <label
            className="ut-label"
            style={{ display: "block", marginBottom: 4 }}
          >
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
          <label
            className="ut-label"
            style={{ display: "block", marginBottom: 4 }}
          >
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

        {hasSecondaryFilters && (
          <button
            type="button"
            className="ut-btn ut-btn-ghost ut-btn-sm"
            style={{ alignSelf: "flex-end" }}
            onClick={() => {
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

      {/* Empty state */}
      {shown.length === 0 ? (
        <div
          className="overflow-hidden rounded-xl"
          style={{ border: "1px solid var(--ut-border)" }}
        >
          <div className="ut-hazard" style={{ height: 6 }} />
          <div
            className="flex flex-col items-center gap-3 py-14 text-center"
            style={{ background: "var(--ut-bg-elevated)" }}
          >
            <div
              className="ut-logo-plaque"
              style={{ width: 44, height: 44, opacity: 0.45 }}
            >
              <Truck size={20} color="var(--ut-black)" strokeWidth={2} />
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
                {statusFilter === "Aguardando"
                  ? "Nenhuma cotação aguardando"
                  : "Nenhuma cotação encontrada"}
              </div>
              <div style={{ fontSize: "var(--ut-fs-sm)", color: "var(--ut-fg-muted)" }}>
                {statusFilter === "Aguardando"
                  ? "Todas as cotações já foram avaliadas."
                  : "Tente ajustar os filtros."}
              </div>
            </div>
            {statusFilter === "Aguardando" && !hasSecondaryFilters && (
              <div
                className="flex items-center gap-1.5 mt-1"
                style={{
                  color: "var(--ut-success-fg)",
                  fontSize: "var(--ut-fs-sm)",
                  fontWeight: 600,
                }}
              >
                <ShieldCheck size={14} />
                Painel em dia
              </div>
            )}
          </div>
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
