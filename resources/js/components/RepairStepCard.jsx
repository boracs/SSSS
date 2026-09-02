import { Sparkles } from "lucide-react";

const ACCENTS = {
    cyan: {
        connector: "from-cyan-400/50 to-cyan-400/10",
        stepBadge: "border-cyan-400/40 bg-cyan-500/15 text-cyan-200",
        iconBox: "bg-cyan-500/10 text-cyan-300 ring-cyan-400/25",
        highlight: "border-cyan-500/20 bg-cyan-500/10 text-cyan-200",
    },
    violet: {
        connector: "from-violet-400/50 to-violet-400/10",
        stepBadge: "border-violet-400/40 bg-violet-500/15 text-violet-200",
        iconBox: "bg-violet-500/10 text-violet-300 ring-violet-400/25",
        highlight: "border-violet-500/20 bg-violet-500/10 text-violet-200",
    },
};

/**
 * Paso de proceso de reparación (tablas: accent="cyan"; neoprenos: accent="violet").
 * Renderiza un <li>: úsalo siempre dentro de un <ol>.
 * Iconos decorativos → aria-hidden.
 */
export default function RepairStepCard({
    step,
    icon: Icon,
    title,
    body,
    highlight,
    isLast = false,
    accent = "cyan",
}) {
    const c = ACCENTS[accent] ?? ACCENTS.cyan;

    return (
        <li className="relative flex gap-4 sm:gap-6">
            {!isLast ? (
                <div
                    className={`absolute left-[1.15rem] top-12 hidden h-[calc(100%-0.5rem)] w-px bg-gradient-to-b ${c.connector} sm:block`}
                    aria-hidden
                />
            ) : null}
            <div
                className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${c.stepBadge} text-sm font-bold ring-4 ring-slate-950 sm:h-10 sm:w-10`}
            >
                {step}
            </div>
            <article className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm sm:p-6">
                <div
                    className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ring-1 ${c.iconBox}`}
                >
                    <Icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="text-lg font-bold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{body}</p>
                <p
                    className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${c.highlight}`}
                >
                    <Sparkles className="h-3 w-3" aria-hidden />
                    {highlight}
                </p>
            </article>
        </li>
    );
}
