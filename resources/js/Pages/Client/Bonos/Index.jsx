import { Head, router, usePage } from "@inertiajs/react";
import { useState } from "react";
import ManualPaymentInstructionsModal from "@/components/ManualPaymentInstructionsModal";

export default function ClientBonosIndex({
    packs = [],
    myBonos = [],
    consumptionHistory = [],
    paymentIban,
    paymentBizumNumber,
    whatsappHelpUrl = null,
}) {
    const { flash } = usePage().props;
    const [selectedPack, setSelectedPack] = useState(null);
    const toast = flash?.success || flash?.error;

    const submitBono = async ({ proofFile }) => {
        if (!selectedPack) throw new Error("no pack");
        const fd = new FormData();
        fd.append("pack_id", String(selectedPack.id));
        fd.append("proof", proofFile);
        await new Promise((resolve, reject) => {
            router.post(route("bonos.request-purchase"), fd, {
                forceFormData: true,
                preserveScroll: true,
                onSuccess: () => resolve(),
                onError: () => reject(new Error("bono")),
            });
        });
    };

    const statusBadgeClass = (status) => {
        const key = String(status || "").toLowerCase();
        if (key === "confirmed") return "bg-emerald-900/35 text-emerald-200 ring-1 ring-emerald-500/35";
        if (key === "pending") return "bg-amber-900/35 text-amber-200 ring-1 ring-amber-500/35";
        if (key === "rejected") return "bg-rose-900/35 text-rose-200 ring-1 ring-rose-500/35";
        return "bg-gray-800 text-gray-200 ring-1 ring-white/10";
    };

    return (
        <>
            <Head title="Bonos VIP" />
            <div className="mx-auto max-w-6xl space-y-6 p-6 text-gray-200">
                <h1 className="text-2xl font-bold text-white">Bonos VIP</h1>
                {toast ? (
                    <div className={`fixed right-4 top-24 z-50 rounded-xl px-4 py-3 text-sm font-semibold shadow-lg ${flash?.success ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"}`}>
                        {toast}
                    </div>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {packs.map((pack) => (
                        <div key={pack.id} className="rounded-2xl border border-gray-700 bg-gray-900 p-4 shadow-sm">
                            <p className="text-lg font-semibold text-gray-100">{pack.nombre}</p>
                            <p className="text-gray-300">{pack.num_clases} clases</p>
                            <p className="mt-2 text-2xl font-bold text-sky-300">{Number(pack.precio).toFixed(2)} €</p>
                            <button type="button" onClick={() => setSelectedPack(pack)} className="mt-3 rounded-xl bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-700">
                                Comprar
                            </button>
                        </div>
                    ))}
                </div>

                <div className="rounded-xl border border-gray-700 bg-gray-900 p-4">
                    <h2 className="mb-3 text-lg font-semibold text-white">Mis compras de bonos</h2>
                    <ul className="space-y-2 text-sm text-gray-200">
                        {myBonos.map((b) => (
                            <li key={b.id} className="rounded-lg border border-gray-700 bg-gray-800/70 p-3 text-gray-200">
                                <span className="font-semibold text-gray-100">{b.pack}</span> · {b.clases_restantes} clases restantes · estado:{" "}
                                <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold uppercase ${statusBadgeClass(b.status)}`}>
                                    {b.status}
                                </span>
                            </li>
                        ))}
                        {myBonos.length === 0 ? <li className="text-gray-400">Aún no tienes bonos.</li> : null}
                    </ul>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <h2 className="mb-3 text-lg font-semibold text-slate-900">Historial de Consumo</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-slate-700">
                                <tr>
                                    <th className="px-3 py-2 text-left">Fecha</th>
                                    <th className="px-3 py-2 text-left">Clase asistida</th>
                                    <th className="px-3 py-2 text-left">Bonos restantes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {consumptionHistory.map((row) => (
                                    <tr key={row.id} className="border-t border-slate-100">
                                        <td className="px-3 py-2">{row.date_human || "—"}</td>
                                        <td className="px-3 py-2">{row.lesson_name || "Clase de surf"}</td>
                                        <td className="px-3 py-2 font-semibold text-sky-700">{row.remaining_after}</td>
                                    </tr>
                                ))}
                                {consumptionHistory.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="px-3 py-4 text-center text-slate-500">
                                            Aún no hay consumos registrados.
                                        </td>
                                    </tr>
                                ) : null}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <ManualPaymentInstructionsModal
                open={!!selectedPack}
                onClose={() => setSelectedPack(null)}
                bizumNumber={paymentBizumNumber || "[BIZUM_NUMBER]"}
                iban={paymentIban || "[IBAN]"}
                whatsappHelpUrl={whatsappHelpUrl}
                showDepositNotice={false}
                totalPrimaryLine={selectedPack ? `Total a pagar: ${Number(selectedPack.precio).toFixed(2).replace(".", ",")} €` : null}
                secondaryNote="Tu bono se activará en cuanto el administrador confirme el pago."
                uploadIntro="Sube aquí el justificante de pago para validación manual."
                onSubmit={submitBono}
                onAfterSuccessSubmit={() => setSelectedPack(null)}
                successSubtitle="Hemos recibido tu solicitud. Validaremos el pago y activaremos tu bono."
            />
        </>
    );
}
