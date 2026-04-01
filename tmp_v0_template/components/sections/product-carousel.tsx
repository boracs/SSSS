"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  ImageOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Product, FormState } from "@/types";

// ============================================
// TYPES
// ============================================
interface ProductCarouselProps {
  title?: string;
  products: Product[];
  onAddToCart?: (productId: string) => void;
  formState?: FormState;
  className?: string;
}

// ============================================
// UTILS
// ============================================
function formatPrice(price: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(price);
}

function calculateDiscount(original: number, current: number): number {
  return Math.round(((original - current) / original) * 100);
}

// ============================================
// ANIMATION VARIANTS
// ============================================
const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

// ============================================
// SUBCOMPONENTS
// ============================================

// Product Card
function ProductCard({
  product,
  onAddToCart,
  isProcessing,
}: {
  product: Product;
  onAddToCart?: (productId: string) => void;
  isProcessing?: boolean;
}) {
  const hasDiscount = product.originalPrice && product.originalPrice > product.price;
  const discountPercent = hasDiscount
    ? calculateDiscount(product.originalPrice!, product.price)
    : null;

  return (
    <motion.div
      variants={cardVariants}
      className="group relative w-44 shrink-0 overflow-hidden rounded-xl border border-border/50 bg-card transition-all duration-300 hover:border-accent/30 hover:shadow-lg sm:w-48"
    >
      {/* Discount Badge */}
      {discountPercent && discountPercent > 0 && (
        <Badge className="absolute left-2 top-2 z-10 bg-accent text-accent-foreground">
          MEJORES OFERTAS
        </Badge>
      )}

      {/* Product Image */}
      <Link href={`/tienda/${product.slug}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-secondary/50">
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
              <ImageOff className="h-8 w-8" />
              <span className="text-xs">Imagen no disponible</span>
            </div>
          )}
        </div>
      </Link>

      {/* Product Info */}
      <div className="p-3">
        {/* Name */}
        <Link href={`/tienda/${product.slug}`}>
          <h3 className="mb-2 truncate text-sm font-medium text-card-foreground transition-colors hover:text-accent">
            {product.name}
          </h3>
        </Link>

        {/* Price */}
        <div className="mb-3 flex items-baseline gap-2">
          <span className="text-base font-bold text-card-foreground">
            {formatPrice(product.price)}
          </span>
          {hasDiscount && (
            <>
              <span className="text-xs text-muted-foreground line-through">
                {formatPrice(product.originalPrice!)}
              </span>
              <Badge
                variant="secondary"
                className="bg-emerald-100 text-emerald-700 text-[10px]"
              >
                -{discountPercent}%
              </Badge>
            </>
          )}
        </div>

        {/* Add to Cart Button */}
        <Button
          size="sm"
          className="w-full gap-1.5 text-xs"
          onClick={() => onAddToCart?.(product.id)}
          disabled={isProcessing || product.stock === 0}
        >
          {isProcessing ? (
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Añadiendo...
            </span>
          ) : product.stock === 0 ? (
            "Agotado"
          ) : (
            <>
              <ShoppingCart className="h-3.5 w-3.5" />
              Agregar al carrito
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}

// Navigation Button
function ScrollButton({
  direction,
  onClick,
}: {
  direction: "left" | "right";
  onClick: () => void;
}) {
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={onClick}
      className={cn(
        "absolute top-1/2 z-10 h-10 w-10 -translate-y-1/2 rounded-full border-border/50 bg-background/90 shadow-lg backdrop-blur-sm transition-all hover:bg-background hover:shadow-xl",
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
export function ProductCarousel({
  title = "Productos destacados",
  products,
  onAddToCart,
  formState,
  className,
}: ProductCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 220;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const handleAddToCart = async (productId: string) => {
    if (!onAddToCart) return;
    setProcessingId(productId);
    await onAddToCart(productId);
    // Reset after a delay if formState.processing is not being managed externally
    if (!formState?.processing) {
      setTimeout(() => setProcessingId(null), 500);
    }
  };

  return (
    <section className={cn("bg-background py-12 lg:py-16", className)}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        {title && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-8 flex items-center justify-between"
          >
            <h2 className="text-2xl font-bold text-foreground">{title}</h2>
            <Link
              href="/tienda"
              className="text-sm font-medium text-accent transition-colors hover:text-accent/80"
            >
              Ver todo →
            </Link>
          </motion.div>
        )}

        {/* Products Carousel */}
        <div className="relative">
          {/* Left Button */}
          <ScrollButton direction="left" onClick={() => scroll("left")} />

          {/* Products */}
          <motion.div
            ref={scrollContainerRef}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            transition={{ staggerChildren: 0.08 }}
            className="flex gap-4 overflow-x-auto scroll-smooth pb-4 pt-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
                isProcessing={
                  formState?.processing
                    ? processingId === product.id
                    : processingId === product.id
                }
              />
            ))}
          </motion.div>

          {/* Right Button */}
          <ScrollButton direction="right" onClick={() => scroll("right")} />
        </div>
      </div>
    </section>
  );
}

// Default products for demo
export const defaultProducts: Product[] = [
  {
    id: "1",
    name: "asperiores",
    slug: "asperiores",
    description: "Tabla de surf premium",
    price: 35.09,
    originalPrice: undefined,
    image: "",
    category: "tablas",
    stock: 10,
    featured: true,
    discountPercentage: 90,
  },
  {
    id: "2",
    name: "quia",
    slug: "quia",
    description: "Tabla de surf intermedia",
    price: 11.04,
    originalPrice: 63.99,
    image: "",
    category: "tablas",
    stock: 5,
    featured: true,
    discountPercentage: 73,
  },
  {
    id: "3",
    name: "qui",
    slug: "qui",
    description: "Tabla de surf principiante",
    price: 5.99,
    originalPrice: 18.45,
    image: "",
    category: "tablas",
    stock: 8,
    featured: true,
    discountPercentage: 77,
  },
  {
    id: "4",
    name: "nostrum",
    slug: "nostrum",
    description: "Neopreno profesional",
    price: 86.79,
    originalPrice: undefined,
    image: "",
    category: "neoprenos",
    stock: 3,
    featured: true,
    discountPercentage: 60,
  },
  {
    id: "5",
    name: "impedit",
    slug: "impedit",
    description: "Accesorios surf",
    price: 29.34,
    originalPrice: 82.49,
    image: "",
    category: "accesorios",
    stock: 15,
    featured: true,
    discountPercentage: 64,
  },
  {
    id: "6",
    name: "temetur",
    slug: "temetur",
    description: "Tabla surfskate",
    price: 11.81,
    originalPrice: undefined,
    image: "",
    category: "surfskate",
    stock: 7,
    featured: true,
  },
];
