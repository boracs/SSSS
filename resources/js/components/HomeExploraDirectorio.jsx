import React from "react";
import { Link } from "@inertiajs/react";
import {
    ArrowRight,
    ArrowUpRight,
    BookOpen,
    Camera,
    Clapperboard,
    Compass,
    Gavel,
    GitCompareArrows,
    GraduationCap,
    Layers,
    MapPin,
    ShieldCheck,
    Shirt,
    ShoppingBag,
    Sparkles,
    Tag,
    UserRound,
    Video,
    Waves,
    Wrench,
} from "lucide-react";

/** Temas por intención: color sin repetir cajas idénticas. */
const GROUP_THEMES = {
    Clases: {
        dot: "bg-emerald-400",
        card: "border-emerald-400/20 bg-emerald-500/[0.06]",
        featured: "from-emerald-600 via-cyan-600 to-teal-600 shadow-emerald-950/40",
        icon: "bg-emerald-500/15 text-emerald-200 ring-emerald-400/25",
        hover: "hover:border-emerald-400/30 hover:bg-emerald-500/10",
    },
    "Mar y olas": {
        dot: "bg-sky-400",
        card: "border-sky-400/20 bg-sky-500/[0.06]",
        featured: "from-sky-600 via-cyan-600 to-blue-600 shadow-sky-950/40",
        icon: "bg-sky-500/15 text-sky-200 ring-sky-400/25",
        hover: "hover:border-sky-400/30 hover:bg-sky-500/10",
    },
    "Material y tienda": {
        dot: "bg-amber-400",
        card: "border-amber-400/20 bg-amber-500/[0.06]",
        featured: "from-amber-600 via-orange-500 to-amber-600 shadow-amber-950/40",
        icon: "bg-amber-500/15 text-amber-200 ring-amber-400/25",
        hover: "hover:border-amber-400/30 hover:bg-amber-500/10",
    },
    "Club y taller": {
        dot: "bg-cyan-400",
        card: "border-cyan-400/20 bg-cyan-500/[0.06]",
        featured: "from-cyan-700 via-teal-700 to-slate-800 shadow-cyan-950/40",
        icon: "bg-cyan-500/15 text-cyan-200 ring-cyan-400/25",
        hover: "hover:border-cyan-400/30 hover:bg-cyan-500/10",
    },
};

const directorioServicios = [
    {
        title: "Clases",
        blurb: "Aprende, progresa y reserva según tu nivel.",
        items: [
            {
                label: "Reservar clases",
                hint: "Academia y grupos",
                href: route("academy.lessons.index"),
                icon: GraduationCap,
                featured: true,
            },
            {
                label: "Clases particulares",
                hint: "1 a 1 a tu nivel",
                href: `${route("academy.lessons.index")}?particular=1`,
                icon: UserRound,
            },
            {
                label: "Clases de surf",
                hint: "Info y tarifas",
                href: route("servicios.surf"),
                icon: Waves,
            },
            {
                label: "Surfskate",
                hint: "Técnica en asfalto",
                href: route("servicios.surfSkate"),
                icon: Sparkles,
            },
            {
                label: "Surftrips",
                hint: "Viajes y camps",
                href: route("servicios.surfTrips"),
                icon: Compass,
            },
        ],
    },
    {
        title: "Mar y olas",
        blurb: "Lee el mar, analiza tu surfing y captura la sesión.",
        items: [
            {
                label: "Webcam y parte",
                hint: "Zurriola en vivo",
                href: `${route("servicios.webcams")}#webcam-directo`,
                icon: Video,
                featured: true,
            },
            {
                label: "Comparador de maniobras",
                hint: "AutoCoach",
                href: route("autocoach.index"),
                icon: GitCompareArrows,
            },
            {
                label: "Videocorrecciones",
                hint: "Análisis técnico",
                href: route("servicios.videograbaciones"),
                icon: Clapperboard,
            },
            {
                label: "Fotografía",
                hint: "Sesiones en el agua",
                href: route("servicios.fotografia"),
                icon: Camera,
            },
        ],
    },
    {
        title: "Material y tienda",
        blurb: "Alquila, compra o encuentra tu próxima tabla.",
        items: [
            {
                label: "Alquiler de tablas",
                hint: "Por horas o días",
                href: route("rentals.surfboards.index"),
                icon: Layers,
                featured: true,
            },
            {
                label: "Tienda S4",
                hint: "Material oficial",
                href: route("tienda"),
                icon: ShoppingBag,
            },
            {
                label: "Tablas segunda mano",
                hint: "Tablas revisadas",
                href: route("second-hand.index"),
                icon: Tag,
            },
            {
                label: "Subastas",
                hint: "Pujas activas",
                href: route("auctions.index"),
                icon: Gavel,
            },
        ],
    },
    {
        title: "Club y taller",
        blurb: "Taquilla, reparaciones y comunidad del club.",
        items: [
            {
                label: "Taquillas",
                hint: "Planes y cuotas",
                href: route("taquillas.planes"),
                icon: ShieldCheck,
                featured: true,
            },
            {
                label: "Reparación de tablas",
                hint: "Ding y epoxy",
                href: route("servicios"),
                icon: Wrench,
            },
            {
                label: "Reparación de neoprenos",
                hint: "Parches y costuras",
                href: route("servicios.reparacionNeoprenos"),
                icon: Shirt,
            },
            {
                label: "Blog educativo",
                hint: "Taller S4",
                href: route("taller.index"),
                icon: BookOpen,
            },
            {
                label: "Sobre nosotros",
                hint: "Escuela y club",
                href: route("nosotros"),
                icon: MapPin,
            },
        ],
    },
];

function FeaturedLink({ item, theme }) {
    const Icon = item.icon;

    return (
        <Link
            href={item.href}
            className={`group relative flex min-h-[4.5rem] items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r px-4 py-3.5 shadow-lg transition duration-300 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${theme.featured}`}
        >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white ring-1 ring-white/20">
                <Icon className="h-5 w-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-white sm:text-base">{item.label}</span>
                {item.hint ? (
                    <span className="mt-0.5 block text-xs text-white/80">{item.hint}</span>
                ) : null}
            </span>
            <ArrowUpRight
                className="h-4 w-4 shrink-0 text-white/70 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white"
                aria-hidden
            />
        </Link>
    );
}

function CompactLink({ item, theme }) {
    const Icon = item.icon;

    return (
        <Link
            href={item.href}
            className={`group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40 ${theme.hover}`}
        >
            <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ${theme.icon}`}
            >
                <Icon className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1 leading-tight">
                <span className="block text-sm font-semibold text-white">{item.label}</span>
                {item.hint ? (
                    <span className="mt-0.5 block text-[11px] text-slate-400">{item.hint}</span>
                ) : null}
            </span>
            <ArrowRight
                className="h-3.5 w-3.5 shrink-0 text-slate-500 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100"
                aria-hidden
            />
        </Link>
    );
}

function CategoryPanel({ grupo }) {
    const theme = GROUP_THEMES[grupo.title] ?? GROUP_THEMES.Clases;
    const featured = grupo.items.find((item) => item.featured) ?? grupo.items[0];
    const rest = grupo.items.filter((item) => item !== featured);

    return (
        <article
            className={`flex flex-col rounded-2xl border p-5 backdrop-blur-sm sm:p-6 ${theme.card}`}
        >
            <header className="mb-4">
                <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${theme.dot}`} aria-hidden />
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">
                        {grupo.title}
                    </h3>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{grupo.blurb}</p>
            </header>

            <FeaturedLink item={featured} theme={theme} />

            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {rest.map((item) => (
                    <li key={item.label}>
                        <CompactLink item={item} theme={theme} />
                    </li>
                ))}
            </ul>
        </article>
    );
}

/**
 * Hub de exploración home: bento por intención (clases, mar, material, club).
 * Sustituye el directorio plano de filas blancas.
 */
export default function HomeExploraDirectorio() {
    return (
        <section
            className="relative mt-12 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950 via-[#0a2230] to-slate-950 px-5 py-8 shadow-2xl shadow-slate-900/30 sm:mt-14 sm:px-8 sm:py-10"
            aria-labelledby="directorio-servicios-heading"
        >
            <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(34,211,238,0.12),_transparent_50%)]"
                aria-hidden
            />
            <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(52,211,153,0.08),_transparent_55%)]"
                aria-hidden
            />

            <div className="relative mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
                <div className="max-w-xl">
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300/90">
                        Explora S4
                    </p>
                    <h2
                        id="directorio-servicios-heading"
                        className="mt-2 font-heading text-2xl font-extrabold tracking-tight text-white sm:text-3xl lg:text-4xl"
                    >
                        Tu club en Zurriola,
                        <span className="mt-1 block bg-gradient-to-r from-cyan-200 to-emerald-200 bg-clip-text text-transparent">
                            de un vistazo
                        </span>
                    </h2>
                    <p className="mt-3 text-sm leading-relaxed text-slate-400 sm:text-base">
                        Clases, condiciones del mar, material y servicios del club — elige por intención,
                        no por menú infinito.
                    </p>
                </div>
                <Link
                    href={route("nosotros")}
                    className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/25 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 sm:self-auto"
                >
                    Conoce el club
                    <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
            </div>

            <div className="relative grid gap-4 lg:grid-cols-2 lg:gap-5">
                {directorioServicios.map((grupo) => (
                    <CategoryPanel key={grupo.title} grupo={grupo} />
                ))}
            </div>
        </section>
    );
}
