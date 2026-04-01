"use client";

import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Calendar,
  DollarSign,
  Package,
  Lock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { KPIData } from "@/types";

// ============================================
// TYPES
// ============================================
interface KPICardProps extends KPIData {
  className?: string;
  loading?: boolean;
}

// ============================================
// ICON MAP
// ============================================
const iconMap: Record<string, React.ElementType> = {
  users: Users,
  calendar: Calendar,
  dollar: DollarSign,
  package: Package,
  lock: Lock,
};

// ============================================
// MAIN COMPONENT
// ============================================
export function KPICard({
  label,
  value,
  change,
  changeType = "neutral",
  icon = "users",
  className,
  loading = false,
}: KPICardProps) {
  const Icon = iconMap[icon] || Users;

  const getTrendIcon = () => {
    if (changeType === "positive") return TrendingUp;
    if (changeType === "negative") return TrendingDown;
    return Minus;
  };

  const getTrendColor = () => {
    if (changeType === "positive") return "text-emerald-600 bg-emerald-100";
    if (changeType === "negative") return "text-red-600 bg-red-100";
    return "text-slate-600 bg-slate-100";
  };

  const TrendIcon = getTrendIcon();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        className={cn(
          "relative overflow-hidden border-border/50 transition-all duration-300 hover:border-accent/30 hover:shadow-lg",
          className
        )}
      >
        {/* Background decoration */}
        <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-accent/5" />

        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {label}
          </CardTitle>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <Icon className="h-4 w-4" />
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <div className="h-8 w-24 animate-pulse rounded bg-secondary" />
              <div className="h-4 w-16 animate-pulse rounded bg-secondary" />
            </div>
          ) : (
            <>
              {/* Value */}
              <div className="text-2xl font-bold text-foreground">
                {typeof value === "number"
                  ? value.toLocaleString("es-ES")
                  : value}
              </div>

              {/* Change indicator */}
              {change !== undefined && (
                <div className="mt-2 flex items-center gap-1.5">
                  <span
                    className={cn(
                      "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium",
                      getTrendColor()
                    )}
                  >
                    <TrendIcon className="h-3 w-3" />
                    {Math.abs(change)}%
                  </span>
                  <span className="text-xs text-muted-foreground">
                    vs. mes anterior
                  </span>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ============================================
// KPI GRID COMPONENT
// ============================================
interface KPIGridProps {
  kpis: KPIData[];
  loading?: boolean;
  className?: string;
}

export function KPIGrid({ kpis, loading = false, className }: KPIGridProps) {
  return (
    <div
      className={cn(
        "grid gap-4 sm:grid-cols-2 lg:grid-cols-4",
        className
      )}
    >
      {kpis.map((kpi, index) => (
        <motion.div
          key={kpi.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <KPICard {...kpi} loading={loading} />
        </motion.div>
      ))}
    </div>
  );
}

// ============================================
// DEFAULT KPIs FOR DEMO
// ============================================
export const defaultKPIs: KPIData[] = [
  {
    label: "Clases Reservadas",
    value: 156,
    change: 12,
    changeType: "positive",
    icon: "calendar",
  },
  {
    label: "Alumnos Activos",
    value: 89,
    change: 8,
    changeType: "positive",
    icon: "users",
  },
  {
    label: "Ingresos del Mes",
    value: "12.450 €",
    change: -3,
    changeType: "negative",
    icon: "dollar",
  },
  {
    label: "Taquillas Ocupadas",
    value: "24/30",
    change: 0,
    changeType: "neutral",
    icon: "lock",
  },
];
