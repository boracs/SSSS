import React, { useState } from "react";
import { Head, usePage, Link } from "@inertiajs/react";
import {
    Package,
    Truck,
    ShoppingBag,
    ImageOff,
    CreditCard,
    Calendar,
} from "lucide-react";
import PageShell from "@/layouts/PageShell";
import { formatEur } from "@/utils/money";
import StoreFiscalInvoiceActions from "@/components/StoreFiscalInvoiceActions";
import AccordionTrigger from "@/components/ui/AccordionTrigger";
import S4Button from "@/components/S4Button";

const formatDate = (value) => {
    if (!value) return "—";
    return new Date(value).toLocaleDateString("es-ES", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
};

const formatPurchaseDate = (value) => {
    if (!value) return "—";
    return new Date(value).toLocaleDateString("es-ES", {
        weekday: "short",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const MetaItem = ({ icon: Icon, label, value }) => (
    <div className="flex min-w-[8.5rem] flex-1 items-start gap-2 rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200/80">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
        <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                {label}
            </p>
            <p className="text-sm font-semibold text-slate-800">{value}</p>
        </div>
    </div>
);

const paymentLabel = (method) => {
    if (!method) return "No especificado";
    const map = { card: "Con tarjeta", datafono: "Datáfono", cash: "Efectivo" };
    return map[method] ?? method;
};

const StatusPill = ({ active, activeLabel, inactiveLabel, icon: Icon }) => (
    <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
            active
                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                : "bg-amber-50 text-amber-700 ring-amber-200"
        }`}
    >
        <Icon className="h-3.5 w-3.5" />
        {active ? activeLabel : inactiveLabel}
    </span>
);

const Thumb = ({ src, alt }) => {
    const [failed, setFailed] = useState(false);
    if (!src || failed) {
        return (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-300">
                <ImageOff className="h-4 w-4" />
            </div>
        );
    }
    return (
        <img
            src={src}
            alt={alt}
            onError={() => setFailed(true)}
            className="h-11 w-11 shrink-0 rounded-lg border border-slate-200 object-cover"
        />
    );
};

function FiscalInvoiceBadge({ pedido }) {
    return (
        <StoreFiscalInvoiceActions
            detailUrl={pedido.fiscal_invoice_url}
            pdfUrl={pedido.fiscal_invoice_pdf_url}
            ready={Boolean(pedido.fiscal_invoice_ready)}
        />
    );
}

function PedidoAccordionPanel({ pedido }) {
    const productos = pedido.productos || [];

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
                <MetaItem
                    icon={Calendar}
                    label="Fecha de compra"
                    value={formatPurchaseDate(pedido.created_at)}
                />
                <MetaItem
                    icon={CreditCard}
                    label="Forma de pago"
                    value={paymentLabel(pedido.payment_method)}
                />
            </div>

            <ul className="divide-y divide-slate-100 rounded-xl bg-slate-50/80">
                {productos.map((producto) => {
                    const lineTotal = producto.precio_pagado * producto.cantidad;

                    return (
                        <li
                            key={producto.id}
                            className="flex items-center gap-3 px-3 py-3 first:pt-3 last:pb-3"
                        >
                            <Thumb src={producto.imagen} alt={producto.nombre} />
                            <div className="min-w-0 flex-1">
                                <Link
                                    href={route("producto.ver", producto.id)}
                                    className="truncate text-sm font-semibold text-slate-800 hover:text-s4"
                                >
                                    {producto.nombre}
                                </Link>
                                <p className="mt-0.5 text-xs text-slate-500">
                                    {producto.cantidad} × {formatEur(producto.precio_pagado)}
                                </p>
                                {producto.descuento_aplicado > 0 ? (
                                    <span className="mt-1 inline-flex items-center rounded-md bg-orange-50 px-1.5 py-0.5 text-[11px] font-semibold text-orange-600 ring-1 ring-orange-200">
                                        -{parseInt(producto.descuento_aplicado, 10)}% dto.
                                    </span>
                                ) : null}
                            </div>
                            <p className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">
                                {formatEur(lineTotal)}
                            </p>
                        </li>
                    );
                })}
            </ul>

            <div className="flex justify-end text-sm">
                <span className="font-semibold tabular-nums text-slate-900">
                    Total {formatEur(pedido.precio_total)}
                </span>
            </div>
        </div>
    );
}

const MostrarPedidos = () => {
    const { pedidos = [] } = usePage().props;
    const [expandedId, setExpandedId] = useState(null);

    const toggleExpanded = (id) => {
        setExpandedId((prev) => (prev === id ? null : id));
    };

    return (
        <PageShell variant="light">
            <Head title="Mis pedidos" />
            <div className="px-4 py-10 sm:px-6">
                <div className="mx-auto w-full max-w-3xl">
                    {/* Cabecera */}
                    <div className="mb-8">
                        <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-s4 shadow-sm ring-1 ring-slate-200/80">
                            <Package className="h-3.5 w-3.5" aria-hidden />
                            Tienda socios
                        </div>
                        <h1 className="mt-3 font-heading text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                            Mis pedidos
                        </h1>
                        <p className="mt-1.5 max-w-lg text-sm text-slate-600">
                            Consulta el estado y el detalle de tus compras.
                        </p>
                    </div>

                    {pedidos.length === 0 ? (
                        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white text-center shadow-[0_24px_60px_-28px_rgba(15,23,42,0.2)]">
                            <div
                                className="h-1 w-full bg-gradient-to-r from-s4 via-cyan-500 to-teal-400"
                                aria-hidden
                            />
                            <div className="flex flex-col items-center px-6 py-16">
                                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400 ring-1 ring-slate-200/80">
                                    <Package className="h-7 w-7" />
                                </div>
                                <h2 className="mt-4 text-lg font-semibold text-slate-800">
                                    Aún no tienes pedidos
                                </h2>
                                <p className="mt-1 max-w-sm text-sm text-slate-500">
                                    Cuando realices tu primera compra, aparecerá aquí
                                    con todo su detalle.
                                </p>
                                <S4Button
                                    href={route("tienda")}
                                    variant="primary"
                                    className="mt-6"
                                >
                                    <ShoppingBag className="h-4 w-4" />
                                    Ir a la tienda
                                </S4Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {pedidos.map((pedido) => {
                                const isOpen = expandedId === pedido.id;
                                const productos = pedido.productos || [];
                                const nombres =
                                    productos.map((p) => p.nombre).join(", ") ||
                                    "Sin productos";

                                return (
                                    <article
                                        key={pedido.id}
                                        className={`rounded-2xl bg-white p-5 ring-1 transition ${
                                            isOpen
                                                ? "ring-s4/20"
                                                : "ring-slate-200 hover:ring-slate-300"
                                        }`}
                                    >
                                        <div className="space-y-3">
                                            {/* Cabecera */}
                                            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm">
                                                <p className="font-semibold text-slate-900">
                                                    Pedido #{pedido.id}
                                                </p>
                                                <p className="text-center text-slate-500">
                                                    {formatDate(pedido.created_at)}
                                                </p>
                                                <p className="text-right font-semibold tabular-nums text-slate-900">
                                                    {formatEur(pedido.precio_total)}
                                                </p>
                                            </div>

                                            {/* Estado protagonista */}
                                            <div className="flex flex-wrap items-center gap-2">
                                                <StatusPill
                                                    active={pedido.entregado}
                                                    activeLabel="Entregado"
                                                    inactiveLabel="Pendiente de envío"
                                                    icon={Truck}
                                                />
                                                <FiscalInvoiceBadge pedido={pedido} />
                                            </div>

                                            {/* Cuerpo */}
                                            <div className="flex min-w-0 items-center gap-3">
                                                <div className="flex -space-x-2">
                                                    {productos.slice(0, 3).map((producto) => (
                                                        <Thumb
                                                            key={producto.id}
                                                            src={producto.imagen}
                                                            alt={producto.nombre}
                                                        />
                                                    ))}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-medium text-slate-700">
                                                        {nombres}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        {pedido.total_articulos}{" "}
                                                        {pedido.total_articulos === 1
                                                            ? "artículo"
                                                            : "artículos"}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Pie: acordeón */}
                                            <AccordionTrigger
                                                open={isOpen}
                                                onToggle={() =>
                                                    toggleExpanded(pedido.id)
                                                }
                                                panelId={`pedido-panel-${pedido.id}`}
                                                stopPropagation={false}
                                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                                                chevronClassName="h-3.5 w-3.5"
                                            >
                                                {isOpen
                                                    ? "Ocultar detalles"
                                                    : "Ver detalles"}
                                            </AccordionTrigger>
                                        </div>

                                        {isOpen ? (
                                            <div
                                                id={`pedido-panel-${pedido.id}`}
                                                className="mt-4 pt-4"
                                            >
                                                <PedidoAccordionPanel pedido={pedido} />
                                            </div>
                                        ) : null}
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </PageShell>
    );
};

export default MostrarPedidos;
