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
            <div className="mx-auto max-w-6xl space-y-6 p-6 text-gray-200">
                <h1 className="text-2xl font-bold text-white">Dashboard de Pagos · Bonos VIP</h1>
                {toast ? (
                    <div className={`fixed right-4 top-24 z-50 rounded-xl px-4 py-3 text-sm font-semibold shadow-lg ${flash?.success ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"}`}>
                        {toast}
                    </div>
                ) : null}

                <div className="overflow-hidden rounded-xl border border-gray-700 bg-gray-900">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-800 text-gray-200">
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
                                <tr key={row.id} className="border-t border-gray-700">
                                    <td className="px-3 py-2 text-gray-100">{row.user}<div className="text-xs text-gray-400">{row.email}</div></td>
                                    <td className="px-3 py-2 text-gray-200">{row.pack} ({row.num_clases} clases)</td>
                                    <td className="px-3 py-2 text-gray-200">{Number(row.precio).toFixed(2)} €</td>
                                    <td className="px-3 py-2">
                                        {row.proof_url ? (
                                            <div className="flex items-center gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setProofModalUrl(row.proof_url)}
                                                    className="text-sky-300 underline"
                                                >
                                                    Ampliar
                                                </button>
                                                <a href={row.proof_url} target="_blank" rel="noreferrer" className="text-gray-300 underline">
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
                    <div className="space-y-3 rounded-xl border border-rose-700 bg-rose-900/30 p-4">
                        <p className="font-semibold text-rose-200">Motivo de rechazo</p>
                        <textarea value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-lg border border-rose-700 bg-gray-900 px-3 py-2 text-gray-100" rows={3} />
                        <div className="flex gap-2">
                            <button onClick={() => rejectBono(rejectingId)} className="rounded-md bg-rose-700 px-3 py-1 text-white" type="button">Confirmar rechazo</button>
                            <button onClick={() => { setRejectingId(null); setReason(""); }} className="rounded-md bg-gray-700 px-3 py-1 text-gray-100" type="button">Cancelar</button>
                        </div>
                    </div>
                ) : null}

                {proofModalUrl ? (
                    <div className="fixed inset-0 z-50 grid place-items-center bg-gray-950/80 p-4" onClick={() => setProofModalUrl(null)}>
                        <div className="w-full max-w-4xl rounded-2xl border border-gray-700 bg-gray-900 p-4" onClick={(e) => e.stopPropagation()}>
                            <div className="mb-3 flex items-center justify-between">
                                <p className="text-sm font-semibold text-gray-200">Comprobante ampliado</p>
                                <button type="button" className="rounded-md bg-gray-700 px-3 py-1 text-gray-100" onClick={() => setProofModalUrl(null)}>
                                    Cerrar
                                </button>
                            </div>
                            <img src={proofModalUrl} alt="Comprobante de pago" className="max-h-[75vh] w-full rounded-lg object-contain bg-gray-800" />
                        </div>
                    </div>
                ) : null}
            </div>
        </>
    );
}

