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

                <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-gray-950 via-gray-900 to-teal-950/50 p-[1px] shadow-xl shadow-amber-900/20">
                    <div className="rounded-2xl bg-gray-950/90 px-4 pb-4 pt-3">
                        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <h2 className="text-lg font-bold tracking-tight text-transparent bg-gradient-to-r from-amber-200 via-orange-200 to-teal-200 bg-clip-text">
                                    Historial de consumo
                                </h2>
                                <p className="mt-1 text-xs text-amber-100/70">
                                    Cada sesión descuenta créditos del bono:{" "}
                                    <span className="font-semibold text-teal-200/90">grupal o semanal = 1</span>
                                    {" · "}
                                    <span className="font-semibold text-amber-200/90">particular = 2</span> (equivale a dos grupales).
                                </p>
                            </div>
                        </div>
                        <div className="overflow-x-auto rounded-xl border border-white/5">
                            <table className="w-full min-w-[520px] text-sm">
                                <thead className="bg-gradient-to-r from-amber-900/35 via-gray-900/80 to-teal-900/35 text-[11px] font-semibold uppercase tracking-wide text-amber-50/90">
                                    <tr>
                                        <th className="px-3 py-2.5 text-left">Fecha</th>
                                        <th className="px-3 py-2.5 text-left">Clase asistida</th>
                                        <th className="px-3 py-2.5 text-center">Créditos</th>
                                        <th className="px-3 py-2.5 text-right">Saldo tras sesión</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 text-gray-100">
                                    {consumptionHistory.map((row, idx) => {
                                        const uc = Math.max(1, Number(row.credits_consumed ?? 1));
                                        const ucBadge =
                                            uc >= 2
                                                ? "bg-amber-500/20 text-amber-100 ring-1 ring-amber-400/40"
                                                : "bg-teal-500/15 text-teal-100 ring-1 ring-teal-400/30";
                                        return (
                                            <tr
                                                key={row.id}
                                                className={idx % 2 === 0 ? "bg-gray-900/25 hover:bg-gray-800/40" : "bg-gray-900/10 hover:bg-gray-800/35"}
                                            >
                                                <td className="whitespace-nowrap px-3 py-2.5 text-gray-200">{row.date_human || "—"}</td>
                                                <td className="px-3 py-2.5 text-gray-100">{row.lesson_name || "Clase de surf"}</td>
                                                <td className="px-3 py-2.5 text-center">
                                                    <span className={`inline-flex min-w-[2.25rem] justify-center rounded-full px-2 py-0.5 text-xs font-bold ${ucBadge}`}>
                                                        {uc === 1 ? "1" : "2"}
                                                    </span>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold text-teal-200 tabular-nums">
                                                    {row.remaining_after}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {consumptionHistory.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-3 py-6 text-center text-sm text-gray-400">
                                                Aún no hay consumos registrados.
                                            </td>
                                        </tr>
                                    ) : null}
                                </tbody>
                            </table>
                        </div>
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
