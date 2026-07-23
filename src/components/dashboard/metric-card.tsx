import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

interface MetricCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: { value: string; positive?: boolean };
  accent?: boolean;
  className?: string;
}

export function MetricCard({ label, value, icon: Icon, trend, accent, className }: MetricCardProps) {
  return (
    <Card className={cn("p-5", className)}>
      <div className="flex items-start justify-between">
        <p className="font-mono-label text-muted-foreground">{label}</p>
        {Icon && <Icon className={cn("h-4 w-4", accent ? "text-primary" : "text-muted-foreground")} />}
      </div>
      <p className={cn("mt-2 text-3xl font-semibold tracking-tight", accent ? "text-primary" : "text-foreground")}>
        {value}
      </p>
      {trend && (
        <p className={cn("mt-1 text-xs", trend.positive ? "text-primary" : "text-muted-foreground")}>
          {trend.value}
        </p>
      )}
    </Card>
  );
}

export function EmptyState({ title, description, icon: Icon }: { title: string; description?: string; icon?: LucideIcon }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-10 text-center">
      {Icon && <Icon className="h-8 w-8 text-muted-foreground" />}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && <p className="max-w-sm text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}
