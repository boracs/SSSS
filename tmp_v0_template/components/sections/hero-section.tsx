"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  Calendar,
  Shield,
  Award,
  Users,
  ImageOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TrustBadge } from "@/types";

// ============================================
// TYPES
// ============================================
interface HeroSectionProps {
  preTitle?: string;
  title: string;
  highlightedText?: string;
  description: string;
  primaryCta: {
    label: string;
    href: string;
    onClick?: () => void;
  };
  secondaryCta?: {
    label: string;
    href: string;
    onClick?: () => void;
  };
  trustBadges?: TrustBadge[];
  heroImage?: string;
  className?: string;
}

// ============================================
// ANIMATION VARIANTS
// ============================================
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

const imageVariants = {
  hidden: { opacity: 0, scale: 0.95, x: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    x: 0,
    transition: { duration: 0.6, ease: "easeOut", delay: 0.2 },
  },
};

// ============================================
// SUBCOMPONENTS
// ============================================

// Trust Badge Component
function TrustBadgeItem({ badge }: { badge: TrustBadge }) {
  const iconMap: Record<string, React.ElementType> = {
    shield: Shield,
    award: Award,
    users: Users,
  };

  const Icon = iconMap[badge.icon] || Shield;

  return (
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h4 className="text-sm font-semibold text-foreground">{badge.title}</h4>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {badge.description}
        </p>
      </div>
    </div>
  );
}

// Hero Image Component with placeholder
function HeroImage({ src, alt }: { src?: string; alt: string }) {
  return (
    <motion.div
      variants={imageVariants}
      className="relative"
    >
      {/* Main Image Container */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 shadow-2xl">
        {src ? (
          <img
            src={src}
            alt={alt}
            className="aspect-[4/3] w-full object-cover"
          />
        ) : (
          <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 text-muted-foreground">
            <ImageOff className="h-12 w-12" />
            <p className="text-sm">Imagen no disponible</p>
            <p className="text-xs">Suba una imagen desde su panel</p>
          </div>
        )}

        {/* Floating Badge - Location */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="absolute bottom-4 left-4 rounded-lg bg-white/90 px-3 py-2 shadow-lg backdrop-blur-sm"
        >
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-medium text-foreground">
              La Concha · Zurriola
            </span>
          </div>
        </motion.div>

        {/* Floating Badge - Conditions */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.4 }}
          className="absolute right-4 top-4 rounded-lg bg-primary/90 px-3 py-2 text-primary-foreground shadow-lg backdrop-blur-sm"
        >
          <p className="text-xs font-medium">Condiciones: Óptimas</p>
        </motion.div>
      </div>

      {/* Decorative elements */}
      <div className="absolute -bottom-4 -right-4 -z-10 h-full w-full rounded-2xl bg-accent/20" />
    </motion.div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================
export function HeroSection({
  preTitle = "S4 · SAN SEBASTIAN SURF SCHOOL",
  title = "Domina el Cantábrico",
  highlightedText = "con S4",
  description,
  primaryCta,
  secondaryCta,
  trustBadges = defaultTrustBadges,
  heroImage,
  className,
}: HeroSectionProps) {
  return (
    <section className={cn("relative overflow-hidden bg-background", className)}>
      {/* Background subtle gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-secondary/30 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Content */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="text-center lg:text-left"
          >
            {/* Pre-title */}
            <motion.p
              variants={itemVariants}
              className="mb-4 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-widest text-accent lg:justify-start"
            >
              <span className="inline-block h-px w-6 bg-accent" />
              {preTitle}
            </motion.p>

            {/* Main Title */}
            <motion.h1
              variants={itemVariants}
              className="mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl"
            >
              {title}
              {highlightedText && (
                <>
                  <br />
                  <span className="text-accent">{highlightedText}</span>
                </>
              )}
            </motion.h1>

            {/* Description */}
            <motion.p
              variants={itemVariants}
              className="mx-auto mb-8 max-w-xl text-base leading-relaxed text-muted-foreground lg:mx-0 lg:text-lg"
            >
              {description}
            </motion.p>

            {/* CTAs */}
            <motion.div
              variants={itemVariants}
              className="mb-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start"
            >
              <Button
                size="lg"
                className="group w-full gap-2 sm:w-auto"
                onClick={primaryCta.onClick}
                asChild={!primaryCta.onClick}
              >
                {primaryCta.onClick ? (
                  <>
                    <Calendar className="h-4 w-4" />
                    {primaryCta.label}
                  </>
                ) : (
                  <a href={primaryCta.href}>
                    <Calendar className="h-4 w-4" />
                    {primaryCta.label}
                  </a>
                )}
              </Button>

              {secondaryCta && (
                <Button
                  variant="outline"
                  size="lg"
                  className="group w-full gap-2 sm:w-auto"
                  onClick={secondaryCta.onClick}
                  asChild={!secondaryCta.onClick}
                >
                  {secondaryCta.onClick ? (
                    <>
                      {secondaryCta.label}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </>
                  ) : (
                    <a href={secondaryCta.href}>
                      {secondaryCta.label}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </a>
                  )}
                </Button>
              )}
            </motion.div>

            {/* Trust Badges */}
            <motion.div
              variants={itemVariants}
              className="grid gap-6 sm:grid-cols-3"
            >
              {trustBadges.map((badge) => (
                <TrustBadgeItem key={badge.id} badge={badge} />
              ))}
            </motion.div>
          </motion.div>

          {/* Hero Image */}
          <motion.div
            initial="hidden"
            animate="visible"
            className="relative"
          >
            <HeroImage
              src={heroImage}
              alt="Surf en San Sebastián - La Concha"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// Default trust badges
const defaultTrustBadges: TrustBadge[] = [
  {
    id: "1",
    icon: "shield",
    title: "Instructores federados",
    description: "Formación oficial y rescate certificado",
  },
  {
    id: "2",
    icon: "award",
    title: "Equipo premium incluido",
    description: "Tablas y neoprenos de últimas marcas",
  },
  {
    id: "3",
    icon: "users",
    title: "+5.000 surfistas formados",
    description: "Formamos surfistas desde hace años",
  },
];
