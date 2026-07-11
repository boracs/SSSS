import React from "react";
import { motion } from "framer-motion";

const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    visible: (i = 0) => ({
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] },
    }),
};

export function TallerPageShell({ children, className = "" }) {
    return (
        <div className={`relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-cyan-50/30 ${className}`}>
            <div aria-hidden className="pointer-events-none absolute inset-0">
                <div className="absolute -left-24 top-0 h-80 w-80 rounded-full bg-cyan-400/15 blur-3xl" />
                <div className="absolute -right-20 top-1/4 h-72 w-72 rounded-full bg-[#0f5f74]/10 blur-3xl" />
                <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-orange-300/10 blur-3xl" />
            </div>
            <div className="relative">{children}</div>
        </div>
    );
}

export function TallerHero({ badge, title, description, children }) {
    return (
        <motion.header
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-[0_24px_60px_-28px_rgba(15,95,116,0.35)] backdrop-blur-sm sm:p-10"
        >
            <div
                aria-hidden
                className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-to-br from-cyan-400/25 to-transparent blur-2xl"
            />
            <div
                aria-hidden
                className="pointer-events-none absolute -bottom-16 -left-8 h-36 w-36 rounded-full bg-gradient-to-tr from-[#0f5f74]/15 to-transparent blur-2xl"
            />

            {badge ? (
                <motion.div variants={fadeUp} custom={0.1} className="mb-4">
                    {badge}
                </motion.div>
            ) : null}

            <motion.h1
                variants={fadeUp}
                custom={0.15}
                className="font-heading text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]"
            >
                {title}
            </motion.h1>

            {description ? (
                <motion.p
                    variants={fadeUp}
                    custom={0.2}
                    className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg"
                >
                    {description}
                </motion.p>
            ) : null}

            {children ? (
                <motion.div variants={fadeUp} custom={0.25} className="mt-6">
                    {children}
                </motion.div>
            ) : null}
        </motion.header>
    );
}

export function TallerBadge({ icon: Icon, label, variant = "default" }) {
    const classes =
        variant === "light"
            ? "inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white backdrop-blur-sm"
            : "inline-flex items-center gap-2 rounded-full border border-[#0f5f74]/15 bg-gradient-to-r from-[#0f5f74]/8 to-cyan-500/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#0f5f74]";

    return (
        <span className={classes}>
            {Icon ? (
                <Icon
                    className={variant === "light" ? "h-3.5 w-3.5 text-cyan-200" : "h-3.5 w-3.5 text-cyan-600"}
                    aria-hidden="true"
                />
            ) : null}
            {label}
        </span>
    );
}

export function ReadingProgressBar() {
    const [progress, setProgress] = React.useState(0);

    React.useEffect(() => {
        const onScroll = () => {
            const el = document.documentElement;
            const scrollTop = el.scrollTop || document.body.scrollTop;
            const height = el.scrollHeight - el.clientHeight;
            setProgress(height > 0 ? Math.min(100, (scrollTop / height) * 100) : 0);
        };
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <div className="fixed inset-x-0 top-0 z-[80] h-1 bg-slate-200/80">
            <motion.div
                className="h-full bg-gradient-to-r from-[#0f5f74] via-cyan-500 to-cyan-400"
                style={{ width: `${progress}%` }}
                layout
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
        </div>
    );
}

export { fadeUp, motion };
