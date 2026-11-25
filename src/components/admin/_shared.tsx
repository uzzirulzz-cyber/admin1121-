"use client";

import { Badge } from "@/components/ui/badge";
import { STATUS_COLORS } from "@/lib/format";

export function StatusBadge({ status }: { status: string }) {
  const className = STATUS_COLORS[status] ?? STATUS_COLORS.cancelled;
  return (
    <Badge variant="outline" className={`capitalize border ${className}`}>
      {status}
    </Badge>
  );
}
