import { CheckCircle2, Clock, XCircle } from "lucide-react";

type Status = "Aguardando" | "Aprovada" | "Reprovada";

const map: Record<Status, { cls: string; Icon: typeof Clock }> = {
  Aguardando: { cls: "pending",  Icon: Clock },
  Aprovada:   { cls: "approved", Icon: CheckCircle2 },
  Reprovada:  { cls: "rejected", Icon: XCircle },
};

export default function StatusBadge({ status }: { status: string }) {
  const m = map[(status as Status) in map ? (status as Status) : "Aguardando"];
  const Icon = m.Icon;
  return (
    <span className={`ut-badge ${m.cls}`}>
      <Icon size={11} />
      {status}
    </span>
  );
}
