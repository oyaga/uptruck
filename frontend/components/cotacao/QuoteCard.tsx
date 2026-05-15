"use client";

import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Truck,
  XCircle,
} from "lucide-react";
import type { CotacaoApi } from "@/lib/api";
import { fmt, UNITIZACOES, VEI } from "@/lib/antt";
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

export default function QuoteCard({ q, isAdmin, onApprove, onReject }: Props) {
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState("");

  const sug = Number(q.valor_sugerido) || 0;
  const min = Number(q.antt_min) || 0;
  const margin =
    sug > 0 && min > 0 ? (((sug - min) / min) * 100).toFixed(1) : null;
  const unitLabel =
    UNITIZACOES.find((u) => u.value === q.unitizacao)?.label ||
    q.unitizacao ||
    "—";

  return (
    <div className="mb-2 overflow-hidden rounded-xl border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100">
          <Truck size={16} className="text-gray-500" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-gray-900">
              {q.uf_ori}/{q.cidade_ori}
            </span>
            <ArrowRight size={13} className="text-gray-400" />
            <span className="text-sm font-semibold text-gray-900">
              {q.uf_des}/{q.cidade_des}
            </span>
            <StatusBadge status={q.status} />
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-gray-500">
            <span>{q.produto || "—"}</span>
            <span>
              {q.embalagem || "—"} · {unitLabel}
            </span>
            <span>Piso ANTT: {fmt(min)}</span>
            <span className="font-semibold text-gray-700">
              Cotado: {fmt(sug)}
            </span>
            {margin && (
              <span className="text-emerald-500">+{margin}% acima</span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-[11px] text-gray-400">
          <span>{fmtDate(q.created_at)}</span>
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      {open && (
        <div className="flex flex-col gap-3.5 border-t border-gray-100 bg-gray-50 px-4 py-3.5">
          <section>
            <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Rota
            </div>
            <div className="grid grid-cols-1 gap-y-1.5 text-xs sm:grid-cols-2 sm:gap-x-5">
              {[
                [
                  "Origem",
                  `${q.cep_ori ? q.cep_ori + " · " : ""}${q.uf_ori}/${q.cidade_ori}${q.bairro_ori ? " — " + q.bairro_ori : ""}`,
                ],
                [
                  "Destino",
                  `${q.cep_des ? q.cep_des + " · " : ""}${q.uf_des}/${q.cidade_des}${q.bairro_des ? " — " + q.bairro_des : ""}`,
                ],
                ["Distância", `${q.distancia_km} km`],
                ["Veículo", VEI[q.veiculo as keyof typeof VEI]?.l || q.veiculo],
              ].map(([l, v]) => (
                <div key={l}>
                  <span className="text-gray-400">{l}: </span>
                  <span className="font-semibold text-gray-700">{v}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Carga
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-4">
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
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    {l}
                  </div>
                  <div className="font-semibold text-gray-700">{v}</div>
                </div>
              ))}
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-5 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-xs">
            <div>
              <span className="text-gray-500">Piso ANTT: </span>
              <span className="font-bold text-green-800">{fmt(min)}</span>
            </div>
            <div>
              <span className="text-gray-500">Cotado: </span>
              <span className="font-bold text-green-800">{fmt(sug)}</span>
            </div>
            {margin && (
              <div className="font-bold text-green-700">
                +{margin}% acima do piso mínimo
              </div>
            )}
          </div>

          {q.admin_comment && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2.5 text-[13px] text-yellow-800">
              <strong>Admin:</strong> {q.admin_comment}
            </div>
          )}

          {isAdmin && q.status === "Aguardando" && (
            <div className="flex flex-col gap-2 border-t border-gray-200 pt-3">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Comentário para o cotador (opcional)"
                className="min-h-[56px] w-full resize-y rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onApprove?.(q.id, comment);
                    setOpen(false);
                  }}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-200"
                >
                  <CheckCircle2 size={15} /> Aprovar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onReject?.(q.id, comment);
                    setOpen(false);
                  }}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-100 px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-200"
                >
                  <XCircle size={15} /> Reprovar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
