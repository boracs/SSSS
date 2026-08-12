import React, { useMemo, useState } from "react";
import { usePage } from "@inertiajs/react";
import { ArrowDown, ArrowUpDown, Lock, ShieldCheck, Sparkles } from "lucide-react";
import Producto from "../components/Producto";
import Layout1 from "../layouts/Layout1";
import SeoHead from "../components/seo/SeoHead";
import ContactChannelsModal from "../components/ContactChannelsModal";
import { hasStoreAccess } from "@/utils/hasStoreAccess";

const SORT_OPTIONS = [
    { value: "nombre", label: "Nombre (A–Z)" },
    { value: "descuento_desc", label: "Mayor descuento" },
    { value: "descuento_asc", label: "Menor descuento" },
];

/** Lotes de 8 = 2 filas en xl (4 cols) / ~4 filas en móvil (2 cols). */
const BATCH_SIZE = 8;

const Tienda = ({ productos, productTagOptions = [], seo = null }) => {
    const { props } = usePage();
    const { flash, auth } = props;
    const user = auth?.user || null;
    const puedeComprar = hasStoreAccess(user);
    const [contactOpen, setContactOpen] = useState(false);

    const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
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

    const productosVisibles = productosFiltrados.slice(0, visibleCount);
    const quedanMas = visibleCount < productosFiltrados.length;

    React.useEffect(() => {
        setVisibleCount(BATCH_SIZE);
    }, [tagActivo, orden]);

    const toastClasses =
        tipoToast === "success"
            ? "bg-green-100 border border-green-400 text-green-800"
            : "bg-red-100 border border-red-400 text-red-800";
    const toastIcon = tipoToast === "success" ? "✔ Éxito" : "❌ Error";

    return (
        <Layout1>
            <SeoHead seo={seo} />
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
                    <h1 className="text-xl font-extrabold tracking-tight text-slate-100 sm:text-2xl lg:text-3xl">
                        Tienda · San Sebastián Surf School
                    </h1>
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

                <aside
                    className={`mb-5 rounded-2xl border px-4 py-3 sm:mb-6 sm:px-5 ${
                        puedeComprar
                            ? "border-emerald-500/25 bg-emerald-500/10"
                            : "border-cyan-500/25 bg-cyan-500/[0.08]"
                    }`}
                    aria-label="Información de acceso a la tienda"
                >
                    <div className="flex items-start gap-3">
                        <span
                            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                                puedeComprar
                                    ? "bg-emerald-500/20 text-emerald-300"
                                    : "bg-cyan-500/20 text-cyan-300"
                            }`}
                        >
                            {puedeComprar ? (
                                <ShieldCheck className="h-4 w-4" aria-hidden />
                            ) : (
                                <Lock className="h-4 w-4" aria-hidden />
                            )}
                        </span>
                        <div className="min-w-0">
                            <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-cyan-300/90">
                                <Sparkles className="h-3 w-3" aria-hidden />
                                Tienda exclusiva de socios
                            </p>
                            {puedeComprar ? (
                                <p className="mt-1 text-sm leading-relaxed text-slate-200">
                                    Precios de club activos con tu cuenta y taquilla.
                                </p>
                            ) : (
                                <p className="mt-1 text-sm leading-relaxed text-slate-300">
                                    Compra online para socios con{" "}
                                    <strong className="font-semibold text-white">
                                        cuenta y taquilla activa
                                    </strong>
                                    . Si eres cliente recurrente y conoces al personal,{" "}
                                    <button
                                        type="button"
                                        onClick={() => setContactOpen(true)}
                                        className="font-semibold text-cyan-300 underline-offset-2 hover:underline"
                                    >
                                        contacta con nosotros
                                    </button>{" "}
                                    y vemos cómo ayudarte.
                                </p>
                            )}
                        </div>
                    </div>
                </aside>

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

                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-4 xl:gap-5">
                    {productosVisibles.map((producto) => (
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

                {quedanMas ? (
                    <div className="mt-7 flex flex-col items-center gap-2">
                        <button
                            type="button"
                            onClick={() =>
                                setVisibleCount((n) =>
                                    Math.min(
                                        n + BATCH_SIZE,
                                        productosFiltrados.length,
                                    ),
                                )
                            }
                            className="rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-cyan-400/40 hover:bg-cyan-500/10 hover:text-white"
                        >
                            Ver más
                        </button>
                        <p className="text-xs text-slate-500">
                            Mostrando {productosVisibles.length} de{" "}
                            {productosFiltrados.length}
                        </p>
                    </div>
                ) : null}
            </div>

            {contactOpen ? (
                <ContactChannelsModal
                    topic="store"
                    title="Hablemos de tu caso"
                    subtitle="Cuéntanos tu situación y te ayudamos a resolver cualquier duda sobre tu acceso, material o taquilla."
                    footerNote="Si eres cliente habitual, contáctanos y buscamos juntos una solución que te encaje."
                    onClose={() => setContactOpen(false)}
                />
            ) : null}
        </Layout1>
    );
};

export default Tienda;
