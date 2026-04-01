"use client";

import { useState } from "react";
import { TopBanner } from "@/components/layout/top-banner";
import { Header, defaultNavigation } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { HeroSection } from "@/components/sections/hero-section";
import {
  CategoryCards,
  defaultCategories,
} from "@/components/sections/category-cards";
import { FeaturesSection } from "@/components/sections/features-section";
import { TestimonialsSection } from "@/components/sections/testimonials-section";
import {
  ProductCarousel,
  defaultProducts,
} from "@/components/sections/product-carousel";
import type { FormState } from "@/types";

export default function HomePage() {
  // State for cart functionality (Inertia.js integration point)
  const [cartFormState, setCartFormState] = useState<FormState>({
    processing: false,
    errors: {},
  });

  // Handlers for user authentication (Inertia.js integration point)
  const handleLogin = () => {
    // Replace with Inertia router.visit('/login') or modal open
    console.log("[v0] Login clicked - integrate with Inertia");
  };

  const handleLogout = () => {
    // Replace with Inertia router.post('/logout')
    console.log("[v0] Logout clicked - integrate with Inertia");
  };

  // Handler for add to cart (Inertia.js integration point)
  const handleAddToCart = async (productId: string) => {
    setCartFormState({ processing: true, errors: {} });

    // Simulate API call - replace with Inertia useForm
    // Example: const { post, processing, errors } = useForm({ product_id: productId })
    // post('/cart/add')
    await new Promise((resolve) => setTimeout(resolve, 800));

    setCartFormState({ processing: false, errors: {} });
    console.log("[v0] Add to cart:", productId);
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top Banner */}
      <TopBanner
        preTitle="S4 · SAN SEBASTIAN SURF SCHOOL"
        title="Domina el Cantabrico con"
        highlightedText="S4"
        subtitle="Escuela de surf premium en San Sebastián. Seguridad, técnica y experiencia local en La Concha y Zurriola."
        dismissible
      />

      {/* Header */}
      <Header
        navigation={defaultNavigation}
        user={null} // Replace with authenticated user from Inertia page props
        notifications={[]}
        cartItemsCount={0} // Replace with actual cart count
        onLogin={handleLogin}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <HeroSection
          preTitle="S4 · SAN SEBASTIAN SURF SCHOOL"
          title="Domina el Cantábrico"
          highlightedText="con S4"
          description="San Sebastián Surf School: tu seguridad, nuestra técnica. Vive la experiencia definitiva en las olas de La Concha y Zurriola, con instructores locales que conocen cada pico del Cantábrico."
          primaryCta={{
            label: "Reserva tu clase",
            href: "/reservar",
          }}
          secondaryCta={{
            label: "Ver niveles y horarios",
            href: "/clases",
          }}
          heroImage="" // Replace with actual image URL
        />

        {/* Category Cards */}
        <CategoryCards categories={defaultCategories} />

        {/* Features Section */}
        <FeaturesSection
          title="¿Por qué elegir S4?"
          subtitle="Más de 15 años formando surfistas en el Cantábrico con los mejores estándares de seguridad y calidad."
        />

        {/* Testimonials Section */}
        <TestimonialsSection
          title="Lo que dicen nuestros surfistas"
          highlightedNumber="5.000"
        />

        {/* Product Carousel */}
        <ProductCarousel
          title="Mejores Ofertas"
          products={defaultProducts}
          onAddToCart={handleAddToCart}
          formState={cartFormState}
        />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
