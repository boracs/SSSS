import React, { useState } from "react";
import { Head, router, usePage } from "@inertiajs/react";
import Layout1 from "../../layouts/Layout1";
import { KeyRound, AlertTriangle, ShieldAlert, ChevronLeft } from "lucide-react";

function ConfirmModal({ open, title, children, confirmLabel, onCancel, onConfirm, processing, tone = "amber" }) {
    if (!open) return null;

    const btnClass = tone === "orange"
        ? "bg-orange-500 hover:bg-orange-600"
        : "bg-amber-500 hover:bg-amber-600";

    return (
        <div className="fixed inset-0 z-[800] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
                <h2 className="text-lg font-bold text-white">{title}</h2>
                <div className="mt-3 text-sm leading-relaxed text-slate-400">{children}</div>
                <div className="mt-6 flex gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={processing}
                        className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/10 disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={processing}
                        className={`flex-1 rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-50 ${btnClass}`}
                    >
                        {processing ? "Procesando…" : confirmLabel}
                    </button>
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
        <Layout1>
            <Head title="Me quedé sin llave" />

            <div className="mx-auto w-full max-w-lg px-4 py-10 sm:px-6">
                <button
                    type="button"
                    onClick={() => router.get(route("taquillas.index.client"))}
                    className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-white"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Volver a mi taquilla
                </button>

                <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 backdrop-blur-md sm:p-8">
                    <div className="mb-4 flex items-center gap-3">
                        <KeyRound className="h-8 w-8 text-orange-400" />
                        <h1 className="text-2xl font-extrabold text-white">Me quedé sin llave</h1>
                    </div>

                    <p className="text-sm leading-relaxed text-slate-400">
                        Candado exterior con llave de repuesto. El código solo puede solicitarse una vez por ciclo
                        hasta que el administrador reponga la llave física.
                    </p>

                    {flash?.error && (
                        <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                            {flash.error}
                        </div>
                    )}

                    {revealedCode && (
                        <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
                            <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                                Contraseña del candado
                            </p>
                            <p className="mt-2 font-mono text-5xl font-extrabold tracking-[0.35em] text-white">
                                {revealedCode}
                            </p>
                            <p className="mt-3 text-xs text-slate-400">
                                Guárdala solo para esta sesión. No compartas el código públicamente.
                            </p>
                        </div>
                    )}

                    {!isActive && !revealedCode && (
                        <div className="mt-6 flex gap-3 rounded-2xl border border-slate-600/40 bg-slate-800/60 p-4">
                            <ShieldAlert className="h-5 w-5 shrink-0 text-slate-400" />
                            <p className="text-sm text-slate-300">
                                La llave de emergencia ya ha sido retirada. Contacta con el administrador si necesitas asistencia.
                            </p>
                        </div>
                    )}

                    {isActive && canRequest && !revealedCode && (
                        <button
                            type="button"
                            onClick={() => setStep(1)}
                            className="mt-6 w-full rounded-xl bg-orange-500 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-orange-600"
                        >
                            Solicitar contraseña del candado
                        </button>
                    )}

                    {isActive && !canRequest && !revealedCode && (
                        <div className="mt-6 flex gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" />
                            <p className="text-sm text-amber-100">
                                Tu taquilla no está al día. Renueva la cuota para poder solicitar la llave de emergencia.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <ConfirmModal
                open={step === 1}
                title="¿Necesitas la llave de emergencia?"
                confirmLabel="Continuar"
                onCancel={() => setStep(null)}
                onConfirm={() => setStep(2)}
            >
                <p>
                    Solo debes usar este servicio si no tienes acceso a tu llave habitual.
                    Si devuelves la llave de repuesto, <strong className="text-white">no hay coste</strong>.
                </p>
                <p className="mt-2">
                    En caso de <strong className="text-white">extravío total</strong> de tu llave original,
                    se aplicará una penalización de <strong className="text-white">2 €</strong> por gestión
                    más el coste de la nueva llave.
                </p>
            </ConfirmModal>

            <ConfirmModal
                open={step === 2}
                title="Solicitando la llave…"
                confirmLabel="Confirmar y ver contraseña"
                tone="orange"
                processing={processing}
                onCancel={() => !processing && setStep(null)}
                onConfirm={submitRequest}
            >
                <p>
                    Perfecto, solicitando la llave… Al confirmar, tu usuario quedará registrado como el portador
                    actual de la llave de emergencia.
                </p>
                <p className="mt-2 text-amber-200">
                    Nadie más podrá solicitar el código hasta que el administrador reponga la llave en el candado.
                </p>
            </ConfirmModal>
        </Layout1>
    );
}
