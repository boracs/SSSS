import React from "react";
import PageShell from "@/layouts/PageShell";
import { Link } from "@inertiajs/react";
import SeoHead from "../components/seo/SeoHead";
import S4Button from "@/components/S4Button";
import {
    Activity,
    CheckCircle2,
    Users,
    User,
    CalendarDays,
    ArrowRight,
    BookOpen,
} from "lucide-react";

const ACCENT_LG =
    "bg-gradient-to-r from-orange-500 to-amber-400 px-6 py-3 font-bold text-slate-900 shadow-lg hover:brightness-110";
const OUTLINE_GLASS_BLUR_LG =
    "border border-white/20 bg-white/5 px-6 py-3 font-semibold text-white backdrop-blur-sm hover:bg-white/10";

const RESERVE_ORANGE_PILL =
    "rounded-full bg-orange-500/15 font-semibold text-orange-200 ring-1 ring-orange-400/30 hover:bg-orange-500/25";

const CLASES = [
    {
        titulo: "Individual · Principiante",
        descripcion:
            "Clase privada ideal para quienes nunca han practicado skate o surf. Atención personalizada para aprender lo básico con confianza.",
        detalles: ["1,5 horas", "Clase personalizada", "Material no incluido"],
        precio: "50 €",
        nota: "por clase",
        icon: User,
    },
    {
        titulo: "Grupal · Principiante",
        descripcion:
            "Clase grupal dirigida a quienes nunca han practicado skate o surf. Aprende lo básico de forma divertida junto a otros principiantes.",
        detalles: ["1,5 horas", "Grupo de principiantes", "Material no incluido"],
        precio: "25 €",
        nota: "por persona",
        icon: Users,
    },
    {
        titulo: "Grupal · Intermedio",
        descripcion:
            "Para quienes ya tienen nociones de skate o surf y buscan mejorar su técnica en grupo en un ambiente motivador.",
        detalles: ["1,5 horas", "Mejora tu técnica", "Material no incluido"],
        precio: "25 €",
        nota: "por persona",
        icon: Users,
    },
    {
        titulo: "Grupal · Avanzado",
        descripcion:
            "Diseñada para niveles avanzados. Perfecciona tu técnica y aprende trucos nuevos con un grupo de tu mismo nivel.",
        detalles: ["1,5 horas", "Nivel avanzado", "Material no incluido"],
        precio: "25 €",
        nota: "por persona",
        icon: Users,
    },
    {
        titulo: "Surf & Skate Experience",
        descripcion:
            "Una experiencia combinada única: surf y skate para mejorar tu equilibrio y tu técnica a lo largo de la semana.",
        detalles: [
            "5 días (lunes a viernes)",
            "Incluye tabla de surf, neopreno y equipo de skate",
        ],
        precio: "50 €",
        nota: "por persona",
        icon: CalendarDays,
        destacado: true,
    },
    {
        titulo: "Mensual · 1 clase/semana",
        descripcion:
            "Para quienes desean clases regulares. Una sesión por semana para avanzar de forma progresiva en skate o surf.",
        detalles: ["1 mes (4 clases)", "Progreso constante", "Material no incluido"],
        precio: "100 €",
        nota: "al mes",
        icon: CalendarDays,
    },
    {
        titulo: "Mensual · 2 clases/semana",
        descripcion:
            "Para quienes quieren acelerar su progreso con dos sesiones semanales de skate o surf.",
        detalles: ["1 mes (8 clases)", "Progreso acelerado", "Material no incluido"],
        precio: "150 €",
        nota: "al mes",
        icon: CalendarDays,
    },
];

const ClaseCard = ({ clase }) => {
    const Icon = clase.icon;
    return (
        <div
            className={`relative flex flex-col rounded-2xl border p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 ${
                clase.destacado
                    ? "border-orange-400/40 bg-gradient-to-b from-orange-500/10 to-white/5 shadow-lg shadow-orange-950/30"
                    : "border-white/10 bg-white/5 hover:border-orange-400/30 hover:bg-white/10"
            }`}
        >
            {clase.destacado && (
                <span className="absolute -top-3 left-6 rounded-full bg-gradient-to-r from-orange-400 to-amber-300 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-900">
                    Experiencia top
                </span>
            )}
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/15 text-orange-300 ring-1 ring-orange-400/30">
                <Icon className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-white">{clase.titulo}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
                {clase.descripcion}
            </p>
            <ul className="mt-4 space-y-2">
                {clase.detalles.map((d) => (
                    <li
                        key={d}
                        className="flex items-start gap-2 text-sm text-slate-300"
                    >
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" />
                        {d}
                    </li>
                ))}
            </ul>
            <div className="mt-6 flex items-end justify-between border-t border-white/10 pt-4">
                <div>
                    <p className="text-2xl font-extrabold text-white">
                        {clase.precio}
                    </p>
                    <p className="text-xs text-slate-500">{clase.nota}</p>
                </div>
                <S4Button href={route("contacto")} variant="secondary" size="sm" className={RESERVE_ORANGE_PILL}>
                    Reservar
                    <ArrowRight className="h-3.5 w-3.5" />
                </S4Button>
            </div>
        </div>
    );
};

export default function ServiciosSurfSkate({ seo = null }) {
    return (
        <PageShell variant="warm" withGradient>
            <SeoHead seo={seo} />
            {/* Hero */}
            <section className="relative overflow-hidden border-b border-orange-950/60">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(120,53,15,0.4),_transparent_55%)]" />
                <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-400/25 bg-orange-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-orange-200">
                        <Activity className="h-3.5 w-3.5" />
                        Surfskate · San Sebastián Surf School
                    </div>
                    <h1 className="max-w-3xl font-heading text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                        Clases de surfskate para{" "}
                        <span className="bg-gradient-to-r from-orange-300 to-amber-300 bg-clip-text text-transparent">
                            llevar tu surf a tierra
                        </span>
                    </h1>
                    <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
                        Mejora tu equilibrio, fluidez y técnica de bottom turn sin
                        depender de las olas. Sesiones individuales, grupales y
                        bonos mensuales para todos los niveles.
                    </p>
                    <div className="mt-8 flex flex-wrap gap-3">
                        <S4Button href={route("contacto")} variant="accent" size="lg" className={ACCENT_LG}>
                            <Activity className="h-4 w-4" />
                            Reservar mi clase
                        </S4Button>
                        <S4Button
                            href={route("servicios.surfSkate.guia")}
                            variant="secondary"
                            size="lg"
                            className={OUTLINE_GLASS_BLUR_LG}
                        >
                            <BookOpen className="h-4 w-4" />
                            Guía: elige tu tabla
                        </S4Button>
                        <S4Button
                            href={route("servicios.surf")}
                            variant="secondary"
                            size="lg"
                            className={OUTLINE_GLASS_BLUR_LG}
                        >
                            Ver clases de surf
                        </S4Button>
                    </div>
                </div>
            </section>

            {/* Cards */}
            <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
                <div className="mb-10 text-center">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-300">
                        Modalidades
                    </p>
                    <h2 className="mt-2 text-3xl font-extrabold text-white">
                        Encuentra tu ritmo sobre el skate
                    </h2>
                </div>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {CLASES.map((clase) => (
                        <ClaseCard key={clase.titulo} clase={clase} />
                    ))}
                </div>
            </section>
        </PageShell>
    );
}
