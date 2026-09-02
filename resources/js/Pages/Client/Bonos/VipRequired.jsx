import { Head, Link } from "@inertiajs/react";
import { Lock, MessageCircle, Star, Waves } from "lucide-react";
import { formatEur } from "@/utils/money";

const CHECKLIST = [
    "Tu nivel actual en el agua (iniciación, intermedio, avanzado…)",
    "Si coges olas de forma autónoma o con ayuda del monitor",
    "Técnica básica: remada, sentarse en la tabla, duck dive o turtle roll",
    "Qué tablas sueles surfear y sus medidas",
];

function pricePerClass(pack) {
    const n = Number(pack.num_clases);
    const p = Number(pack.precio);
    if (!n || !p) return null;
    return formatEur(p / n);
}

export default function VipRequired({ packs = [], whatsappHelpUrl = null, contactUrl = "/contacto" }) {
    const whatsappVipUrl = whatsappHelpUrl
        ? `${whatsappHelpUrl}?text=${encodeURIComponent(
              "Hola, me he registrado en la web y me gustaría solicitar la activación de mi perfil VIP para bonos de clases grupales.",
          )}`
        : null;

    return (
        <>
            <Head title="Bonos VIP — tarifas y activación" />
            <div className="s4-surface-light min-h-screen">
                <div className="mx-auto max-w-6xl space-y-6 p-4 py-8 sm:p-6">
                    <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-amber-50/60 p-5 sm:p-8">
                        <div className="flex items-start gap-3">
                            <div className="rounded-xl bg-amber-100 p-2.5 ring-1 ring-amber-200">
                                <Star className="h-6 w-6 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-amber-700">
                                    Clases grupales VIP
                                </p>
                                <h1 className="font-heading mt-1 text-2xl font-extrabold text-slate-900 sm:text-3xl">
                                    Bonos VIP — tarifas y activación
                                </h1>
                                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">
                                    Consulta los packs disponibles para{" "}
                                    <strong className="text-slate-900">clases grupales</strong> según tu nivel. La compra
                                    requiere perfil VIP activado por el monitor; puedes ver precios y opciones antes de
                                    solicitarlo.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Catálogo de bonos (solo consulta) */}
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                        <h2 className="text-lg font-bold text-slate-900">Packs y precios</h2>
                        <p className="mt-1 text-sm text-slate-600">
                            Clases grupales de surf. El monitor te asignará el nivel adecuado tras la valoración previa.
                        </p>

                        {packs.length === 0 ? (
                            <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                                No hay bonos publicados en este momento. Contacta con la escuela para más información.
                            </p>
                        ) : (
                            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {packs.map((pack) => {
                                    const perClass = pricePerClass(pack);
                                    return (
                                        <article
                                            key={pack.id}
                                            className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                                        >
                                            <p className="font-semibold text-slate-900">{pack.nombre}</p>
                                            <p className="mt-0.5 text-sm text-slate-600">
                                                {pack.num_clases}{" "}
                                                {Number(pack.num_clases) === 1 ? "clase" : "clases"} grupales
                                            </p>
                                            <p className="mt-2 text-2xl font-extrabold tabular-nums text-sky-600">
                                                {formatEur(pack.precio)}
                                            </p>
                                            {perClass ? (
                                                <p className="text-xs text-slate-500">≈ {perClass} / clase</p>
                                            ) : null}
                                            <div className="mt-3 flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] font-medium text-amber-800">
                                                <Lock className="h-3.5 w-3.5 shrink-0" />
                                                Compra tras activación VIP
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        )}

                        <p className="mt-4 text-xs text-slate-500">
                            Créditos: clase grupal o semanal = 1 · clase particular = 2 créditos.
                        </p>
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                        <div className="flex items-center gap-2">
                            <Waves className="h-5 w-5 text-teal-600" />
                            <h2 className="text-lg font-bold text-slate-900">Cómo activar tu perfil VIP</h2>
                        </div>
                        <ol className="mt-4 space-y-3 text-sm leading-relaxed text-slate-700">
                            <li>
                                <span className="font-semibold text-slate-900">1. Regístrate</span> en la web si aún no
                                tienes cuenta.
                            </li>
                            <li>
                                <span className="font-semibold text-slate-900">2. Contacta con el monitor</span> para una
                                valoración previa. Necesitamos conocer tu nivel antes de asignarte clases grupales
                                adecuadas.
                            </li>
                            <li>
                                <span className="font-semibold text-slate-900">3. El administrador te activará como VIP</span>{" "}
                                una vez validada la información. Entonces podrás comprar bonos y reservar con tus créditos.
                            </li>
                        </ol>

                        <ul className="mt-5 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                Información que revisamos contigo
                            </p>
                            {CHECKLIST.map((item) => (
                                <li key={item} className="flex gap-2 text-sm text-slate-700">
                                    <span className="text-teal-600">·</span>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </section>

                    <section className="rounded-2xl border border-teal-200 bg-teal-50 p-5 sm:p-6">
                        <h2 className="text-base font-bold text-slate-900">¿Quieres empezar?</h2>
                        <p className="mt-2 text-sm text-slate-700">
                            Escríbenos para solicitar la activación VIP. Cuando esté activo, vuelve a esta página y podrás
                            comprar el pack que prefieras.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-3">
                            {whatsappVipUrl ? (
                                <a
                                    href={whatsappVipUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-500"
                                >
                                    <MessageCircle className="h-4 w-4" />
                                    Solicitar activación VIP
                                </a>
                            ) : null}
                            <Link
                                href={contactUrl}
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                                Formulario de contacto
                            </Link>
                        </div>
                    </section>
                </div>
            </div>
        </>
    );
}
