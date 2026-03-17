import React from "react";
import Layout1 from "../layouts/Layout1";
import "../../css/pagina_principal.css"; // dejamos tu CSS actual
import Contenedor_productos from "../layouts/Contenedor_productos";
import { Head } from "@inertiajs/react";
import OpcionesIntro from "../components/OpcionesIntro";
import Por_que_escogernos_motivo from "../components/Por_que_escogernos_motivo";
import { ShieldCheck, Sparkles, Users } from "lucide-react";

// Datos internos de la página
const motivos = [
  {
    title: "Seguridad Primero",
    paragraph: "Todas nuestras clases siguen protocolos de seguridad rigurosos",
    bgColor: "bg-blue-50",
    textColor: "text-blue-800",
  },
  {
    title: "Instructores Certificados",
    paragraph: "Nuestros instructores tienen años de experiencia y certificaciones internacionales.",
    bgColor: "bg-green-50",
    textColor: "text-green-800",
  },
  {
    title: "Equipo de Calidad",
    paragraph: "Utilizamos tablas y trajes de neopreno de marcas líderes en el mercado.",
    bgColor: "bg-purple-50",
    textColor: "text-purple-800",
  },
];

const Pag_principal = ({ productos }) => (
  <Layout1>
    <Head>
      <title>San Sebastian Surf School | S4</title>
      <meta
        name="description"
        content="Domina el Cantábrico con San Sebastian Surf School (S4). Clases de surf seguras y exclusivas en La Concha y Zurriola."
      />
    </Head>

    <main className="px-4 sm:px-6 md:px-10 lg:px-16">
      {/* HERO PRINCIPAL S4 */}
      <section
        className="relative pt-16 sm:pt-20 lg:pt-24 pb-12 sm:pb-16 lg:pb-20"
        aria-labelledby="hero-heading"
      >
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-surf-primary/10 via-surf-sand to-white" />

        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
          {/* Columna de texto (60%) */}
          <div className="w-full lg:w-3/5 space-y-6">
            <p className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] text-surf-primary/80">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-surf-primary text-surf-sand text-xs font-bold">
                S4
              </span>
              San Sebastian Surf School
            </p>

            <h1
              id="hero-heading"
              className="font-heading text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight bg-gradient-to-r from-surf-primary to-surf-secondary bg-clip-text text-transparent"
            >
              Domina el Cantábrico con S4
            </h1>

            <p className="max-w-xl text-sm sm:text-base md:text-lg text-slate-700">
              San Sebastian Surf School: tu seguridad, nuestra técnica. Vive la experiencia
              definitiva en las olas de{" "}
              <strong className="font-semibold text-surf-primary">La Concha</strong> y{" "}
              <strong className="font-semibold text-surf-primary">Zurriola</strong>, con
              instructores locales que conocen cada pico del Cantábrico.
            </p>

            {/* CTA principal */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-4">
              <a
                href="/servicios/surf"
                className="transition-s4 inline-flex items-center justify-center rounded-full bg-surf-accent px-6 py-3 text-sm sm:text-base font-semibold text-white shadow-lg shadow-surf-accent/30 hover:bg-surf-accent/90 hover:-translate-y-0.5 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surf-accent/80 focus-visible:ring-offset-2 focus-visible:ring-offset-surf-sand"
              >
                Reserva tu clase
              </a>
              <button
                type="button"
                className="transition-s4 inline-flex items-center gap-2 rounded-full border border-surf-primary/20 bg-white/60 px-5 py-2.5 text-sm font-medium text-surf-primary hover:bg-surf-primary/5 hover:-translate-y-0.5 hover:scale-[1.01]"
              >
                Ver niveles y horarios
                <Sparkles className="h-4 w-4 text-surf-secondary" />
              </button>
            </div>

            {/* Trust bar */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surf-primary text-surf-secondary">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Instructores federados</p>
                  <p className="text-xs text-slate-600">Formación oficial y rescate en mar</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surf-secondary/10 text-surf-secondary">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Equipo premium incluido</p>
                  <p className="text-xs text-slate-600">Tablas y neoprenos de última generación</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surf-primary/5 text-surf-primary">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">+5.000 surfistas formados</p>
                  <p className="text-xs text-slate-600">Clases para todos los niveles y edades</p>
                </div>
              </div>
            </div>
          </div>

          {/* Columna visual (40%) */}
          <div className="w-full lg:w-2/5 mt-6 lg:mt-0">
            <div className="relative glass-card hero-wave-mask rounded-custom overflow-hidden shadow-2xl bg-gradient-to-br from-surf-primary via-slate-900 to-surf-secondary animate-wave-float">
              <img
                src="/img/placeholder.svg"
                alt="Surfista en el Cantábrico frente a San Sebastián"
                className="h-72 w-full object-cover opacity-90 sm:h-80 md:h-96"
                loading="lazy"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-surf-primary/70 via-surf-primary/10 to-transparent" />

              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs sm:text-sm text-surf-sand">
                <div>
                  <p className="font-semibold tracking-wide uppercase">Spot Local</p>
                  <p className="text-surf-sand/80">
                    La Concha · Zurriola · Ondarreta
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">Condiciones Cantábrico</p>
                  <p className="text-surf-sand/80">Seguridad &amp; técnica primero</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sección de introducción visual existente */}
      <section aria-label="Explora las áreas principales de S4" className="mt-10 sm:mt-12">
        <OpcionesIntro />
      </section>

      {/* Sección de Confianza / Features */}
      <section className="mt-16 sm:mt-20 text-center bg-white/80 glass-card p-8 sm:p-10 rounded-custom shadow-2xl">
        <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold text-surf-primary mb-6">
          ¿Por qué elegir S4?
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {motivos.map((m, index) => (
            <Por_que_escogernos_motivo key={index} {...m} />
          ))}
        </div>
      </section>

      {/* Sección de Testimonios */}
      <section className="mt-16 sm:mt-20 mb-12">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold text-surf-primary mb-4">
            Lo que dicen nuestros surfistas
          </h2>
          <p className="text-sm sm:text-base text-slate-700 mb-8">
            Más de <span className="font-semibold">5.000 alumnos</span> han confiado en San Sebastian
            Surf School para dar su primer take-off en el Cantábrico.
          </p>
        </div>
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          <article className="glass-card rounded-2xl p-6 shadow-xl transition-s4 hover:-translate-y-1 hover:shadow-2xl text-left">
            <p className="text-sm text-slate-700 mb-4">
              “Sentí que conocían cada ola de Zurriola. Fui con respeto al mar y salí con
              confianza y muchas ganas de volver.”
            </p>
            <p className="text-xs font-semibold text-surf-primary">Ane · Nivel Iniciación</p>
          </article>
          <article className="glass-card rounded-2xl p-6 shadow-xl transition-s4 hover:-translate-y-1 hover:shadow-2xl text-left">
            <p className="text-sm text-slate-700 mb-4">
              “La combinación de seguridad, técnica y material hizo que mis hijos disfrutaran
              sin riesgos. Se nota que son escuela oficial.”
            </p>
            <p className="text-xs font-semibold text-surf-primary">Jon · Padre de dos alumnos</p>
          </article>
          <article className="glass-card rounded-2xl p-6 shadow-xl transition-s4 hover:-translate-y-1 hover:shadow-2xl text-left">
            <p className="text-sm text-slate-700 mb-4">
              “Venía con experiencia en otras playas y me sorprendió el conocimiento local del
              Cantábrico. Clases muy personalizadas.”
            </p>
            <p className="text-xs font-semibold text-surf-primary">Laura · Intermedio</p>
          </article>
        </div>
      </section>

      {/* Sección de Productos */}
      {productos.length > 0 ? (
        <Contenedor_productos
          productos={productos}
          className="contenedor_productos grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
        />
      ) : (
        <p className="text-center text-gray-700">
          No hay productos disponibles actualmente.
        </p>
      )}
    </main>
  </Layout1>
);

export default Pag_principal;
