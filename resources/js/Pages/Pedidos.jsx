import React, { useState } from "react";
import { Head, usePage, Link } from "@inertiajs/react";
import {
    Package,
    CreditCard,
    Truck,
    ChevronRight,
    ShoppingBag,
    ImageOff,
} from "lucide-react";
import Layout1 from "../layouts/Layout1";
import { formatEur } from "@/utils/money";

const formatDate = (value) => {
    if (!value) return "—";
    return new Date(value).toLocaleDateString("es-ES", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
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

const MostrarPedidos = () => {
    const { pedidos = [] } = usePage().props;

    return (
        <Layout1>
            <Head title="Mis pedidos" />
            <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
                <div className="mx-auto w-full max-w-3xl">
                    {/* Cabecera */}
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                            Mis pedidos
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Consulta el estado y el detalle de tus compras.
                        </p>
                    </div>

                    {pedidos.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-2xl bg-white px-6 py-16 text-center shadow-sm ring-1 ring-slate-200">
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                <Package className="h-7 w-7" />
                            </div>
                            <h2 className="mt-4 text-lg font-semibold text-slate-800">
                                Aún no tienes pedidos
                            </h2>
                            <p className="mt-1 max-w-sm text-sm text-slate-500">
                                Cuando realices tu primera compra, aparecerá aquí
                                con todo su detalle.
                            </p>
                            <Link
                                href={route("tienda")}
                                className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                            >
                                <ShoppingBag className="h-4 w-4" />
                                Ir a la tienda
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {pedidos.map((pedido) => (
                                <Link
                                    key={pedido.id}
                                    href={route("mostrar.pedido", pedido.id)}
                                    className="group block overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 transition-all hover:shadow-md hover:ring-slate-300"
                                >
                                    {/* Cabecera de la tarjeta */}
                                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                                        <div>
                                            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                                Pedido
                                            </p>
                                            <p className="text-base font-bold text-slate-900">
                                                #{pedido.id}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                                {formatDate(pedido.created_at)}
                                            </p>
                                            <p className="text-lg font-extrabold text-slate-900">
                                                {formatEur(pedido.precio_total)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Cuerpo */}
                                    <div className="flex items-center justify-between gap-4 px-5 py-4">
                                        <div className="flex min-w-0 items-center gap-3">
                                            {/* Miniaturas de productos */}
                                            <div className="flex -space-x-2">
                                                {(pedido.productos || [])
                                                    .slice(0, 3)
                                                    .map((producto) => (
                                                        <Thumb
                                                            key={producto.id}
                                                            src={producto.imagen}
                                                            alt={producto.nombre}
                                                        />
                                                    ))}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium text-slate-700">
                                                    {(pedido.productos || [])
                                                        .map((p) => p.nombre)
                                                        .join(", ") || "Sin productos"}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {pedido.total_articulos}{" "}
                                                    {pedido.total_articulos === 1
                                                        ? "artículo"
                                                        : "artículos"}
                                                </p>
                                            </div>
                                        </div>
                                        <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 transition-colors group-hover:text-slate-500" />
                                    </div>

                                    {/* Pie con estados */}
                                    <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
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
                                        {pedido.fiscal_invoice_url ? (
                                            <span className="inline-flex items-center rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700 ring-1 ring-sky-200">
                                                {pedido.fiscal_invoice_ready ? "Factura TBAI" : "Factura en trámite"}
                                            </span>
                                        ) : null}
                                        <span className="ml-auto text-xs font-semibold text-slate-400 transition-colors group-hover:text-slate-600">
                                            Ver detalles
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Layout1>
    );
};

export default MostrarPedidos;
