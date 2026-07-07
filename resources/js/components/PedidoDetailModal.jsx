import React, { useEffect, useState } from "react";
import {
    X,
    Package,
    CreditCard,
    User,
    Calendar,
    FileCheck2,
    Truck,
    ReceiptText,
    ImageOff,
    LayoutDashboard,
    Phone,
    Mail,
} from "lucide-react";
import { formatEur } from "@/utils/money";

const formatDate = (value) => {
    if (!value) return "—";
    return new Date(value).toLocaleDateString("es-ES", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
};

const formatDateTime = (value) => {
    if (!value) return null;
    return new Date(value).toLocaleString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const paymentLabel = (method) => {
    if (!method) return "No especificado";
    const map = { bizum: "Bizum", transferencia: "Transferencia bancaria" };
    return map[method] ?? method;
};

function StatusPill({ active, activeLabel, inactiveLabel, icon: Icon, inactiveTone = "amber" }) {
    const activeCls = "bg-emerald-50 text-emerald-700 ring-emerald-200";
    const inactiveCls =
        inactiveTone === "rose"
            ? "bg-rose-50 text-rose-700 ring-rose-200"
            : "bg-amber-50 text-amber-700 ring-amber-200";

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 sm:px-3 sm:text-xs ${
                active ? activeCls : inactiveCls
            }`}
        >
            <Icon className="h-3.5 w-3.5" />
            {active ? activeLabel : inactiveLabel}
        </span>
    );
}

function InfoRow({ icon: Icon, label, value }) {
    return (
        <div className="flex items-start gap-2.5 sm:gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 sm:h-9 sm:w-9">
                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400 sm:text-xs">
                    {label}
                </p>
                <p className="truncate text-sm font-semibold text-slate-800">{value || "—"}</p>
            </div>
        </div>
    );
}

function ProductThumb({ src, alt }) {
    const [failed, setFailed] = useState(false);

    if (!src || failed) {
        return (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-300 sm:h-14 sm:w-14 sm:rounded-xl">
                <ImageOff className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
        );
    }

    return (
        <img
            src={src}
            alt={alt}
            loading="lazy"
            onError={() => setFailed(true)}
            className="h-12 w-12 shrink-0 rounded-lg border border-slate-200 object-cover sm:h-14 sm:w-14 sm:rounded-xl"
        />
    );
}

function ToggleSwitch({ checked, onChange, label }) {
    return (
        <label className="inline-flex cursor-pointer items-center gap-2">
            <span className="text-xs font-medium text-slate-600">{label}</span>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                aria-label={label}
                onClick={onChange}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                    checked ? "bg-emerald-500" : "bg-slate-300"
                }`}
            >
                <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        checked ? "left-[1.35rem]" : "left-0.5"
                    }`}
                />
            </button>
        </label>
    );
}

function pedidoClienteNombre(pedido) {
    const u = pedido?.usuario;
    if (!u) return "Cliente";
    return [u.nombre, u.apellido].filter(Boolean).join(" ") || "Cliente";
}

const PedidoDetailModal = ({ open, pedido, onClose, onTogglePagado, onToggleEntregado }) => {
    useEffect(() => {
        if (!open) return undefined;

        document.body.style.overflow = "hidden";

        const onKeyDown = (event) => {
            if (event.key === "Escape") onClose();
        };

        window.addEventListener("keydown", onKeyDown);

        return () => {
            document.body.style.overflow = "";
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [open, onClose]);

    if (!open || !pedido) return null;

    const productos = pedido.productos || [];
    const cliente = pedidoClienteNombre(pedido);
    const justificante = formatDateTime(pedido.proof_uploaded_at);
    const entregadoSinPagar = pedido.entregado && !pedido.pagado;

    return (
        <div
            className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pedido-detail-modal-title"
        >
            <button
                type="button"
                className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm"
                aria-label="Cerrar detalle"
                onClick={onClose}
            />

            <div className="relative flex max-h-[min(94vh,820px)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-slate-100 shadow-2xl sm:max-h-[90vh] sm:max-w-2xl sm:rounded-2xl">
                <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2.5 sm:px-4 sm:py-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
                            <LayoutDashboard className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                                Detalle del pedido
                            </p>
                            <h2 id="pedido-detail-modal-title" className="truncate text-base font-bold text-slate-900">
                                #{pedido.id} · {cliente}
                            </h2>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Cerrar"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-3 sm:space-y-4 sm:p-4">
                    <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
                        <div className="border-b border-slate-100 bg-gradient-to-b from-sky-50/80 to-white px-4 py-4 text-center sm:px-5 sm:py-5">
                            <div className="flex flex-wrap items-center justify-center gap-2">
                                <StatusPill
                                    active={pedido.pagado}
                                    activeLabel="Pagado"
                                    inactiveLabel="Pago pendiente"
                                    icon={CreditCard}
                                />
                                <StatusPill
                                    active={pedido.entregado}
                                    activeLabel="Entregado"
                                    inactiveLabel="Pendiente de envío"
                                    icon={Truck}
                                />
                            </div>
                            {entregadoSinPagar ? (
                                <p className="mt-2 text-xs font-medium text-rose-600">
                                    Entregado a socio de confianza — cobro pendiente
                                </p>
                            ) : null}
                        </div>

                        <div className="grid grid-cols-1 gap-4 px-4 py-4 sm:grid-cols-2 sm:gap-5 sm:px-5 sm:py-5">
                            <InfoRow icon={User} label="Cliente" value={cliente} />
                            <InfoRow icon={Calendar} label="Fecha del pedido" value={formatDate(pedido.created_at)} />
                            <InfoRow
                                icon={CreditCard}
                                label="Método de pago"
                                value={paymentLabel(pedido.payment_method)}
                            />
                            <InfoRow
                                icon={FileCheck2}
                                label="Justificante"
                                value={justificante ? `Subido el ${justificante}` : "Pendiente"}
                            />
                            {pedido.usuario?.telefono ? (
                                <InfoRow icon={Phone} label="Teléfono" value={pedido.usuario.telefono} />
                            ) : null}
                            {pedido.usuario?.email ? (
                                <InfoRow icon={Mail} label="Email" value={pedido.usuario.email} />
                            ) : null}
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
                        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 sm:px-5">
                            <Package className="h-4 w-4 text-slate-400 sm:h-5 sm:w-5" />
                            <h3 className="text-sm font-semibold text-slate-800 sm:text-base">
                                Resumen de productos
                            </h3>
                            <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 sm:text-xs">
                                {productos.length} {productos.length === 1 ? "artículo" : "artículos"}
                            </span>
                        </div>

                        <ul className="divide-y divide-slate-100">
                            {productos.map((producto) => (
                                <li
                                    key={producto.id}
                                    className="flex items-center gap-3 px-4 py-3 sm:gap-4 sm:px-5 sm:py-4"
                                >
                                    <ProductThumb src={producto.imagen} alt={producto.nombre} />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-slate-800">{producto.nombre}</p>
                                        <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                                            {producto.cantidad} × {formatEur(producto.precio_pagado)}
                                        </p>
                                        {producto.descuento_aplicado > 0 ? (
                                            <span className="mt-1 inline-flex items-center rounded-md bg-orange-50 px-1.5 py-0.5 text-[10px] font-semibold text-orange-600 ring-1 ring-orange-200">
                                                -{parseInt(producto.descuento_aplicado, 10)}% dto.
                                            </span>
                                        ) : null}
                                    </div>
                                    <p className="shrink-0 text-sm font-bold text-slate-900 sm:text-base">
                                        {formatEur(producto.subtotal)}
                                    </p>
                                </li>
                            ))}
                        </ul>

                        <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-4 sm:px-5">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-slate-800 sm:text-base">Total</span>
                                <span className="text-xl font-extrabold text-slate-900 sm:text-2xl">
                                    {formatEur(pedido.precio_total)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-start gap-2.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-3 sm:gap-3 sm:px-4 sm:py-4">
                        <ReceiptText className="mt-0.5 h-4 w-4 shrink-0 text-sky-600 sm:h-5 sm:w-5" />
                        <p className="text-xs text-sky-900 sm:text-sm">
                            Revisa el justificante y actualiza el estado desde aquí o en la tarjeta del listado.
                            Referencia: <span className="font-semibold">#{pedido.id}</span>.
                        </p>
                    </div>
                </div>

                <div className="flex shrink-0 flex-col gap-2 border-t border-slate-200 bg-white px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-3">
                    <div className="flex flex-wrap gap-4">
                        <ToggleSwitch
                            label="Pagado"
                            checked={!!pedido.pagado}
                            onChange={() => onTogglePagado(pedido.id)}
                        />
                        <ToggleSwitch
                            label="Entregado"
                            checked={!!pedido.entregado}
                            onChange={() => onToggleEntregado(pedido.id)}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full rounded-lg border border-slate-300 bg-white py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto sm:px-5"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PedidoDetailModal;
