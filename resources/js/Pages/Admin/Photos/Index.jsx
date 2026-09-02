import React, { useState } from "react";
import { router, usePage } from "@inertiajs/react";
import AdminPageShell from "@/components/admin/ui/AdminPageShell";
import AdminCard from "@/components/admin/ui/AdminCard";
import AdminTable from "@/components/admin/ui/AdminTable";
import AdminStatusBadge from "@/components/admin/ui/AdminStatusBadge";
import AdminButton from "@/components/admin/ui/AdminButton";
import AdminFormField from "@/components/admin/ui/AdminFormField";
import AdminToast from "@/components/admin/ui/AdminToast";

function eurosFromCents(cents) {
    return (Number(cents || 0) / 100).toLocaleString("es-ES", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
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

const emptySession = {
    nombre: "",
    descripcion: "",
    precio_euros: "10",
    plus_euros: "0",
    duracion_minutos: 60,
    capacidad_maxima: "",
    fotografo_user_id: "",
    activo: true,
};

function durationHint(minutes) {
    const m = Number(minutes);
    if (!Number.isFinite(m) || m <= 0) return null;
    if (m < 60) return `${m} min`;
    if (m % 60 === 0) return `${m / 60} h`;
    return `${Math.floor(m / 60)} h ${m % 60} min`;
}

function parseEuros(value) {
    const n = Number(String(value ?? "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
}

function quotePreview(baseEuros, plusEuros, partySize) {
    const total = parseEuros(baseEuros) + parseEuros(plusEuros) * partySize;
    return total.toLocaleString("es-ES", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function FormSection({ title, hint, children, className = "" }) {
    return (
        <section className={`space-y-3 ${className}`}>
            <div>
                <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    {title}
                </h3>
                {hint ? (
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">{hint}</p>
                ) : null}
            </div>
            {children}
        </section>
    );
}

export default function PhotosAdminIndex({
    sessions = [],
    bookings = [],
    fotografos = [],
}) {
    const { flash } = usePage().props;
    const [form, setForm] = useState(emptySession);
    const [editingId, setEditingId] = useState(null);
    const [busy, setBusy] = useState(false);

    const startEdit = (s) => {
        setEditingId(s.id);
        setForm({
            nombre: s.nombre || "",
            descripcion: s.descripcion || "",
            precio_euros: String((Number(s.precio_cents || 0) / 100).toFixed(2)),
            plus_euros: String((Number(s.plus_por_persona_cents || 0) / 100).toFixed(2)),
            duracion_minutos: s.duracion_minutos || 60,
            capacidad_maxima: s.capacidad_maxima ?? "",
            fotografo_user_id: s.fotografo_user_id ?? "",
            activo: Boolean(s.activo),
        });
    };

    const resetForm = () => {
        setEditingId(null);
        setForm(emptySession);
    };

    const submitSession = (e) => {
        e.preventDefault();
        if (busy) return;
        const euros = Number(String(form.precio_euros).replace(",", "."));
        const plusEuros = Number(String(form.plus_euros || "0").replace(",", "."));
        const payload = {
            nombre: form.nombre,
            descripcion: form.descripcion || null,
            precio_cents: Math.round(euros * 100),
            plus_por_persona_cents: Math.round((Number.isFinite(plusEuros) ? plusEuros : 0) * 100),
            duracion_minutos: Number(form.duracion_minutos) || 60,
            capacidad_maxima: form.capacidad_maxima
                ? Number(form.capacidad_maxima)
                : null,
            fotografo_user_id: form.fotografo_user_id || null,
            activo: Boolean(form.activo),
        };
        setBusy(true);
        const opts = {
            preserveScroll: true,
            onFinish: () => {
                setBusy(false);
                resetForm();
            },
        };
        if (editingId) {
            router.patch(route("admin.photos.sessions.update", editingId), payload, opts);
        } else {
            router.post(route("admin.photos.sessions.store"), payload, opts);
        }
    };

    const toast = flash?.success || flash?.error;

    return (
        <AdminPageShell
            headTitle="Fotos · Admin"
            activeTab="fotos"
            breadcrumbs={[
                { label: "Admin", href: route("Pag_principal") },
                { label: "Servicios", href: route("admin.catalog.index") },
                { label: "Fotos" },
            ]}
            eyebrow="Admin · Fotos"
            title="Packs de fotos"
            description="Bonos/packs (1 h, 2 h…). Precio = base + (personas × plus archivo/envío)."
            toast={<AdminToast message={toast} variant={flash?.success ? "success" : "error"} />}
        >
            <div className="grid gap-6 xl:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] xl:items-start">
                <AdminCard className="xl:sticky xl:top-4">
                    <form onSubmit={submitSession} className="space-y-5">
                        <div>
                            <h2 className="text-sm font-bold text-white">
                                {editingId ? `Editar pack #${editingId}` : "Nuevo pack"}
                            </h2>
                            <p className="mt-1 text-xs leading-relaxed text-slate-500">
                                Lo que rellenes aquí sale en{" "}
                                <span className="text-slate-400">/servicios/fotos</span>.
                            </p>
                        </div>

                        <FormSection title="Qué es" hint="Nombre y texto que ve el cliente.">
                            <AdminFormField
                                label="Nombre"
                                inputProps={{
                                    required: true,
                                    value: form.nombre,
                                    onChange: (e) =>
                                        setForm((f) => ({ ...f, nombre: e.target.value })),
                                    placeholder: "Ej. Pack 1 hora",
                                }}
                            />
                            <AdminFormField
                                as="textarea"
                                label="Descripción (opcional)"
                                inputProps={{
                                    rows: 2,
                                    value: form.descripcion,
                                    onChange: (e) =>
                                        setForm((f) => ({ ...f, descripcion: e.target.value })),
                                    placeholder: "Qué incluye la sesión…",
                                }}
                            />
                        </FormSection>

                        <FormSection
                            title="Precio"
                            hint="Base fija + plus por cada persona extra."
                            className="rounded-xl border border-white/10 bg-slate-950/50 p-3"
                        >
                            <div className="grid grid-cols-2 gap-3">
                                <AdminFormField
                                    label="Base (€)"
                                    inputProps={{
                                        required: true,
                                        inputMode: "decimal",
                                        value: form.precio_euros,
                                        onChange: (e) =>
                                            setForm((f) => ({ ...f, precio_euros: e.target.value })),
                                    }}
                                />
                                <AdminFormField
                                    label="Plus / pers. (€)"
                                    inputProps={{
                                        inputMode: "decimal",
                                        value: form.plus_euros,
                                        onChange: (e) =>
                                            setForm((f) => ({ ...f, plus_euros: e.target.value })),
                                        placeholder: "0",
                                    }}
                                />
                            </div>
                            <p className="rounded-lg bg-cyan-500/10 px-2.5 py-2 text-[11px] leading-relaxed text-cyan-100/90 ring-1 ring-cyan-500/20">
                                Vista previa:{" "}
                                <span className="font-semibold text-white">
                                    1 pers. = {quotePreview(form.precio_euros, form.plus_euros, 1)} €
                                </span>
                                {" · "}
                                <span className="font-semibold text-white">
                                    3 pers. = {quotePreview(form.precio_euros, form.plus_euros, 3)} €
                                </span>
                            </p>
                        </FormSection>

                        <FormSection title="Sesión">
                            <div className="grid grid-cols-2 gap-3">
                                <AdminFormField
                                    type="number"
                                    label="Duración (min)"
                                    inputProps={{
                                        min: 15,
                                        step: 15,
                                        required: true,
                                        value: form.duracion_minutos,
                                        onChange: (e) =>
                                            setForm((f) => ({
                                                ...f,
                                                duracion_minutos: e.target.value,
                                            })),
                                    }}
                                />
                                <AdminFormField
                                    type="number"
                                    label="Máx. personas"
                                    inputProps={{
                                        min: 1,
                                        value: form.capacidad_maxima,
                                        onChange: (e) =>
                                            setForm((f) => ({
                                                ...f,
                                                capacidad_maxima: e.target.value,
                                            })),
                                        placeholder: "Sin límite",
                                    }}
                                />
                            </div>
                            {durationHint(form.duracion_minutos) ? (
                                <p className="text-[11px] text-slate-500">
                                    ≈ {durationHint(form.duracion_minutos)} en catálogo
                                </p>
                            ) : null}
                        </FormSection>

                        <FormSection title="Publicación">
                            <AdminFormField
                                as="select"
                                label="Fotógrafo asignado"
                                inputProps={{
                                    value: form.fotografo_user_id,
                                    onChange: (e) =>
                                        setForm((f) => ({
                                            ...f,
                                            fotografo_user_id: e.target.value,
                                        })),
                                }}
                            >
                                <option value="">Sin asignar</option>
                                {fotografos.map((f) => (
                                    <option key={f.id} value={f.id}>
                                        {f.nombre}
                                    </option>
                                ))}
                            </AdminFormField>
                            <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-slate-500 bg-slate-900 text-cyan-500 accent-cyan-500 focus:ring-2 focus:ring-s4-cyan/40"
                                    checked={form.activo}
                                    onChange={(e) =>
                                        setForm((f) => ({ ...f, activo: e.target.checked }))
                                    }
                                />
                                <span className="text-sm text-slate-200">
                                    Visible en la web
                                </span>
                            </label>
                        </FormSection>

                        <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
                            <AdminButton type="submit" disabled={busy} className="flex-1 sm:flex-none">
                                {editingId ? "Guardar" : "Crear pack"}
                            </AdminButton>
                            {editingId ? (
                                <AdminButton type="button" variant="ghost" onClick={resetForm}>
                                    Cancelar
                                </AdminButton>
                            ) : null}
                        </div>
                    </form>
                </AdminCard>

                <div className="min-w-0 space-y-6">
            <AdminTable
                columns={[
                    { key: "sesion", label: "Pack" },
                    { key: "precio", label: "Base" },
                    { key: "plus", label: "Plus/pers." },
                    { key: "capacidad", label: "Máx." },
                    { key: "duracion", label: "Duración" },
                    { key: "estado", label: "Estado" },
                    { key: "acciones", label: "", align: "right" },
                ]}
                rows={sessions}
                renderCell={(s, col) => {
                    switch (col.key) {
                        case "sesion":
                            return (
                                <>
                                    <div className="font-medium">{s.nombre}</div>
                                    <div className="text-xs text-slate-500">
                                        {s.fotografo_nombre || "Sin fotógrafo"}
                                    </div>
                                </>
                            );
                        case "precio":
                            return `${eurosFromCents(s.precio_cents)} €`;
                        case "plus":
                            return `${eurosFromCents(s.plus_por_persona_cents)} €`;
                        case "capacidad":
                            return s.capacidad_maxima != null ? String(s.capacidad_maxima) : "—";
                        case "duracion":
                            return `${s.duracion_minutos} min`;
                        case "estado":
                            return (
                                <AdminStatusBadge variant={s.activo ? "success" : "neutral"}>
                                    {s.activo ? "Activo" : "Inactivo"}
                                </AdminStatusBadge>
                            );
                        case "acciones":
                            return (
                                <button
                                    type="button"
                                    onClick={() => startEdit(s)}
                                    className="text-xs font-semibold text-cyan-300 hover:underline"
                                >
                                    Editar
                                </button>
                            );
                        default:
                            return null;
                    }
                }}
            />

            <div>
                <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-400">
                    Reservas
                </h2>
                <AdminTable
                    columns={[
                        { key: "cliente", label: "Cliente" },
                        { key: "sesion", label: "Sesión" },
                        { key: "cuando", label: "Cuándo" },
                        { key: "importe", label: "Importe" },
                        { key: "pago", label: "Pago" },
                        { key: "acciones", label: "Acciones" },
                    ]}
                    rows={bookings}
                    emptyMessage="Sin reservas todavía."
                    renderCell={(b, col) => {
                        switch (col.key) {
                            case "cliente":
                                return (
                                    <>
                                        <div className="font-medium">{b.display_name}</div>
                                        <div className="text-xs text-slate-500">
                                            {b.email || "—"}
                                            {b.is_admin_guest ? " · invitado" : ""}
                                        </div>
                                    </>
                                );
                            case "sesion":
                                return (
                                    <>
                                        {b.session_nombre}
                                        <div className="text-xs text-slate-500">
                                            {b.party_size} pers.
                                        </div>
                                    </>
                                );
                            case "cuando":
                                return <span className="text-xs">{fmtDate(b.fecha_inicio)}</span>;
                            case "importe":
                                return `${eurosFromCents(b.precio_pagado_cents)} €`;
                            case "pago":
                                return (
                                    <span className="text-xs">
                                        {b.payment_status} / {b.status}
                                    </span>
                                );
                            case "acciones":
                                return (
                                    <div className="flex flex-wrap items-center gap-2">
                                        {b.can_confirm ? (
                                            <AdminButton
                                                variant="success"
                                                className="px-2 py-1 text-xs"
                                                onClick={() =>
                                                    router.post(
                                                        route(
                                                            "admin.photos.bookings.confirm",
                                                            b.id,
                                                        ),
                                                        {},
                                                        { preserveScroll: true },
                                                    )
                                                }
                                            >
                                                Confirmar
                                            </AdminButton>
                                        ) : null}
                                        {b.can_reject ? (
                                            <AdminButton
                                                variant="danger"
                                                className="px-2 py-1 text-xs"
                                                onClick={() =>
                                                    router.post(
                                                        route(
                                                            "admin.photos.bookings.reject",
                                                            b.id,
                                                        ),
                                                        { reason: "Rechazado por admin" },
                                                        { preserveScroll: true },
                                                    )
                                                }
                                            >
                                                Rechazar
                                            </AdminButton>
                                        ) : null}
                                        {b.is_expired ? (
                                            <AdminStatusBadge variant="warning">
                                                Caducada
                                            </AdminStatusBadge>
                                        ) : null}
                                        {b.proof_url ? (
                                            <a
                                                href={b.proof_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-xs text-cyan-300 underline"
                                            >
                                                Justificante
                                            </a>
                                        ) : null}
                                    </div>
                                );
                            default:
                                return null;
                        }
                    }}
                />
            </div>
                </div>
            </div>
        </AdminPageShell>
    );
}
