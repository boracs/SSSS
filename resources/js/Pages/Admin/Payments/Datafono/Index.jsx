import React, { useState } from "react";
import { Head, router, usePage } from "@inertiajs/react";
import PageShell from "@/layouts/PageShell";
import Breadcrumbs from "@/components/Breadcrumbs";
import AccordionTrigger from "@/components/ui/AccordionTrigger";
import AdminTable from "@/components/admin/ui/AdminTable";
import AdminStatusBadge from "@/components/admin/ui/AdminStatusBadge";
import AdminButton from "@/components/admin/ui/AdminButton";
import AdminToast from "@/components/admin/ui/AdminToast";
import MostradorTicketModal from "@/components/admin/payments/MostradorTicketModal";

const CATEGORY_LABELS = {
    taquilla: "Taquilla",
    bono: "Bono",
    alquiler: "Alquiler",
    clase: "Clase",
    fotos: "Fotos",
    producto: "Producto",
};

const SOURCE_LABELS = {
    tpv: "TPV",
    manual_cash: "Efectivo",
};

const HACIENDA_TONE = {
    n_a: "text-slate-500",
    tpv: "text-slate-300",
    pending: "text-amber-300",
    processing: "text-sky-300",
    issued: "text-emerald-300",
    failed: "text-rose-300",
};

function HaciendaCell({ payment, onCommunicate, busy }) {
    const h = payment?.hacienda;
    if (!h) {
        return <span className="text-xs text-slate-500">—</span>;
    }

    return (
        <div className="flex flex-col items-start gap-1.5">
            <span className={`text-xs font-medium ${HACIENDA_TONE[h.code] || "text-slate-400"}`}>
                {h.label}
            </span>
            {h.can_communicate ? (
                <AdminButton
                    className="px-2 py-1 text-[11px]"
                    disabled={busy}
                    title="Enviar TicketBAI a Hacienda vía B2B"
                    onClick={() => onCommunicate(payment.id)}
                >
                    Comunicar a Hacienda
                </AdminButton>
            ) : null}
        </div>
    );
}

/** Nombre corto de terminal: "Datáfono 1 · Mostrador" → "Datáfono 1". */
function terminalShortLabel(payment) {
    const nombre = String(payment?.terminal_nombre || "").trim();
    if (nombre) {
        const short = nombre.split("·")[0].trim();
        if (short) return short;
    }
    const codigo = String(payment?.terminal_codigo || "").trim();
    return codigo || "—";
}

function fmtDate(value) {
    if (!value) return "—";
    return new Date(value).toLocaleString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function fmtDateCompact(value) {
    if (!value) return "—";
    return new Date(value).toLocaleString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function fmtServiceRange(from, until) {
    if (!from && !until) return null;
    if (from && until) {
        return `${fmtDateCompact(from)} → ${fmtDateCompact(until)}`;
    }
    return fmtDateCompact(from || until);
}

function formatAmountEur(amount) {
    return `${Number(amount).toLocaleString("es-ES", {
        minimumFractionDigits: 2,
    })} €`;
}

/**
 * Cliente + estado fusionados: evita repetir un badge "Pendiente" al lado de
 * un campo ya vacío. El propio texto/color de "Cliente" comunica el estado.
 */
function paymentClientInfo(p) {
    if (p.assigned_user_name) {
        return { label: p.assigned_user_name, tone: "assigned" };
    }
    if (p.guest_name) {
        return { label: p.guest_name, tone: "guest" };
    }
    if (p.status === "ignored") {
        return { label: "Ignorado", tone: "ignored" };
    }
    return { label: "Sin asignar", tone: "pending" };
}

const CLIENT_TONE_CLASSES = {
    assigned: "text-slate-100",
    guest: "text-amber-300/90",
    ignored: "text-slate-500",
    pending: "text-amber-300/80",
};

function paymentTicketLines(p) {
    return Array.isArray(p.ticket_lines) ? p.ticket_lines : [];
}

export default function DatafonoPaymentsIndex({
    payments = [],
    terminals = [],
    filters = {},
    users = [],
    productos = [],
    photoSessions = [],
    planesTaquilla = [],
    packsBono = [],
    lessons = [],
    surfboards = [],
    categories = [],
    guestAllowedCategories = ["producto", "fotos", "alquiler", "clase"],
    invoicingEnabled = false,
}) {
    const { flash, errors } = usePage().props;
    const [cashOpen, setCashOpen] = useState(false);
    const [assignRow, setAssignRow] = useState(null);
    const [busy, setBusy] = useState(false);
    const [expandedMobileId, setExpandedMobileId] = useState(null);
    const [sort, setSort] = useState({ key: "cuando", dir: "desc" });

    const handleSortChange = (key) => {
        setSort((prev) =>
            prev.key === key
                ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
                : { key, dir: "asc" },
        );
    };

    const sortedPayments = React.useMemo(() => {
        const arr = [...payments];
        const dirMul = sort.dir === "asc" ? 1 : -1;
        arr.sort((a, b) => {
            let av;
            let bv;
            switch (sort.key) {
                case "terminal":
                    av = terminalShortLabel(a).toLowerCase();
                    bv = terminalShortLabel(b).toLowerCase();
                    break;
                case "servicios": {
                    const al = paymentTicketLines(a);
                    const bl = paymentTicketLines(b);
                    av = (al[0]?.label || al[0]?.category || "").toLowerCase();
                    bv = (bl[0]?.label || bl[0]?.category || "").toLowerCase();
                    break;
                }
                case "cuando":
                default:
                    av = a.paid_at ? new Date(a.paid_at).getTime() : 0;
                    bv = b.paid_at ? new Date(b.paid_at).getTime() : 0;
                    break;
            }
            if (av < bv) return -1 * dirMul;
            if (av > bv) return 1 * dirMul;
            return 0;
        });
        return arr;
    }, [payments, sort]);

    const applyFilters = (next) => {
        router.get(route("admin.payments.datafono.index"), next, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const toggleMobileExpanded = (id) => {
        setExpandedMobileId((prev) => (prev === id ? null : id));
    };

    const ignorePayment = (paymentId) => {
        if (
            !window.confirm(
                "¿Ignorar este cobro TPV? No se vinculará a ningún servicio.",
            )
        ) {
            return;
        }
        setBusy(true);
        router.post(
            route("admin.payments.datafono.ignore", paymentId),
            {},
            {
                preserveScroll: true,
                onFinish: () => setBusy(false),
            },
        );
    };

    const communicateHacienda = (paymentId) => {
        if (
            !window.confirm(
                "¿Comunicar este cobro a Hacienda (TicketBAI vía B2B)?",
            )
        ) {
            return;
        }
        setBusy(true);
        router.post(
            route("admin.payments.datafono.communicate-hacienda", paymentId),
            {},
            {
                preserveScroll: true,
                onFinish: () => setBusy(false),
            },
        );
    };

    const submitCash = (payload) => {
        setBusy(true);
        router.post(route("admin.payments.datafono.store"), payload, {
            preserveScroll: true,
            onSuccess: () => setCashOpen(false),
            onFinish: () => setBusy(false),
        });
    };

    const submitAssign = (payload) => {
        if (!assignRow) return;
        setBusy(true);
        router.post(
            route("admin.payments.datafono.assign", assignRow.id),
            payload,
            {
                preserveScroll: true,
                onSuccess: () => setAssignRow(null),
                onFinish: () => setBusy(false),
            },
        );
    };

    return (
        <PageShell variant="slate">
            <Head title="Pagos datáfono" />
            <div className="mx-auto max-w-7xl space-y-4 overflow-x-hidden px-3 py-5 text-slate-100 sm:px-4 sm:py-6">
                <Breadcrumbs
                    items={[
                        { label: "Gestión", href: route("admin.catalog.index") },
                        { label: "Pagos datáfono" },
                    ]}
                />

                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
                    <div className="min-w-0">
                        <h1 className="text-xl font-bold text-white sm:text-2xl">
                            Pagos datáfono
                        </h1>
                        <p className="mt-1 max-w-2xl text-xs text-slate-400 sm:text-sm">
                            Los cobros del TPV llegan solos: asígnales un
                            ticket con una o varias líneas (producto, clase,
                            fotos…). El efectivo abre el ticket directamente:
                            cliente + líneas + un solo cobro.
                        </p>
                    </div>
                    <AdminButton
                        className="w-full shrink-0 sm:w-auto"
                        onClick={() => setCashOpen(true)}
                    >
                        + Cobro en efectivo
                    </AdminButton>
                </div>

                <AdminToast
                    message={flash?.success || flash?.error}
                    variant={flash?.success ? "success" : "error"}
                />

                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <select
                        value={filters.status || ""}
                        onChange={(e) =>
                            applyFilters({
                                ...filters,
                                status: e.target.value || undefined,
                            })
                        }
                        className="w-full min-w-0 rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm sm:w-auto"
                    >
                        <option value="">Todos los estados</option>
                        <option value="pending_review">
                            Pendiente
                        </option>
                        <option value="assigned">Asignados</option>
                        <option value="ignored">Ignorados</option>
                    </select>
                    {terminals.length > 1 ? (
                        <select
                            value={filters.terminal_id || ""}
                            onChange={(e) =>
                                applyFilters({
                                    ...filters,
                                    terminal_id: e.target.value || undefined,
                                })
                            }
                            className="w-full min-w-0 rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm sm:w-auto"
                        >
                            <option value="">Todos los datáfonos</option>
                            {terminals.map((t) => (
                                <option key={t.id} value={t.id}>
                                    {String(t.nombre || "")
                                        .split("·")[0]
                                        .trim() || t.codigo}
                                </option>
                            ))}
                        </select>
                    ) : null}
                </div>

                {/* Móvil: cards acordeón (sin scroll horizontal) */}
                <div className="space-y-2 md:hidden">
                    {sortedPayments.length === 0 ? (
                        <p className="rounded-2xl border border-white/10 px-3 py-6 text-center text-sm text-slate-500">
                            Sin cobros de datáfono todavía.
                        </p>
                    ) : (
                        sortedPayments.map((p) => {
                            const open = expandedMobileId === p.id;
                            return (
                                <div
                                    key={p.id}
                                    className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70"
                                >
                                    <AccordionTrigger
                                        open={open}
                                        onToggle={() =>
                                            toggleMobileExpanded(p.id)
                                        }
                                        panelId={`datafono-mobile-${p.id}`}
                                        stopPropagation={false}
                                        className="flex w-full items-start gap-2 px-3 py-2.5 text-left"
                                        chevronClassName="mt-0.5 h-5 w-5 text-slate-400"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-baseline justify-between gap-2">
                                                <span className="text-sm font-semibold tabular-nums text-white">
                                                    {formatAmountEur(p.amount)}
                                                </span>
                                                <span className="shrink-0 text-[11px] text-slate-500">
                                                    {fmtDateCompact(p.paid_at)}
                                                </span>
                                            </div>
                                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                                <AdminStatusBadge
                                                    variant={
                                                        p.source === "tpv"
                                                            ? "success"
                                                            : "warning"
                                                    }
                                                >
                                                    {SOURCE_LABELS[p.source] ||
                                                        p.source}
                                                </AdminStatusBadge>
                                                <span
                                                    className={`truncate text-[11px] ${CLIENT_TONE_CLASSES[paymentClientInfo(p).tone]}`}
                                                >
                                                    {paymentClientInfo(p).label}
                                                    {paymentClientInfo(p).tone ===
                                                    "guest"
                                                        ? " · no registrado"
                                                        : ""}
                                                </span>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    {open ? (
                                        <div
                                            id={`datafono-mobile-${p.id}`}
                                            className="space-y-2.5 border-t border-white/10 px-3 py-2.5 text-xs text-slate-300"
                                        >
                                            <div className="grid grid-cols-[4.5rem_1fr] gap-x-2 gap-y-1">
                                                <span className="text-slate-500">
                                                    Cobrado
                                                </span>
                                                <span className="tabular-nums text-slate-200">
                                                    {fmtDate(p.paid_at)}
                                                </span>
                                                <span className="text-slate-500">
                                                    Terminal
                                                </span>
                                                <span className="truncate font-medium text-slate-200">
                                                    {terminalShortLabel(p)}
                                                </span>
                                            </div>

                                            <div>
                                                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                                    Servicios
                                                </p>
                                                {paymentTicketLines(p)
                                                    .length === 0 ? (
                                                    <p className="text-slate-500">
                                                        {p.status ===
                                                        "pending_review"
                                                            ? "Aún sin asignar a ningún servicio."
                                                            : "Sin líneas de ticket."}
                                                    </p>
                                                ) : (
                                                    <ul className="space-y-1.5">
                                                        {paymentTicketLines(
                                                            p,
                                                        ).map((line, idx) => {
                                                            const range =
                                                                fmtServiceRange(
                                                                    line.service_at,
                                                                    line.service_until,
                                                                );
                                                            return (
                                                                <li
                                                                    key={`${p.id}-line-${idx}`}
                                                                    className="rounded-lg border border-white/5 bg-slate-950/50 px-2 py-1.5"
                                                                >
                                                                    <div className="flex items-start justify-between gap-2">
                                                                        <span className="min-w-0 break-words font-medium text-slate-100">
                                                                            {line.label ||
                                                                                CATEGORY_LABELS[
                                                                                    line
                                                                                        .category
                                                                                ] ||
                                                                                line.category}
                                                                        </span>
                                                                        <span className="shrink-0 tabular-nums text-slate-200">
                                                                            {formatAmountEur(
                                                                                line.amount ??
                                                                                    line.amount_cents /
                                                                                        100,
                                                                            )}
                                                                        </span>
                                                                    </div>
                                                                    {range ||
                                                                    line.detail ? (
                                                                        <p className="mt-0.5 text-[11px] text-slate-400">
                                                                            {[
                                                                                range,
                                                                                line.detail,
                                                                            ]
                                                                                .filter(
                                                                                    Boolean,
                                                                                )
                                                                                .join(
                                                                                    " · ",
                                                                                )}
                                                                        </p>
                                                                    ) : null}
                                                                </li>
                                                            );
                                                        })}
                                                    </ul>
                                                )}
                                            </div>

                                            {p.notes ? (
                                                <p className="text-[11px] text-slate-500">
                                                    Nota: {p.notes}
                                                </p>
                                            ) : null}

                                            <div className="border-t border-white/5 pt-2">
                                                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                                    Hacienda
                                                </p>
                                                <HaciendaCell
                                                    payment={p}
                                                    busy={busy}
                                                    onCommunicate={communicateHacienda}
                                                />
                                            </div>

                                            {p.status === "pending_review" ? (
                                                <div className="flex gap-2 pt-0.5">
                                                    <AdminButton
                                                        className="flex-1 px-2 py-1.5 text-xs"
                                                        title="Asignar a un cliente y a un servicio/producto"
                                                        onClick={() =>
                                                            setAssignRow(p)
                                                        }
                                                    >
                                                        Asignar
                                                    </AdminButton>
                                                    {p.source === "tpv" ? (
                                                        <AdminButton
                                                            variant="ghost"
                                                            className="px-2 py-1.5 text-xs"
                                                            onClick={() =>
                                                                ignorePayment(
                                                                    p.id,
                                                                )
                                                            }
                                                        >
                                                            Ignorar
                                                        </AdminButton>
                                                    ) : null}
                                                </div>
                                            ) : null}
                                        </div>
                                    ) : null}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Desktop: tabla completa */}
                <div className="hidden md:block">
                    <AdminTable
                        columns={[
                            { key: "cuando", label: "Fecha", sortable: true },
                            { key: "terminal", label: "Terminal", sortable: true },
                            { key: "origen", label: "Método" },
                            { key: "importe", label: "Importe" },
                            { key: "pagador", label: "Pagador" },
                            { key: "cliente", label: "Cliente" },
                            { key: "servicios", label: "Servicios", sortable: true },
                            { key: "hacienda", label: "Hacienda" },
                            { key: "acciones", label: "Acciones" },
                        ]}
                        rows={sortedPayments}
                        sortKey={sort.key}
                        sortDir={sort.dir}
                        onSortChange={handleSortChange}
                        emptyMessage="Sin cobros de datáfono todavía."
                        renderCell={(p, col) => {
                            switch (col.key) {
                                case "cuando":
                                    return (
                                        <span className="text-xs">
                                            {fmtDate(p.paid_at)}
                                        </span>
                                    );
                                case "terminal":
                                    return (
                                        <div className="font-medium">
                                            {terminalShortLabel(p)}
                                        </div>
                                    );
                                case "origen":
                                    return (
                                        <AdminStatusBadge
                                            variant={
                                                p.source === "tpv"
                                                    ? "success"
                                                    : "warning"
                                            }
                                        >
                                            {SOURCE_LABELS[p.source] ||
                                                p.source}
                                        </AdminStatusBadge>
                                    );
                                case "importe":
                                    return (
                                        <span className="font-semibold tabular-nums">
                                            {formatAmountEur(p.amount)}
                                        </span>
                                    );
                                case "pagador":
                                    return (
                                        <span className="text-xs text-slate-400">
                                            {p.external_reference || "—"}
                                        </span>
                                    );
                                case "cliente": {
                                    const info = paymentClientInfo(p);
                                    return (
                                        <span
                                            className={`text-xs ${CLIENT_TONE_CLASSES[info.tone]}`}
                                        >
                                            {info.label}
                                            {info.tone === "guest" ? (
                                                <span className="block text-[10px] text-slate-500">
                                                    No registrado
                                                </span>
                                            ) : null}
                                        </span>
                                    );
                                }
                                case "servicios": {
                                    const lines = paymentTicketLines(p);
                                    if (lines.length === 0) {
                                        return (
                                            <span className="text-xs text-slate-400">
                                                {p.status === "pending_review"
                                                    ? "Sin asignar"
                                                    : "—"}
                                            </span>
                                        );
                                    }
                                    return (
                                        <ul className="space-y-1 text-xs text-slate-300">
                                            {lines.map((line, idx) => {
                                                const range = fmtServiceRange(
                                                    line.service_at,
                                                    line.service_until,
                                                );
                                                return (
                                                    <li
                                                        key={`${p.id}-dline-${idx}`}
                                                    >
                                                        <span className="font-medium text-slate-200">
                                                            {line.label ||
                                                                CATEGORY_LABELS[
                                                                    line
                                                                        .category
                                                                ] ||
                                                                line.category}
                                                        </span>
                                                        {lines.length > 1 ? (
                                                            <span className="text-slate-500">
                                                                {" "}
                                                                ·{" "}
                                                                {formatAmountEur(
                                                                    line.amount ??
                                                                        line.amount_cents /
                                                                            100,
                                                                )}
                                                            </span>
                                                        ) : null}
                                                        {range ||
                                                        line.detail ? (
                                                            <div className="text-[11px] text-slate-500">
                                                                {[
                                                                    range,
                                                                    line.detail,
                                                                ]
                                                                    .filter(
                                                                        Boolean,
                                                                    )
                                                                    .join(
                                                                        " · ",
                                                                    )}
                                                            </div>
                                                        ) : null}
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    );
                                }
                                case "hacienda":
                                    return (
                                        <HaciendaCell
                                            payment={p}
                                            busy={busy}
                                            onCommunicate={communicateHacienda}
                                        />
                                    );
                                case "acciones":
                                    return p.status === "pending_review" ? (
                                        <div className="flex flex-wrap gap-2">
                                            <AdminButton
                                                className="px-2 py-1 text-xs"
                                                title="Asignar a un cliente y a un servicio/producto"
                                                onClick={() => setAssignRow(p)}
                                            >
                                                Asignar
                                            </AdminButton>
                                            {p.source === "tpv" ? (
                                                <AdminButton
                                                    variant="ghost"
                                                    className="px-2 py-1 text-xs"
                                                    onClick={() =>
                                                        ignorePayment(p.id)
                                                    }
                                                >
                                                    Ignorar
                                                </AdminButton>
                                            ) : null}
                                        </div>
                                    ) : (
                                        <span className="text-xs text-slate-500">
                                            —
                                        </span>
                                    );
                                default:
                                    return null;
                            }
                        }}
                    />
                </div>
            </div>

            <MostradorTicketModal
                open={cashOpen}
                mode="cash"
                title="Cobro en efectivo · ticket"
                subtitle="Selecciona cliente y añade todas las líneas del mismo cobro. Se cobra y asigna de una vez."
                terminals={terminals}
                users={users}
                productos={productos}
                photoSessions={photoSessions}
                planesTaquilla={planesTaquilla}
                packsBono={packsBono}
                lessons={lessons}
                surfboards={surfboards}
                categories={categories}
                guestAllowedCategories={guestAllowedCategories}
                invoicingEnabled={invoicingEnabled}
                errors={cashOpen ? errors : {}}
                busy={busy}
                onClose={() => setCashOpen(false)}
                onSubmit={submitCash}
            />

            <MostradorTicketModal
                open={Boolean(assignRow)}
                mode="tpv"
                fixedAmountCents={assignRow?.amount_cents ?? null}
                title={
                    assignRow
                        ? `Asignar cobro · ${assignRow.amount} €`
                        : "Asignar cobro"
                }
                subtitle={
                    assignRow
                        ? `${terminalShortLabel(assignRow)} · ${fmtDate(assignRow.paid_at)} · reparte el importe en una o varias líneas`
                        : ""
                }
                terminals={terminals}
                users={users}
                productos={productos}
                photoSessions={photoSessions}
                planesTaquilla={planesTaquilla}
                packsBono={packsBono}
                lessons={lessons}
                surfboards={surfboards}
                categories={categories}
                guestAllowedCategories={guestAllowedCategories}
                errors={assignRow ? errors : {}}
                busy={busy}
                initialGuestName={
                    assignRow?.source !== "tpv"
                        ? assignRow?.external_reference || ""
                        : ""
                }
                onClose={() => setAssignRow(null)}
                onSubmit={submitAssign}
            />
        </PageShell>
    );
}
