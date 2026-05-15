import { EMBALAGENS } from "@/lib/antt";

interface Props {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}

export default function EmbalagemSelect({ value, onChange, className = "" }: Props) {
  return (
    <select
      className={`w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900 ${className}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {EMBALAGENS.map((e) => (
        <option key={e} value={e}>
          {e}
        </option>
      ))}
    </select>
  );
}
