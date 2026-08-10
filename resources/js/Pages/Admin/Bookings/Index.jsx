import React, { useMemo, useState } from "react";
import { Head, Link, router, usePage } from "@inertiajs/react";
import { ArrowDown, ArrowUp, ArrowUpDown, Clock, ExternalLink, PackageCheck } from "lucide-react";
import { toast } from "react-toastify";
import AuthenticatedLayout from "../../../layouts/AuthenticatedLayout";
import { DAY_PACKS, MINUTE_PACKS, packLabel } from "../../../lib/rentalPricing";

const STATUS_SORT_ORDER = {
    pending: 0,
    confirmed: 1,
    completed: 2,
    cancelled: 3,
};

function SortHeader({ label, active, direction, onClick }) {
    const Icon = !active ? ArrowUpDown : direction === "asc" ? ArrowUp : ArrowDown;

    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={`Ordenar por ${label}`}
            className={`inline-flex items-center gap-1 transition hover:text-slate-900 ${
                active ? "text-surf-primary" : ""
            }`}
        >
            {label}
            <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
        </button>
    );
}

function isExpiredPending(booking) {
    if (!booking) return false;
    if (booking.status !== "pending") return false;
    if (!booking.expires_at) return false;
    const exp = new Date(booking.expires_at);
    return Number.isNaN(exp.getTime()) ? false : exp.getTime() < Date.now();
}

function Badge({ children, tone = "slate" }) {
    const tones = {
        slate: "bg-slate-100 text-slate-700 ring-slate-200",
        green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
        red: "bg-rose-50 text-rose-700 ring-rose-200",
        amber: "bg-amber-50 text-amber-800 ring-amber-200",
        indigo: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    };
    return (
        <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                tones[tone] || tones.slate
            }`}
        >
            {children}
        </span>
    );
}

function money(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return "—";
    return `${n.toFixed(2).replace(".", ",")} €`;
}

/* El mostrador trabaja en hora de escuela: se fija la zona para no depender del equipo. */
const MADRID_DATE_TIME = new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
});

const MADRID_TIME = new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    minute: "2-digit",
});

function formatMadrid(value, formatter = MADRID_DATE_TIME) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : formatter.format(date);
}

/** Duración cobrada: etiqueta del pack si la reserva usa uno; si no, días del rango. */
function durationLabel(booking) {
    if (booking.pack_minutes) return packLabel(MINUTE_PACKS[booking.pack_minutes]);
    if (booking.pack_days) return packLabel(DAY_PACKS[booking.pack_days]);

    const pickup = new Date(booking.pickup_at);
    const returnAt = new Date(booking.return_at);
    if (Number.isNaN(pickup.getTime()) || Number.isNaN(returnAt.getTime())) return null;

    const days = Math.round((returnAt.getTime() - pickup.getTime()) / 86400000);
    return days > 0 ? `${days} día(s)` : null;
}

/** Misma regla que BookingService::markPickedUp: sin pago confirmado (o con
 * el resto pendiente de cobrar) no se entrega la tabla. */
function canMarkPickup(booking) {
    return (
        !booking.picked_up_at &&
        ["pending", "confirmed"].includes(booking.status) &&
        booking.payment_status === "confirmed" &&
        booking.balance_status !== "pending"
    );
}

function pickupBlockedByPayment(booking) {
    return (
        !booking.picked_up_at &&
        ["pending", "confirmed"].includes(booking.status) &&
        (booking.payment_status !== "confirmed" || booking.balance_status === "pending")
    );
}

function hasBalanceDue(booking) {
    return booking.payment_status === "confirmed" && booking.balance_status === "pending";
}

export default function Index({ surfboards, bookings, filters }) {
    const flash = usePage().props.flash || {};

    const selectedSurfboard = filters?.surfboard_id ?? "";
    const statusFilter = filters?.status ?? "all";
    const [sortBy, setSortBy] = useState(null);
    const [sortDir, setSortDir] = useState("asc");

    const toggleSort = (key) => {
        if (sortBy === key) {
            setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
        } else {
            setSortBy(key);
            setSortDir("asc");
        }
    };

    const filtered = useMemo(() => {
        // ya viene filtrado por backend, mantenemos por si quieres client-side adicional
        const list = bookings?.data || [];
        if (statusFilter === "all") return list;
        return list.filter((b) => b.status === statusFilter);
    }, [bookings, statusFilter]);

    const sorted = useMemo(() => {
        const list = [...filtered];

        if (!sortBy) return list;

        if (sortBy === "range") {
            return list.sort((a, b) => {
                const da = new Date(a.pickup_at || a.start_date).getTime();
                const db = new Date(b.pickup_at || b.start_date).getTime();
                if (Number.isNaN(da) || Number.isNaN(db)) return 0;
                return sortDir === "asc" ? da - db : db - da;
            });
        }

        if (sortBy === "status") {
            return list.sort((a, b) => {
                const oa = STATUS_SORT_ORDER[a.status] ?? 99;
                const ob = STATUS_SORT_ORDER[b.status] ?? 99;
                const cmp = oa - ob;
                return sortDir === "asc" ? cmp : -cmp;
            });
        }

        return list;
    }, [filtered, sortBy, sortDir]);

    const markPickedUp = (booking) => {
        const when = formatMadrid(booking.pickup_at);
        if (!window.confirm(`¿Registrar la entrega de la tabla a ${booking.client_name}${when ? ` (recogida ${when})` : ""}?`)) {
            return;
        }
        router.patch(route("admin.bookings.mark-picked-up", booking.id), {}, {
            preserveScroll: true,
            onSuccess: () => toast.success("Recogida registrada."),
        });
    };

    const chargeBalanceCash = (booking) => {
        const remaining = money(Number(booking.remaining_balance_cents || 0) / 100);
        if (!window.confirm(`¿Cobrar en efectivo el resto de ${booking.client_name} (${remaining})?`)) {
            return;
        }
        router.patch(route("admin.bookings.charge-balance-cash", booking.id), {}, {
            preserveScroll: true,
            onSuccess: () => toast.success("Resto cobrado en efectivo."),
        });
    };

    const statusBadge = (status) => {
        if (status === "pending") return <Badge tone="amber">Pendiente</Badge>;
        if (status === "confirmed") return <Badge tone="green">Confirmada</Badge>;
        if (status === "completed") return <Badge tone="indigo">Completada</Badge>;
        if (status === "cancelled") return <Badge tone="red">Cancelada</Badge>;
        return <Badge>{status}</Badge>;
    };

    return (
        <>
            <Head title="Gestor de reservas" />
            <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
                <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 shadow-lg backdrop-blur-sm sm:p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                                Reservas (admin)
                            </h1>
                            <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
                                Filtra por tabla y estado, confirma pagos, libera fechas bloqueadas y
                                registra la recogida cuando el cliente se lleva la tabla.
                            </p>
                            <p className="mt-2 flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-100/95">
                                <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden />
                                <span>
                                    <strong className="font-semibold text-amber-50">Marcar expiradas</strong>{" "}
                                    cancela las reservas <em>pendientes de pago</em> cuyo plazo de 7 días ya
                                    venció. Así la tabla vuelve a estar disponible. No afecta a confirmadas ni
                                    completadas.
                                </span>
                            </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
                            <Link
                                href={route("admin.surfboards.index")}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/25 hover:bg-white/10"
                            >
                                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                                Ir a tablas
                            </Link>
                            <Link
                                href={route("admin.bookings.mark-expired")}
                                method="post"
                                as="button"
                                preserveScroll
                                title="Cancelar pendientes expiradas y liberar tablas"
                                onSuccess={() => toast.success("Reservas expiradas procesadas.")}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/40 bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-amber-400"
                            >
                                <Clock className="h-3.5 w-3.5" aria-hidden />
                                Marcar expiradas
                            </Link>
                        </div>
                    </div>
                </div>

                {flash.success ? (
                    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                        {flash.success}
                    </div>
                ) : null}
                {flash.error ? (
                    <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                        {flash.error}
                    </div>
                ) : null}

                <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <label className="block md:col-span-2">
                            <span className="text-sm font-semibold text-slate-700">
                                Tabla
                            </span>
                            <select
                                value={selectedSurfboard || ""}
                                onChange={(e) =>
                                    router.get(
                                        route("admin.bookings.index"),
                                        {
                                            status: statusFilter,
                                            surfboard_id: e.target.value || null,
                                        },
                                        { preserveScroll: true }
                                    )
                                }
                                className="mt-1 w-full rounded-xl border-slate-300 focus:border-surf-primary focus:ring-surf-primary"
                            >
                                <option value="">Todas</option>
                                {(surfboards || []).map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name || `Tabla #${s.id}`} · {s.category}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="block">
                            <span className="text-sm font-semibold text-slate-700">
                                Estado
                            </span>
                            <select
                                value={statusFilter}
                                onChange={(e) =>
                                    router.get(
                                        route("admin.bookings.index"),
                                        {
                                            status: e.target.value,
                                            surfboard_id: selectedSurfboard || null,
                                        },
                                        { preserveScroll: true }
                                    )
                                }
                                className="mt-1 w-full rounded-xl border-slate-300 focus:border-surf-primary focus:ring-surf-primary"
                            >
                                <option value="all">Todos</option>
                                <option value="pending">Pendiente</option>
                                <option value="confirmed">Confirmada</option>
                                {/* "completed" no lo asigna ningún flujo hoy (Booking::STATUS_COMPLETED
                                    queda para cuando se implemente "marcar tabla devuelta"); se omite
                                    del filtro para no mostrar un estado inalcanzable. */}
                                <option value="cancelled">Cancelada</option>
                            </select>
                        </label>
                    </div>
                </div>

                <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="grid grid-cols-12 gap-0 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                        <div className="col-span-3">
                            <SortHeader
                                label="Rango"
                                active={sortBy === "range"}
                                direction={sortDir}
                                onClick={() => toggleSort("range")}
                            />
                        </div>
                        <div className="col-span-2">
                            <SortHeader
                                label="Estado"
                                active={sortBy === "status"}
                                direction={sortDir}
                                onClick={() => toggleSort("status")}
                            />
                        </div>
                        <div className="col-span-2">Recogida</div>
                        <div className="col-span-2">Depósito / Resto</div>
                        <div className="col-span-3 text-right">Acciones</div>
                    </div>

                    <div className="divide-y divide-slate-100">
                        {sorted.map((b) => {
                            const expired = isExpiredPending(b);
                            return (
                                <div
                                    key={b.id}
                                    className="grid grid-cols-12 items-center gap-0 px-4 py-3"
                                >
                                    <div className="col-span-3 text-sm text-slate-900">
                                        <div className="font-semibold tabular-nums">
                                            {formatMadrid(b.pickup_at) || "—"}
                                        </div>
                                        <div className="text-xs tabular-nums text-slate-500">
                                            → {formatMadrid(b.return_at) || "—"}
                                        </div>
                                        <div className="mt-1 flex flex-wrap items-center gap-1">
                                            <Badge tone={b.mode === "hour" ? "indigo" : "slate"}>
                                                {b.mode === "hour" ? "Por horas" : "Por días"}
                                            </Badge>
                                            {durationLabel(b) ? (
                                                <span className="text-xs font-semibold text-slate-600">
                                                    {durationLabel(b)}
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>
                                    <div className="col-span-2 flex flex-wrap items-start gap-1">
                                        {statusBadge(b.status)}
                                        {expired ? <Badge tone="red">Expirada</Badge> : null}
                                    </div>
                                    <div className="col-span-2">
                                        {b.picked_up_at ? (
                                            <Badge tone="green">
                                                Recogida {formatMadrid(b.picked_up_at, MADRID_TIME)}
                                            </Badge>
                                        ) : b.no_show_at ? (
                                            <Badge tone="red">No-show</Badge>
                                        ) : b.status === "cancelled" ? (
                                            <Badge tone="slate">—</Badge>
                                        ) : (
                                            <Badge tone="amber">Pendiente</Badge>
                                        )}
                                    </div>
                                    <div className="col-span-2 text-sm text-slate-700">
                                        <div className="font-semibold tabular-nums">
                                            {money(b.deposit_amount)}
                                            <span className="ml-1 text-xs font-normal text-slate-400">
                                                / {money(b.total_price)}
                                            </span>
                                        </div>
                                        {hasBalanceDue(b) ? (
                                            <Badge tone="red">
                                                Resto {money(Number(b.remaining_balance_cents || 0) / 100)}
                                            </Badge>
                                        ) : b.balance_status === "confirmed" ? (
                                            <Badge tone="green">Resto cobrado</Badge>
                                        ) : null}
                                    </div>
                                    <div className="col-span-3 flex flex-wrap justify-end gap-2">
                                        {canMarkPickup(b) ? (
                                            <button
                                                type="button"
                                                onClick={() => markPickedUp(b)}
                                                title="Registrar que el cliente ya se llevó la tabla"
                                                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-50"
                                            >
                                                <PackageCheck className="h-3.5 w-3.5" aria-hidden />
                                                Marcar recogida
                                            </button>
                                        ) : pickupBlockedByPayment(b) ? (
                                            <span
                                                title={
                                                    hasBalanceDue(b)
                                                        ? "Cobra el resto antes de entregar la tabla"
                                                        : "Confirma el pago antes de entregar la tabla"
                                                }
                                                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-slate-400"
                                            >
                                                <PackageCheck className="h-3.5 w-3.5 opacity-40" aria-hidden />
                                                {hasBalanceDue(b) ? "Resto pendiente" : "Pago pendiente"}
                                            </span>
                                        ) : null}
                                        {hasBalanceDue(b) ? (
                                            <button
                                                type="button"
                                                onClick={() => chargeBalanceCash(b)}
                                                title="Registrar el cobro del resto en efectivo"
                                                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                                            >
                                                Cobrar resto (efectivo)
                                            </button>
                                        ) : null}
                                        <Link
                                            href={route(
                                                "admin.bookings.confirm-payment",
                                                b.id
                                            )}
                                            method="patch"
                                            as="button"
                                            preserveScroll
                                            disabled={b.status !== "pending"}
                                            className="rounded-lg px-2 py-1 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                                            onSuccess={() =>
                                                toast.success("Pago confirmado.")
                                            }
                                        >
                                            Confirmar pago
                                        </Link>
                                        <Link
                                            href={route("admin.bookings.cancel", b.id)}
                                            method="patch"
                                            as="button"
                                            preserveScroll
                                            disabled={b.status === "cancelled"}
                                            className="rounded-lg px-2 py-1 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                                            onSuccess={() => toast.success("Reserva cancelada.")}
                                        >
                                            Cancelar
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}

                        {sorted.length === 0 ? (
                            <div className="px-4 py-10 text-center text-sm text-slate-600">
                                Sin reservas en el filtro actual.
                            </div>
                        ) : null}
                    </div>
                </div>

                {bookings?.links?.length ? (
                    <div className="mt-6 flex flex-wrap items-center gap-2">
                        {bookings.links.map((l) => (
                            <Link
                                key={l.url || l.label}
                                href={l.url || ""}
                                preserveScroll
                                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                                    l.active
                                        ? "bg-surf-primary text-white"
                                        : "bg-white text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
                                } ${!l.url ? "opacity-50 pointer-events-none" : ""}`}
                                dangerouslySetInnerHTML={{ __html: l.label }}
                            />
                        ))}
                    </div>
                ) : null}
            </div>
        </>
    );
}

Index.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;

