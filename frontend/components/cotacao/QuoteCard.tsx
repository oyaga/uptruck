"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
  MapPin,
  Package,
  Send,
  Truck,
  XCircle,
} from "lucide-react";
import type { CotacaoApi } from "@/lib/api";
import { fmt, UNITIZACOES, VEI } from "@/lib/antt";
import { empresaLabel } from "@/lib/empresa";
import {
  COTADOR_ACTIONS,
  statusMeta,
  STATUS_HINT,
  type CotadorAction,
} from "@/lib/cotacaoStatus";
import CurrencyInput, {
  centsToNumber,
  numberToCents,
} from "./CurrencyInput";
import StatusBadge from "./StatusBadge";

interface Props {
  q: CotacaoApi;
  role: "admin" | "cotador";
  // Quando admin é o dono da cotação (created_by == ele), ganha também os
  // botões de transição do cotador. Sem isso, admin só vê ações de admin.
  currentUserId?: number;
  onAdminRespond?: (id: number, comment: string, valorSugerido: number) => void;
  onAdminReject?: (id: number, comment: string) => void;
  onCotadorAction?: (id: number, acao: string) => void;
}

const fmtDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch {
    return iso;
  }
};

export default function QuoteCard({
  q,
  role,
  currentUserId,
  onAdminRespond,
  onAdminReject,
  onCotadorAction,
}: Props) {
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [valorCents, setValorCents] = useState(() =>
    numberToCents(q.valor_sugerido || 0),
  );

  const sug = Number(q.valor_sugerido) || 0;
  const min = Number(q.antt_min) || 0;
  const margin =
    sug > 0 && min > 0 ? (((sug - min) / min) * 100).toFixed(1) : null;
  const belowFloor = sug > 0 && min > 0 && sug < min;
  const unitLabel =
    UNITIZACOES.find((u) => u.value === q.unitizacao)?.label ||
    q.unitizacao ||
    "—";

  const accent = statusMeta(q.status).accent;

  // Painel de resposta do admin (só na etapa "Em Análise").
  const adminCanRespond = role === "admin" && q.status === "Em Análise";
  const typedValue = centsToNumber(valorCents);
  const typedBelowFloor = typedValue > 0 && min > 0 && typedValue < min;

  // Cotador sempre vê as transições. Admin só vê quando ele mesmo é o
  // dono da cotação (created_by == admin) — caso em que precisa tocar o
  // fluxo do cotador também.
  const isOwner =
    currentUserId !== undefined && currentUserId === q.created_by;
  const canActAsCotador = role === "cotador" || (role === "admin" && isOwner);
  const cotadorActions: CotadorAction[] = canActAsCotador
    ? COTADOR_ACTIONS[q.status] || []
    : [];

  const runCotadorAction = (a: CotadorAction) => {
    if (a.confirm && !window.confirm(a.confirm)) return;
    onCotadorAction?.(q.id, a.acao);
    setOpen(false);
  };

  // Endereço da cotação pode diferir do cadastro da empresa quando a coleta/
  // entrega acontece em outro local (galpão, filial, depósito do cliente etc.).
  // Sinalizamos isso no rótulo da empresa pra deixar a divergência explícita.
  const oriDifere = enderecoDifere(
    q.empresa_ori,
    q.cep_ori,
    q.uf_ori,
    q.cidade_ori,
    q.bairro_ori,
  );
  const desDifere = enderecoDifere(
    q.empresa_des,
    q.cep_des,
    q.uf_des,
    q.cidade_des,
    q.bairro_des,
  );

  const rotaRows: [string, string][] = [
    [
      "Origem",
      `${q.cep_ori ? q.cep_ori + " · " : ""}${q.uf_ori}/${q.cidade_ori}${q.bairro_ori ? " — " + q.bairro_ori : ""}`,
    ],
  ];
  if (q.empresa_ori)
    rotaRows.push([
      "Empresa (Coleta)",
      empresaLabel(q.empresa_ori) +
        (oriDifere ? " · endereço diferente do cadastro" : ""),
    ]);
  rotaRows.push([
    "Destino",
    `${q.cep_des ? q.cep_des + " · " : ""}${q.uf_des}/${q.cidade_des}${q.bairro_des ? " — " + q.bairro_des : ""}`,
  ]);
  if (q.empresa_des)
    rotaRows.push([
      "Empresa (Entrega)",
      empresaLabel(q.empresa_des) +
        (desDifere ? " · endereço diferente do cadastro" : ""),
    ]);
  rotaRows.push(["Distância", `${q.distancia_km} km`]);
  rotaRows.push(["Veículo", VEI[q.veiculo as keyof typeof VEI]?.l || q.veiculo]);

  const toneClass: Record<CotadorAction["tone"], string> = {
    primary: "ut-btn-primary",
    approve: "ut-btn-approve",
    reject: "ut-btn-reject",
  };

  return (
    <div
      className="mb-2 overflow-hidden"
      style={{
        background: "var(--ut-bg-elevated)",
        border: "1px solid var(--ut-border)",
        borderRadius: "var(--ut-radius-lg)",
        boxShadow: "var(--ut-shadow-sm)",
        display: "flex",
      }}
    >
      {/* Left accent bar */}
      <div
        style={{
          width: 3,
          flexShrink: 0,
          background: accent,
          borderRadius: "var(--ut-radius-lg) 0 0 var(--ut-radius-lg)",
        }}
      />

      <div className="min-w-0 flex-1">
        {/* Header row — clickable to expand */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center gap-3 px-4 py-3 text-left"
          style={{ background: "transparent", border: 0, cursor: "pointer" }}
        >
          {/* Truck icon plaque */}
          <div
            className="ut-logo-plaque"
            style={{ width: 34, height: 34, flexShrink: 0 }}
          >
            <Truck size={15} color="var(--ut-black)" strokeWidth={2.5} />
          </div>

          {/* Main content */}
          <div className="min-w-0 flex-1">
            {/* Route + badges */}
            <div
              className="mb-1 flex flex-wrap items-center gap-2"
              style={{ fontSize: "var(--ut-fs-base)", fontWeight: 700, color: "var(--ut-fg)" }}
            >
              <span>{q.uf_ori}/{q.cidade_ori}</span>
              <ArrowRight size={13} style={{ color: "var(--ut-fg-faint)", flexShrink: 0 }} />
              <span>{q.uf_des}/{q.cidade_des}</span>

              {/* Vehicle badge */}
              {q.veiculo && (
                <span className="ut-badge info">
                  <Truck size={10} />
                  {VEI[q.veiculo as keyof typeof VEI]?.l || q.veiculo}
                </span>
              )}

              <StatusBadge status={q.status} />
            </div>

            {/* Meta row */}
            <div
              className="flex flex-wrap gap-3"
              style={{ fontSize: "var(--ut-fs-sm)", color: "var(--ut-fg-muted)" }}
            >
              <span className="flex items-center gap-1">
                <Package size={11} />
                {q.produto || "—"}
              </span>
              <span>{q.embalagem || "—"} · {unitLabel}</span>
              <span>
                Piso:{" "}
                <span style={{ fontFamily: "var(--ut-font-mono)", fontWeight: 500 }}>
                  {fmt(min)}
                </span>
              </span>
              <span style={{ fontWeight: 700, color: "var(--ut-fg)" }}>
                Cotado:{" "}
                <span style={{ fontFamily: "var(--ut-font-mono)" }}>
                  {fmt(sug)}
                </span>
              </span>
              {margin && !belowFloor && (
                <span style={{ color: "var(--ut-success-fg)", fontWeight: 600 }}>
                  +{margin}% acima
                </span>
              )}
              {belowFloor && (
                <span
                  className="flex items-center gap-1"
                  style={{ color: "var(--ut-danger-fg)", fontWeight: 600 }}
                >
                  <AlertTriangle size={11} />
                  Abaixo do piso
                </span>
              )}
            </div>
          </div>

          {/* Date + chevron */}
          <div
            className="flex shrink-0 items-center gap-2"
            style={{ fontSize: "var(--ut-fs-eyebrow)", color: "var(--ut-fg-faint)" }}
          >
            <span>{fmtDate(q.created_at)}</span>
            {open
              ? <ChevronUp size={14} style={{ color: "var(--ut-fg-subtle)" }} />
              : <ChevronDown size={14} style={{ color: "var(--ut-fg-subtle)" }} />
            }
          </div>
        </button>

        {/* Expanded detail panel */}
        {open && (
          <div
            className="flex flex-col gap-4 px-4 pb-4 pt-3 ut-fade-in"
            style={{
              borderTop: "1px solid var(--ut-border)",
              background: "var(--ut-bg-sunken)",
            }}
          >
            {/* Route section */}
            <section>
              <div className="ut-eyebrow mb-2 flex items-center gap-1.5">
                <MapPin size={10} />
                Rota
              </div>
              <div
                className="grid grid-cols-1 gap-y-2 sm:grid-cols-2 sm:gap-x-6"
                style={{ fontSize: "var(--ut-fs-sm)" }}
              >
                {rotaRows.map(([l, v]) => (
                  <div key={l}>
                    <span style={{ color: "var(--ut-fg-muted)" }}>{l}: </span>
                    <span style={{ fontWeight: 600, color: "var(--ut-fg)" }}>{v}</span>
                  </div>
                ))}
              </div>
            </section>

            <hr className="ut-divider" />

            {/* Cargo section */}
            <section>
              <div className="ut-eyebrow mb-2 flex items-center gap-1.5">
                <Package size={10} />
                Carga
              </div>
              <div
                className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4"
                style={{ fontSize: "var(--ut-fs-sm)" }}
              >
                {[
                  ["Produto", q.produto || "—"],
                  ["Embalagem", q.embalagem || "—"],
                  ["Unitização", unitLabel],
                  ["Categoria", q.categoria],
                  ["Peso", q.peso_kg ? `${q.peso_kg} kg` : "—"],
                  ["Volumes", q.volumes ?? "—"],
                  ["Cubagem", q.cubagem_m3 ? `${q.cubagem_m3} m³` : "—"],
                  ["Valor NF", q.valor_nf ? fmt(q.valor_nf) : "—"],
                ].map(([l, v]) => (
                  <div key={l}>
                    <div className="ut-eyebrow mb-0.5">{l}</div>
                    <div style={{ fontWeight: 600, color: "var(--ut-fg)" }}>{v}</div>
                  </div>
                ))}
              </div>
            </section>

            <hr className="ut-divider" />

            {/* ANTT value strip */}
            <div
              className="flex flex-wrap items-center gap-5 rounded-lg px-4 py-2.5"
              style={{
                background: belowFloor ? "var(--ut-danger-bg)" : "var(--ut-success-bg)",
                border: `1px solid ${belowFloor ? "var(--ut-danger-line)" : "var(--ut-success-line)"}`,
                fontSize: "var(--ut-fs-sm)",
              }}
            >
              <div>
                <span style={{ color: belowFloor ? "var(--ut-danger-fg)" : "var(--ut-success-fg)", opacity: 0.7 }}>
                  Piso ANTT:{" "}
                </span>
                <span
                  style={{
                    fontFamily: "var(--ut-font-mono)",
                    fontWeight: 700,
                    color: belowFloor ? "var(--ut-danger-fg)" : "var(--ut-success-fg)",
                  }}
                >
                  {fmt(min)}
                </span>
              </div>
              <div>
                <span style={{ color: belowFloor ? "var(--ut-danger-fg)" : "var(--ut-success-fg)", opacity: 0.7 }}>
                  Cotado:{" "}
                </span>
                <span
                  style={{
                    fontFamily: "var(--ut-font-mono)",
                    fontWeight: 700,
                    color: belowFloor ? "var(--ut-danger-fg)" : "var(--ut-success-fg)",
                  }}
                >
                  {fmt(sug)}
                </span>
              </div>
              {margin && !belowFloor && (
                <div style={{ fontWeight: 700, color: "var(--ut-success-fg)" }}>
                  +{margin}% acima do piso mínimo
                </div>
              )}
              {belowFloor && (
                <div
                  className="flex items-center gap-1.5"
                  style={{ fontWeight: 700, color: "var(--ut-danger-fg)" }}
                >
                  <AlertTriangle size={13} />
                  Valor abaixo do piso mínimo ANTT
                </div>
              )}
            </div>

            {/* Admin comment */}
            {q.admin_comment && (
              <div
                className="rounded-lg px-3 py-2.5"
                style={{
                  background: "var(--ut-pending-bg)",
                  border: "1px solid var(--ut-pending-line)",
                  fontSize: "var(--ut-fs-sm)",
                  color: "var(--ut-pending-fg)",
                }}
              >
                <strong>Admin:</strong> {q.admin_comment}
              </div>
            )}

            {/* Status hint */}
            {STATUS_HINT[q.status] && (
              <div
                className="flex items-start gap-2"
                style={{ fontSize: "var(--ut-fs-xs)", color: "var(--ut-fg-muted)" }}
              >
                <Info size={13} className="mt-0.5 shrink-0" />
                {STATUS_HINT[q.status]}
              </div>
            )}

            {/* Admin: responder / recusar (etapa Em Análise) */}
            {adminCanRespond && (
              <div
                className="flex flex-col gap-2 pt-1"
                style={{ borderTop: "1px solid var(--ut-border)" }}
              >
                <label className="ut-label">Valor corrigido do frete</label>
                <CurrencyInput
                  value={valorCents}
                  onChange={setValorCents}
                  placeholder="R$ 0,00"
                />
                {typedBelowFloor && (
                  <div
                    className="flex items-center gap-1.5"
                    style={{ fontSize: "var(--ut-fs-xs)", color: "var(--ut-danger-fg)", fontWeight: 600 }}
                  >
                    <AlertTriangle size={12} />
                    Valor abaixo do piso ANTT ({fmt(min)}).
                  </div>
                )}
                <label className="ut-label" style={{ marginTop: 4 }}>
                  Comentário para o cotador (opcional)
                </label>
                <textarea
                  className="ut-textarea"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Escreva um comentário..."
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="ut-btn ut-btn-approve"
                    style={{ flex: 1, justifyContent: "center" }}
                    onClick={() => {
                      const v = centsToNumber(valorCents);
                      if (v <= 0) {
                        window.alert("Informe o valor corrigido da cotação.");
                        return;
                      }
                      onAdminRespond?.(q.id, comment, v);
                      setOpen(false);
                    }}
                  >
                    <CheckCircle2 size={14} />
                    Responder
                  </button>
                  <button
                    type="button"
                    className="ut-btn ut-btn-reject"
                    style={{ flex: 1, justifyContent: "center" }}
                    onClick={() => {
                      onAdminReject?.(q.id, comment);
                      setOpen(false);
                    }}
                  >
                    <XCircle size={14} />
                    Recusar
                  </button>
                </div>
              </div>
            )}

            {/* Cotador: ações de avanço do fluxo */}
            {cotadorActions.length > 0 && (
              <div
                className="flex flex-col gap-2 pt-1 sm:flex-row"
                style={{ borderTop: "1px solid var(--ut-border)" }}
              >
                {cotadorActions.map((a) => (
                  <button
                    key={a.acao}
                    type="button"
                    className={`ut-btn ${toneClass[a.tone]}`}
                    style={{ flex: 1, justifyContent: "center", marginTop: 8 }}
                    onClick={() => runCotadorAction(a)}
                  >
                    {a.tone === "reject" ? (
                      <XCircle size={14} />
                    ) : a.tone === "approve" ? (
                      <CheckCircle2 size={14} />
                    ) : (
                      <Send size={14} />
                    )}
                    {a.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Verifica se o endereço gravado na cotação (cep/uf/cidade/bairro) é
// diferente do cadastro da empresa vinculada. Quando não há empresa
// vinculada, não faz sentido comparar — devolve false.
function enderecoDifere(
  e: { cep?: string; uf?: string; cidade?: string; bairro?: string } | null | undefined,
  cep: string | null | undefined,
  uf: string,
  cidade: string,
  bairro: string | null | undefined,
): boolean {
  if (!e) return false;
  const digits = (s?: string | null) => (s || "").replace(/\D/g, "");
  return (
    digits(e.cep) !== digits(cep) ||
    (e.uf || "") !== uf ||
    (e.cidade || "") !== cidade ||
    (e.bairro || "") !== (bairro || "")
  );
}
