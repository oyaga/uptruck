import { ReactNode } from "react";

interface Props {
  label: string;
  hint?: string;
  hintColor?: string;
  children: ReactNode;
}

export default function Field({ label, hint, hintColor, children }: Props) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-gray-500">
        {label}
      </label>
      {children}
      {hint && (
        <p
          className="mt-1 text-[11px]"
          style={{ color: hintColor || "#9ca3af" }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}
