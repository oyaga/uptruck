import { UNITIZACOES } from "@/lib/antt";

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export default function UnitizacaoSelect({ value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      {UNITIZACOES.map((u) => {
        const active = value === u.value;
        return (
          <label
            key={u.value}
            className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-2.5 py-2 transition ${
              active
                ? "border-gray-900 bg-gray-50"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <input
              type="radio"
              name="unitizacao"
              value={u.value}
              checked={active}
              onChange={() => onChange(u.value)}
              className="mt-1 shrink-0"
            />
            <div>
              <div className="text-[13px] font-semibold text-gray-900">
                {u.label}
              </div>
              <div className="text-[11px] text-gray-400">{u.desc}</div>
            </div>
          </label>
        );
      })}
    </div>
  );
}
