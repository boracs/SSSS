import React from "react";
import { Head, Link } from "@inertiajs/react";
import Layout1 from "../../layouts/Layout1";
import { Gavel, Key, Star, ArrowRight } from "lucide-react";

export default function AuctionsAccessRequired() {
    return (
        <Layout1>
            <Head title="Subastas — solo socios" />
            <div className="min-h-screen bg-gradient-to-b from-slate-950 via-[#0f172a] to-slate-950 px-4 py-12 sm:px-6">
                <div className="mx-auto max-w-2xl">
                    <div className="rounded-2xl border border-orange-400/25 bg-gradient-to-br from-orange-500/10 via-white/5 to-transparent p-8 sm:p-10">
                        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/20 text-orange-300 ring-1 ring-orange-400/30">
                            <Gavel className="h-6 w-6" />
                        </div>
                        <h1 className="text-2xl font-extrabold text-white sm:text-3xl">
                            Subastas exclusivas para socios
                        </h1>
                        <p className="mt-4 text-sm leading-relaxed text-slate-300 sm:text-base">
                            Las subastas de material surf están reservadas a clientes{" "}
                            <strong className="text-white">VIP</strong> o socios con{" "}
                            <strong className="text-white">taquilla en el club</strong>.
                            Si ya eres socio, inicia sesión con tu cuenta; si no, puedes solicitar acceso.
                        </p>

                        <ul className="mt-6 space-y-3">
                            <li className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                                <Star className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
                                <span>
                                    <strong className="text-white">Perfil VIP</strong> — bonos y ventajas de la escuela.
                                </span>
                            </li>
                            <li className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                                <Key className="mt-0.5 h-5 w-5 shrink-0 text-cyan-400" />
                                <span>
                                    <strong className="text-white">Taquilla S4</strong> — plan de cuota con casillero en el club.
                                </span>
                            </li>
                        </ul>

                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                            <Link
                                href={route("taquillas.planes")}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 px-5 py-3 text-sm font-bold text-slate-900"
                            >
                                Ver planes de taquilla
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                            <Link
                                href={route("bonos.index")}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
                            >
                                Bonos VIP
                            </Link>
                            <Link
                                href={route("contacto")}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-slate-400 hover:text-white"
                            >
                                Contacto
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </Layout1>
    );
}
