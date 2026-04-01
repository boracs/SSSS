"use client";

import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        pending: "bg-amber-100 text-amber-800 border border-amber-200",
        confirmed: "bg-emerald-100 text-emerald-800 border border-emerald-200",
        alert: "bg-red-100 text-red-800 border border-red-200",
        info: "bg-sky-100 text-sky-800 border border-sky-200",
        neutral: "bg-slate-100 text-slate-700 border border-slate-200",
        success: "bg-emerald-100 text-emerald-800 border border-emerald-200",
        warning: "bg-amber-100 text-amber-800 border border-amber-200",
        error: "bg-red-100 text-red-800 border border-red-200",
        available: "bg-emerald-100 text-emerald-800 border border-emerald-200",
        occupied: "bg-slate-100 text-slate-700 border border-slate-200",
        maintenance: "bg-orange-100 text-orange-800 border border-orange-200",
        paid: "bg-emerald-100 text-emerald-800 border border-emerald-200",
        refunded: "bg-purple-100 text-purple-800 border border-purple-200",
        failed: "bg-red-100 text-red-800 border border-red-200",
      },
      size: {
        sm: "text-[10px] px-2 py-0.5",
        default: "text-xs px-2.5 py-0.5",
        lg: "text-sm px-3 py-1",
      },
    },
    defaultVariants: {
      variant: "neutral",
      size: "default",
    },
  }
);

const statusDotVariants = cva("h-1.5 w-1.5 rounded-full", {
  variants: {
    variant: {
      pending: "bg-amber-500",
      confirmed: "bg-emerald-500",
      alert: "bg-red-500",
      info: "bg-sky-500",
      neutral: "bg-slate-500",
      success: "bg-emerald-500",
      warning: "bg-amber-500",
      error: "bg-red-500",
      available: "bg-emerald-500",
      occupied: "bg-slate-500",
      maintenance: "bg-orange-500",
      paid: "bg-emerald-500",
      refunded: "bg-purple-500",
      failed: "bg-red-500",
    },
  },
  defaultVariants: {
    variant: "neutral",
  },
});

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  showDot?: boolean;
  pulse?: boolean;
}

export function StatusBadge({
  className,
  variant,
  size,
  showDot = true,
  pulse = false,
  children,
  ...props
}: StatusBadgeProps) {
  return (
    <span
      className={cn(statusBadgeVariants({ variant, size }), className)}
      {...props}
    >
      {showDot && (
        <span className="relative flex h-1.5 w-1.5">
          {pulse && (
            <span
              className={cn(
                "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
                statusDotVariants({ variant })
              )}
            />
          )}
          <span className={cn(statusDotVariants({ variant }))} />
        </span>
      )}
      {children}
    </span>
  );
}

// Helper to map status strings to variants
export function getStatusVariant(
  status: string
): VariantProps<typeof statusBadgeVariants>["variant"] {
  const statusMap: Record<string, VariantProps<typeof statusBadgeVariants>["variant"]> = {
    pending: "pending",
    confirmed: "confirmed",
    in_progress: "info",
    completed: "success",
    cancelled: "alert",
    available: "available",
    occupied: "occupied",
    maintenance: "maintenance",
    paid: "paid",
    refunded: "refunded",
    failed: "failed",
    full: "warning",
  };
  return statusMap[status] || "neutral";
}

// Spanish translation helper
export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: "Pendiente",
    confirmed: "Confirmado",
    in_progress: "En curso",
    completed: "Completado",
    cancelled: "Cancelado",
    available: "Disponible",
    occupied: "Ocupado",
    maintenance: "Mantenimiento",
    paid: "Pagado",
    refunded: "Reembolsado",
    failed: "Fallido",
    full: "Completo",
  };
  return labels[status] || status;
}
