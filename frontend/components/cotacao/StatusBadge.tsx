import { statusMeta } from "@/lib/cotacaoStatus";

export default function StatusBadge({ status }: { status: string }) {
  return <span className={`ut-badge ${statusMeta(status).variant}`}>{status}</span>;
}
