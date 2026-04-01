"use client";

import { forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// ============================================
// TYPES (Inertia.js useForm compatible)
// ============================================
interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
  error?: string;
  success?: boolean;
  hint?: string;
  required?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  processing?: boolean;
}

// ============================================
// ANIMATION VARIANTS
// ============================================
const errorVariants = {
  hidden: { opacity: 0, y: -8, height: 0 },
  visible: { 
    opacity: 1, 
    y: 0, 
    height: "auto",
    transition: { duration: 0.2, ease: "easeOut" }
  },
  exit: { 
    opacity: 0, 
    y: -8, 
    height: 0,
    transition: { duration: 0.15 }
  },
};

// ============================================
// MAIN COMPONENT
// ============================================
export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  (
    {
      label,
      name,
      error,
      success,
      hint,
      required,
      leftIcon,
      rightIcon,
      processing,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const hasError = Boolean(error);
    const hasSuccess = success && !hasError;
    const isDisabled = disabled || processing;

    return (
      <div className="space-y-2">
        {/* Label */}
        <Label
          htmlFor={name}
          className={cn(
            "text-sm font-medium",
            hasError && "text-destructive",
            hasSuccess && "text-emerald-600"
          )}
        >
          {label}
          {required && <span className="ml-1 text-destructive">*</span>}
        </Label>

        {/* Input Container */}
        <div className="relative">
          {/* Left Icon */}
          {leftIcon && (
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {leftIcon}
            </div>
          )}

          {/* Input */}
          <Input
            ref={ref}
            id={name}
            name={name}
            disabled={isDisabled}
            className={cn(
              "transition-all duration-200",
              leftIcon && "pl-10",
              (rightIcon || hasError || hasSuccess) && "pr-10",
              hasError &&
                "border-destructive/50 focus-visible:border-destructive focus-visible:ring-destructive/20",
              hasSuccess &&
                "border-emerald-500/50 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20",
              isDisabled && "cursor-not-allowed opacity-60",
              className
            )}
            aria-invalid={hasError}
            aria-describedby={hasError ? `${name}-error` : hint ? `${name}-hint` : undefined}
            {...props}
          />

          {/* Right Icon / Status Icon */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {hasError ? (
              <AlertCircle className="h-4 w-4 text-destructive" />
            ) : hasSuccess ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : (
              rightIcon && (
                <span className="text-muted-foreground">{rightIcon}</span>
              )
            )}
          </div>
        </div>

        {/* Error Message */}
        <AnimatePresence mode="wait">
          {hasError && (
            <motion.p
              key="error"
              id={`${name}-error`}
              variants={errorVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex items-center gap-1.5 text-xs text-destructive"
              role="alert"
            >
              <AlertCircle className="h-3 w-3" />
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Hint Text */}
        {hint && !hasError && (
          <p
            id={`${name}-hint`}
            className="text-xs text-muted-foreground"
          >
            {hint}
          </p>
        )}
      </div>
    );
  }
);

FormInput.displayName = "FormInput";

// ============================================
// USAGE EXAMPLE WITH INERTIA.JS
// ============================================
/*
import { useForm } from '@inertiajs/react';

function MyForm() {
  const { data, setData, post, processing, errors, recentlySuccessful } = useForm({
    email: '',
    name: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    post('/submit');
  };

  return (
    <form onSubmit={handleSubmit}>
      <FormInput
        label="Email"
        name="email"
        type="email"
        value={data.email}
        onChange={(e) => setData('email', e.target.value)}
        error={errors.email}
        success={recentlySuccessful}
        processing={processing}
        required
      />
      <FormInput
        label="Nombre"
        name="name"
        value={data.name}
        onChange={(e) => setData('name', e.target.value)}
        error={errors.name}
        processing={processing}
        required
      />
    </form>
  );
}
*/
