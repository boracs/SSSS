import React from "react";
import { Link } from "@inertiajs/react";

const year = new Date().getFullYear();

export default function Footer() {
    return (
        <footer className="mt-16 border-t border-slate-200 bg-brand-deep text-white">
            <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12">
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-brand-accent">
                            Explorar
                        </h3>
                        <ul className="mt-4 space-y-2.5 text-sm leading-relaxed">
                            <li><Link href={route("nosotros")} className="font-medium text-white/90 transition-all duration-300 hover:text-brand-accent">Sobre S4</Link></li>
                            <li><Link href={route("servicios.surf")} className="font-medium text-white/90 transition-all duration-300 hover:text-brand-accent">Clases de surf</Link></li>
                            <li><Link href={route("rentals.surfboards.index")} className="font-medium text-white/90 transition-all duration-300 hover:text-brand-accent">Tablas de alquiler</Link></li>
                            <li><Link href={route("contacto")} className="font-medium text-white/90 transition-all duration-300 hover:text-brand-accent">Contacto</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-brand-accent">
                            Soporte
                        </h3>
                        <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-white/90">
                            <li>San Sebastián · Donostia</li>
                            <li>
                                <a href="mailto:info@sansebastiansurfschool.com" className="font-medium transition-all duration-300 hover:text-brand-accent">
                                    info@sansebastiansurfschool.com
                                </a>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-brand-accent">
                            Escuela
                        </h3>
                        <p className="mt-4 font-heading text-lg font-bold tracking-tight text-white">
                            San Sebastian Surf School
                        </p>
                        <p className="mt-2 text-sm font-medium leading-relaxed text-white/80">
                            La Concha · Zurriola · Cantábrico. Seguridad, técnica y experiencia premium.
                        </p>
                    </div>
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-brand-accent">
                            Síguenos
                        </h3>
                        <div className="mt-4 flex gap-4">
                            <a href="#" className="text-white/80 transition-all duration-300 hover:text-brand-accent" aria-label="Instagram">IG</a>
                            <a href="#" className="text-white/80 transition-all duration-300 hover:text-brand-accent" aria-label="Facebook">FB</a>
                        </div>
                    </div>
                </div>
            </div>
            <div className="border-t border-white/10">
                <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-4 sm:flex-row sm:px-6">
                    <p className="text-xs leading-relaxed text-white/70">
                        © {year} San Sebastian Surf School · S4. Todos los derechos reservados.
                    </p>
                    <div className="flex items-center gap-4 text-xs text-white/70">
                        <span>Pagos seguros</span>
                        <span aria-hidden>·</span>
                        <span>Redes sociales</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
