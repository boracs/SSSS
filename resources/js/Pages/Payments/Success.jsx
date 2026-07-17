import { useEffect } from "react";
import { Head, Link } from "@inertiajs/react";

const PAYABLE_LABELS = {
    Pedido: { label: "tu pedido", icon: "🛍️", link: "/mis-pedidos" },
    Booking: { label: "tu reserva de alquiler", icon: "🏄", link: "/alquileres" },
    LessonUser: { label: "tu clase", icon: "🌊", link: "/mis-reservas" },
    UserBono: { label: "tu bono VIP", icon: "⭐", link: "/bonos" },
    PagoCuota: { label: "tu plan de taquilla", icon: "🔐", link: "/taquillas" },
};

export default function PaymentSuccess({ status, payableType, payableId, redirectTo, fiscalInvoice = null }) {
    const info = PAYABLE_LABELS[payableType] ?? { label: "tu pago", icon: "✅", link: "/" };
    const isPending = status === "pending";
    const hasFiscalLink = Boolean(fiscalInvoice?.detail_url);

    // Auto-redirigir tras 6s (si hay factura, alargamos un poco para que pueda abrirla)
    useEffect(() => {
        const delay = hasFiscalLink ? 12000 : 6000;
        const t = setTimeout(() => {
            window.location.href = redirectTo ?? info.link;
        }, delay);
        return () => clearTimeout(t);
    }, [redirectTo, info.link, hasFiscalLink]);

    return (
        <>
            <Head title="Pago completado" />
            <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-4 py-16 text-white">
                <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl backdrop-blur-sm">
                    <div className="mb-6 flex justify-center">
                        <span className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500/20 text-5xl ring-4 ring-emerald-500/30">
                            {isPending ? "⏳" : "✅"}
                        </span>
                    </div>

                    <h1 className="text-2xl font-bold tracking-tight text-white">
                        {isPending
                            ? "Pago en proceso…"
                            : `¡Pago confirmado! ${info.icon}`}
                    </h1>

                    <p className="mt-3 text-sm leading-relaxed text-white/70">
                        {isPending
                            ? "Estamos procesando tu pago. Recibirás una confirmación en breve."
                            : `Hemos confirmado ${info.label}. Serás redirigido automáticamente en unos segundos.`}
                    </p>

                    {hasFiscalLink ? (
                        <div className="mt-5 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-4 text-left">
                            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200/80">
                                Factura TicketBAI
                            </p>
                            <p className="mt-1 text-sm text-white/75">
                                {fiscalInvoice.is_ready
                                    ? "Ya puedes ver el identificador, el QR y descargar el PDF."
                                    : "La factura fiscal se está registrando. Puedes abrirla y refrescar en unos minutos."}
                            </p>
                            <Link
                                href={fiscalInvoice.detail_url}
                                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
                            >
                                Ver factura / TicketBAI
                            </Link>
                        </div>
                    ) : null}

                    <div className="mt-6 h-1 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                            className="h-full rounded-full bg-emerald-500 transition-all"
                            style={{
                                width: "100%",
                                animation: `shrink ${hasFiscalLink ? "12s" : "6s"} linear forwards`,
                            }}
                        />
                    </div>

                    <Link
                        href={redirectTo ?? info.link}
                        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-500/20 px-6 py-3 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/30"
                    >
                        Ver {info.label}
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </Link>
                </div>
            </div>

            <style>{`
                @keyframes shrink {
                    from { width: 100%; }
                    to   { width: 0%; }
                }
            `}</style>
        </>
    );
}
