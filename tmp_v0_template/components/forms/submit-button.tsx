"use client";

import { forwardRef } from "react";
import { motion } from "framer-motion";
import { Loader2, Check } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ============================================
// TYPES (Inertia.js useForm compatible)
// ============================================
interface SubmitButtonProps extends Omit<ButtonProps, "asChild"> {
  processing?: boolean;
  recentlySuccessful?: boolean;
  loadingText?: string;
  successText?: string;
  icon?: React.ReactNode;
}

// ============================================
// MAIN COMPONENT
// ============================================
export const SubmitButton = forwardRef<HTMLButtonElement, SubmitButtonProps>(
  (
    {
      children,
      processing = false,
      recentlySuccessful = false,
      loadingText = "Procesando...",
      successText = "¡Completado!",
      icon,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || processing;

    return (
      <Button
        ref={ref}
        type="submit"
        disabled={isDisabled}
        className={cn(
          "relative min-w-[140px] transition-all duration-200",
          processing && "cursor-wait",
          recentlySuccessful && "bg-emerald-600 hover:bg-emerald-700",
          className
        )}
        {...props}
      >
        {/* Button Content */}
        <span
          className={cn(
            "flex items-center justify-center gap-2 transition-opacity duration-200",
            (processing || recentlySuccessful) && "opacity-0"
          )}
        >
          {icon}
          {children}
        </span>

        {/* Loading State */}
        {processing && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center gap-2"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{loadingText}</span>
          </motion.span>
        )}

        {/* Success State */}
        {recentlySuccessful && !processing && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 flex items-center justify-center gap-2"
          >
            <Check className="h-4 w-4" />
            <span>{successText}</span>
          </motion.span>
        )}
      </Button>
    );
  }
);

SubmitButton.displayName = "SubmitButton";

// ============================================
// USAGE EXAMPLE WITH INERTIA.JS
// ============================================
/*
import { useForm } from '@inertiajs/react';

function MyForm() {
  const { post, processing, recentlySuccessful } = useForm({ ... });

  return (
    <form onSubmit={(e) => { e.preventDefault(); post('/submit'); }}>
      <SubmitButton
        processing={processing}
        recentlySuccessful={recentlySuccessful}
        loadingText="Guardando..."
        successText="¡Guardado!"
      >
        Guardar cambios
      </SubmitButton>
    </form>
  );
}
*/
