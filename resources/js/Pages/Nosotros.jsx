import React, { useState } from "react";
import Layout1 from "../layouts/Layout1";
import {
    Wind,
    Dumbbell,
    Layers,
    ClipboardList,
    Search,
    Wrench,
    ShieldCheck,
    Coffee,
    Package,
    Star,
    Zap,
    ChevronRight,
    ChevronDown,
    Wifi,
    Droplets,
    Plug,
    Heart,
    Scissors,
    Music,
    Ruler,
    Refrigerator,
    Bath,
    Info,
} from "lucide-react";

// ── Componentes auxiliares ─────────────────────────────────────────────────────

function SectionLabel({ children }) {
    return (
        <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-orange-400">
            {children}
        </p>
    );
}

function BenefitVerMas({ detail, trigger = "Ver dinámica" }) {
    const [open, setOpen] = useState(false);

    return (
        <span className="mt-2 block">
            <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md border border-orange-500/30 bg-orange-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-orange-300 transition hover:bg-orange-500/20 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
            >
                <Info className="h-3 w-3" />
                {trigger}
                <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
                <div className="mt-2 rounded-xl border border-orange-500/20 bg-slate-950/90 p-3 text-xs leading-relaxed text-slate-300 shadow-lg">
                    {detail}
                </div>
            )}
        </span>
    );
}

function MicroServiceItem({ icon: Icon, label, sub, more, anchorId, anchorLabel = "Ver dinámica" }) {
    const scrollToSection = () => {
        document.getElementById(anchorId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    return (
        <div className={`flex items-start gap-2.5 rounded-xl border border-white/5 bg-white/[0.03] p-3 ${more ? "sm:col-span-2" : ""}`}>
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold leading-tight text-white">{label}</p>
                {sub && <p className="mt-0.5 text-[10px] text-slate-500">{sub}</p>}
                {more && <BenefitVerMas detail={more} />}
                {anchorId && !more && (
                    <button
                        type="button"
                        onClick={scrollToSection}
                        className="mt-2 inline-flex items-center gap-1 rounded-md border border-orange-500/30 bg-orange-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-orange-300 transition hover:bg-orange-500/20 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                    >
                        <Info className="h-3 w-3" />
                        {anchorLabel}
                        <ChevronRight className="h-3 w-3" />
                    </button>
                )}
            </div>
        </div>
    );
}

const MICRO_SERVICES = [
    { icon: Coffee,      label: "Maquina de cafe",             sub: "Trae tus capsulas" },
    { icon: Refrigerator,label: "Frigorifico comunitario",      sub: "Guarda tus tapers, bebidas..." },
    { icon: Zap,         label: "Vending tecnico",              sub: "Parafina, Solarez, quillas" },
    { icon: Droplets,    label: "Ducha de agua caliente",       sub: "Aclarado post-sesion" },
    { icon: Scissors,    label: "Secador de pelo",              sub: "Profesional de uso comun" },
    { icon: Plug,        label: "Enchufes y carga USB",         sub: "En cada taquilla" },
    { icon: Wifi,        label: "WiFi alta velocidad",          sub: "En toda la instalacion" },
    { icon: Music,       label: "Alexa smart speaker",          sub: "Musica y domótica" },
    { icon: Heart,       label: "Botiquin primeros auxilios",   sub: "Siempre disponible" },
    { icon: Ruler,       label: "Zona de encerado y reparaciones pequenas", sub: "Material comun: Solarez, lijas, luz UV..." },
    { icon: Wind,        label: "Zona de secado rapido para neoprenos", sub: "Baja humedad relativa" },
    { icon: Bath,        label: "Baños",                        sub: "A disposicion de socios" },
    { icon: Package,     label: "Taquillas",                    sub: "Espacio privado a pie de playa" },
    {
        icon: Wrench,
        label: "Servicio de reparacion automatizado",
        sub: "Pizarra fisica + seguimiento semanal",
        anchorId: "taller-edy-mulder",
    },
];

const TAQUILLA_BENEFITS = [
    "Zona de secado rapido de trajes",
    "Extras: Alexa, frigorifico y maquina de cafe",
    "Zona de calentamiento (TRX, maquina multi ejercicios)",
    "Descuentos de hasta el 50% en articulos para socios",
    "1 vez al mes: alquiler de material gratis para un invitado (el socio responde del invitado)",
    "Precios especiales en clases y bonos",
    "Banos a disposicion",
    "Rack para almacenar dos tablas + taquilla",
    "Camara de vigilancia",
    {
        text: "Llave electronica — acceso inmediato al local mediante candado con contrasena (solicitud online con registro de accesos).",
        tagline: "En caso de extravio de la llave no te quedas fuera.",
        more: "Acceso a la contrasena del candado ubicada en la entrada del local y accesible desde fuera mediante la aplicacion web, a la que podra entrar desde cualquier movil y solicitar la contrasena del candado para poder abrirlo y adquirir la llave que contiene y poder acceder al local. Posteriormente el administrador podra desactivar la llave anterior en caso de extravio y asignar esta nueva al usuario que la solicito (mediante la aplicacion). Esto supondra un coste de dos euros por molestias ocasionadas mas coste de la llave en caso de extravio total. De no extraviarla no supondra ningun coste.",
    },
];

const EDY_STEPS = [
    {
        step: 1,
        icon: ClipboardList,
        title: "Registro en Pizarra",
        body: "El socio anota su numero de taquilla en la pizarra fisica del local antes del viernes. Sin aplicaciones ni formularios.",
    },
    {
        step: 2,
        icon: Search,
        title: "Inspeccion y Marcado",
        body: "Edy Mulder pasa los viernes. Primero revisa la pizarra para saber que numeros de taquilla tienen tablas para reparar. A continuacion se dirige a cada taquilla, recoge la tabla que tenga cinta azul marcando los toques a reparar y la traslada al taller.",
    },
    {
        step: 3,
        icon: Wrench,
        title: "Reparacion en Taller",
        body: "Traslado al taller especializado. La tabla vuelve al rack a la semana siguiente con su etiqueta de precio transparente.",
    },
    {
        step: 4,
        icon: ShieldCheck,
        title: "Garantia de Entrega",
        body: "Edy devuelve la tabla al rack con una pegatina indicando el precio de la reparacion. El socio valida el arreglo en el local y abona el importe a Edy: por transferencia a su cuenta o en metalico introduciendo un sobre con su nombre y numero de taquilla en el buzon de su propiedad situado en el local.",
    },
];

function StepCard({ step, icon: Icon, title, body }) {
    return (
        <div className="flex h-full gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-orange-500/40 bg-orange-500/10 text-orange-400">
                <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-widest text-orange-400">
                    Paso {step}
                </p>
                <h4 className="mt-1 text-base font-bold text-white">{title}</h4>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{body}</p>
            </div>
        </div>
    );
}

// ── Modal de contacto ──────────────────────────────────────────────────────────

const CONTACT_OPTIONS = [
    {
        id: "whatsapp",
        label: "WhatsApp",
        sub: "Respuesta rápida",
        href: "https://wa.me/34600000000?text=Hola%2C%20me%20interesa%20información%20sobre%20las%20taquillas%20del%20club.",
        bg: "bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20",
        iconBg: "bg-emerald-500/20 text-emerald-400",
        icon: (
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
        ),
    },
    {
        id: "instagram",
        label: "Instagram",
        sub: "Síguenos y escríbenos",
        href: "https://www.instagram.com/sansebastiansurfschool",
        bg: "bg-pink-500/10 border-pink-500/30 hover:bg-pink-500/20",
        iconBg: "bg-pink-500/20 text-pink-400",
        icon: (
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
            </svg>
        ),
    },
    {
        id: "email",
        label: "Correo electrónico",
        sub: "info@sansebastiansurfschool.com",
        href: "mailto:info@sansebastiansurfschool.com",
        bg: "bg-[#4ecde6]/10 border-[#4ecde6]/30 hover:bg-[#4ecde6]/20",
        iconBg: "bg-[#4ecde6]/20 text-[#4ecde6]",
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
            </svg>
        ),
    },
    {
        id: "form",
        label: "Formulario de contacto",
        sub: "Te respondemos en 24h",
        href: "/contacto",
        bg: "bg-white/5 border-white/10 hover:bg-white/10",
        iconBg: "bg-white/10 text-slate-300",
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
        ),
    },
];

function ContactModal({ onClose }) {
    return (
        <div
            className="fixed inset-0 z-[900] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-slate-900/95 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/5 px-6 py-5">
                    <div>
                        <h3 className="text-base font-bold text-white">Contacta con nosotros</h3>
                        <p className="mt-0.5 text-xs text-slate-500">Elige cómo prefieres hablar con el equipo</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-white"
                        aria-label="Cerrar"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>

                {/* Opciones */}
                <div className="flex flex-col gap-2 p-4">
                    {CONTACT_OPTIONS.map(({ id, label, sub, href, bg, iconBg, icon }) => (
                        <a
                            key={id}
                            href={href}
                            target={id !== "form" ? "_blank" : undefined}
                            rel={id !== "form" ? "noopener noreferrer" : undefined}
                            className={`flex items-center gap-4 rounded-2xl border p-4 transition ${bg}`}
                        >
                            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
                                {icon}
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-white">{label}</p>
                                <p className="mt-0.5 text-xs text-slate-500">{sub}</p>
                            </div>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ml-auto h-4 w-4 shrink-0 text-slate-600">
                                <polyline points="9 18 15 12 9 6"/>
                            </svg>
                        </a>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ── Página principal ───────────────────────────────────────────────────────────

export default function SobreNosotros() {
    const [showContact, setShowContact] = useState(false);

    return (
        <Layout1>
            {/* ── Fondo premium aislado ── */}
            <div className="relative min-h-screen overflow-hidden bg-slate-950">

                {/* Orbes de luz decorativos — estilo Stripe/Vercel */}
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
                    {/* Orbe teal superior izquierda */}
                    <div className="absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full bg-[#0f5f74]/25 blur-[120px]" />
                    {/* Orbe naranja centro-derecha */}
                    <div className="absolute right-0 top-1/3 h-[400px] w-[400px] rounded-full bg-orange-500/10 blur-[100px]" />
                    {/* Orbe teal inferior */}
                    <div className="absolute bottom-0 left-1/2 h-[350px] w-[700px] -translate-x-1/2 rounded-full bg-[#0f5f74]/15 blur-[120px]" />
                </div>

                {/* Rejilla sutil de fondo */}
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0"
                    style={{
                        backgroundImage:
                            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
                        backgroundSize: "64px 64px",
                    }}
                />

                {/* Contenido */}
                <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">

                {/* ══════════════════════════════════════════
                    HERO
                ══════════════════════════════════════════ */}
                <header className="mb-16 text-center">
                    {/* Overline institucional */}
                    <p className="mb-4 text-xs font-bold uppercase tracking-[0.25em] text-[#4ecde6]">
                        Escuela oficial de surf · Zurriola, San Sebastián
                    </p>

                    {/* Título principal */}
                    <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
                        <span className="block text-white">
                            San Sebastian Surf School
                        </span>
                        <span className="mt-2 block bg-gradient-to-r from-[#0f5f74] via-[#1aa3c0] to-[#4ecde6] bg-clip-text text-transparent">
                            Lockers &amp; Club de Socios
                        </span>
                    </h1>

                    {/* Subtítulo */}
                    <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">
                        Taquillas privadas a pie de playa, zona de secado, calentamiento y acceso
                        a los mejores servicios del club. Todo lo que necesitas antes y después del agua.
                    </p>
                    {/* Barra de métricas premium */}
                    <div className="mx-auto mt-10 max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm">
                        <div className="grid grid-cols-2 divide-x divide-y divide-white/5 sm:grid-cols-4 sm:divide-y-0">
                            {[
                                {
                                    value: "<5",
                                    label: "Instalaciones renovadas",
                                    sub: "Menos de 5 años de antigüedad",
                                    color: "text-[#4ecde6]",
                                },
                                {
                                    value: "200+",
                                    label: "Socios activos",
                                    sub: "Comunidad creciente",
                                    color: "text-[#4ecde6]",
                                },
                                {
                                    value: "98%",
                                    label: "Satisfacción",
                                    sub: "Valoración media",
                                    color: "text-emerald-400",
                                },
                                {
                                    value: "Top",
                                    label: "Material premium",
                                    sub: "Las mejores marcas del mercado",
                                    color: "text-orange-400",
                                },
                            ].map(({ value, label, sub, color }, i) => (
                                <div key={i} className="flex flex-col items-center justify-center gap-1 px-6 py-6">
                                    <span className={`text-4xl font-black tracking-tight ${color}`}>
                                        {value}
                                    </span>
                                    <span className="text-[13px] font-semibold text-white/80">{label}</span>
                                    <span className="text-[11px] text-slate-500">{sub}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </header>

                {/* ══════════════════════════════════════════
                    BLOQUE 1 — BENTO GRID INSTALACIONES
                ══════════════════════════════════════════ */}
                <section className="mb-16">
                    <div className="mb-6">
                        <SectionLabel>Instalaciones de Primer Nivel</SectionLabel>
                        <h2 className="text-3xl font-extrabold text-white">Todo lo que necesitas, cuando lo necesitas</h2>
                    </div>

                    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">

                        {/* Tarjeta grande — Taquillas Premium (2 col) */}
                        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-800/80 to-slate-900/90 p-7 backdrop-blur-md md:col-span-2">
                            {/* Badge Mas Popular */}
                            <div className="absolute right-5 top-5 flex items-center gap-1.5 rounded-full border border-orange-400/40 bg-orange-500/15 px-3 py-1 text-[11px] font-bold text-orange-300 shadow-[0_0_12px_rgba(251,146,60,0.3)]">
                                <Star className="h-3 w-3 fill-orange-400 text-orange-400" />
                                Servicios VIP para socios
                            </div>
                            <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1">
                                <Package className="h-8 w-8 shrink-0 text-orange-400" />
                                <h3 className="text-xl font-extrabold text-white">Pack premium</h3>
                                <span className="text-4xl font-extrabold leading-none text-orange-400">40€</span>
                                <span className="text-sm text-slate-400">/mes</span>
                            </div>
                            <p className="mt-3 text-sm text-slate-400">
                                Tu espacio privado a pie de playa, listo antes y despues de cada sesion.
                            </p>
                            {/* Lista completa de beneficios */}
                            <ul className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {TAQUILLA_BENEFITS.map((item) => {
                                    const text = typeof item === "string" ? item : item.text;
                                    const tagline = typeof item === "object" ? item.tagline : null;
                                    const more = typeof item === "object" ? item.more : null;

                                    return (
                                        <li
                                            key={text}
                                            className={`flex items-start gap-2 text-sm text-slate-300 ${more ? "sm:col-span-2" : ""}`}
                                        >
                                            <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-400" />
                                            <span className="min-w-0 flex-1">
                                                {text}
                                                {tagline && (
                                                    <span className="mt-1 block text-xs font-semibold text-orange-300/90">
                                                        {tagline}
                                                    </span>
                                                )}
                                                {more && <BenefitVerMas detail={more} />}
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>

                        {/* Tarjeta — Secado Rapido */}
                        <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-7 backdrop-blur-md">
                            <Wind className="h-8 w-8 text-cyan-400" />
                            <h3 className="text-lg font-bold text-white">Secado de Trajes</h3>
                            <p className="text-sm leading-relaxed text-slate-400">
                                Tecnologia de secado rapido mediante control de
                                <strong className="text-white"> Baja Humedad Relativa (Baja HR)</strong>.
                                Tu neopreno siempre seco y sin hongos antes de cada sesion.
                            </p>
                            <div className="mt-auto overflow-hidden rounded-2xl border border-cyan-500/10">
                                <img
                                    src="/img/secadero-trajes.png"
                                    alt="Trajes de neopreno en el secadero del club"
                                    className="h-44 w-full object-cover"
                                />
                            </div>
                        </div>

                        {/* Tarjeta — Performance Zone */}
                        <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-7 backdrop-blur-md">
                            <div className="flex items-center gap-3">
                                <Dumbbell className="h-8 w-8 shrink-0 text-emerald-400" />
                                <h3 className="text-lg font-bold text-white">Performance Zone</h3>
                            </div>
                            <p className="text-sm leading-relaxed text-slate-400">
                                Zona de calentamiento funcional orientada a la
                                <strong className="text-white"> movilidad y preparacion fisica</strong> pre-baño.
                                Activa los musculos correctos antes de entrar al agua.
                            </p>
                            <p className="text-sm leading-relaxed text-slate-400">
                                Evita lesiones y mejora tu agilidad utilizando nuestros foam rollers, bandas
                                elasticas y equipamiento de calentamiento.{" "}
                                <strong className="text-emerald-400">¡Entra al agua al 100%!</strong>
                            </p>
                            <div className="mt-auto overflow-hidden rounded-2xl border border-emerald-500/10">
                                <img
                                    src="/img/zona-calentamiento.png"
                                    alt="Zona de calentamiento con maquina multi ejercicios del club"
                                    className="h-44 w-full object-cover"
                                />
                            </div>
                        </div>

                        {/* Tarjeta — Micro-servicios (grid completo) */}
                        <div
                            id="micro-servicios-club"
                            className="flex scroll-mt-24 flex-col gap-5 rounded-3xl border border-white/10 bg-white/5 p-7 backdrop-blur-md md:col-span-2"
                        >
                            <div className="flex items-center gap-3">
                                <Layers className="h-8 w-8 shrink-0 text-amber-400" />
                                <div>
                                    <h3 className="text-lg font-bold text-white">Micro-servicios del Club</h3>
                                    <p className="text-xs text-slate-500">+14 servicios incluidos para socios</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                {MICRO_SERVICES.map((item) => (
                                    <MicroServiceItem key={item.label} {...item} />
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* ══════════════════════════════════════════
                    BLOQUE 2 — BENEFICIOS FINANCIEROS
                ══════════════════════════════════════════ */}
                <section className="mb-16 overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 backdrop-blur-md">
                    <div className="grid grid-cols-1 lg:grid-cols-2">

                        {/* Izquierda — Header y descripcion */}
                        <div className="flex flex-col justify-center p-8 lg:p-10">
                            <SectionLabel>Club de Socios</SectionLabel>
                            <h2 className="mt-2 text-3xl font-extrabold leading-tight text-white lg:text-4xl">
                                Descuentos de hasta el{" "}
                                <span className="text-orange-400">50%</span>{" "}
                                para socios con rutina de taquilla
                            </h2>
                            <p className="mt-4 text-sm leading-relaxed text-slate-400">
                                Ser socio no es solo tener una taquilla. Es acceder a un ecosistema de
                                beneficios exclusivos que hacen que cada sesion cueste menos y disfrutes mas.
                            </p>
                            <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
                                <p className="text-sm font-bold text-emerald-300">Pase de Invitados Mensual</p>
                                <p className="mt-1.5 text-sm text-slate-400">
                                    Como socio puedes traer hasta <strong className="text-white">2 invitados una vez al mes</strong> con acceso completo a tablas y neoprenos de test.
                                    A partir de la tercera persona, el resto abonara el precio estandar de alquiler.
                                </p>
                            </div>
                        </div>

                        {/* Derecha — Tabla de ahorro */}
                        <div className="flex items-center justify-center border-t border-white/5 p-8 lg:border-l lg:border-t-0 lg:p-10">
                            <div className="w-full max-w-sm">
                                <p className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                                    Desglose del ahorro — Pase Invitado
                                </p>
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-white/10">
                                            <th className="pb-2 text-left text-xs font-semibold text-slate-500">Concepto</th>
                                            <th className="pb-2 text-center text-xs font-semibold text-slate-500">Precio normal</th>
                                            <th className="pb-2 text-right text-xs font-semibold text-slate-500">Precio socio</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[
                                            { concepto: "Alquiler Tabla (1.5h)", normal: "15€", socio: "Gratis" },
                                            { concepto: "Alquiler Traje",        normal: "10€", socio: "Gratis" },
                                        ].map(({ concepto, normal, socio }) => (
                                            <tr key={concepto} className="border-b border-white/5">
                                                <td className="py-3 text-slate-300">{concepto}</td>
                                                <td className="py-3 text-center text-slate-500 line-through">{normal}</td>
                                                <td className="py-3 text-right font-bold text-emerald-400">{socio}</td>
                                            </tr>
                                        ))}
                                        <tr className="border-t-2 border-orange-500/30">
                                            <td className="pt-3 font-bold text-white">Ahorro por visita</td>
                                            <td className="pt-3 text-center font-bold text-slate-400 line-through">25€</td>
                                            <td className="pt-3 text-right font-extrabold text-orange-400">100% gratis</td>
                                        </tr>
                                    </tbody>
                                </table>
                                <div className="mt-5 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4 text-center">
                                    <p className="text-xs text-slate-400">Ahorro anual acumulado (x12 meses)</p>
                                    <p className="mt-1 text-3xl font-extrabold text-cyan-300">300€</p>
                                    <p className="text-xs text-slate-500">solo en descuentos de socio</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ══════════════════════════════════════════
                    BLOQUE 3 — TIMELINE EDY MULDER
                ══════════════════════════════════════════ */}
                <section id="taller-edy-mulder" className="mb-16 scroll-mt-24">
                    <div className="mb-10 text-center">
                        <SectionLabel>Artesania Local</SectionLabel>
                        <h2 className="mt-2 text-3xl font-extrabold text-white">
                            Taller de Reparacion con Edy Mulder
                        </h2>
                        <p className="mx-auto mt-3 max-w-xl text-sm text-slate-400">
                            Tu tabla en manos del mejor shaper local de San Sebastian.
                            Un proceso semanal, riguroso y transparente.
                        </p>
                    </div>

                    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-2">
                        {EDY_STEPS.map((item) => (
                            <StepCard key={item.step} {...item} />
                        ))}
                    </div>
                </section>

                {/* ══════════════════════════════════════════
                    FOOTER CTA
                ══════════════════════════════════════════ */}
                <section className="rounded-3xl border border-orange-500/20 bg-gradient-to-br from-orange-500/10 via-slate-900/80 to-slate-900/90 p-10 text-center backdrop-blur-md">
                    <h2 className="text-3xl font-extrabold text-white lg:text-4xl">
                        Listo para unirte al club?
                    </h2>
                    <p className="mx-auto mt-3 max-w-lg text-sm text-slate-400">
                        La comunidad S4 te espera en Zurriola. Escríbenos y te contamos cómo unirte al club.
                    </p>
                    <div className="mt-7 flex justify-center">
                        <button
                            type="button"
                            onClick={() => setShowContact(true)}
                            className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-orange-600">
                            Contactar con nosotros
                        </button>
                    </div>
                </section>

                </div>
            </div>{/* fin fondo premium */}

            {/* Modal de contacto */}
            {showContact && <ContactModal onClose={() => setShowContact(false)} />}
        </Layout1>
    );
}