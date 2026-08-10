import React, { useEffect, useState } from "react";
import {
    X,
    Package,
    CreditCard,
    User,
    Calendar,
    Truck,
    ImageOff,
    Phone,
    Mail,
} from "lucide-react";
import { formatEur } from "@/utils/money";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { whatsappUrlFromPhone } from "@/lib/whatsapp";

const formatDate = (value) => {
    if (!value) return "—";
    return new Date(value).toLocaleDateString("es-ES", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
};

const paymentLabel = (method) => {
    if (!method) return "Pasarela / tarjeta";
    const map = {
        card: "Tarjeta",
        stripe: "Tarjeta (Stripe)",
        datafono: "Datáfono",
        cash: "Efectivo",
    };
    return map[method] ?? method;
};

function StatusPill({ active, activeLabel, inactiveLabel, icon: Icon }) {
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${
                active
                    ? "bg-emerald-500/15 text-emerald-200 ring-emerald-400/30"
                    : "bg-rose-500/10 text-rose-200 ring-rose-400/30"
            }`}
        >
            <Icon className="h-3.5 w-3.5" />
            {active ? activeLabel : inactiveLabel}
        </span>
    );
}

function MetaItem({ icon: Icon, label, children }) {
    return (
        <div className="flex min-w-0 items-start gap-2.5">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-cyan-400">
                <Icon className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
                <div className="mt-0.5 text-sm font-semibold text-slate-100">{children}</div>
            </div>
        </div>
    );
}

function ProductThumb({ src, alt }) {
    const [failed, setFailed] = useState(false);

    if (!src || failed) {
        return (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-500">
                <ImageOff className="h-4 w-4" />
            </div>
        );
    }

    return (
        <img
            src={src}
            alt={alt}
            loading="lazy"
            onError={() => setFailed(true)}
            className="h-11 w-11 shrink-0 rounded-lg border border-white/10 object-cover"
        />
    );
}

function ToggleSwitch({ checked, onChange, label }) {
    return (
        <label className="inline-flex cursor-pointer items-center gap-2">
            <span className="text-xs font-medium text-slate-400">{label}</span>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                aria-label={label}
                onClick={onChange}
                className={`relative h-5 w-9 rounded-full transition-colors ${
                    checked ? "bg-emerald-500" : "bg-slate-600"
                }`}
            >
                <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                        checked ? "left-[1.15rem]" : "left-0.5"
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

const PedidoDetailModal = ({ open, pedido, onClose, onToggleEntregado }) => {
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
    const telefono = pedido.usuario?.telefono || null;
    const waUrl = telefono ? whatsappUrlFromPhone(telefono) : null;
    const accent = pedido.entregado ? "border-l-emerald-500" : "border-l-rose-500";

    return (
        <div
            className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pedido-detail-modal-title"
        >
            <button
                type="button"
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                aria-label="Cerrar detalle"
                onClick={onClose}
            />

            <div
                className={`relative flex max-h-[min(94vh,820px)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-white/10 border-l-[3px] bg-slate-900 shadow-2xl shadow-black/50 sm:max-h-[90vh] sm:max-w-xl sm:rounded-2xl ${accent}`}
            >
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-400">
                            Pedido #{pedido.id}
                        </p>
                        <h2
                            id="pedido-detail-modal-title"
                            className="truncate text-base font-bold text-white"
                        >
                            {cliente}
                        </h2>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <StatusPill
                            active={pedido.entregado}
                            activeLabel="Entregado"
                            inactiveLabel="Sin entregar"
                            icon={Truck}
                        />
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Cerrar"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4">
                    <section className="grid grid-cols-1 gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:grid-cols-2 sm:gap-4 sm:p-4">
                        <MetaItem icon={User} label="Cliente">
                            <span className="truncate">{cliente}</span>
                        </MetaItem>
                        <MetaItem icon={Calendar} label="Fecha">
                            {formatDate(pedido.created_at)}
                        </MetaItem>
                        <MetaItem icon={CreditCard} label="Método de pago">
                            {paymentLabel(pedido.payment_method)}
                        </MetaItem>
                        {telefono ? (
                            <MetaItem icon={Phone} label="Teléfono">
                                <span className="inline-flex items-center gap-1.5">
                                    <span className="tabular-nums">{telefono}</span>
                                    {waUrl ? (
                                        <a
                                            href={waUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white transition hover:bg-emerald-500"
                                            aria-label={`WhatsApp a ${cliente}`}
                                            title="WhatsApp"
                                        >
                                            <WhatsAppIcon className="h-3 w-3" />
                                        </a>
                                    ) : null}
                                </span>
                            </MetaItem>
                        ) : null}
                        {pedido.usuario?.email ? (
                            <MetaItem icon={Mail} label="Email">
                                <span className="truncate">{pedido.usuario.email}</span>
                            </MetaItem>
                        ) : null}
                    </section>

                    <section className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
                        <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2.5 sm:px-4">
                            <Package className="h-4 w-4 text-cyan-400" />
                            <h3 className="text-sm font-semibold text-slate-100">Productos</h3>
                            <span className="ml-auto rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-slate-400 ring-1 ring-white/10">
                                {productos.length} {productos.length === 1 ? "artículo" : "artículos"}
                            </span>
                        </div>

                        <ul className="divide-y divide-white/5">
                            {productos.map((producto) => (
                                <li
                                    key={producto.id}
                                    className="flex items-center gap-3 px-3 py-2.5 sm:px-4 sm:py-3"
                                >
                                    <ProductThumb src={producto.imagen} alt={producto.nombre} />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-slate-100">
                                            {producto.nombre}
                                        </p>
                                        <p className="mt-0.5 text-xs text-slate-500">
                                            {producto.cantidad} × {formatEur(producto.precio_pagado)}
                                            {producto.descuento_aplicado > 0 ? (
                                                <span className="ml-1.5 font-semibold text-amber-300/90">
                                                    -{parseInt(producto.descuento_aplicado, 10)}%
                                                </span>
                                            ) : null}
                                        </p>
                                    </div>
                                    <p className="shrink-0 text-sm font-bold tabular-nums text-white">
                                        {formatEur(producto.subtotal)}
                                    </p>
                                </li>
                            ))}
                        </ul>

                        <div className="flex items-center justify-between border-t border-white/10 bg-white/[0.04] px-3 py-3 sm:px-4">
                            <span className="text-sm font-semibold text-slate-300">Total</span>
                            <span className="text-lg font-extrabold tabular-nums text-white">
                                {formatEur(pedido.precio_total)}
                            </span>
                        </div>
                    </section>
                </div>

                <div className="flex shrink-0 items-center justify-between gap-3 border-t border-white/10 bg-slate-950/50 px-4 py-3">
                    <ToggleSwitch
                        label="Entregado"
                        checked={!!pedido.entregado}
                        onChange={() => onToggleEntregado(pedido)}
                    />
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PedidoDetailModal;
