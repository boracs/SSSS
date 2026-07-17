import { Head, Link } from "@inertiajs/react";

function euros(cents) {
    return (Number(cents || 0) / 100).toFixed(2).replace(".", ",") + " €";
}

export default function FiscalInvoice({ invoice, pending_message = null }) {
    const ready = Boolean(invoice?.is_ready);

    return (
        <>
            <Head title="Factura TicketBAI" />
            <div className="min-h-screen bg-slate-950 px-4 py-12 text-white">
                <div className="mx-auto w-full max-w-lg rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300/80">
                        Factura fiscal · TicketBAI
                    </p>
                    <h1 className="mt-2 text-2xl font-bold tracking-tight">
                        {ready ? "Tu factura está lista" : invoice?.status_label || "Factura"}
                    </h1>
                    <p className="mt-2 text-sm text-white/65">
                        Importe: <span className="font-semibold text-white">{euros(invoice?.amount_cents)}</span>
                    </p>

                    {pending_message ? (
                        <p className="mt-4 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                            {pending_message}
                        </p>
                    ) : null}

                    {ready && invoice?.tbai_identifier ? (
                        <div className="mt-6 space-y-2">
                            <p className="text-xs uppercase tracking-wide text-white/50">Identificador TicketBAI</p>
                            <p className="break-all rounded-xl bg-black/30 px-4 py-3 font-mono text-sm text-emerald-200">
                                {invoice.tbai_identifier}
                            </p>
                            {String(invoice.tbai_identifier).startsWith("http") ? (
                                <a
                                    href={invoice.tbai_identifier}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-block text-sm text-emerald-300 underline underline-offset-2"
                                >
                                    Verificar en Hacienda Foral
                                </a>
                            ) : null}
                        </div>
                    ) : null}

                    {ready && invoice?.qr_image_src ? (
                        <div className="mt-6 flex flex-col items-center gap-3">
                            <p className="text-xs uppercase tracking-wide text-white/50">Código QR TicketBAI</p>
                            <img
                                src={invoice.qr_image_src}
                                alt="Código QR TicketBAI de la factura"
                                className="h-44 w-44 rounded-xl bg-white p-2"
                            />
                        </div>
                    ) : null}

                    <div className="mt-8 flex flex-col gap-3">
                        {invoice?.pdf_url ? (
                            <a
                                href={invoice.pdf_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
                            >
                                Descargar / ver PDF de la factura
                            </a>
                        ) : null}
                        <Link
                            href="/"
                            className="inline-flex items-center justify-center rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/5"
                        >
                            Volver al inicio
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
}
