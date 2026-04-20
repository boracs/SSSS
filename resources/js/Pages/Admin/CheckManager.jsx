import React, { useMemo, useState } from "react";
import { Head, router, usePage } from "@inertiajs/react";
import { BuildingStorefrontIcon, DevicePhoneMobileIcon } from "@heroicons/react/24/outline";
import { formatDateMadrid, formatDateTimeMadrid, formatTimeMadrid } from "../../lib/madridTime";

const TAB_LESSONS = "lessons";
const TAB_RENTALS = "rentals";

const STATUS_OPTIONS = [
    { id: "all", label: "Todos" },
    { id: "submitted", label: "Pendientes de Validar" },
    { id: "pending", label: "Pendientes de Pago" },
    { id: "confirmed", label: "Confirmados" },
];

function statusBadge(status) {
    if (status === "confirmed") return "bg-emerald-900/30 text-emerald-200";
    if (status === "submitted") return "bg-sky-900/30 text-sky-200";
    if (status === "pending_extra_monitor") return "bg-rose-900/30 text-rose-200";
    return "bg-amber-900/30 text-amber-200";
}

function statusLabel(status) {
    if (status === "confirmed") return "Confirmado";
    if (status === "submitted") return "Enviado";
    if (status === "pending_extra_monitor") return "Pend. refuerzo";
    return "Pendiente";
}

function StatCard({ title, value, icon, tone = "slate", subtitle, tooltip, emphasize = false }) {
    const toneMap = {
        green: "border-emerald-700 bg-emerald-900/20 text-emerald-200",
        red: "border-rose-700 bg-rose-900/20 text-rose-200",
        amber: "border-amber-700 bg-amber-900/20 text-amber-200",
        slate: "border-gray-700 bg-gray-800 text-gray-100",
    };

    return (
        <div className={`rounded-xl border p-4 ${toneMap[tone] || toneMap.slate}`}>
            <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wider opacity-80" title={tooltip || ""}>
                    {title}
                </div>
                <div className="text-xl">{icon}</div>
            </div>
            <div className={`mt-2 text-4xl font-black tracking-tight ${emphasize ? "animate-pulse" : ""}`}>{value}</div>
            <div className="mt-1 text-xs opacity-75">{subtitle}</div>
        </div>
    );
}

function generateWhatsAppLink(row) {
    const rawPhone = String(row?.phone || "").replace(/\D/g, "");
    if (!rawPhone) return null;
    const phone = rawPhone.startsWith("34") ? rawPhone : `34${rawPhone}`;
    const name = row?.user || "alumno";
    const lessonName = row?.lesson_name || "Clase de Surf";
    const level = row?.level_name || null;
    const date = row?.date_human || (row?.date ? formatDateMadrid(row.date) : "fecha pendiente");
    const time = row?.time_human || (row?.date ? formatTimeMadrid(row.date) : "--:--");
    const totalStudents = Number(row?.total_students || 0) || 1;
    const monitorName = row?.monitor_name || null;
    const googleMapsUrl = row?.google_maps_url || "https://maps.app.goo.gl/TuUbicacion";
    const text = `¡Hola ${name}! 🤙 Soy de la Escuela de Surf. Tu plaza para la clase de ${lessonName} está confirmada.

📅 Cuándo: ${date} a las ${time}
🌊 Nivel: ${level || "General"}
👥 Grupo: Seréis ${totalStudents} alumnos.
${monitorName ? `🏄‍♂️ *Monitor:* ${monitorName}
` : ""}
📍 UBICACIÓN: ${googleMapsUrl}

LA ASISTENCIA DEBERÁ SER 15 MINUTOS ANTES PARA PREPARARSE Y PONERSE EL TRAJE.

📸 Nota: Si quieres un fotógrafo para la sesión, avísanos por aquí. ¡Nos vemos en el agua!`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

function extractAttempts(notes) {
    const m = String(notes || "").match(/\[attempts:(\d+)\]/);
    return m ? Number(m[1]) : 0;
}

export default function CheckManager({ lessonRows = [], rentalRows = [], filters = {}, counts = {}, weeklyHealth = {} }) {
    const { flash } = usePage().props;
    const [tab, setTab] = useState(TAB_LESSONS);
    const [status, setStatus] = useState(filters.status || "all");
    const [preview, setPreview] = useState(null); // {url,name}
    const [rejecting, setRejecting] = useState(null); // {type,id,notes}
    const [dismissing, setDismissing] = useState({});
    const [removed, setRemoved] = useState({});
    const [methodFilter, setMethodFilter] = useState("all"); // all|digital|tienda
    const [search, setSearch] = useState("");
    const [supportModal, setSupportModal] = useState(null); // {id,user,user_email,email_error}
    const [resendingId, setResendingId] = useState(null);
    const [supportEmail, setSupportEmail] = useState("");

    const rows = useMemo(() => (tab === TAB_LESSONS ? lessonRows : rentalRows), [tab, lessonRows, rentalRows]);
    const visibleRows = useMemo(() => {
        const q = (search || "").trim().toLowerCase();
        return rows
            .filter((r) => !removed[`${tab}-${r.id}`])
            .filter((r) => {
                if (methodFilter === "all") return true;
                return (r.payment_method || r.method) === methodFilter;
            })
            .filter((r) => {
                if (!q) return true;
                return String(r.user || "").toLowerCase().includes(q);
            });
    }, [rows, removed, tab, methodFilter, search]);

    const countMap = tab === TAB_LESSONS ? (counts.lessons || {}) : (counts.rentals || {});
    const totals = usePage().props?.totals || {};
    const totalTienda = Number(totals.total_tienda_eur || 0);
    const totalDigital = Number(totals.total_digital_eur || 0);
    const rangeStart = weeklyHealth?.range_start || "—";
    const rangeEnd = weeklyHealth?.range_end || "—";
    const confirmedRevenue = Number(weeklyHealth?.confirmed_revenue_eur || 0);
    const lostRevenue = Number(weeklyHealth?.lost_revenue_eur || 0);
    const emailRatio = Number(weeklyHealth?.email_success_ratio || 0);

    const pulseTone = emailRatio > 98 ? "green" : emailRatio >= 90 ? "amber" : "red";

    const exportCsv = () => {
        const headers = ["usuario", "fecha", "importe", "metodo", "estado"];
        const lines = visibleRows.map((r) => [
            `"${String(r.user || "").replaceAll('"', '""')}"`,
            `"${r.date ? formatDateTimeMadrid(r.date) : ""}"`,
            Number(r.amount || 0).toFixed(2),
            `"${(r.payment_method || r.method || "").replaceAll('"', '""')}"`,
            `"${r.status || ""}"`,
        ].join(","));
        const content = [headers.join(","), ...lines].join("\n");
        const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `cierre-caja-${tab}-${status}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const reloadStatus = (next) => {
        setStatus(next);
        router.get(route("admin.check-manager"), { status: next }, { preserveState: true, preserveScroll: true });
    };

    const refreshMetrics = () => {
        router.reload({
            only: ["lessonRows", "rentalRows", "counts", "totals", "weeklyHealth", "flash", "adminStats"],
            preserveState: true,
            preserveScroll: true,
        });
    };

    const dismissRow = (id) => {
        const k = `${tab}-${id}`;
        setDismissing((s) => ({ ...s, [k]: true }));
        setTimeout(() => {
            setRemoved((s) => ({ ...s, [k]: true }));
            setDismissing((s) => ({ ...s, [k]: false }));
        }, 350);
    };

    const approve = (row) => {
        const onSuccess = () => {
            router.reload({ only: ["lessonRows", "rentalRows", "counts", "flash", "adminStats"] });
        };
        if (tab === TAB_LESSONS) {
            if (status === "submitted") dismissRow(row.id);
            router.post(route("admin.academy.enrollments.confirm", row.id), {}, { preserveScroll: true, onSuccess });
            return;
        }
        if (status === "submitted") dismissRow(row.id);
        router.post(route("admin.bookings.approve-proof", row.id), {}, { preserveScroll: true, onSuccess });
    };

    const reject = () => {
        if (!rejecting) return;
        const onSuccess = () => {
            router.reload({ only: ["lessonRows", "rentalRows", "counts", "flash", "adminStats"] });
        };
        if (tab === TAB_LESSONS) {
            router.post(route("admin.academy.enrollments.reject", rejecting.id), { admin_notes: rejecting.notes || null }, { preserveScroll: true, onSuccess });
        } else {
            router.post(route("admin.bookings.reject-proof", rejecting.id), { admin_notes: rejecting.notes || null }, { preserveScroll: true, onSuccess });
        }
        setRejecting(null);
    };

    const openSupport = (row) => {
        setSupportModal(row);
        setSupportEmail(row?.user_email || "");
    };

    const resendConfirmation = (useEditedEmail) => {
        if (!supportModal?.enrollment_id) return;
        setResendingId(supportModal.enrollment_id);
        router.post(
            route("admin.academy.enrollments.resend-confirmation", supportModal.enrollment_id),
            {
                email: useEditedEmail ? (supportEmail || null) : null,
            },
            {
                preserveScroll: true,
                onFinish: () => setResendingId(null),
                onSuccess: () => {
                    setSupportModal(null);
                    router.reload({ only: ["lessonRows", "weeklyHealth", "flash"] });
                },
            }
        );
    };

    return (
        <>
            <Head title="Gestor de Comprobaciones" />
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
                <h1 className="font-heading text-2xl font-bold tracking-tight text-gray-100">Gestor de Comprobaciones</h1>
                <p className="mt-1 text-sm text-gray-400">Auditoría de pagos para clases y alquileres.</p>

                {flash?.success && <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800">{flash.success}</div>}
                {flash?.error && <div className="mt-4 rounded-xl bg-rose-50 px-4 py-2 text-sm font-medium text-rose-800">{flash.error}</div>}

                <div className="mt-6 flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setTab(TAB_LESSONS)}
                        className={`rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${tab === TAB_LESSONS ? "bg-[#00D1FF] text-slate-900" : "bg-gray-800 text-gray-200 ring-1 ring-gray-600"}`}
                    >
                        🏄‍♂️ Clases
                    </button>
                    <button
                        type="button"
                        onClick={() => setTab(TAB_RENTALS)}
                        className={`rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${tab === TAB_RENTALS ? "bg-[#00D1FF] text-slate-900" : "bg-gray-800 text-gray-200 ring-1 ring-gray-600"}`}
                    >
                        🚲 Alquileres
                    </button>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                    {STATUS_OPTIONS.map((s) => (
                        <button
                            key={s.id}
                            type="button"
                            onClick={() => reloadStatus(s.id)}
                            className={`rounded-full px-3 py-1 text-xs font-semibold transition-all duration-200 ${status === s.id ? "bg-brand-deep text-white" : "bg-gray-800 text-gray-200"}`}
                        >
                            {s.label} {typeof countMap[s.id] === "number" ? `(${countMap[s.id]})` : ""}
                        </button>
                    ))}
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
                        <div className="text-xs font-semibold uppercase tracking-wider text-indigo-700">Caja Presencial</div>
                        <div className="mt-1 text-xl font-extrabold text-indigo-800">{totalTienda.toFixed(2)} €</div>
                    </div>
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                        <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Caja Digital</div>
                        <div className="mt-1 text-xl font-extrabold text-emerald-800">{totalDigital.toFixed(2)} €</div>
                    </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-gray-300">Weekly Health</h2>
                    <button
                        type="button"
                        onClick={refreshMetrics}
                        className="rounded-lg bg-gray-800 px-3 py-1.5 text-xs font-semibold text-gray-200 hover:bg-gray-700"
                    >
                        🔄 Refrescar
                    </button>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                    <StatCard
                        title="Ingresos Confirmados"
                        icon="💰"
                        tone="green"
                        value={`${confirmedRevenue.toFixed(2)} €`}
                        subtitle={`Del ${rangeStart} al ${rangeEnd}`}
                    />
                    <StatCard
                        title="Oportunidades Perdidas"
                        icon="📉"
                        tone="red"
                        value={`${lostRevenue.toFixed(2)} €`}
                        subtitle={`Del ${rangeStart} al ${rangeEnd}`}
                        tooltip="Ingresos potenciales de reservas que expiraron sin pago"
                        emphasize={lostRevenue > 0}
                    />
                    <StatCard
                        title="Salud del Sistema"
                        icon="📧"
                        tone={pulseTone}
                        value={`${emailRatio.toFixed(1)}%`}
                        subtitle={`Del ${rangeStart} al ${rangeEnd}`}
                    />
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                    {[
                        { id: "all", label: "Todos" },
                        { id: "digital", label: "📱 Digital" },
                        { id: "tienda", label: "🏠 Tienda" },
                    ].map((m) => (
                        <button
                            key={m.id}
                            type="button"
                            onClick={() => setMethodFilter(m.id)}
                            className={`rounded-full px-3 py-1 text-xs font-semibold transition-all duration-200 ${methodFilter === m.id ? "bg-sky-600 text-white" : "bg-gray-800 text-gray-200"}`}
                        >
                            {m.label}
                        </button>
                    ))}
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar alumno..."
                        className="input-focus-ring ml-auto min-w-[220px] rounded-xl px-3 py-2 text-sm"
                    />
                    <button
                        type="button"
                        onClick={exportCsv}
                        className="rounded-xl bg-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-700"
                    >
                        Cierre de Caja (CSV)
                    </button>
                </div>

                <div className="mt-5 overflow-hidden rounded-xl border border-gray-700 bg-gray-800 shadow-sm">
                    <div className="max-h-[68vh] overflow-auto">
                        <table className="min-w-full text-sm">
                            <thead className="sticky top-0 z-10 bg-gray-900 text-gray-300">
                                <tr>
                                    <th className="px-4 py-3 text-left font-semibold">Usuario</th>
                                    <th className="px-4 py-3 text-left font-semibold">Fecha</th>
                                    <th className="px-4 py-3 text-left font-semibold">Importe</th>
                                    <th className="px-4 py-3 text-left font-semibold">Método</th>
                                    <th className="px-4 py-3 text-left font-semibold">Estado</th>
                                    <th className="px-4 py-3 text-left font-semibold">Relación con Cliente</th>
                                    <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                                            {methodFilter === "tienda"
                                                ? "Sin movimientos de caja presenciales hoy."
                                                : "No hay registros para este filtro."}
                                        </td>
                                    </tr>
                                ) : (
                                    visibleRows.map((r) => (
                                        <tr
                                            key={r.id}
                                            className={`border-t border-gray-700 transition-all duration-300 ${r.requires_second_monitor ? "animate-pulse bg-amber-900/20 ring-1 ring-rose-700" : ""} ${dismissing[`${tab}-${r.id}`] ? "scale-[0.99] opacity-0" : "opacity-100"}`}
                                        >
                                            <td className="px-4 py-3 font-medium text-gray-100">{r.user}</td>
                                            <td className="px-4 py-3 text-gray-300">{r.date ? formatDateTimeMadrid(r.date) : "—"}</td>
                                            <td className="px-4 py-3 text-gray-200">
                                                <div>{Number(r.amount || 0).toFixed(2)} €</div>
                                                {r.occupancy_label ? (
                                                    <div className={`mt-0.5 text-xs ${r.requires_second_monitor ? "font-semibold text-rose-300" : "text-gray-400"}`}>
                                                        Ocupación: {r.occupancy_label}
                                                    </div>
                                                ) : null}
                                            </td>
                                            <td className="px-4 py-3 text-gray-200">
                                                {(r.payment_method || r.method) === "tienda" ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                                                        <BuildingStorefrontIcon className="h-3.5 w-3.5" />
                                                        Venta en Tienda
                                                    </span>
                                                ) : (r.payment_method || r.method) === "digital" ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                                        <DevicePhoneMobileIcon className="h-3.5 w-3.5" />
                                                        Bizum / Transf.
                                                    </span>
                                                ) : (
                                                    "—"
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadge(r.status)}`}>
                                                    {statusLabel(r.status)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    {generateWhatsAppLink(r) ? (
                                                        <a
                                                            href={generateWhatsAppLink(r)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white shadow-md transition-all duration-200 hover:scale-110 hover:shadow-lg"
                                                            style={{ backgroundColor: "#25D366" }}
                                                            title="Enviar WhatsApp"
                                                        >
                                                            W
                                                        </a>
                                                    ) : (
                                                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-700 text-gray-300" title="Sin teléfono">
                                                            ○
                                                        </span>
                                                    )}

                                                    {r.email_status === "sent" ? (
                                                        <span className="inline-flex cursor-help items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700" title="Email enviado con éxito">
                                                            📧✅
                                                        </span>
                                                    ) : r.email_status === "error" ? (
                                                        resendingId === r.enrollment_id ? (
                                                            <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                                                                🔄
                                                            </span>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() => openSupport(r)}
                                                                className={`inline-flex cursor-help items-center rounded-full px-2 py-0.5 text-xs font-semibold ${r.status === "confirmed" && r.enrollment_status === "confirmed" ? "bg-rose-900/30 text-rose-200 hover:bg-rose-900/40" : "pointer-events-none bg-gray-700 text-gray-400 opacity-50"}`}
                                                                title={r.status === "confirmed" && r.enrollment_status === "confirmed" ? (r.email_error || "Fallo al enviar email") : "Disponible solo para reservas confirmadas"}
                                                            >
                                                                📧⚠️
                                                            </button>
                                                        )
                                                    ) : (
                                                        <span className="inline-flex items-center rounded-full bg-gray-700 px-2 py-0.5 text-xs font-semibold text-gray-300" title="Sin dato de email">
                                                            📧—
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex justify-end gap-2">
                                                    {r.proof_url ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => setPreview({ url: r.proof_url, name: r.user })}
                                                            className="rounded-xl bg-gray-700 px-2 py-1 text-xs font-semibold text-gray-100 hover:bg-gray-600"
                                                            title="Ver comprobante"
                                                        >
                                                            🖼️
                                                        </button>
                                                    ) : (
                                                        <span className="rounded-xl bg-gray-700 px-2 py-1 text-xs text-gray-400">—</span>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => approve(r)}
                                                        className="rounded-xl bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                                                    >
                                                        Aprobar
                                                    </button>
                                                    {r.requires_second_monitor ? (
                                                        <>
                                                            <a
                                                                href={route("admin.academy.index", { date: r.date ? new Date(r.date).toISOString().slice(0, 10) : undefined })}
                                                                className="rounded-xl bg-rose-600 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-700"
                                                            >
                                                                ➕ Añadir Monitor de Refuerzo
                                                            </a>
                                                            {r.extra_monitor_whatsapp_url ? (
                                                                <a
                                                                    href={r.extra_monitor_whatsapp_url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="rounded-xl bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                                                                >
                                                                    WhatsApp Refuerzo
                                                                </a>
                                                            ) : null}
                                                        </>
                                                    ) : null}
                                                    <button
                                                        type="button"
                                                        onClick={() => setRejecting({ id: r.id, notes: "" })}
                                                        className="rounded-xl bg-rose-600 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-700"
                                                    >
                                                        Rechazar
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {preview && (
                <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-950/80" onClick={() => setPreview(null)} aria-hidden />
                    <div className="relative h-[90vh] w-full max-w-5xl overflow-hidden rounded-xl border border-gray-700 bg-gray-800 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
                            <div className="text-sm font-semibold text-gray-100">{preview.name}</div>
                            <button type="button" onClick={() => setPreview(null)} className="rounded-xl bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-sky-700">
                                Cerrar
                            </button>
                        </div>
                        <iframe title="Comprobante" src={preview.url} className="h-full w-full" />
                    </div>
                </div>
            )}

            {rejecting && (
                <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-950/70" onClick={() => setRejecting(null)} aria-hidden />
                    <div className="relative w-full max-w-lg rounded-xl border border-gray-700 bg-gray-800 p-5 shadow-xl">
                        <h3 className="font-heading text-lg font-bold text-gray-100">Rechazar comprobante</h3>
                        <textarea
                            value={rejecting.notes}
                            onChange={(e) => setRejecting((s) => ({ ...s, notes: e.target.value }))}
                            rows={4}
                            className="input-focus-ring mt-4 w-full rounded-xl px-4 py-3 text-sm"
                            placeholder="Ej: Importe incorrecto"
                        />
                        <div className="mt-4 flex justify-end gap-2">
                            <button type="button" onClick={() => setRejecting(null)} className="btn-secondary">Cancelar</button>
                            <button type="button" onClick={reject} className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700">
                                Confirmar rechazo
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {supportModal && (
                <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-950/70" onClick={() => setSupportModal(null)} aria-hidden />
                    <div className="relative w-full max-w-lg rounded-xl border border-gray-700 bg-gray-800 p-5 shadow-xl">
                        <h3 className="font-heading text-lg font-bold text-gray-100">Gestión de Error de Envío</h3>
                        <p className="mt-2 text-sm text-gray-300">
                            Alumno: <span className="font-semibold text-gray-100">{supportModal.user}</span>
                        </p>
                        <p className="mt-2 rounded-xl bg-rose-900/30 px-3 py-2 text-xs text-rose-200">
                            Error técnico: {supportModal.email_error || "No disponible"}
                        </p>
                        <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                            Email del alumno
                        </label>
                        <input
                            type="email"
                            value={supportEmail}
                            onChange={(e) => setSupportEmail(e.target.value)}
                            className="input-focus-ring mt-2 w-full rounded-xl px-4 py-2.5 text-sm"
                            placeholder="correo@dominio.com"
                        />
                        <div className="mt-4 flex flex-wrap justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setSupportModal(null)}
                                className="btn-secondary"
                            >
                                Cerrar
                            </button>
                            <button
                                type="button"
                                disabled={resendingId === supportModal.enrollment_id || supportModal.status !== "confirmed" || supportModal.enrollment_status !== "confirmed"}
                                onClick={() => resendConfirmation(false)}
                                className="rounded-xl bg-gray-700 px-4 py-2.5 text-sm font-semibold text-gray-100 hover:bg-gray-600 disabled:opacity-60"
                            >
                                Reintentar con email actual
                            </button>
                            <button
                                type="button"
                                disabled={resendingId === supportModal.enrollment_id || supportModal.status !== "confirmed" || supportModal.enrollment_status !== "confirmed"}
                                onClick={() => resendConfirmation(true)}
                                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                            >
                                Corregir y Reenviar
                            </button>
                        </div>
                        <p className="mt-3 text-xs text-gray-400">
                            Historial: Se han realizado {extractAttempts(supportModal.admin_notes)} intentos de contacto para este alumno.
                        </p>
                    </div>
                </div>
            )}
        </>
    );
}

