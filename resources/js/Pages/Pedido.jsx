import React, { useState } from "react";
import { Head, usePage, Link } from "@inertiajs/react";
import {
    CheckCircle2,
    Package,
    CreditCard,
    User,
    Calendar,
    FileCheck2,
    Truck,
    ShoppingBag,
    ReceiptText,
    ImageOff,
} from "lucide-react";
import Layout1 from "../layouts/Layout1";
import { formatEur } from "@/utils/money";

const formatDate = (value) => {
    if (!value) return null;
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
    const { pedido } = usePage().props;

    if (!pedido) {
        return (
            <Layout1>
                <div className="flex min-h-[60vh] items-center justify-center px-4 text-center text-lg text-slate-600">
                    No se pudo cargar el pedido o no existe.
                </div>
            </Layout1>
        );
    }

    const productos = pedido.productos || [];
    const fechaPedido = formatDate(pedido.created_at) || "Pendiente";
    const justificante = formatDateTime(pedido.proof_uploaded_at);

    return (
        <Layout1>
            <Head title={`Pedido #${pedido.id}`} />
            <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
                <div className="mx-auto w-full max-w-3xl">
                    {/* Cabecera */}
                    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
                        <div className="flex flex-col items-center gap-3 border-b border-slate-100 bg-gradient-to-b from-emerald-50/80 to-white px-6 py-8 text-center">
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                                <CheckCircle2 className="h-8 w-8" />
                            </div>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                                ¡Pedido confirmado!
                            </h1>
                            <p className="max-w-md text-sm text-slate-500">
                                Gracias por tu compra. Tu pedido{" "}
                                <span className="font-semibold text-slate-700">
                                    #{pedido.id}
                                </span>{" "}
                                ha sido registrado correctamente.
                            </p>
                            <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
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
                            <InfoRow
                                icon={FileCheck2}
                                label="Justificante"
                                value={
                                    justificante
                                        ? `Subido el ${justificante}`
                                        : "Pendiente"
                                }
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

                    {/* Aviso de validación de pago manual */}
                    <div className="mt-6 flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-5 py-4">
                        <ReceiptText className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
                        <p className="text-sm text-sky-900">
                            Hemos recibido tu justificante de pago. Nuestro equipo
                            lo verificará y actualizará el estado del pedido. Para
                            cualquier consulta, indícanos el identificador{" "}
                            <span className="font-semibold">#{pedido.id}</span>.
                        </p>
                    </div>

                    {/* Acciones */}
                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                        <Link
                            href={route("tienda")}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                        >
                            <ShoppingBag className="h-4 w-4" />
                            Seguir comprando
                        </Link>
                        <Link
                            href={route("pedidos")}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                        >
                            <Package className="h-4 w-4" />
                            Ver mis pedidos
                        </Link>
                    </div>
                </div>
            </div>
        </Layout1>
    );
};

export default ConfirmacionPedido;
