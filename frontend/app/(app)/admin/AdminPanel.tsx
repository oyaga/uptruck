"use client";

import { useMemo, useState } from "react";
import { Download, Loader2, ShieldCheck, Truck, X } from "lucide-react";
import type { CotacaoApi } from "@/lib/api";
import { api } from "@/lib/api";
import { COTACAO_STATUS, statusMeta } from "@/lib/cotacaoStatus";
import QuoteCard from "@/components/cotacao/QuoteCard";

type StatusFilter = "all" | (typeof COTACAO_STATUS)[number];

const UF_LIST = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA",
  "MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN",
  "RS","RO","RR","SC","SP","SE","TO",
];

const VARIANT_COLORS: Record<
  string,
  { bg: string; fg: string; line: string }
> = {
  pending: { bg: "var(--ut-pending-bg)", fg: "var(--ut-pending-fg)", line: "var(--ut-pending-line)" },
  info: { bg: "var(--ut-info-bg)", fg: "var(--ut-info-fg)", line: "var(--ut-info-line)" },
  approved: { bg: "var(--ut-success-bg)", fg: "var(--ut-success-fg)", line: "var(--ut-success-line)" },
  rejected: { bg: "var(--ut-danger-bg)", fg: "var(--ut-danger-fg)", line: "var(--ut-danger-line)" },
};

export default function AdminPanel({
  initialQuotes,
  currentUserId,
}: {
  initialQuotes: CotacaoApi[];
  currentUserId?: number;
}) {
  const [quotes, setQuotes]       = useState(initialQuotes);
  const [statusFilter, setStatus] = useState<StatusFilter>("all");
  const [ufOri, setUfOri]         = useState("");
  const [ufDes, setUfDes]         = useState("");
  const [dateFrom, setDateFrom]   = useState("");
  const [dateTo, setDateTo]       = useState("");
  const [err, setErr]             = useState("");

  const countByStatus = useMemo(() => {
    const m: Record<string, number> = {};
    for (const q of quotes) m[q.status] = (m[q.status] || 0) + 1;
    return m;
  }, [quotes]);

  // Botões de filtro: "Todos" + um por status.
  const filterButtons: {
    key: StatusFilter;
    label: string;
    count: number;
    fg: string;
    bg: string;
  }[] = [
    { key: "all", label: "Todos", count: quotes.length, fg: VARIANT_COLORS.info.fg, bg: VARIANT_COLORS.info.bg },
    ...COTACAO_STATUS.map((s) => {
      const c = VARIANT_COLORS[statusMeta(s).variant];
      return { key: s as StatusFilter, label: s, count: countByStatus[s] || 0, fg: c.fg, bg: c.bg };
    }),
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

  const respond = async (id: number, comment: string, valor: number) => {
    setErr("");
    try {
      const updated = await api.responder(id, comment, valor);
      setQuotes((prev) => prev.map((q) => (q.id === id ? updated : q)));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Falha ao responder a cotação.");
    }
  };

  const reject = async (id: number, comment: string) => {
    setErr("");
    try {
      const updated = await api.recusarCotacao(id, comment);
      setQuotes((prev) => prev.map((q) => (q.id === id ? updated : q)));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Falha ao recusar a cotação.");
    }
  };

  // Transições de cotador (admin pode acionar nas cotações que ele mesmo criou).
  const cotadorAction = async (id: number, acao: string) => {
    setErr("");
    try {
      const updated = await api.transicao(id, acao);
      setQuotes((prev) => prev.map((q) => (q.id === id ? updated : q)));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Falha ao atualizar a cotação.");
    }
  };

  const [exporting, setExporting] = useState(false);
  const exportXlsx = async () => {
    setErr("");
    setExporting(true);
    try {
      const { blob, filename } = await api.exportCotacoes({
        status: statusFilter !== "all" ? statusFilter : undefined,
        uf_ori: ufOri || undefined,
        uf_des: ufDes || undefined,
        from: dateFrom || undefined,
        to: dateTo || undefined,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Falha ao exportar.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      {/* Status filter chips */}
      <div className="mb-4 flex flex-wrap gap-2">
        {filterButtons.map((b) => {
          const active = statusFilter === b.key;
          return (
            <button
              key={b.key}
              type="button"
              onClick={() => setStatus(active ? "all" : b.key)}
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5"
              style={{
                background: active ? b.bg : "var(--ut-bg-elevated)",
                borderColor: active ? b.fg : "var(--ut-border)",
                color: active ? b.fg : "var(--ut-fg-muted)",
                fontSize: "var(--ut-fs-sm)",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "var(--ut-font-sans)",
                transition: "all var(--ut-dur-fast) var(--ut-ease)",
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: b.fg,
                  flexShrink: 0,
                }}
              />
              {b.label}
              <span style={{ fontWeight: 800 }}>{b.count}</span>
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
            {UF_LIST.map((uf) => (
              <option key={uf} value={uf}>{uf}</option>
            ))}
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
            {UF_LIST.map((uf) => (
              <option key={uf} value={uf}>{uf}</option>
            ))}
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

        <button
          type="button"
          onClick={exportXlsx}
          disabled={exporting || shown.length === 0}
          className="ut-btn ut-btn-sm"
          style={{ alignSelf: "flex-end" }}
          title={
            shown.length === 0
              ? "Sem cotações para exportar"
              : "Baixar como planilha .xlsx aplicando os filtros atuais"
          }
        >
          {exporting ? <Loader2 size={12} className="animate-spin-slow" /> : <Download size={12} />}
          Exportar Excel
        </button>
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
                {statusFilter === "Em Análise"
                  ? "Nenhuma cotação em análise"
                  : "Nenhuma cotação encontrada"}
              </div>
              <div style={{ fontSize: "var(--ut-fs-sm)", color: "var(--ut-fg-muted)" }}>
                {statusFilter === "Em Análise"
                  ? "Todas as cotações já foram respondidas."
                  : "Tente ajustar os filtros."}
              </div>
            </div>
            {statusFilter === "Em Análise" && !hasSecondaryFilters && (
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
            role="admin"
            currentUserId={currentUserId}
            onAdminRespond={respond}
            onAdminReject={reject}
            onCotadorAction={cotadorAction}
          />
        ))
      )}
    </div>
  );
}
