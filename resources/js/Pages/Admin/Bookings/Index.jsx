import React, { useMemo } from "react";
import { Head, Link, router, usePage } from "@inertiajs/react";
import { toast } from "react-toastify";
import AuthenticatedLayout from "../../../layouts/AuthenticatedLayout";

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

export default function Index({ surfboards, bookings, filters }) {
    const flash = usePage().props.flash || {};

    const selectedSurfboard = filters?.surfboard_id ?? "";
    const statusFilter = filters?.status ?? "all";

    const filtered = useMemo(() => {
        // ya viene filtrado por backend, mantenemos por si quieres client-side adicional
        const list = bookings?.data || [];
        if (statusFilter === "all") return list;
        return list.filter((b) => b.status === statusFilter);
    }, [bookings, statusFilter]);

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
            <div className="mx-auto max-w-6xl px-4 py-8">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">
                            Reservas (admin)
                        </h1>
                        <p className="mt-1 text-sm text-slate-600">
                            Filtra por estado y confirma pagos. Las pendientes expiran a los 7 días.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Link
                            href={route("admin.surfboards.index")}
                            className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                        >
                            Ir a tablas
                        </Link>
                        <Link
                            href={route("admin.bookings.mark-expired")}
                            method="post"
                            as="button"
                            preserveScroll
                            onSuccess={() => toast.success("Pendientes expiradas procesadas.")}
                            className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                        >
                            Marcar expiradas
                        </Link>
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
                                <option value="completed">Completada</option>
                                <option value="cancelled">Cancelada</option>
                            </select>
                        </label>
                    </div>
                </div>

                <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="grid grid-cols-12 gap-0 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                        <div className="col-span-3">Rango</div>
                        <div className="col-span-2">Estado</div>
                        <div className="col-span-2">Expirada</div>
                        <div className="col-span-3">Precio</div>
                        <div className="col-span-2 text-right">Acciones</div>
                    </div>

                    <div className="divide-y divide-slate-100">
                        {filtered.map((b) => {
                            const expired = isExpiredPending(b);
                            return (
                                <div
                                    key={b.id}
                                    className="grid grid-cols-12 items-center gap-0 px-4 py-3"
                                >
                                    <div className="col-span-3 text-sm text-slate-900">
                                        <div className="font-semibold">
                                            {new Date(b.start_date).toLocaleDateString()}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            → {new Date(b.end_date).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div className="col-span-2">
                                        {statusBadge(b.status)}
                                    </div>
                                    <div className="col-span-2">
                                        {expired ? (
                                            <Badge tone="red">Sí</Badge>
                                        ) : (
                                            <Badge tone="slate">No</Badge>
                                        )}
                                    </div>
                                    <div className="col-span-3 text-sm text-slate-700">
                                        {money(b.total_price)}
                                    </div>
                                    <div className="col-span-2 flex justify-end gap-2">
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

                        {filtered.length === 0 ? (
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

