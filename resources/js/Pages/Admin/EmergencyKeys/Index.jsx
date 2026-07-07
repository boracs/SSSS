import React, { useState } from "react";
import { Head, router, usePage } from "@inertiajs/react";
import Layout1 from "../../../layouts/Layout1";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { KeyRound, Power, ShieldCheck, History, KeySquare, RotateCcw } from "lucide-react";

export default function AdminEmergencyKeysIndex({ lock = {}, requests = [] }) {
    const { flash } = usePage().props;
    const [code, setCode] = useState(lock.current_code ?? "");
    const [saving, setSaving] = useState(false);
    const [processingId, setProcessingId] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);

    const saveCode = (e) => {
        e.preventDefault();
        setSaving(true);
        router.post(route("admin.emergency-keys.update-code"), { current_code: code }, {
            preserveScroll: true,
            onFinish: () => setSaving(false),
        });
    };

    const openResolveModal = (row) => {
        setSelectedRequest(row);
        setModalOpen(true);
    };

    const closeResolveModal = () => {
        if (processingId) return;
        setModalOpen(false);
        setSelectedRequest(null);
    };

    const resolveRequest = (outcome) => {
        if (!selectedRequest) return;

        setProcessingId(selectedRequest.id);
        router.patch(
            route("admin.emergency-keys.resolve", selectedRequest.id),
            { outcome },
            {
                preserveScroll: true,
                onFinish: () => {
                    setProcessingId(null);
                    setModalOpen(false);
                    setSelectedRequest(null);
                },
            },
        );
    };

    return (
        <Layout1>
            <Head title="Admin · Llave de emergencia" />

            <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="mb-6 flex items-center gap-3">
                    <KeyRound className="h-8 w-8 text-orange-400" />
                    <div>
                        <h1 className="text-2xl font-extrabold text-white">Candado de emergencia</h1>
                        <p className="text-xs text-slate-500">Asignar código · activar candado · ver quién lo solicitó</p>
                    </div>
                </div>

                {flash?.success && (
                    <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                        {flash.success}
                    </div>
                )}

                <div className="mb-6 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Estado del candado</p>
                        <div className="mt-2 flex items-center gap-2">
                            <span className={`inline-flex h-2.5 w-2.5 rounded-full ${lock.is_active ? "bg-emerald-400" : "bg-rose-400"}`} />
                            <span className="text-lg font-bold text-white">
                                {lock.is_active ? "ON — disponible" : "OFF — llave retirada"}
                            </span>
                        </div>
                    </div>

                    <form onSubmit={saveCode} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Reponer candado (nuevo código)
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                            Tras guardar, el candado pasa automáticamente a ON.
                        </p>
                        <div className="mt-3 flex gap-2">
                            <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={4}
                                value={code}
                                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                                className="h-10 w-28 rounded-xl border border-white/10 bg-slate-950 px-3 text-center font-mono text-lg tracking-widest text-white focus:border-orange-500/50 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                                placeholder="0000"
                                required
                            />
                            <button
                                type="submit"
                                disabled={saving || code.length !== 4}
                                className="inline-flex h-10 items-center gap-2 rounded-xl bg-orange-500 px-4 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-50"
                            >
                                <Power className="h-4 w-4" />
                                {saving ? "Guardando…" : "Activar candado"}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                    <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                        <History className="h-4 w-4 text-slate-400" />
                        <h2 className="text-sm font-bold text-white">Histórico de solicitudes</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-slate-500">
                                    <th className="px-4 py-3">Solicitado por</th>
                                    <th className="px-4 py-3">Taquilla</th>
                                    <th className="px-4 py-3">Fecha / hora</th>
                                    <th className="px-4 py-3">Código entregado</th>
                                    <th className="px-4 py-3">Activación / extravío</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                                            Sin solicitudes registradas.
                                        </td>
                                    </tr>
                                ) : (
                                    requests.map((row) => (
                                        <tr key={row.id} className="border-t border-white/5 hover:bg-white/5">
                                            <td className="px-4 py-3 font-medium text-white">{row.member_name}</td>
                                            <td className="px-4 py-3 text-slate-400">
                                                {row.locker_number ? `#${row.locker_number}` : "—"}
                                            </td>
                                            <td className="px-4 py-3 text-slate-400">{row.requested_at_label}</td>
                                            <td className="px-4 py-3 font-mono text-orange-300">{row.resolved_code_shown}</td>
                                            <td className="px-4 py-3">
                                                {row.is_key_deactivated ? (
                                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
                                                        <ShieldCheck className="h-3.5 w-3.5" />
                                                        Llave anterior desactivada
                                                    </span>
                                                ) : row.is_key_recovered ? (
                                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-300">
                                                        <RotateCcw className="h-3.5 w-3.5" />
                                                        Llave recuperada — sin anular
                                                    </span>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        disabled={processingId === row.id}
                                                        onClick={() => openResolveModal(row)}
                                                        className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-200 hover:bg-amber-500/20 disabled:opacity-50"
                                                    >
                                                        {processingId === row.id ? "…" : "Gestionar llave extraviada"}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <Dialog open={modalOpen} onOpenChange={(open) => (open ? setModalOpen(true) : closeResolveModal())}>
                <DialogContent className="border-white/10 bg-slate-900 text-white sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg text-white">
                            <KeySquare className="h-5 w-5 text-amber-400" />
                            ¿Desactivar la llave extraviada?
                        </DialogTitle>
                        <DialogDescription className="text-sm leading-relaxed text-slate-400">
                            {selectedRequest ? (
                                <>
                                    <span className="font-semibold text-slate-200">{selectedRequest.member_name}</span>
                                    {selectedRequest.locker_number ? (
                                        <> (taquilla #{selectedRequest.locker_number})</>
                                    ) : null}{" "}
                                    solicitó el código{" "}
                                    <span className="font-mono font-semibold text-orange-300">
                                        {selectedRequest.resolved_code_shown}
                                    </span>
                                    . Confirma si la llave original se perdió definitivamente o si finalmente se
                                    encontró.
                                </>
                            ) : (
                                "Confirma el estado de la llave original antes de cerrar la solicitud."
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter className="flex-col gap-2 sm:flex-col sm:items-stretch">
                        <button
                            type="button"
                            disabled={!selectedRequest || processingId === selectedRequest?.id}
                            onClick={() => resolveRequest("lost_definitive")}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 text-sm font-bold text-white transition hover:bg-amber-600 disabled:opacity-50"
                        >
                            <ShieldCheck className="h-4 w-4" />
                            Sí, se extravió definitivamente
                        </button>
                        <button
                            type="button"
                            disabled={!selectedRequest || processingId === selectedRequest?.id}
                            onClick={() => resolveRequest("found")}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 text-sm font-bold text-cyan-200 transition hover:bg-cyan-500/20 disabled:opacity-50"
                        >
                            <RotateCcw className="h-4 w-4" />
                            No, finalmente se encontró
                        </button>
                        <button
                            type="button"
                            disabled={processingId === selectedRequest?.id}
                            onClick={closeResolveModal}
                            className="inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-slate-200 disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Layout1>
    );
}
