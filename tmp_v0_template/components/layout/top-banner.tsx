"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ============================================
// TYPES
// ============================================
interface TopBannerProps {
  preTitle?: string;
  title: string;
  highlightedText?: string;
  subtitle?: string;
  dismissible?: boolean;
  className?: string;
}

// ============================================
// MAIN COMPONENT
// ============================================
export function TopBanner({
  preTitle = "S4 · SAN SEBASTIAN SURF SCHOOL",
  title = "Domina el Cantabrico con",
  highlightedText = "S4",
  subtitle = "Escuela de surf premium en San Sebastián. Seguridad, técnica y experiencia local en La Concha y Zurriola.",
  dismissible = true,
  className,
}: TopBannerProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn(
        "relative gradient-hero px-4 py-4 text-primary-foreground sm:px-6 lg:px-8",
        className
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <div className="flex-1">
          {/* Pre-title */}
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-primary-foreground/70">
            {preTitle}
          </p>

          {/* Main Title */}
          <h2 className="text-lg font-bold sm:text-xl">
            {title}{" "}
            <span className="text-accent">{highlightedText}</span>
          </h2>

          {/* Subtitle */}
          <p className="mt-1 max-w-2xl text-xs text-primary-foreground/80 sm:text-sm">
            {subtitle}
          </p>
        </div>

        {/* Dismiss Button */}
        {dismissible && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsVisible(false)}
            className="shrink-0 text-primary-foreground/70 hover:bg-white/10 hover:text-primary-foreground"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Cerrar banner</span>
          </Button>
        )}
      </div>
    </motion.div>
  );
}
