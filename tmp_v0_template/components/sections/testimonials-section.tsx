"use client";

import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Testimonial } from "@/types";

// ============================================
// TYPES
// ============================================
interface TestimonialsSectionProps {
  title?: string;
  subtitle?: string;
  highlightedNumber?: string;
  testimonials?: Testimonial[];
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
      staggerChildren: 0.12,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

// ============================================
// SUBCOMPONENTS
// ============================================

// Star Rating
function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "h-3.5 w-3.5",
            i < rating
              ? "fill-amber-400 text-amber-400"
              : "fill-slate-200 text-slate-200"
          )}
        />
      ))}
    </div>
  );
}

// Single Testimonial Card
function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <motion.div
      variants={itemVariants}
      className="group relative rounded-2xl border border-border/50 bg-card p-6 transition-all duration-300 hover:border-accent/30 hover:shadow-lg"
    >
      {/* Quote Icon */}
      <Quote className="absolute right-6 top-6 h-8 w-8 text-accent/10 transition-colors group-hover:text-accent/20" />

      {/* Rating */}
      <StarRating rating={testimonial.rating} />

      {/* Content */}
      <blockquote className="mt-4 text-sm leading-relaxed text-muted-foreground">
        &ldquo;{testimonial.content}&rdquo;
      </blockquote>

      {/* Author */}
      <div className="mt-5 flex items-center gap-3 border-t border-border/50 pt-5">
        {testimonial.avatar ? (
          <img
            src={testimonial.avatar}
            alt={testimonial.author}
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent">
            <span className="text-sm font-semibold">
              {testimonial.author.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div>
          <p className="text-sm font-medium text-card-foreground">
            {testimonial.author}
          </p>
          {testimonial.role && (
            <p className="text-xs text-muted-foreground">{testimonial.role}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Stats Badge
function StatsBadge({ number, label }: { number: string; label: string }) {
  return (
    <div className="flex items-baseline gap-1 text-center">
      <span className="text-2xl font-bold text-accent">{number}</span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================
export function TestimonialsSection({
  title = "Lo que dicen nuestros surfistas",
  subtitle,
  highlightedNumber = "5.000",
  testimonials = defaultTestimonials,
  className,
}: TestimonialsSectionProps) {
  return (
    <section className={cn("bg-secondary/30 py-20 lg:py-28", className)}>
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
          <p className="mx-auto max-w-2xl text-base text-muted-foreground">
            {subtitle || (
              <>
                Más de{" "}
                <span className="font-semibold text-accent">
                  {highlightedNumber} alumnos
                </span>{" "}
                han confiado en San Sebastian Surf School para dar su primer
                take-off en el Cantábrico.
              </>
            )}
          </p>
        </motion.div>

        {/* Testimonials Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {testimonials.map((testimonial) => (
            <TestimonialCard key={testimonial.id} testimonial={testimonial} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// Default testimonials
const defaultTestimonials: Testimonial[] = [
  {
    id: "1",
    author: "Mikel Imatzeder",
    role: "Surfista principiante",
    content:
      "Sentí que conocía cada ola de Zurriola. Fue una experiencia genial y salí con confianza y muchas ganas de volver.",
    rating: 5,
    date: "2024-01-15",
  },
  {
    id: "2",
    author: "Pedro de los Alamos",
    role: "Nivel intermedio",
    content:
      "La combinación de seguridad, técnica y material hizo que me haya disfrutado sin riesgos. Se nota que son escuela oficial.",
    rating: 5,
    date: "2024-02-20",
  },
  {
    id: "3",
    author: "Lucia Fernandez",
    role: "Clase intensiva",
    content:
      "Venía con experiencia en otras playas y me sorprendió su conocimiento local del Cantábrico. Clases muy personalizadas.",
    rating: 5,
    date: "2024-03-10",
  },
];
