import React, { useMemo, useState } from "react";
import { Head, usePage } from "@inertiajs/react";
import { ArrowDown, ArrowUpDown } from "lucide-react";
import Producto from "../components/Producto";
import Layout1 from "../layouts/Layout1";

const SORT_OPTIONS = [
    { value: "nombre", label: "Nombre (A–Z)" },
    { value: "descuento_desc", label: "Mayor descuento" },
    { value: "descuento_asc", label: "Menor descuento" },
];

const Tienda = ({ productos, productTagOptions = [] }) => {
    const { props } = usePage();
    const { flash } = props;

    const productosPorPagina = 18;
    const [paginaActual, setPaginaActual] = useState(1);
    const [tagActivo, setTagActivo] = useState("all");
    const [orden, setOrden] = useState("nombre");

    const [mensajeToast, setMensajeToast] = useState("");
    const [tipoToast, setTipoToast] = useState("");

    React.useEffect(() => {
        if (flash && flash.success) {
            setMensajeToast(flash.success);
            setTipoToast("success");
            setTimeout(() => setMensajeToast(""), 4000);
        }
        if (flash && flash.error) {
            setMensajeToast(flash.error);
            setTipoToast("error");
            setTimeout(() => setMensajeToast(""), 4000);
        }
    }, [flash]);

    const productosFiltrados = useMemo(() => {
        const base = [...productos].filter((producto) => {
            if (tagActivo === "all") return true;
            return (producto.tags || []).includes(tagActivo);
        });

        return base.sort((a, b) => {
            if (orden === "descuento_desc" || orden === "descuento_asc") {
                const descA = Number(a.descuento || 0);
                const descB = Number(b.descuento || 0);
                if (descA !== descB) {
                    return orden === "descuento_desc" ? descB - descA : descA - descB;
                }
            }

            const nameA = a.nombre.toLowerCase();
            const nameB = b.nombre.toLowerCase();
            if (nameA < nameB) return -1;
            if (nameA > nameB) return 1;
            return a.id - b.id;
        });
    }, [productos, tagActivo, orden]);

    const obtenerProductosDePagina = () => {
        const inicio = (paginaActual - 1) * productosPorPagina;
        const fin = inicio + productosPorPagina;
        return productosFiltrados.slice(inicio, fin);
    };

    const totalPaginas = Math.max(1, Math.ceil(productosFiltrados.length / productosPorPagina));

    React.useEffect(() => {
        setPaginaActual(1);
    }, [tagActivo, orden]);

    const irAAnterior = () => {
        if (paginaActual > 1) setPaginaActual(paginaActual - 1);
    };

    const irASiguiente = () => {
        if (paginaActual < totalPaginas) setPaginaActual(paginaActual + 1);
    };

    const toastClasses =
        tipoToast === "success"
            ? "bg-green-100 border border-green-400 text-green-800"
            : "bg-red-100 border border-red-400 text-red-800";
    const toastIcon = tipoToast === "success" ? "✔ Éxito" : "❌ Error";

    return (
        <Layout1>
            <Head title="Tienda oficial S4" />
            {mensajeToast && (
                <div
                    className={`fixed top-5 right-5 px-4 py-3 rounded-lg shadow-lg animate-fade-in-down ${toastClasses} z-50`}
                >
                    <strong className="font-semibold">{toastIcon}</strong>
                    <div className="text-sm">{mensajeToast}</div>
                </div>
            )}
            <div className="mx-auto w-full max-w-[96rem] px-2 py-4 sm:px-4 sm:py-5 lg:px-6 lg:py-6">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3 sm:mb-5">
                    <h2 className="text-xl font-extrabold tracking-tight text-slate-100 sm:text-2xl lg:text-3xl">
                        Tienda oficial S4
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <label className="flex items-center gap-1.5 text-slate-400">
                            <span className="sr-only">Ordenar productos</span>
                            {orden.startsWith("descuento") ? (
                                <ArrowDown className="h-3.5 w-3.5 shrink-0 text-cyan-400" aria-hidden />
                            ) : (
                                <ArrowUpDown className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            )}
                            <select
                                value={orden}
                                onChange={(e) => setOrden(e.target.value)}
                                aria-label="Ordenar productos"
                                className="rounded-lg border border-white/10 bg-slate-800/80 px-2 py-1.5 text-[10px] font-semibold text-slate-200 outline-none transition focus:border-cyan-400/40 sm:text-xs"
                            >
                                {SORT_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400 sm:text-xs">
                            {productosFiltrados.length} productos
                        </p>
                    </div>
                </div>

                {productTagOptions.length > 0 ? (
                    <div
                        className="mb-4 flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mb-5 sm:flex-wrap sm:overflow-visible"
                        role="group"
                        aria-label="Filtrar por categoría"
                    >
                        <button
                            type="button"
                            onClick={() => setTagActivo("all")}
                            aria-pressed={tagActivo === "all"}
                            className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition sm:text-xs ${
                                tagActivo === "all"
                                    ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-200"
                                    : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20"
                            }`}
                        >
                            Todos
                        </button>
                        {productTagOptions.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => setTagActivo(option.value)}
                                aria-pressed={tagActivo === option.value}
                                className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition sm:text-xs ${
                                    tagActivo === option.value
                                        ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-200"
                                        : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20"
                                }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                ) : null}

                <div className="grid grid-cols-[repeat(auto-fill,minmax(6.75rem,1fr))] gap-2 sm:grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] sm:gap-2.5 md:grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] md:gap-3 lg:grid-cols-[repeat(auto-fill,minmax(11.5rem,1fr))] lg:gap-4 xl:grid-cols-[repeat(auto-fill,minmax(12.5rem,1fr))] 2xl:grid-cols-[repeat(auto-fill,minmax(13.5rem,1fr))]">
                    {obtenerProductosDePagina().map((producto) => (
                        <Producto
                            key={producto.id}
                            nombre={producto.nombre}
                            precio={producto.precio}
                            imagenes={producto.imagenes}
                            unidades={producto.unidades}
                            descuento={producto.descuento}
                            producto={producto}
                        />
                    ))}
                </div>

                {productosFiltrados.length === 0 ? (
                    <p className="mt-8 text-center text-sm text-slate-400">
                        No hay productos en esta categoría.
                    </p>
                ) : null}

                <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                    <button
                        onClick={irAAnterior}
                        className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={paginaActual === 1}
                    >
                        Anterior
                    </button>
                    <span className="text-sm text-slate-300">
                        Página <span className="font-bold text-slate-100">{paginaActual}</span> de{" "}
                        <span className="font-bold text-slate-100">{totalPaginas}</span>
                    </span>
                    <button
                        onClick={irASiguiente}
                        className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={paginaActual === totalPaginas}
                    >
                        Siguiente
                    </button>
                </div>
            </div>
        </Layout1>
    );
};

export default Tienda;
