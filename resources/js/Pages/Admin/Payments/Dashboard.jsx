import { Head, router, usePage } from "@inertiajs/react";
import { useState } from "react";

export default function PaymentDashboard({ pendingBonos = [] }) {
    const { flash } = usePage().props;
    const [rejectingId, setRejectingId] = useState(null);
    const [reason, setReason] = useState("");
    const [proofModalUrl, setProofModalUrl] = useState(null);
    const toast = flash?.success || flash?.error;

    const confirmBono = (id) => {
        router.post(route("admin.payment-validation.confirm", id));
    };

    const rejectBono = (id) => {
        if (!reason.trim()) return;
        router.post(route("admin.payment-validation.reject", id), { reason: reason.trim() }, {
            onSuccess: () => {
                setRejectingId(null);
                setReason("");
            },
        });
    };

    return (
        <>
            <Head title="Admin · Dashboard de Pagos" />
            <div className="mx-auto max-w-6xl p-6 space-y-6">
                <h1 className="text-2xl font-bold text-slate-900">Dashboard de Pagos · Bonos VIP</h1>
                {toast ? (
                    <div className={`fixed right-4 top-24 z-50 rounded-xl px-4 py-3 text-sm font-semibold shadow-lg ${flash?.success ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"}`}>
                        {toast}
                    </div>
                ) : null}

                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-700">
                            <tr>
                                <th className="px-3 py-2 text-left">Usuario</th>
                                <th className="px-3 py-2 text-left">Pack</th>
                                <th className="px-3 py-2 text-left">Importe</th>
                                <th className="px-3 py-2 text-left">Comprobante</th>
                                <th className="px-3 py-2 text-left">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingBonos.map((row) => (
                                <tr key={row.id} className="border-t border-slate-100">
                                    <td className="px-3 py-2">{row.user}<div className="text-xs text-slate-500">{row.email}</div></td>
                                    <td className="px-3 py-2">{row.pack} ({row.num_clases} clases)</td>
                                    <td className="px-3 py-2">{Number(row.precio).toFixed(2)} €</td>
                                    <td className="px-3 py-2">
                                        {row.proof_url ? (
                                            <div className="flex items-center gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setProofModalUrl(row.proof_url)}
                                                    className="text-sky-700 underline"
                                                >
                                                    Ampliar
                                                </button>
                                                <a href={row.proof_url} target="_blank" rel="noreferrer" className="text-slate-600 underline">
                                                    Abrir pestaña
                                                </a>
                                            </div>
                                        ) : (
                                            "—"
                                        )}
                                    </td>
                                    <td className="px-3 py-2 space-x-2">
                                        <button onClick={() => confirmBono(row.id)} className="rounded-md bg-emerald-600 px-3 py-1 text-white" type="button">Confirmar</button>
                                        <button onClick={() => setRejectingId(row.id)} className="rounded-md bg-rose-600 px-3 py-1 text-white" type="button">Rechazar</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {rejectingId ? (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 space-y-3">
                        <p className="font-semibold text-rose-800">Motivo de rechazo</p>
                        <textarea value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-lg border border-rose-300 px-3 py-2" rows={3} />
                        <div className="flex gap-2">
                            <button onClick={() => rejectBono(rejectingId)} className="rounded-md bg-rose-700 px-3 py-1 text-white" type="button">Confirmar rechazo</button>
                            <button onClick={() => { setRejectingId(null); setReason(""); }} className="rounded-md bg-slate-200 px-3 py-1 text-slate-700" type="button">Cancelar</button>
                        </div>
                    </div>
                ) : null}

                {proofModalUrl ? (
                    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/70 p-4" onClick={() => setProofModalUrl(null)}>
                        <div className="w-full max-w-4xl rounded-2xl bg-white p-4" onClick={(e) => e.stopPropagation()}>
                            <div className="mb-3 flex items-center justify-between">
                                <p className="text-sm font-semibold text-slate-700">Comprobante ampliado</p>
                                <button type="button" className="rounded-md bg-slate-200 px-3 py-1 text-slate-700" onClick={() => setProofModalUrl(null)}>
                                    Cerrar
                                </button>
                            </div>
                            <img src={proofModalUrl} alt="Comprobante de pago" className="max-h-[75vh] w-full rounded-lg object-contain bg-slate-100" />
                        </div>
                    </div>
                ) : null}
            </div>
        </>
    );
}

