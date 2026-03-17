import React from "react";
import { Link, usePage } from "@inertiajs/react";
import Menu_principal from "../components/Menu_principal";
import BrandBanner from "../components/BrandBanner";
import { CartProvider } from "../Contexts/cartContext";

const year = new Date().getFullYear();

export default function AuthenticatedLayout({ header, children }) {
    const { auth } = usePage().props;
    const user = auth?.user;
    const isAdmin = user && String(user?.role) === "admin";

    return (
        <div className="flex min-h-screen flex-col bg-brand-surface">
            {/* Mismo header que en el resto: banner + menú único (el menú cambia según admin/user) */}
            <BrandBanner />
            <header className="sticky top-0 z-header w-full border-b border-slate-200/60 bg-white/95 shadow-sm backdrop-blur-md">
                <CartProvider>
                    <Menu_principal headerVariant="solid" />
                </CartProvider>
            </header>

            <main className="flex-1">{children}</main>

            <footer className="mt-auto border-t border-slate-200 bg-white">
                <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
                    <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Explorar</h3>
                            <ul className="mt-4 space-y-2 text-sm">
                                <li><Link href={route("Pag_principal")} className="font-medium text-slate-700 transition-colors duration-300 ease-in-out hover:text-brand-primary">Inicio</Link></li>
                                <li><Link href={route("nosotros")} className="font-medium text-slate-700 transition-colors duration-300 ease-in-out hover:text-brand-primary">Nosotros</Link></li>
                                <li><Link href={route("rentals.surfboards.index")} className="font-medium text-slate-700 transition-colors duration-300 ease-in-out hover:text-brand-primary">Tablas de alquiler</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Soporte</h3>
                            <ul className="mt-4 space-y-2 text-sm">
                                <li><Link href={route("contacto")} className="font-medium text-slate-700 transition-colors duration-300 ease-in-out hover:text-brand-primary">Contacto</Link></li>
                                {isAdmin && (
                                    <li><Link href={route("admin.surfboards.index")} className="font-medium text-slate-700 transition-colors duration-300 ease-in-out hover:text-brand-primary">Panel tablas</Link></li>
                                )}
                            </ul>
                        </div>
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Escuela</h3>
                            <p className="mt-4 text-sm font-medium text-slate-700">
                                San Sebastian Surf School · S4
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                                La Concha · Zurriola · Cantábrico
                            </p>
                        </div>
                    </div>
                    <div className="mt-8 flex flex-col gap-4 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs text-slate-500">© {year} San Sebastian Surf School · S4. Todos los derechos reservados.</p>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span>Pagos seguros</span>
                            <span aria-hidden>·</span>
                            <span>Área administración</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
