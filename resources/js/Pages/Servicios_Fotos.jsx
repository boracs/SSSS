import React from "react";
import { Link } from "@inertiajs/react";
import {
    Camera,
    CheckCircle2,
    Image as ImageIcon,
    ArrowRight,
    Aperture,
} from "lucide-react";

const BONOS = [
    {
        titulo: "Bono Básico",
        descripcion:
            "Perfecto para quienes quieren iniciarse. Llévate fotos de tu primera experiencia sobre la tabla.",
        detalles: ["1 clase", "Fotos incluidas (sin garantía en todas)"],
        precio: "5 €",
        nota: "por persona",
    },
    {
        titulo: "Bono de 1 hora",
        descripcion:
            "Una hora de pura diversión en el agua para mejorar tus habilidades, con recuerdo fotográfico.",
        detalles: ["Duración: 1 hora", "Fotos incluidas (sin garantía en todas)"],
        precio: "10 €",
        nota: "por persona",
    },
    {
        titulo: "Bono de 1,5 horas",
        descripcion:
            "Un poco más de tiempo para perfeccionar tu técnica y disfrutar del mar mientras te capturamos.",
        detalles: ["Duración: 1,5 horas", "Fotos incluidas (sin garantía en todas)"],
        precio: "15 €",
        nota: "por persona",
        destacado: true,
    },
    {
        titulo: "Bono Grupal",
        descripcion:
            "Perfecto para disfrutar en grupo y aprender juntos las mejores técnicas de surf con reportaje incluido.",
        detalles: [
            "Duración: 2 horas",
            "Máximo 5 personas",
            "Fotos incluidas (sin garantía en todas)",
        ],
        precio: "80 €",
        nota: "por grupo",
    },
    {
        titulo: "Bono Semanal",
        descripcion:
            "Una semana completa de surf para llevar tus habilidades al siguiente nivel, con cobertura fotográfica.",
        detalles: [
            "5 días (lunes a viernes)",
            "Fotos incluidas (sin garantía en todas)",
        ],
        precio: "50 €",
        nota: "por persona",
    },
];

const BonoCard = ({ bono }) => (
    <div
        className={`relative flex flex-col rounded-2xl border p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 ${
            bono.destacado
                ? "border-fuchsia-400/40 bg-gradient-to-b from-fuchsia-500/10 to-white/5 shadow-lg shadow-fuchsia-950/30"
                : "border-white/10 bg-white/5 hover:border-fuchsia-400/30 hover:bg-white/10"
        }`}
    >
        {bono.destacado && (
            <span className="absolute -top-3 left-6 rounded-full bg-gradient-to-r from-fuchsia-400 to-pink-300 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-900">
                Recomendado
            </span>
        )}
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-fuchsia-500/15 text-fuchsia-200 ring-1 ring-fuchsia-400/30">
            <Camera className="h-5 w-5" />
        </div>
        <h3 className="text-lg font-bold text-white">{bono.titulo}</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
            {bono.descripcion}
        </p>
        <ul className="mt-4 space-y-2">
            {bono.detalles.map((d) => (
                <li
                    key={d}
                    className="flex items-start gap-2 text-sm text-slate-300"
                >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-fuchsia-400" />
                    {d}
                </li>
            ))}
        </ul>
        <div className="mt-6 flex items-end justify-between border-t border-white/10 pt-4">
            <div>
                <p className="text-2xl font-extrabold text-white">
                    {bono.precio}
                </p>
                <p className="text-xs text-slate-500">{bono.nota}</p>
            </div>
            <Link
                href={route("contacto")}
                className="inline-flex items-center gap-1.5 rounded-full bg-fuchsia-500/15 px-4 py-2 text-sm font-semibold text-fuchsia-200 ring-1 ring-fuchsia-400/30 transition hover:bg-fuchsia-500/25"
            >
                Reservar
                <ArrowRight className="h-3.5 w-3.5" />
            </Link>
        </div>
    </div>
);

export default function ServiciosFotos() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-[#1a0a24] to-slate-950 text-white">
            {/* Hero */}
            <section className="relative overflow-hidden border-b border-fuchsia-950/60">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(112,26,117,0.4),_transparent_55%)]" />
                <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-fuchsia-400/25 bg-fuchsia-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-fuchsia-200">
                        <Aperture className="h-3.5 w-3.5" />
                        Fotografía de surf S4
                    </div>
                    <h1 className="max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                        Captura tu mejor ola y{" "}
                        <span className="bg-gradient-to-r from-fuchsia-300 to-pink-300 bg-clip-text text-transparent">
                            llévate el recuerdo
                        </span>
                    </h1>
                    <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
                        Inmortaliza tu sesión en la Zurriola. Bonos de clase con
                        reportaje fotográfico incluido para que revivas cada
                        maniobra y compartas tu progreso.
                    </p>
                    <div className="mt-8 flex flex-wrap gap-3">
                        <Link
                            href={route("contacto")}
                            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-pink-400 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:brightness-110"
                        >
                            <Camera className="h-4 w-4" />
                            Reservar sesión con fotos
                        </Link>
                        <Link
                            href={route("servicios.videograbaciones")}
                            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/10"
                        >
                            Ver videograbaciones
                        </Link>
                    </div>
                </div>
            </section>

            {/* Bonos */}
            <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
                <div className="mb-10 text-center">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-fuchsia-300">
                        Bonos con fotos
                    </p>
                    <h2 className="mt-2 text-3xl font-extrabold text-white">
                        Elige tu sesión fotográfica
                    </h2>
                </div>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {BONOS.map((bono) => (
                        <BonoCard key={bono.titulo} bono={bono} />
                    ))}
                </div>

                <div className="mt-10 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-sm">
                    <ImageIcon className="mt-0.5 h-5 w-5 shrink-0 text-fuchsia-300" />
                    <p className="text-sm leading-relaxed text-slate-400">
                        Las fotos se realizan durante la sesión en condiciones
                        reales de mar. No garantizamos aparecer en todas las
                        tomas, pero seleccionamos siempre las mejores imágenes de
                        cada participante.
                    </p>
                </div>
            </section>
        </div>
    );
}
