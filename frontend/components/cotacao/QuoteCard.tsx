"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  MapPin,
  Package,
  Truck,
  XCircle,
} from "lucide-react";
import type { CotacaoApi } from "@/lib/api";
import { fmt, UNITIZACOES, VEI } from "@/lib/antt";
import { empresaLabel } from "@/lib/empresa";
import StatusBadge from "./StatusBadge";

interface Props {
  q: CotacaoApi;
  isAdmin?: boolean;
  onApprove?: (id: number, comment: string) => void;
  onReject?: (id: number, comment: string) => void;
}

const fmtDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch {
    return iso;
  }
};

/** Returns the accent color for the left bar by status */
function accentColor(status: string): string {
  if (status === "Aprovada") return "var(--ut-success-fg)";
  if (status === "Reprovada") return "var(--ut-danger-fg)";
  return "var(--ut-yellow)";
}

export default function QuoteCard({ q, isAdmin, onApprove, onReject }: Props) {
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState("");

  const sug = Number(q.valor_sugerido) || 0;
  const min = Number(q.antt_min) || 0;
  const margin =
    sug > 0 && min > 0 ? (((sug - min) / min) * 100).toFixed(1) : null;
  const belowFloor = sug > 0 && min > 0 && sug < min;
  const unitLabel =
    UNITIZACOES.find((u) => u.value === q.unitizacao)?.label ||
    q.unitizacao ||
    "—";

  const rotaRows: [string, string][] = [
    [
      "Origem",
      `${q.cep_ori ? q.cep_ori + " · " : ""}${q.uf_ori}/${q.cidade_ori}${q.bairro_ori ? " — " + q.bairro_ori : ""}`,
    ],
  ];
  if (q.empresa_ori)
    rotaRows.push(["Empresa (Coleta)", empresaLabel(q.empresa_ori)]);
  rotaRows.push([
    "Destino",
    `${q.cep_des ? q.cep_des + " · " : ""}${q.uf_des}/${q.cidade_des}${q.bairro_des ? " — " + q.bairro_des : ""}`,
  ]);
  if (q.empresa_des)
    rotaRows.push(["Empresa (Entrega)", empresaLabel(q.empresa_des)]);
  rotaRows.push(["Distância", `${q.distancia_km} km`]);
  rotaRows.push(["Veículo", VEI[q.veiculo as keyof typeof VEI]?.l || q.veiculo]);

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
          background: accentColor(q.status),
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
                <div
                  style={{
                    fontWeight: 700,
                    color: "var(--ut-success-fg)",
                  }}
                >
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

            {/* Admin comment (when already decided) */}
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

            {/* Admin approve / reject controls */}
            {isAdmin && q.status === "Aguardando" && (
              <div
                className="flex flex-col gap-2 pt-1"
                style={{ borderTop: "1px solid var(--ut-border)" }}
              >
                <label className="ut-label">Comentário para o cotador (opcional)</label>
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
                      onApprove?.(q.id, comment);
                      setOpen(false);
                    }}
                  >
                    <CheckCircle2 size={14} />
                    Aprovar
                  </button>
                  <button
                    type="button"
                    className="ut-btn ut-btn-reject"
                    style={{ flex: 1, justifyContent: "center" }}
                    onClick={() => {
                      onReject?.(q.id, comment);
                      setOpen(false);
                    }}
                  >
                    <XCircle size={14} />
                    Reprovar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
