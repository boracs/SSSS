import React, { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { Head, Link } from "@inertiajs/react";
import { ArrowLeft } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";

export const authInputClass =
    "mt-1.5 block w-full rounded-xl border border-white/15 bg-slate-900/70 px-3.5 py-2.5 text-sm text-white shadow-sm placeholder:text-slate-500 transition focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/25";

export const authLabelClass = "block text-xs font-semibold uppercase tracking-wide text-slate-300";

export const AuthTextInput = forwardRef(function AuthTextInput(
    { className = "", isFocused = false, ...props },
    ref,
) {
    const localRef = useRef(null);

    useImperativeHandle(ref, () => ({
        focus: () => localRef.current?.focus(),
    }));

    useEffect(() => {
        if (isFocused) {
            localRef.current?.focus();
        }
    }, [isFocused]);

    return (
        <input
            {...props}
            ref={localRef}
            className={`${authInputClass} ${className}`.trim()}
        />
    );
});

export function AuthSubmitButton({ children, disabled, className = "" }) {
    return (
        <button
            type="submit"
            disabled={disabled}
            className={`inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-cyan-900/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        >
            {children}
        </button>
    );
}

export default function AuthShell({
    title,
    subtitle,
    headTitle,
    maxWidth = "max-w-md",
    children,
    footer,
}) {
    return (
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-950 via-[#0a2230] to-slate-950 px-4 py-10 text-white sm:py-14">
            <Head title={headTitle ?? title} />

            <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
            <div className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-teal-500/10 blur-3xl" />

            <div className={`relative mx-auto w-full ${maxWidth}`}>
                <div className="mb-6 flex flex-col items-center gap-3 text-center">
                    <Link href={route("Pag_principal")} className="transition hover:opacity-90">
                        <BrandLogo variant="whiteMark" className="h-20 w-20" priority />
                    </Link>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/30 backdrop-blur-md sm:p-8">
                    <header className="mb-6 text-center">
                        <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                            {title}
                        </h1>
                        {subtitle ? (
                            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-400">
                                {subtitle}
                            </p>
                        ) : null}
                    </header>

                    {children}

                    {footer ? <div className="mt-6 border-t border-white/10 pt-5">{footer}</div> : null}
                </div>

                <div className="mt-6 flex justify-center">
                    <Link
                        href={route("Pag_principal")}
                        className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-cyan-500/30 hover:bg-white/10 hover:text-white"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Volver al inicio
                    </Link>
                </div>
            </div>
        </div>
    );
}
