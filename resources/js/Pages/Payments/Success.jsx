import { useEffect } from "react";
import { Head, Link } from "@inertiajs/react";
import S4Button from "@/components/S4Button";

const PAYABLE_LABELS = {
    Pedido: { label: "tu pedido", icon: "🛍️", link: "/mis-pedidos" },
    Booking: { label: "tu reserva de alquiler", icon: "🏄", link: "/alquileres" },
    LessonUser: { label: "tu clase", icon: "🌊", link: "/mis-reservas" },
    UserBono: { label: "tu bono VIP", icon: "⭐", link: "/bonos" },
    PagoCuota: { label: "tu plan de taquilla", icon: "🔐", link: "/taquilla/planes" },
    Auction: { label: "tu subasta", icon: "🔨", link: "/subastas" },
};

export default function PaymentSuccess({ status, payableType, payableId, redirectTo, fiscalInvoice = null }) {
    const info = PAYABLE_LABELS[payableType] ?? { label: "tu pago", icon: "✅", link: "/" };
    const isPending = status === "pending";
    const hasFiscalLink = Boolean(fiscalInvoice?.detail_url);

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
            <div className="s4-surface-light flex min-h-screen flex-col items-center justify-center px-4 py-16">
                <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-lg ring-1 ring-slate-100">
                    <div className="mb-6 flex justify-center">
                        <span className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-50 text-5xl ring-4 ring-emerald-100">
                            {isPending ? "⏳" : "✅"}
                        </span>
                    </div>

                    <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900">
                        {isPending
                            ? "Pago en proceso…"
                            : `¡Pago confirmado! ${info.icon}`}
                    </h1>

                    <p className="mt-3 text-sm leading-relaxed text-slate-600">
                        {isPending
                            ? "Estamos procesando tu pago. Recibirás una confirmación en breve."
                            : `Hemos confirmado ${info.label}. Serás redirigido automáticamente en unos segundos.`}
                    </p>

                    {hasFiscalLink ? (
                        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left">
                            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                                Factura TicketBAI
                            </p>
                            <p className="mt-1 text-sm text-slate-600">
                                {fiscalInvoice.is_ready
                                    ? "Ya puedes ver el identificador, el QR y descargar el PDF."
                                    : "La factura fiscal se está registrando. Puedes abrirla y refrescar en unos minutos."}
                            </p>
                            <S4Button
                                href={fiscalInvoice.detail_url}
                                variant="accent"
                                className="mt-3 bg-emerald-600 font-semibold text-white hover:bg-emerald-500"
                            >
                                Ver factura / TicketBAI
                            </S4Button>
                        </div>
                    ) : null}

                    <div className="mt-6 h-1 w-full overflow-hidden rounded-full bg-slate-200">
                        <div
                            className="h-full rounded-full bg-emerald-500 transition-all"
                            style={{
                                width: "100%",
                                animation: `shrink ${hasFiscalLink ? "12s" : "6s"} linear forwards`,
                            }}
                        />
                    </div>

                    <S4Button
                        href={redirectTo ?? info.link}
                        variant="secondary"
                        className="mt-6 border-emerald-200 bg-emerald-50 font-semibold text-emerald-800 hover:bg-emerald-100"
                    >
                        Ver {info.label}
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </S4Button>
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
