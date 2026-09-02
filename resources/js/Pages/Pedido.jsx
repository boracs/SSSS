import React, { useState } from "react";
import { Head, usePage } from "@inertiajs/react";
import {
    CheckCircle2,
    Package,
    CreditCard,
    User,
    Calendar,
    Truck,
    ShoppingBag,
    ReceiptText,
    ImageOff,
    ArrowLeft,
    LayoutDashboard,
} from "lucide-react";
import PageShell from "@/layouts/PageShell";
import { formatEur } from "@/utils/money";
import StoreFiscalInvoiceActions from "@/components/StoreFiscalInvoiceActions";
import S4Button from "@/components/S4Button";

const formatDate = (value) => {
    if (!value) return null;
    return new Date(value).toLocaleDateString("es-ES", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
};

const paymentLabel = (method) => {
    if (!method) return "No especificado";
    const map = { card: "Con tarjeta", datafono: "Datáfono", cash: "Efectivo" };
    return map[method] ?? method;
};

const StatusPill = ({ active, activeLabel, inactiveLabel, icon: Icon }) => (
    <span
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
            active
                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                : "bg-amber-50 text-amber-700 ring-amber-200"
        }`}
    >
        <Icon className="h-3.5 w-3.5" />
        {active ? activeLabel : inactiveLabel}
    </span>
);

const InfoRow = ({ icon: Icon, label, value }) => (
    <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {label}
            </p>
            <p className="truncate text-sm font-semibold text-slate-800">
                {value || "—"}
            </p>
        </div>
    </div>
);

const ProductThumb = ({ src, alt }) => {
    const [failed, setFailed] = useState(false);
    if (!src || failed) {
        return (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-300">
                <ImageOff className="h-5 w-5" />
            </div>
        );
    }
    return (
        <img
            src={src}
            alt={alt}
            onError={() => setFailed(true)}
            className="h-16 w-16 shrink-0 rounded-xl border border-slate-200 object-cover"
        />
    );
};

const ConfirmacionPedido = () => {
    const { pedido, isAdminView: isAdminViewProp, auth } = usePage().props;
    const isAdmin =
        isAdminViewProp === true || String(auth?.user?.role) === "admin";

    if (!pedido) {
        return (
            <PageShell variant="light">
                <div className="flex min-h-[60vh] items-center justify-center px-4 text-center text-lg text-slate-600">
                    No se pudo cargar el pedido o no existe.
                </div>
            </PageShell>
        );
    }

    const productos = pedido.productos || [];
    const fechaPedido = formatDate(pedido.created_at) || "Pendiente";

    return (
        <PageShell variant="light">
            <Head title={`Pedido #${pedido.id}`} />
            <div className="px-4 py-10 sm:px-6">
                <div className="mx-auto w-full max-w-3xl">
                    {/* Cabecera */}
                    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
                        <div className="flex flex-col items-center gap-3 border-b border-slate-100 bg-gradient-to-b from-emerald-50/80 to-white px-6 py-8 text-center">
                            <div
                                className={`flex h-14 w-14 items-center justify-center rounded-full ${
                                    isAdmin ? "bg-sky-100 text-sky-600" : "bg-emerald-100 text-emerald-600"
                                }`}
                            >
                                {isAdmin ? (
                                    <LayoutDashboard className="h-8 w-8" />
                                ) : (
                                    <CheckCircle2 className="h-8 w-8" />
                                )}
                            </div>
                            <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                                {isAdmin ? `Detalle del pedido #${pedido.id}` : "¡Pedido confirmado!"}
                            </h1>
                            <p className="max-w-md text-sm text-slate-500">
                                {isAdmin ? (
                                    <>
                                        Vista de administración del pedido de{" "}
                                        <span className="font-semibold text-slate-700">
                                            {pedido.cliente?.nombre || "cliente"}
                                        </span>
                                        .
                                    </>
                                ) : (
                                    <>
                                        Gracias por tu compra. Tu pedido{" "}
                                        <span className="font-semibold text-slate-700">#{pedido.id}</span> ha sido
                                        registrado correctamente.
                                    </>
                                )}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
                                <StatusPill
                                    active={pedido.entregado}
                                    activeLabel="Entregado"
                                    inactiveLabel="Pendiente de envío"
                                    icon={Truck}
                                />
                                <StoreFiscalInvoiceActions
                                    detailUrl={pedido.fiscal_invoice_url}
                                    pdfUrl={pedido.fiscal_invoice_pdf_url}
                                    ready={Boolean(pedido.fiscal_invoice_ready)}
                                />
                            </div>
                        </div>

                        {/* Datos del pedido */}
                        <div className="grid grid-cols-1 gap-5 px-6 py-6 sm:grid-cols-2">
                            <InfoRow
                                icon={User}
                                label="Cliente"
                                value={pedido.cliente?.nombre}
                            />
                            <InfoRow
                                icon={Calendar}
                                label="Fecha del pedido"
                                value={fechaPedido}
                            />
                            <InfoRow
                                icon={CreditCard}
                                label="Método de pago"
                                value={paymentLabel(pedido.payment_method)}
                            />
                        </div>
                    </div>

                    {/* Productos */}
                    <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
                        <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
                            <Package className="h-5 w-5 text-slate-400" />
                            <h2 className="text-base font-semibold text-slate-800">
                                Resumen de productos
                            </h2>
                            <span className="ml-auto rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
                                {productos.length}{" "}
                                {productos.length === 1 ? "artículo" : "artículos"}
                            </span>
                        </div>

                        <ul className="divide-y divide-slate-100">
                            {productos.map((producto) => (
                                <li
                                    key={producto.id}
                                    className="flex items-center gap-4 px-6 py-4"
                                >
                                    <ProductThumb
                                        src={producto.imagen}
                                        alt={producto.nombre}
                                    />
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold text-slate-800">
                                            {producto.nombre}
                                        </p>
                                        <p className="mt-0.5 text-sm text-slate-500">
                                            {producto.cantidad} ×{" "}
                                            {formatEur(producto.precio_pagado)}
                                        </p>
                                        {producto.descuento_aplicado > 0 && (
                                            <span className="mt-1 inline-flex items-center rounded-md bg-orange-50 px-1.5 py-0.5 text-[11px] font-semibold text-orange-600 ring-1 ring-orange-200">
                                                -{parseInt(producto.descuento_aplicado, 10)}% dto.
                                            </span>
                                        )}
                                    </div>
                                    <p className="shrink-0 text-base font-bold text-slate-900">
                                        {formatEur(producto.subtotal)}
                                    </p>
                                </li>
                            ))}
                        </ul>

                        {/* Totales */}
                        <div className="space-y-2 border-t border-slate-100 bg-slate-50/60 px-6 py-5">
                            {pedido.descuentos > 0 && (
                                <>
                                    <div className="flex items-center justify-between text-sm text-slate-500">
                                        <span>Subtotal</span>
                                        <span>{formatEur(pedido.subtotal)}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm font-medium text-emerald-600">
                                        <span>Descuentos</span>
                                        <span>−{formatEur(pedido.descuentos)}</span>
                                    </div>
                                </>
                            )}
                            <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                                <span className="text-base font-bold text-slate-800">
                                    Total
                                </span>
                                <span className="text-2xl font-extrabold text-slate-900">
                                    {formatEur(pedido.precio_total)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Aviso de seguimiento del pedido */}
                    <div className="mt-6 flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-5 py-4">
                        <ReceiptText className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
                        <p className="text-sm text-sky-900">
                            {isAdmin ? (
                                <>
                                    Actualiza el estado de entrega desde el{" "}
                                    <span className="font-semibold">gestor de pedidos</span>. Referencia:{" "}
                                    <span className="font-semibold">#{pedido.id}</span>.
                                </>
                            ) : (
                                <>
                                    Tu pago está confirmado. Te avisaremos cuando el pedido esté listo para
                                    recoger en el club. Para cualquier consulta, indícanos el
                                    identificador <span className="font-semibold">#{pedido.id}</span>.
                                </>
                            )}
                        </p>
                    </div>

                    {/* Acciones */}
                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                        {isAdmin ? (
                            <>
                                <S4Button
                                    href={route("gestor.pedidos")}
                                    variant="primary"
                                    className="flex-1"
                                >
                                    <LayoutDashboard className="h-4 w-4" />
                                    Volver al gestor de pedidos
                                </S4Button>
                                <S4Button
                                    type="button"
                                    variant="secondary"
                                    className="flex-1"
                                    onClick={() => window.history.back()}
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    Volver atrás
                                </S4Button>
                            </>
                        ) : (
                            <>
                                <S4Button
                                    href={route("tienda")}
                                    variant="primary"
                                    className="flex-1"
                                >
                                    <ShoppingBag className="h-4 w-4" />
                                    Seguir comprando
                                </S4Button>
                                <S4Button
                                    href={route("pedidos")}
                                    variant="secondary"
                                    className="flex-1"
                                >
                                    <Package className="h-4 w-4" />
                                    Ver mis pedidos
                                </S4Button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </PageShell>
    );
};

export default ConfirmacionPedido;
