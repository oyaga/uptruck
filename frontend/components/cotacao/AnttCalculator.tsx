"use client";

import { Calculator, ShieldCheck } from "lucide-react";
import { CAT, fmt, calcMin, usedFloor, VEI } from "@/lib/antt";
import Field from "./Field";

interface Props {
  veiculo: string;
  setVeiculo: (v: string) => void;
  categoria: string;
  setCategoria: (v: string) => void;
  distancia: string;
  setDistancia: (v: string) => void;
}

const inputCls =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900";

export default function AnttCalculator({
  veiculo,
  setVeiculo,
  categoria,
  setCategoria,
  distancia,
  setDistancia,
}: Props) {
  const min = calcMin(veiculo, distancia, categoria);
  const v = VEI[veiculo as keyof typeof VEI];
  const fator = CAT[categoria as keyof typeof CAT];
  const floorApplied = usedFloor(veiculo, distancia);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-3.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-gray-400">
          <Calculator size={12} />
          Cálculo ANTT
        </div>
        <div className="flex flex-col gap-3">
          <Field label="Tipo de Veículo">
            <select
              className={inputCls}
              value={veiculo}
              onChange={(e) => setVeiculo(e.target.value)}
            >
              {Object.entries(VEI).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.l}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Categoria de Carga">
            <select
              className={inputCls}
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
            >
              {Object.keys(CAT).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Distância Rodoviária (km)"
            hint="Use Google Maps ou OSRM para distância real"
          >
            <input
              className={inputCls}
              type="number"
              min="0"
              value={distancia}
              onChange={(e) => setDistancia(e.target.value)}
              placeholder="0"
            />
          </Field>
        </div>
      </div>

      {min > 0 ? (
        <div className="rounded-xl border border-green-200 bg-green-50 p-5">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-green-700">
            <ShieldCheck size={12} />
            Piso Mínimo ANTT
          </div>
          <div className="mb-2 text-3xl font-extrabold tracking-tight text-green-800">
            {fmt(min)}
          </div>
          <div className="flex flex-col gap-0.5 text-xs text-green-600">
            <div>
              R$ {v?.r.toFixed(4)}/km × {distancia} km
            </div>
            <div>
              Fator {categoria}: ×{fator?.toFixed(2)}
            </div>
            {floorApplied && (
              <div className="mt-0.5 font-semibold text-yellow-700">
                Aplicado mínimo de viagem ({fmt(v?.m)})
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5 text-center text-sm text-gray-400">
          Preencha veículo, categoria e distância para calcular o piso ANTT
        </div>
      )}
    </div>
  );
}
