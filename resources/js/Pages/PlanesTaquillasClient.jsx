import { useMemo, useState } from "react";
import Layout1 from "@/layouts/Layout1";
import { router } from "@inertiajs/react";

function fmt(v) {
    if (!v) return "-";
    return new Date(v).toLocaleDateString("es-ES");
}

export default function PlanesTaquillasClient({ planes = [], userData: initialUserData }) {
    const [data, setData] = useState(initialUserData || {});
    const [planId, setPlanId] = useState("");
    const [ref, setRef] = useState("");
    const [loading, setLoading] = useState(false);
    const [proofFile, setProofFile] = useState(null);
    const [proofTargetId, setProofTargetId] = useState(null);
    const [toast, setToast] = useState(null);

    const statusLabel = useMemo(() => {
        const d = Number(data?.dias_restantes ?? 0);
        if (d > 0) return { text: "ACTIVA", cls: "bg-emerald-100 text-emerald-700" };
        return { text: "VENCIDA", cls: "bg-rose-100 text-rose-700" };
    }, [data?.dias_restantes]);

    const pendingRows = (data?.historial_pagos || []).filter((p) => p.status === "pending" || p.status === "submitted");

    const requestRenewal = () => {
        if (!planId) return;
        setLoading(true);
        router.post(route("taquillas.pago.client"), { plan_id: planId, referencia_pago_externa: ref || null }, {
            preserveScroll: true,
            onSuccess: (page) => {
                setToast("Solicitud de renovación creada.");
                setTimeout(() => setToast(null), 2000);
                const refreshed = page?.props?.userData;
                if (refreshed) setData(refreshed);
                setPlanId("");
                setRef("");
            },
            onFinish: () => setLoading(false),
        });
    };

    const uploadProof = () => {
        if (!proofTargetId || !proofFile) return;
        // Frontend validation defensiva (2MB, tipos permitidos).
        const allowed = ["image/jpeg", "image/png", "application/pdf"];
        if (!allowed.includes(proofFile.type) || proofFile.size > 2 * 1024 * 1024) {
            setToast("Archivo inválido: solo jpg/jpeg/png/pdf hasta 2MB.");
            setTimeout(() => setToast(null), 2200);
            return;
        }
        setLoading(true);
        router.post(route("taquillas.pago.upload-proof", proofTargetId), { proof: proofFile, payment_method: "transferencia" }, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: (page) => {
                setToast("Justificante enviado.");
                setTimeout(() => setToast(null), 2000);
                const refreshed = page?.props?.userData;
                if (refreshed) setData(refreshed);
                setProofFile(null);
                setProofTargetId(null);
            },
            onFinish: () => setLoading(false),
        });
    };

    return (
        <Layout1>
            <div className="mx-auto max-w-6xl p-6 space-y-6">
                <h1 className="text-2xl font-bold text-slate-900">Portal de Taquilla</h1>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm text-slate-500">Estado de tu taquilla</p>
                    <div className="mt-2 flex items-center gap-3">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusLabel.cls}`}>{statusLabel.text}</span>
                        <span className="text-sm text-slate-600">Taquilla #{data?.numero_taquilla || "-"}</span>
                        <span className="text-sm text-slate-600">Vence: {fmt(data?.vencimiento_cuota)}</span>
                    </div>
                </section>

                <section className="space-y-3">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Renovar (Locker Plans)</h2>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        {planes.map((p) => (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => setPlanId(String(p.id))}
                                className={`rounded-2xl border p-4 text-left shadow-sm transition ${String(planId) === String(p.id) ? "border-sky-500 bg-sky-50" : "border-slate-200 bg-white hover:shadow-md"}`}
                            >
                                <p className="font-semibold text-slate-900">{p.nombre}</p>
                                <p className="text-sm text-slate-600">{Number(p.precio_total).toFixed(2)} €</p>
                                <p className="text-xs text-slate-500">{Math.round(Number(p.duracion_dias || 0) / 30)} meses</p>
                            </button>
                        ))}
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Referencia (opcional)" className="rounded-lg border border-slate-300 px-3 py-2" />
                        <button onClick={requestRenewal} disabled={!planId || loading} className="rounded-lg bg-sky-600 px-4 py-2 font-semibold text-white disabled:opacity-60">
                            {loading ? "Procesando..." : "Solicitar Renovación"}
                        </button>
                    </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-slate-500">Pagos pendientes de verificar</h2>
                    {pendingRows.length === 0 ? (
                        <p className="text-sm text-slate-500">No tienes pagos pendientes.</p>
                    ) : (
                        <div className="space-y-2">
                            {pendingRows.map((r) => (
                                <div key={r.id} className="rounded-xl border border-slate-200 p-3">
                                    <p className="text-sm font-semibold text-slate-900">{r.plan?.nombre || "Plan"} · {r.status}</p>
                                    <p className="text-xs text-slate-500">{fmt(r.periodo_inicio)} - {fmt(r.periodo_fin)}</p>
                                    <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                                        <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={(e) => { setProofTargetId(r.id); setProofFile(e.target.files?.[0] || null); }} className="rounded-lg border border-slate-300 px-2 py-1 text-sm" />
                                        <button onClick={uploadProof} disabled={loading || !proofFile || proofTargetId !== r.id} className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
                                            Subir comprobante (max 2MB)
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
            {toast ? (
                <div className="fixed right-4 top-24 z-50 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-xl">{toast}</div>
            ) : null}
        </Layout1>
    );
}
