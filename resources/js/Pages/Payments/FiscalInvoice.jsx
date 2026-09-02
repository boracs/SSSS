import { Head, Link } from "@inertiajs/react";
import S4Button from "@/components/S4Button";

function euros(cents) {
    return (Number(cents || 0) / 100).toFixed(2).replace(".", ",") + " €";
}

export default function FiscalInvoice({
    invoice,
    pending_message = null,
    back_url = "/",
    back_label = "Volver",
}) {
    const ready = Boolean(invoice?.is_ready);

    return (
        <>
            <Head title="Factura TicketBAI" />
            <div className="s4-surface-light min-h-screen px-4 py-12">
                <div className="mx-auto w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-lg ring-1 ring-slate-100">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                        Factura fiscal · TicketBAI
                    </p>
                    <h1 className="mt-2 font-heading text-2xl font-bold tracking-tight text-slate-900">
                        {ready ? "Tu factura está lista" : invoice?.status_label || "Factura"}
                    </h1>
                    <p className="mt-2 text-sm text-slate-600">
                        Importe: <span className="font-semibold text-slate-900">{euros(invoice?.amount_cents)}</span>
                    </p>

                    {pending_message ? (
                        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                            {pending_message}
                        </p>
                    ) : null}

                    {ready && invoice?.tbai_identifier ? (
                        <div className="mt-6 space-y-2">
                            <p className="text-xs uppercase tracking-wide text-slate-500">Identificador TicketBAI</p>
                            <p className="break-all rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm text-emerald-800">
                                {invoice.tbai_identifier}
                            </p>
                            {String(invoice.tbai_identifier).startsWith("http") ? (
                                <a
                                    href={invoice.tbai_identifier}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-block text-sm text-emerald-700 underline underline-offset-2 hover:text-emerald-800"
                                >
                                    Verificar en Hacienda Foral
                                </a>
                            ) : null}
                        </div>
                    ) : null}

                    {ready && invoice?.qr_image_src ? (
                        <div className="mt-6 flex flex-col items-center gap-3">
                            <p className="text-xs uppercase tracking-wide text-slate-500">Código QR TicketBAI</p>
                            <img
                                src={invoice.qr_image_src}
                                alt="Código QR TicketBAI de la factura"
                                className="h-44 w-44 rounded-xl border border-slate-200 bg-white p-2"
                            />
                        </div>
                    ) : null}

                    <div className="mt-8 flex flex-col gap-3">
                        {ready && invoice?.pdf_url ? (
                            <S4Button
                                href={invoice.pdf_url}
                                external
                                target="_blank"
                                rel="noopener noreferrer"
                                variant="accent"
                                className="bg-emerald-600 font-semibold text-white hover:bg-emerald-500"
                            >
                                Descargar / ver PDF de la factura
                            </S4Button>
                        ) : null}
                        <S4Button
                            href={back_url}
                            variant="secondary"
                            className="border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-50"
                        >
                            {back_label}
                        </S4Button>
                    </div>
                </div>
            </div>
        </>
    );
}
