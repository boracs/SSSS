import React from "react";
import { Head, Link, router } from "@inertiajs/react";
import {
    FileText,
    Download,
    ChevronLeft,
    ChevronRight,
    Receipt,
    Clock,
} from "lucide-react";
import { formatEurFromCents } from "@/utils/money";

const formatDate = (value) => {
    if (!value) return "—";
    return new Date(value).toLocaleDateString("es-ES", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
};

const STATUS_STYLES = {
    registered: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    processing: "bg-amber-50 text-amber-700 ring-amber-200",
    pending: "bg-slate-100 text-slate-600 ring-slate-200",
    failed: "bg-rose-50 text-rose-700 ring-rose-200",
};

const StatusBadge = ({ status, label }) => (
    <span
        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
            STATUS_STYLES[status] || STATUS_STYLES.pending
        }`}
    >
        {label}
    </span>
);

const CategoryChip = ({ active, enabled, label, onClick }) => (
    <button
        type="button"
        onClick={enabled || !onClick ? onClick : undefined}
        disabled={!enabled && !!onClick}
        title={!enabled && onClick ? "Próximamente" : undefined}
        className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
            active
                ? "bg-slate-900 text-white"
                : enabled
                  ? "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                  : "cursor-not-allowed bg-slate-50 text-slate-400 ring-1 ring-slate-100"
        }`}
    >
        {label}
        {!enabled ? <span className="text-[10px] font-normal">(pronto)</span> : null}
    </button>
);

export default function MyInvoices({
    items = [],
    categories = [],
    selected_category: selectedCategory = "all",
    meta = { current_page: 1, last_page: 1, total: 0, per_page: 15 },
}) {
    const selectedOption = categories.find((c) => c.value === selectedCategory) || null;
    const selectedIsDisabled = selectedOption ? !selectedOption.enabled : false;

    const goToCategory = (value) => {
        router.get(
            route("my-invoices.index"),
            value === "all" ? {} : { category: value },
            { preserveState: true, preserveScroll: true },
        );
    };

    const goToPage = (page) => {
        router.get(
            route("my-invoices.index"),
            selectedCategory === "all" ? { page } : { category: selectedCategory, page },
            { preserveState: true, preserveScroll: true },
        );
    };

    return (
        <>
            <Head title="Mis facturas" />
            <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
                <div className="mx-auto w-full max-w-4xl">
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                            Mis facturas
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Facturas fiscales TicketBAI de tus compras, bonos, taquillas, alquileres y clases.
                        </p>
                    </div>

                    <div className="mb-6 flex flex-wrap gap-2">
                        <CategoryChip
                            active={selectedCategory === "all"}
                            enabled
                            label="Todas"
                            onClick={() => goToCategory("all")}
                        />
                        {categories.map((c) => (
                            <CategoryChip
                                key={c.value}
                                active={selectedCategory === c.value}
                                enabled={c.enabled}
                                label={c.label}
                                onClick={c.enabled ? () => goToCategory(c.value) : undefined}
                            />
                        ))}
                    </div>

                    {selectedIsDisabled ? (
                        <div className="mb-6 flex items-start gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
                            <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                            <p>
                                La facturación fiscal para <strong>{selectedOption?.label}</strong> todavía no
                                está activada. En cuanto lo esté, tus facturas de esta categoría aparecerán aquí
                                automáticamente.
                            </p>
                        </div>
                    ) : null}

                    {items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-2xl bg-white px-6 py-16 text-center shadow-sm ring-1 ring-slate-200">
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                <Receipt className="h-7 w-7" />
                            </div>
                            <h2 className="mt-4 text-lg font-semibold text-slate-800">
                                {selectedIsDisabled
                                    ? "Todavía no hay facturas en esta categoría"
                                    : "Aún no tienes facturas registradas"}
                            </h2>
                            <p className="mt-1 max-w-sm text-sm text-slate-500">
                                {selectedIsDisabled
                                    ? "Se activará próximamente. Tu pago ya está confirmado en cualquier caso."
                                    : "Cuando se emita una factura fiscal de tus compras, aparecerá aquí con su estado y el PDF descargable."}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {items.map((invoice) => (
                                <div
                                    key={invoice.id}
                                    className="flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div className="flex min-w-0 items-center gap-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                                            <FileText className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-slate-800">
                                                {invoice.description}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {invoice.category_label} · {formatDate(invoice.issued_at || invoice.created_at)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                                        <span className="text-base font-bold text-slate-900">
                                            {formatEurFromCents(invoice.amount_cents)}
                                        </span>
                                        <StatusBadge status={invoice.status} label={invoice.status_label} />
                                        <div className="flex items-center gap-2">
                                            <Link
                                                href={invoice.detail_url}
                                                className="inline-flex items-center rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                                            >
                                                Ver
                                            </Link>
                                            {invoice.pdf_url ? (
                                                <a
                                                    href={invoice.pdf_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                                                >
                                                    <Download className="h-3.5 w-3.5" />
                                                    PDF
                                                </a>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {meta.last_page > 1 ? (
                        <div className="mt-6 flex items-center justify-between">
                            <button
                                type="button"
                                disabled={meta.current_page <= 1}
                                onClick={() => goToPage(meta.current_page - 1)}
                                className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-600 ring-1 ring-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Anterior
                            </button>
                            <span className="text-sm text-slate-500">
                                Página {meta.current_page} de {meta.last_page} · {meta.total} facturas
                            </span>
                            <button
                                type="button"
                                disabled={meta.current_page >= meta.last_page}
                                onClick={() => goToPage(meta.current_page + 1)}
                                className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-600 ring-1 ring-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Siguiente
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    ) : null}
                </div>
            </div>
        </>
    );
}
