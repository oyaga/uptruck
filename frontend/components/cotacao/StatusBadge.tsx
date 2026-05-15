import { CheckCircle2, Clock, XCircle } from "lucide-react";

type Status = "Aguardando" | "Aprovada" | "Reprovada";

const map: Record<
  Status,
  { bg: string; color: string; Icon: typeof Clock }
> = {
  Aguardando: { bg: "#fef3c7", color: "#92400e", Icon: Clock },
  Aprovada:   { bg: "#d1fae5", color: "#065f46", Icon: CheckCircle2 },
  Reprovada:  { bg: "#fee2e2", color: "#991b1b", Icon: XCircle },
};

export default function StatusBadge({ status }: { status: string }) {
  const m = map[(status as Status) in map ? (status as Status) : "Aguardando"];
  const Icon = m.Icon;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ background: m.bg, color: m.color }}
    >
      <Icon size={12} />
      {status}
    </span>
  );
}
