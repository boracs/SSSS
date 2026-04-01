"use client";

import { motion } from "framer-motion";
import { Shield, Award, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Feature } from "@/types";

// ============================================
// TYPES
// ============================================
interface FeaturesSectionProps {
  title?: string;
  subtitle?: string;
  features?: Feature[];
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
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

// ============================================
// SUBCOMPONENTS
// ============================================

// Feature Card
function FeatureCard({ feature }: { feature: Feature }) {
  const iconMap: Record<string, React.ElementType> = {
    shield: Shield,
    award: Award,
    sparkles: Sparkles,
  };

  const Icon = iconMap[feature.icon] || Sparkles;

  return (
    <motion.div
      variants={itemVariants}
      className="group relative rounded-2xl border border-border/50 bg-card p-8 transition-all duration-300 hover:border-accent/30 hover:shadow-lg"
    >
      {/* Icon Container */}
      <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent transition-transform duration-300 group-hover:scale-110">
        <Icon className="h-6 w-6" />
      </div>

      {/* Content */}
      <h3 className="mb-3 text-lg font-semibold text-card-foreground">
        {feature.title}
      </h3>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {feature.description}
      </p>

      {/* Subtle hover accent line */}
      <div className="absolute bottom-0 left-8 right-8 h-0.5 scale-x-0 bg-gradient-to-r from-transparent via-accent to-transparent transition-transform duration-300 group-hover:scale-x-100" />
    </motion.div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================
export function FeaturesSection({
  title = "¿Por qué elegir S4?",
  subtitle,
  features = defaultFeatures,
  className,
}: FeaturesSectionProps) {
  return (
    <section className={cn("bg-background py-20 lg:py-28", className)}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-14 text-center"
        >
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {title}
          </h2>
          {subtitle && (
            <p className="mx-auto max-w-2xl text-base text-muted-foreground">
              {subtitle}
            </p>
          )}
        </motion.div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((feature) => (
            <FeatureCard key={feature.id} feature={feature} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// Default features
const defaultFeatures: Feature[] = [
  {
    id: "1",
    icon: "shield",
    title: "Seguridad Primero",
    description:
      "Todas nuestras clases siguen protocolos de seguridad rigurosos. Instructores certificados en primeros auxilios y rescate acuático.",
  },
  {
    id: "2",
    icon: "award",
    title: "Instructores Certificados",
    description:
      "Nuestros instructores tienen años de experiencia y certificaciones internacionales. Formación continua y pasión por el surf.",
  },
  {
    id: "3",
    icon: "sparkles",
    title: "Equipo de Calidad",
    description:
      "Utilizamos tablas y trajes de neopreno de marcas líderes en el mercado. Equipamiento renovado cada temporada.",
  },
];
