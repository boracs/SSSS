"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, CheckCircle, Info, XCircle, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ============================================
// TYPES
// ============================================
type ModalVariant = "info" | "warning" | "success" | "danger";

interface ConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  details?: React.ReactNode;
  variant?: ModalVariant;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  processing?: boolean;
  destructive?: boolean;
}

// ============================================
// VARIANT CONFIG
// ============================================
const variantConfig: Record<
  ModalVariant,
  {
    icon: React.ElementType;
    iconClassName: string;
    bgClassName: string;
  }
> = {
  info: {
    icon: Info,
    iconClassName: "text-sky-600",
    bgClassName: "bg-sky-100",
  },
  warning: {
    icon: AlertTriangle,
    iconClassName: "text-amber-600",
    bgClassName: "bg-amber-100",
  },
  success: {
    icon: CheckCircle,
    iconClassName: "text-emerald-600",
    bgClassName: "bg-emerald-100",
  },
  danger: {
    icon: XCircle,
    iconClassName: "text-red-600",
    bgClassName: "bg-red-100",
  },
};

// ============================================
// MAIN COMPONENT
// ============================================
export function ConfirmationModal({
  open,
  onOpenChange,
  title,
  description,
  details,
  variant = "warning",
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel,
  processing = false,
  destructive = false,
}: ConfirmationModalProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  const handleConfirm = async () => {
    await onConfirm();
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-4">
            {/* Icon */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
                config.bgClassName
              )}
            >
              <Icon className={cn("h-6 w-6", config.iconClassName)} />
            </motion.div>

            {/* Title & Description */}
            <div className="flex-1">
              <DialogTitle className="text-lg font-semibold text-foreground">
                {title}
              </DialogTitle>
              <DialogDescription className="mt-1.5 text-sm text-muted-foreground">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Additional Details */}
        {details && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-4 rounded-lg border border-border/50 bg-secondary/30 p-4"
          >
            {details}
          </motion.div>
        )}

        {/* Footer Actions */}
        <DialogFooter className="mt-6 flex gap-3 sm:gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={processing}
            className="flex-1 sm:flex-none"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={destructive ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={processing}
            className="flex-1 sm:flex-none"
          >
            {processing ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Procesando...
              </span>
            ) : (
              confirmLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// SPECIALIZED MODALS
// ============================================

// Payment Confirmation Modal
interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  amount: number;
  customerName: string;
  onConfirm: () => void | Promise<void>;
  processing?: boolean;
}

export function PaymentConfirmationModal({
  open,
  onOpenChange,
  bookingId,
  amount,
  customerName,
  onConfirm,
  processing,
}: PaymentModalProps) {
  const formatPrice = (price: number) =>
    new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(price);

  return (
    <ConfirmationModal
      open={open}
      onOpenChange={onOpenChange}
      title="Confirmar Pago"
      description="¿Confirmas que has recibido el pago de esta reserva?"
      variant="success"
      confirmLabel="Confirmar Pago"
      onConfirm={onConfirm}
      processing={processing}
      details={
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Reserva:</span>
            <span className="font-medium">#{bookingId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cliente:</span>
            <span className="font-medium">{customerName}</span>
          </div>
          <div className="flex justify-between border-t border-border/50 pt-2">
            <span className="text-muted-foreground">Total:</span>
            <span className="text-lg font-bold text-accent">
              {formatPrice(amount)}
            </span>
          </div>
        </div>
      }
    />
  );
}

// Locker Assignment Modal
interface LockerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lockerNumber: string;
  customerName: string;
  duration: string;
  accessCode: string;
  onConfirm: () => void | Promise<void>;
  processing?: boolean;
}

export function LockerAssignmentModal({
  open,
  onOpenChange,
  lockerNumber,
  customerName,
  duration,
  accessCode,
  onConfirm,
  processing,
}: LockerModalProps) {
  return (
    <ConfirmationModal
      open={open}
      onOpenChange={onOpenChange}
      title="Asignar Taquilla"
      description="¿Confirmas la asignación de esta taquilla?"
      variant="info"
      confirmLabel="Asignar Taquilla"
      onConfirm={onConfirm}
      processing={processing}
      details={
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Taquilla:</span>
            <span className="font-bold text-lg">#{lockerNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cliente:</span>
            <span className="font-medium">{customerName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Duración:</span>
            <span className="font-medium">{duration}</span>
          </div>
          <div className="flex justify-between border-t border-border/50 pt-2">
            <span className="text-muted-foreground">Código de acceso:</span>
            <code className="rounded bg-primary/10 px-2 py-1 font-mono text-lg font-bold text-accent">
              {accessCode}
            </code>
          </div>
        </div>
      }
    />
  );
}

// Delete Confirmation Modal
interface DeleteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  itemType?: string;
  onConfirm: () => void | Promise<void>;
  processing?: boolean;
}

export function DeleteConfirmationModal({
  open,
  onOpenChange,
  itemName,
  itemType = "elemento",
  onConfirm,
  processing,
}: DeleteModalProps) {
  return (
    <ConfirmationModal
      open={open}
      onOpenChange={onOpenChange}
      title={`Eliminar ${itemType}`}
      description={`¿Estás seguro de que deseas eliminar "${itemName}"? Esta acción no se puede deshacer.`}
      variant="danger"
      confirmLabel="Eliminar"
      onConfirm={onConfirm}
      processing={processing}
      destructive
    />
  );
}
