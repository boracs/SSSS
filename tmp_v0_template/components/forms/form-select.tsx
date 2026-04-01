"use client";

import { forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, CheckCircle2, ChevronDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// ============================================
// TYPES (Inertia.js useForm compatible)
// ============================================
interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface FormSelectProps {
  label: string;
  name: string;
  value?: string;
  onChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
  success?: boolean;
  hint?: string;
  required?: boolean;
  processing?: boolean;
  disabled?: boolean;
  className?: string;
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
    transition: { duration: 0.2, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    y: -8,
    height: 0,
    transition: { duration: 0.15 },
  },
};

// ============================================
// MAIN COMPONENT
// ============================================
export const FormSelect = forwardRef<HTMLButtonElement, FormSelectProps>(
  (
    {
      label,
      name,
      value,
      onChange,
      options,
      placeholder = "Seleccionar...",
      error,
      success,
      hint,
      required,
      processing,
      disabled,
      className,
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

        {/* Select */}
        <Select
          value={value}
          onValueChange={onChange}
          disabled={isDisabled}
          name={name}
        >
          <SelectTrigger
            ref={ref}
            id={name}
            className={cn(
              "w-full transition-all duration-200",
              hasError &&
                "border-destructive/50 focus:border-destructive focus:ring-destructive/20",
              hasSuccess &&
                "border-emerald-500/50 focus:border-emerald-500 focus:ring-emerald-500/20",
              isDisabled && "cursor-not-allowed opacity-60",
              className
            )}
            aria-invalid={hasError}
            aria-describedby={
              hasError ? `${name}-error` : hint ? `${name}-hint` : undefined
            }
          >
            <SelectValue placeholder={placeholder} />
            {/* Status Icons */}
            <div className="ml-auto flex items-center gap-2">
              {hasError && <AlertCircle className="h-4 w-4 text-destructive" />}
              {hasSuccess && (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              )}
            </div>
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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
          <p id={`${name}-hint`} className="text-xs text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

FormSelect.displayName = "FormSelect";
