import React, { useState } from "react";
import { Head, router } from "@inertiajs/react";
import { ChevronDown, ChevronRight, FileText, FileX, Receipt, Search, Star } from "lucide-react";

const ENTITY_LABELS = {
    tienda: "bg-sky-900/40 text-sky-100 ring-sky-600/30",
    bono: "bg-violet-900/40 text-violet-100 ring-violet-600/30",
    alquiler: "bg-amber-900/35 text-amber-100 ring-amber-600/25",
    clase: "bg-emerald-900/35 text-emerald-100 ring-emerald-600/30",
    taquilla: "bg-rose-900/35 text-rose-100 ring-rose-600/25",
};

function statusBadgeClass(status) {
    if (status === "confirmed") return "bg-emerald-900/35 text-emerald-100 ring-1 ring-emerald-600/30";
    if (status === "rejected") return "bg-rose-900/40 text-rose-100 ring-1 ring-rose-500/35";
    if (status === "pending") return "bg-amber-900/35 text-amber-100 ring-1 ring-amber-600/25";
    return "bg-gray-800 text-gray-200 ring-1 ring-gray-600/40";
}

function entityBadgeClass(entity) {
    return ENTITY_LABELS[entity] || "bg-gray-800 text-gray-200 ring-gray-600/40";
}

export default function Clients({ clients = [], pagination = { current_page: 1, last_page: 1, total: 0 }, filters = {} }) {
    const [search, setSearch] = useState(filters.search || "");
    const [expandedUserId, setExpandedUserId] = useState(null);
    const [historyByUser, setHistoryByUser] = useState({});
    const [loadingUserId, setLoadingUserId] = useState(null);
    const [errorUserId, setErrorUserId] = useState(null);
    const [proofModal, setProofModal] = useState(null);

    const submitSearch = (e) => {
        e.preventDefault();
        router.get(route("admin.payments.clients.index"), { search }, { preserveState: true, preserveScroll: true });
    };

    const goToPage = (page) => {
        router.get(route("admin.payments.clients.index"), { search, page }, { preserveState: true, preserveScroll: true });
    };

    const toggleClient = async (userId) => {
        if (expandedUserId === userId) {
            setExpandedUserId(null);
            return;
        }
        setExpandedUserId(userId);
        setErrorUserId(null);
        if (historyByUser[userId]) {
            return;
        }

        setLoadingUserId(userId);
        try {
            const url = route("admin.payments.clients.history", userId);
            const res = window?.axios?.get ? await window.axios.get(url) : await fetch(url).then((r) => r.json());
            const rows = res?.data?.rows ?? res?.rows ?? [];
            setHistoryByUser((prev) => ({ ...prev, [userId]: rows }));
        } catch (e) {
            setErrorUserId(userId);
        } finally {
            setLoadingUserId(null);
        }
    };

    const openProof = (url, isStripe) => {
        if (!url) return;
        if (isStripe) {
            window.open(url, "_blank", "noopener,noreferrer");
            return;
        }
        setProofModal(url);
    };

    return (
        <>
            <Head title="Pagos · Clientes" />
            <div className="mx-auto max-w-6xl space-y-5 p-6 text-gray-200">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-white">Pagos · Clientes</h1>
                    <span className="rounded-full bg-gray-800 px-3 py-1 text-xs font-semibold text-gray-300 ring-1 ring-gray-600/40">
                        {pagination.total} clientes
                    </span>
                </div>

                <form onSubmit={submitSearch} className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar por nombre, email o teléfono…"
                            className="w-full rounded-xl border border-gray-600 bg-gray-800 px-9 py-2.5 text-sm text-gray-100 outline-none transition focus:border-sky-500"
                        />
                    </div>
                    <button type="submit" className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-500">
                        Buscar
                    </button>
                </form>

                <div className="overflow-hidden rounded-2xl border border-gray-700 bg-gray-900">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-800 text-gray-200">
                            <tr>
                                <th className="w-8 px-3 py-3" />
                                <th className="px-4 py-3 text-left">Cliente</th>
                                <th className="px-4 py-3 text-left">Email</th>
                                <th className="px-4 py-3 text-left">Teléfono</th>
                                <th className="px-4 py-3 text-left">Pagos confirmados</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clients.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                                        Sin clientes para este filtro.
                                    </td>
                                </tr>
                            ) : (
                                clients.map((client) => {
                                    const isOpen = expandedUserId === client.id;
                                    const rows = historyByUser[client.id] || [];
                                    const isLoading = loadingUserId === client.id;
                                    const hasError = errorUserId === client.id;

                                    return (
                                        <React.Fragment key={client.id}>
                                            <tr
                                                className="cursor-pointer border-t border-gray-700 hover:bg-gray-800/60"
                                                onClick={() => toggleClient(client.id)}
                                            >
                                                <td className="px-3 py-3 text-gray-400">
                                                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                </td>
                                                <td className="px-4 py-3 font-medium text-gray-100">
                                                    <span className="inline-flex items-center gap-1.5">
                                                        {client.name}
                                                        {client.is_vip ? <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> : null}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-gray-300">{client.email || "—"}</td>
                                                <td className="px-4 py-3 text-gray-300">{client.phone || "—"}</td>
                                                <td className="px-4 py-3">
                                                    <span className="inline-flex items-center rounded-full bg-gray-800 px-2.5 py-0.5 text-xs font-semibold text-gray-200 ring-1 ring-gray-600/40">
                                                        {client.payment_count}
                                                    </span>
                                                </td>
                                            </tr>
                                            {isOpen ? (
                                                <tr className="border-t border-gray-800 bg-gray-950/60">
                                                    <td colSpan={5} className="px-4 py-4">
                                                        {isLoading ? (
                                                            <p className="text-sm text-gray-400">Cargando historial…</p>
                                                        ) : hasError ? (
                                                            <p className="text-sm text-rose-300">No se pudo cargar el historial de este cliente.</p>
                                                        ) : rows.length === 0 ? (
                                                            <p className="text-sm text-gray-400">Este cliente no tiene pagos registrados.</p>
                                                        ) : (
                                                            <div className="overflow-auto rounded-xl border border-gray-800">
                                                                <table className="min-w-full text-xs">
                                                                    <thead className="bg-gray-800/80 text-gray-300">
                                                                        <tr>
                                                                            <th className="px-3 py-2 text-left">Tipo</th>
                                                                            <th className="px-3 py-2 text-left">Detalle</th>
                                                                            <th className="px-3 py-2 text-left">Fecha</th>
                                                                            <th className="px-3 py-2 text-left">Importe</th>
                                                                            <th className="px-3 py-2 text-left">Estado</th>
                                                                            <th className="px-3 py-2 text-left">Justificante</th>
                                                                            <th className="px-3 py-2 text-left">Factura</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {rows.map((row) => (
                                                                            <tr key={`${row.entity}-${row.id}`} className="border-t border-gray-800 text-gray-200">
                                                                                <td className="px-3 py-2">
                                                                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-semibold ring-1 ${entityBadgeClass(row.entity)}`}>
                                                                                        {row.entity_label}
                                                                                    </span>
                                                                                </td>
                                                                                <td className="px-3 py-2">{row.description}</td>
                                                                                <td className="px-3 py-2 text-gray-400">{row.created_at_human || "—"}</td>
                                                                                <td className="px-3 py-2 font-semibold text-white">
                                                                                    {(Number(row.amount_cents || 0) / 100).toFixed(2)} €
                                                                                </td>
                                                                                <td className="px-3 py-2">
                                                                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-semibold ${statusBadgeClass(row.status)}`}>
                                                                                        {row.status_label}
                                                                                    </span>
                                                                                </td>
                                                                                <td className="px-3 py-2">
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => openProof(row.proof_url, row.proof_is_stripe_receipt)}
                                                                                        disabled={!row.proof_url}
                                                                                        className={`inline-flex h-6 w-6 items-center justify-center rounded-full ring-1 ${
                                                                                            row.proof_url
                                                                                                ? "bg-gray-800 text-sky-200 ring-gray-600/50 hover:bg-gray-700"
                                                                                                : "cursor-not-allowed bg-gray-900 text-gray-600 ring-gray-800"
                                                                                        }`}
                                                                                        title={row.proof_url ? "Ver comprobante" : "Sin comprobante"}
                                                                                    >
                                                                                        {row.proof_url ? <FileText className="h-3.5 w-3.5" /> : <FileX className="h-3.5 w-3.5" />}
                                                                                    </button>
                                                                                </td>
                                                                                <td className="px-3 py-2">
                                                                                    {row.fiscal_invoice_url ? (
                                                                                        <a
                                                                                            href={row.fiscal_invoice_url}
                                                                                            className="inline-flex items-center gap-1 rounded-full bg-gray-800 px-2 py-0.5 text-sky-200 ring-1 ring-gray-600/50 hover:bg-gray-700"
                                                                                            title={row.fiscal_invoice_ready ? "Ver factura" : "Factura en trámite"}
                                                                                        >
                                                                                            <Receipt className="h-3.5 w-3.5" />
                                                                                        </a>
                                                                                    ) : (
                                                                                        <span className="text-gray-600">—</span>
                                                                                    )}
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ) : null}
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {pagination.last_page > 1 ? (
                    <div className="flex items-center justify-between">
                        <button
                            type="button"
                            disabled={pagination.current_page <= 1}
                            onClick={() => goToPage(pagination.current_page - 1)}
                            className="rounded-lg bg-gray-800 px-3 py-2 text-sm font-semibold text-gray-200 ring-1 ring-gray-600/40 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Anterior
                        </button>
                        <span className="text-sm text-gray-400">
                            Página {pagination.current_page} de {pagination.last_page}
                        </span>
                        <button
                            type="button"
                            disabled={pagination.current_page >= pagination.last_page}
                            onClick={() => goToPage(pagination.current_page + 1)}
                            className="rounded-lg bg-gray-800 px-3 py-2 text-sm font-semibold text-gray-200 ring-1 ring-gray-600/40 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Siguiente
                        </button>
                    </div>
                ) : null}
            </div>

            {proofModal ? (
                <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/70 p-4" onClick={() => setProofModal(null)}>
                    <div className="w-full max-w-5xl rounded-2xl bg-white p-4" onClick={(e) => e.stopPropagation()}>
                        <div className="mb-3 flex justify-end">
                            <button type="button" className="rounded-md bg-slate-200 px-3 py-1 text-slate-700" onClick={() => setProofModal(null)}>
                                Cerrar
                            </button>
                        </div>
                        <iframe title="Comprobante" src={proofModal} className="h-[75vh] w-full rounded-lg" />
                    </div>
                </div>
            ) : null}
        </>
    );
}
