import { Badge } from "@/components/ui/badge";
import type { ContractLifecycleStatus } from "@/types";

interface ContractStatusBadgeProps {
  status: ContractLifecycleStatus;
}

const STATUS_CONFIG: Record<
  ContractLifecycleStatus,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  draft:         { label: "Draft",           variant: "outline" },
  sent:          { label: "Sent",            variant: "secondary" },
  seller_signed: { label: "Seller Signed",   variant: "secondary" },
  countersigned: { label: "Countersigned",   variant: "default" },
  executed:      { label: "Executed",        variant: "default" },
  expired:       { label: "Expired",         variant: "destructive" },
  voided:        { label: "Voided",          variant: "destructive" },
  amended:       { label: "Amended",         variant: "outline" },
};

export function ContractStatusBadge({ status }: ContractStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, variant: "outline" as const };
  return (
    <Badge
      variant={config.variant}
      className={
        status === "executed"
          ? "border-green-500 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30"
          : undefined
      }
    >
      {config.label}
    </Badge>
  );
}
