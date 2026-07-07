import { Link, usePage } from "@inertiajs/react";
import { formatEur } from "@/utils/money";
import {
    Bath,
    Coffee,
    Droplets,
    ExternalLink,
    Heart,
    Lock,
    Music,
    Package,
    Percent,
    Plug,
    Refrigerator,
    Ruler,
    Scissors,
    Shirt,
    Wifi,
    Wind,
    Wrench,
    Zap,
} from "lucide-react";

const MICRO_SERVICIOS_URL = "/nosotros#micro-servicios-club";

// Beneficios genericos del club (iguales para todos los planes, solo cambia
// la duracion y el precio). Se muestran una sola vez para no saturar la pagina.
const MEMBERSHIP_BENEFITS = [
    { icon: Lock, text: "1 taquilla privada a pie de playa con seguridad." },
    { icon: Shirt, text: "Espacio para 2 tablas en rack y 2 trajes en el secadero rapido." },
    { icon: Bath, text: "Banos, duchas y zona de calentamiento a tu disposicion." },
    { icon: Percent, text: "Hasta 45% de descuento en tienda (50% con plan VIP anual)." },
    { icon: Wrench, text: "Reparacion de tablas y acceso a micro-servicios del club." },
];

// Lista completa de micro-servicios, identica a la presentacion de /nosotros.
const MICRO_SERVICES = [
    { icon: Coffee, label: "Maquina de cafe", sub: "Trae tus capsulas" },
    { icon: Refrigerator, label: "Frigorifico comunitario", sub: "Guarda tus tapers, bebidas..." },
    { icon: Zap, label: "Vending tecnico", sub: "Parafina, Solarez, quillas" },
    { icon: Droplets, label: "Ducha de agua caliente", sub: "Aclarado post-sesion" },
    { icon: Scissors, label: "Secador de pelo", sub: "Profesional de uso comun" },
    { icon: Plug, label: "Enchufes y carga USB", sub: "En cada taquilla" },
    { icon: Wifi, label: "WiFi alta velocidad", sub: "En toda la instalacion" },
    { icon: Music, label: "Alexa smart speaker", sub: "Musica y domotica" },
    { icon: Heart, label: "Botiquin primeros auxilios", sub: "Siempre disponible" },
    { icon: Ruler, label: "Zona de encerado y reparaciones pequenas", sub: "Material comun: Solarez, lijas, luz UV..." },
    { icon: Wind, label: "Zona de secado rapido para neoprenos", sub: "Baja humedad relativa" },
    { icon: Bath, label: "Banos", sub: "A disposicion de socios" },
    { icon: Package, label: "Taquillas", sub: "Espacio privado a pie de playa" },
    { icon: Wrench, label: "Servicio de reparacion automatizado", sub: "Pizarra fisica + seguimiento semanal" },
];

function showMonthlyEquivalent(plan) {
    return Number(plan.duracion_dias || 0) > 30;
}

export default function PlanesTaquillasPublic({ planes = [] }) {
    const { auth } = usePage().props;
    const user = auth?.user;
    const hasLocker = Boolean(user?.hasActiveLocker || user?.numeroTaquilla);

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-[#0a2233] to-slate-950 text-white">
            <div className="mx-auto max-w-6xl space-y-14 px-4 py-10 sm:px-6 sm:py-14">
                {/* HERO */}
                <section
                    aria-labelledby="planes-hero-heading"
                    className="rounded-3xl border border-cyan-900/40 bg-[#0b1d33]/70 p-6 shadow-xl sm:p-10"
                >
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-200/80">San Sebastian Surf School</p>
                    <h1 id="planes-hero-heading" className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                        Planes y cuotas del club
                    </h1>
                    <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-300">
                        Consulta nuestras tarifas y descubre que incluye ser socio con taquilla en Zurriola. Elige el periodo
                        que mejor encaje contigo y accede a instalaciones premium, descuentos y micro-servicios exclusivos.
                    </p>
                    <div className="mt-6 flex flex-wrap gap-3">
                        <Link
                            href={MICRO_SERVICIOS_URL}
                            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold transition hover:bg-white/15"
                        >
                            Ver mas micro-servicios del club <ExternalLink className="h-4 w-4" />
                        </Link>
                        {user && hasLocker ? (
                            <Link
                                href={route("taquillas.index.client")}
                                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-amber-400 px-5 py-2.5 text-sm font-bold text-slate-900 shadow-md transition hover:brightness-110"
                            >
                                Gestionar mi plan
                            </Link>
                        ) : (
                            <Link
                                href={route("contacto")}
                                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-amber-400 px-5 py-2.5 text-sm font-bold text-slate-900 shadow-md transition hover:brightness-110"
                            >
                                Quiero ser socio
                            </Link>
                        )}
                    </div>
                </section>

                {/* TARIFAS */}
                <section>
                    <h2 className="text-xl font-extrabold sm:text-2xl">Tarifas disponibles</h2>
                    <p className="mt-2 text-sm text-slate-400">
                        Todos los planes incluyen el pack completo de beneficios del club. Los importes mostrados son por
                        periodo contratado.
                    </p>

                    {planes.length === 0 ? (
                        <p className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-400">
                            No hay planes publicados en este momento. Contacta con la escuela para mas informacion.
                        </p>
                    ) : (
                        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                            {planes.map((plan) => (
                                <article
                                    key={plan.id}
                                    className="flex flex-col rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-cyan-500/30 hover:bg-white/[0.07]"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-wider text-cyan-300/90">
                                                {plan.periodo_label}
                                            </p>
                                            <h3 className="mt-1 text-lg font-bold leading-snug text-white">{plan.nombre}</h3>
                                            <p className="text-xs text-slate-500">{plan.periodo_sub}</p>
                                        </div>
                                        {plan.es_vip ? (
                                            <span className="shrink-0 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-200">
                                                VIP
                                            </span>
                                        ) : null}
                                    </div>
                                    <div className="mt-auto pt-6">
                                        <p className="text-3xl font-extrabold text-emerald-300">{formatEur(plan.precio_total)}</p>
                                        {showMonthlyEquivalent(plan) ? (
                                            <p className="mt-1 text-xs text-slate-500">
                                                Equivale a {formatEur(plan.precio_mensual_equivalente)}/mes
                                            </p>
                                        ) : null}
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>

                {/* QUE INCLUYE (seccion unica, sin duplicar) */}
                <section className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8">
                    <h2 className="text-xl font-extrabold sm:text-2xl">Que incluye tu membresia</h2>
                    <p className="mt-2 max-w-3xl text-sm text-slate-400">
                        No es solo un casillero: es tu base de operaciones en la playa. Llegas, te cambias, guardas tu
                        material, calientas, surfeas y vuelves sin friccion.
                    </p>
                    <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                        {MEMBERSHIP_BENEFITS.map(({ icon: Icon, text }) => (
                            <li key={text} className="flex gap-3 rounded-xl border border-white/5 bg-slate-900/40 p-4">
                                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" />
                                <span className="text-sm leading-relaxed text-slate-200">{text}</span>
                            </li>
                        ))}
                    </ul>
                    <p className="mt-4 text-xs text-slate-500">
                        * Para contratar o renovar un plan, inicia sesion o contacta con nosotros. Los precios pueden
                        actualizarse segun disponibilidad.
                    </p>
                </section>

                {/* MICRO-SERVICIOS (lista completa, igual que /nosotros) */}
                <section className="rounded-3xl border border-cyan-900/30 bg-[#0b1d33]/50 p-6 sm:p-8">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h2 className="text-xl font-extrabold sm:text-2xl">Micro-servicios del club</h2>
                            <p className="mt-2 text-sm text-slate-400">
                                +14 servicios incluidos para socios: del cafe al taller de reparaciones.
                            </p>
                        </div>
                        <Link
                            href={MICRO_SERVICIOS_URL}
                            className="inline-flex items-center gap-2 self-start rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10 sm:self-auto"
                        >
                            Ver dinamica completa <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                    </div>
                    <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {MICRO_SERVICES.map(({ icon: Icon, label, sub }) => (
                            <li key={label} className="flex items-start gap-3 rounded-xl border border-white/5 bg-slate-900/40 p-4">
                                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" />
                                <div>
                                    <p className="text-sm font-semibold text-white">{label}</p>
                                    <p className="text-xs text-slate-400">{sub}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>

                {/* CTA */}
                <section className="rounded-3xl border border-cyan-900/40 bg-gradient-to-r from-[#0b1d33] to-[#0a2233] p-8 text-center">
                    <h2 className="text-xl font-extrabold sm:text-2xl">Listo para unirte?</h2>
                    <p className="mx-auto mt-2 max-w-xl text-sm text-slate-300">
                        Escribenos o registrate. Te ayudamos a elegir el plan ideal y a activar tu taquilla.
                    </p>
                    <div className="mt-5 flex flex-wrap justify-center gap-3">
                        <Link
                            href={route("contacto")}
                            className="rounded-full bg-gradient-to-r from-pink-500 to-amber-400 px-6 py-2.5 text-sm font-bold text-slate-900 shadow-md transition hover:brightness-110"
                        >
                            Contactar
                        </Link>
                        {!user ? (
                            <Link
                                href={route("register")}
                                className="rounded-full border border-white/20 bg-white/10 px-6 py-2.5 text-sm font-semibold transition hover:bg-white/15"
                            >
                                Crear cuenta
                            </Link>
                        ) : null}
                    </div>
                </section>
            </div>
        </div>
    );
}
