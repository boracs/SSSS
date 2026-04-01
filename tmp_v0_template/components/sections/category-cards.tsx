"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CategoryCard } from "@/types";

// ============================================
// TYPES
// ============================================
interface CategoryCardsProps {
  title?: string;
  categories: CategoryCard[];
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
      staggerChildren: 0.08,
    },
  },
};

const cardVariants = {
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

// Single Category Card
function CategoryCardItem({ category }: { category: CategoryCard }) {
  return (
    <motion.div variants={cardVariants}>
      <Link
        href={category.href}
        className="group relative block aspect-[3/4] w-44 shrink-0 overflow-hidden rounded-xl sm:w-48 lg:w-52"
      >
        {/* Background Image or Placeholder */}
        {category.image ? (
          <img
            src={category.image}
            alt={category.title}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-200 to-slate-300">
            <ImageOff className="h-8 w-8 text-slate-400" />
            <span className="text-xs text-slate-500">Sin imagen</span>
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/30 to-transparent transition-opacity duration-300 group-hover:opacity-90" />

        {/* Content */}
        <div className="absolute inset-x-0 bottom-0 p-4">
          <h3 className="text-sm font-semibold text-white transition-transform duration-300 group-hover:-translate-y-1">
            {category.title}
          </h3>
          {category.description && (
            <p className="mt-1 text-xs text-white/70 opacity-0 transition-all duration-300 group-hover:opacity-100">
              {category.description}
            </p>
          )}
        </div>

        {/* Hover Border Effect */}
        <div className="absolute inset-0 rounded-xl border-2 border-transparent transition-colors duration-300 group-hover:border-accent" />
      </Link>
    </motion.div>
  );
}

// Navigation Buttons
function ScrollButton({
  direction,
  onClick,
  disabled,
}: {
  direction: "left" | "right";
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "absolute top-1/2 z-10 h-10 w-10 -translate-y-1/2 rounded-full border-border/50 bg-background/80 shadow-lg backdrop-blur-sm transition-all hover:bg-background hover:shadow-xl disabled:opacity-0",
        direction === "left" ? "-left-5" : "-right-5"
      )}
    >
      {direction === "left" ? (
        <ChevronLeft className="h-5 w-5" />
      ) : (
        <ChevronRight className="h-5 w-5" />
      )}
      <span className="sr-only">
        {direction === "left" ? "Anterior" : "Siguiente"}
      </span>
    </Button>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================
export function CategoryCards({
  title,
  categories,
  className,
}: CategoryCardsProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 220;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <section className={cn("relative bg-primary py-4", className)}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {title && (
          <h2 className="mb-6 text-center text-xl font-bold text-primary-foreground">
            {title}
          </h2>
        )}

        {/* Scroll Container */}
        <div className="relative">
          {/* Left Button */}
          <ScrollButton direction="left" onClick={() => scroll("left")} />

          {/* Cards */}
          <motion.div
            ref={scrollContainerRef}
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="flex gap-4 overflow-x-auto scroll-smooth pb-4 pt-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {categories.map((category) => (
              <CategoryCardItem key={category.id} category={category} />
            ))}
          </motion.div>

          {/* Right Button */}
          <ScrollButton direction="right" onClick={() => scroll("right")} />
        </div>
      </div>
    </section>
  );
}

// Default categories
export const defaultCategories: CategoryCard[] = [
  {
    id: "1",
    title: "Clases de Surf",
    slug: "clases-surf",
    href: "/clases/surf",
    image: "",
    description: "Aprende con los mejores",
  },
  {
    id: "2",
    title: "Surftrips",
    slug: "surftrips",
    href: "/surftrips",
    image: "",
    description: "Aventuras guiadas",
  },
  {
    id: "3",
    title: "Surfskate",
    slug: "surfskate",
    href: "/clases/surfskate",
    image: "",
    description: "Entrena fuera del agua",
  },
  {
    id: "4",
    title: "Tienda",
    slug: "tienda",
    href: "/tienda",
    image: "",
    description: "Equipo profesional",
  },
  {
    id: "5",
    title: "Taquillas",
    slug: "taquillas",
    href: "/taquillas",
    image: "",
    description: "Guarda tu equipo",
  },
  {
    id: "6",
    title: "Webcam",
    slug: "webcam",
    href: "/webcam",
    image: "",
    description: "Condiciones en vivo",
  },
  {
    id: "7",
    title: "Ofertas",
    slug: "ofertas",
    href: "/ofertas",
    image: "",
    description: "Descuentos especiales",
  },
];
