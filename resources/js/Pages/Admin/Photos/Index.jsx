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
            <AdminCard>
                <form onSubmit={submitSession} className="grid gap-3 sm:grid-cols-2">
                    <h2 className="sm:col-span-2 text-sm font-bold uppercase tracking-wider text-slate-400">
                        {editingId ? `Editar pack #${editingId}` : "Nuevo pack"}
                    </h2>
                    <AdminFormField
                        label="Nombre"
                        inputProps={{
                            required: true,
                            value: form.nombre,
                            onChange: (e) =>
                                setForm((f) => ({ ...f, nombre: e.target.value })),
                            placeholder: "Ej. Bono de 1 hora",
                        }}
                    />
                    <AdminFormField
                        label="Precio base (€)"
                        inputProps={{
                            required: true,
                            value: form.precio_euros,
                            onChange: (e) =>
                                setForm((f) => ({ ...f, precio_euros: e.target.value })),
                        }}
                    />
                    <AdminFormField
                        label="Plus por persona (€)"
                        inputProps={{
                            value: form.plus_euros,
                            onChange: (e) =>
                                setForm((f) => ({ ...f, plus_euros: e.target.value })),
                            placeholder: "5",
                        }}
                    />
                    <div className="sm:col-span-2">
                        <AdminFormField
                            as="textarea"
                            label="Descripción"
                            inputProps={{
                                rows: 2,
                                value: form.descripcion,
                                onChange: (e) =>
                                    setForm((f) => ({ ...f, descripcion: e.target.value })),
                            }}
                        />
                    </div>
                    <AdminFormField
                        type="number"
                        label="Duración (min)"
                        inputProps={{
                            min: 15,
                            required: true,
                            value: form.duracion_minutos,
                            onChange: (e) =>
                                setForm((f) => ({ ...f, duracion_minutos: e.target.value })),
                        }}
                    />
                    <AdminFormField
                        type="number"
                        label="Máx. alumnos (opcional)"
                        inputProps={{
                            min: 1,
                            value: form.capacidad_maxima,
                            onChange: (e) =>
                                setForm((f) => ({ ...f, capacidad_maxima: e.target.value })),
                        }}
                    />
                    <AdminFormField
                        as="select"
                        label="Fotógrafo"
                        inputProps={{
                            value: form.fotografo_user_id,
                            onChange: (e) =>
                                setForm((f) => ({ ...f, fotografo_user_id: e.target.value })),
                        }}
                    >
                        <option value="">—</option>
                        {fotografos.map((f) => (
                            <option key={f.id} value={f.id}>
                                {f.nombre}
                            </option>
                        ))}
                    </AdminFormField>
                    <AdminFormField
                        type="checkbox"
                        label="Activo (visible en web)"
                        inputProps={{
                            checked: form.activo,
                            onChange: (e) =>
                                setForm((f) => ({ ...f, activo: e.target.checked })),
                        }}
                    />
                    <div className="sm:col-span-2 flex flex-wrap gap-2">
                        <AdminButton type="submit" disabled={busy}>
                            {editingId ? "Guardar cambios" : "Crear pack"}
                        </AdminButton>
                        {editingId ? (
                            <AdminButton type="button" variant="ghost" onClick={resetForm}>
                                Cancelar edición
                            </AdminButton>
                        ) : null}
                    </div>
                </form>
            </AdminCard>

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
        </AdminPageShell>
    );
}
