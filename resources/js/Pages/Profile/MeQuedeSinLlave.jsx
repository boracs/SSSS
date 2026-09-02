import React, { useMemo, useState } from "react";
import { Head, Link, router, usePage } from "@inertiajs/react";
import PageShell from "@/layouts/PageShell";
import S4Button from "@/components/S4Button";
import {
    KeyRound,
    AlertTriangle,
    ShieldAlert,
    ChevronLeft,
    CheckCircle2,
    CircleDot,
    Lock,
    CreditCard,
} from "lucide-react";

const STEPS = [
    {
        title: "Confirma que lo necesitas",
        body: "Solo si no tienes acceso a tu llave habitual del candado exterior.",
    },
    {
        title: "Recibe la contraseña",
        body: "Te mostramos el código de 4 dígitos al confirmar la solicitud.",
    },
    {
        title: "Devuelve la llave de repuesto",
        body: "Si la devuelves al equipo, no hay coste. Extravío total: 2 € de gestión + nueva llave.",
    },
];

function ConfirmModal({ open, title, children, confirmLabel, onCancel, onConfirm, processing, tone = "amber" }) {
    if (!open) return null;

    const btnClass =
        tone === "orange"
            ? "bg-amber-500 hover:bg-amber-600 focus-visible:ring-amber-400"
            : "bg-slate-900 hover:bg-slate-800 focus-visible:ring-slate-400";

    return (
        <div
            className="fixed inset-0 z-[800] flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
        >
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
                <h2 className="font-heading text-lg font-bold text-slate-900">{title}</h2>
                <div className="mt-3 text-sm leading-relaxed text-slate-600">{children}</div>
                <div className="mt-6 flex gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={processing}
                        className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-s4-cyan"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={processing}
                        className={`flex-1 rounded-xl py-2.5 text-sm font-bold text-white transition disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 ${btnClass}`}
                    >
                        {processing ? "Procesando…" : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

function StatusBanner({ variant, icon: Icon, title, children, action = null }) {
    const styles = {
        success: "border-emerald-200 bg-emerald-50 text-emerald-900",
        warning: "border-amber-200 bg-amber-50 text-amber-950",
        muted: "border-slate-200 bg-slate-50 text-slate-800",
        danger: "border-rose-200 bg-rose-50 text-rose-900",
    };
    const iconStyles = {
        success: "bg-emerald-100 text-emerald-600 ring-emerald-200",
        warning: "bg-amber-100 text-amber-600 ring-amber-200",
        muted: "bg-slate-100 text-slate-500 ring-slate-200",
        danger: "bg-rose-100 text-rose-600 ring-rose-200",
    };

    return (
        <div className={`rounded-2xl border p-4 sm:p-5 ${styles[variant]}`}>
            <div className="flex gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${iconStyles[variant]}`}>
                    <Icon className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">{title}</p>
                    <div className="mt-1 text-sm leading-relaxed opacity-90">{children}</div>
                    {action ? <div className="mt-4">{action}</div> : null}
                </div>
            </div>
        </div>
    );
}

export default function MeQuedeSinLlave({ lock = {}, reveal = null }) {
    const { flash } = usePage().props;
    const [step, setStep] = useState(null);
    const [processing, setProcessing] = useState(false);

    const isActive = Boolean(lock.is_active);
    const canRequest = Boolean(lock.can_request);
    const revealedCode = reveal?.code ?? null;

    const pageState = useMemo(() => {
        if (revealedCode) return "revealed";
        if (!isActive) return "inactive";
        if (canRequest) return "ready";
        return "payment_blocked";
    }, [revealedCode, isActive, canRequest]);

    const submitRequest = () => {
        setProcessing(true);
        router.post(route("emergency-key.request"), {}, {
            preserveScroll: true,
            onFinish: () => {
                setProcessing(false);
                setStep(null);
            },
        });
    };

    return (
        <PageShell variant="light">
            <Head title="Me quedé sin llave" />

            <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
                <Link
                    href={route("taquillas.index.client")}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-s4-cyan rounded-lg px-1 -ml-1"
                >
                    <ChevronLeft className="h-4 w-4" aria-hidden />
                    Volver a mi taquilla
                </Link>

                <header className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50/70 p-5 sm:p-8">
                    <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-amber-100 p-2.5 ring-1 ring-amber-200">
                            <KeyRound className="h-7 w-7 text-amber-600" aria-hidden />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-amber-700">
                                Llave de emergencia · Candado exterior
                            </p>
                            <h1 className="font-heading mt-1 text-2xl font-extrabold text-slate-900 sm:text-3xl">
                                Me quedé sin llave
                            </h1>
                            <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600">
                                Si te has quedado fuera de tu taquilla, puedes pedir la contraseña del candado de
                                repuesto. Solo puedes solicitarla{" "}
                                <strong className="text-slate-900">una vez por ciclo</strong> hasta que el equipo
                                reponga la llave física.
                            </p>
                        </div>
                    </div>
                </header>

                {flash?.error && (
                    <StatusBanner variant="danger" icon={AlertTriangle} title="No se pudo completar la solicitud">
                        {flash.error}
                    </StatusBanner>
                )}

                {pageState === "revealed" && (
                    <section className="rounded-2xl border border-emerald-200 bg-white p-6 text-center shadow-sm sm:p-8">
                        <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                            Contraseña del candado
                        </p>
                        <p
                            className="mt-3 font-mono text-5xl font-extrabold tracking-[0.35em] text-slate-900 sm:text-6xl"
                            aria-live="polite"
                        >
                            {revealedCode}
                        </p>
                        <p className="mx-auto mt-4 max-w-sm text-sm text-slate-600">
                            Anótala ahora. No la compartas en público. Quedas registrado como portador de la llave de
                            repuesto hasta que la devuelvas.
                        </p>
                    </section>
                )}

                {pageState === "inactive" && (
                    <StatusBanner variant="muted" icon={ShieldAlert} title="Llave no disponible ahora mismo">
                        La llave de emergencia ya ha sido retirada o el candado está bloqueado. El equipo la repone cuando
                        un socio devuelve la llave física. Si necesitas ayuda urgente, contacta con recepción.
                    </StatusBanner>
                )}

                {pageState === "payment_blocked" && (
                    <StatusBanner
                        variant="warning"
                        icon={CreditCard}
                        title="Cuota de taquilla pendiente"
                        action={
                            <S4Button href={`${route("taquillas.index.client")}#renovar-plan`} size="sm">
                                Renovar cuota en mi taquilla
                            </S4Button>
                        }
                    >
                        Tu taquilla no está al día. Renueva la cuota para poder solicitar la llave de emergencia.
                    </StatusBanner>
                )}

                {pageState === "ready" && (
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                            <CheckCircle2 className="h-4 w-4" aria-hidden />
                            Llave de emergencia disponible
                        </div>
                        <p className="mt-2 text-sm text-slate-600">
                            Puedes solicitar la contraseña del candado exterior. Lee cómo funciona antes de continuar.
                        </p>
                        <button
                            type="button"
                            onClick={() => setStep(1)}
                            className="mt-5 w-full rounded-xl bg-amber-500 py-3 text-sm font-bold text-white shadow-md transition hover:bg-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
                        >
                            Solicitar contraseña del candado
                        </button>
                    </section>
                )}

                <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                    <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                        <Lock className="h-4 w-4 text-slate-500" aria-hidden />
                        Cómo funciona
                    </h2>
                    <ol className="mt-4 space-y-4">
                        {STEPS.map((item, index) => (
                            <li key={item.title} className="flex gap-3">
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
                                    {index + 1}
                                </span>
                                <div>
                                    <p className="font-semibold text-slate-900">{item.title}</p>
                                    <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{item.body}</p>
                                </div>
                            </li>
                        ))}
                    </ol>
                    <p className="mt-5 flex items-start gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-slate-500">
                        <CircleDot className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                        Tras usar el código, nadie más podrá solicitarlo hasta que el administrador reactive el candado
                        con una llave nueva.
                    </p>
                </section>
            </div>

            <ConfirmModal
                open={step === 1}
                title="¿Necesitas la llave de emergencia?"
                confirmLabel="Continuar"
                onCancel={() => setStep(null)}
                onConfirm={() => setStep(2)}
            >
                <p>
                    Solo debes usar este servicio si no tienes acceso a tu llave habitual. Si devuelves la llave de
                    repuesto al equipo, <strong className="text-slate-900">no hay coste</strong>.
                </p>
                <p className="mt-2">
                    En caso de <strong className="text-slate-900">extravío total</strong> de tu llave original, se
                    aplicará una penalización de <strong className="text-slate-900">2 €</strong> por gestión más el
                    coste de la nueva llave.
                </p>
            </ConfirmModal>

            <ConfirmModal
                open={step === 2}
                title="Confirmar solicitud"
                confirmLabel="Ver contraseña"
                tone="orange"
                processing={processing}
                onCancel={() => !processing && setStep(null)}
                onConfirm={submitRequest}
            >
                <p>
                    Al confirmar, tu usuario quedará registrado como portador actual de la llave de emergencia y verás
                    la contraseña del candado.
                </p>
                <p className="mt-2 font-medium text-amber-800">
                    Nadie más podrá solicitar el código hasta que el administrador reponga la llave en el candado.
                </p>
            </ConfirmModal>
        </PageShell>
    );
}
