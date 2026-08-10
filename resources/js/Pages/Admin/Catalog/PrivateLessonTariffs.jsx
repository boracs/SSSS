import React, { useMemo, useState } from "react";
import { Head, router, usePage } from "@inertiajs/react";
import CatalogOfferTabs from "@/components/admin/CatalogOfferTabs";

function hrefFor(name) {
    try {
        return route(name, undefined, false);
    } catch {
        return "#";
    }
}

function formatEur(value) {
    return new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: "EUR",
    }).format(Number(value) || 0);
}

function durationLabel(minutes) {
    const m = Number(minutes) || 0;
    if (m === 60) return "1 hora";
    if (m === 90) return "1,5 horas";
    if (m === 120) return "2 horas";
    return `${m} min`;
}

export default function PrivateLessonTariffs({
    tariffs = [],
    baseMinutes = 90,
    depositPercentage = 30,
}) {
    const { flash } = usePage().props;
    const [rows, setRows] = useState(() =>
        tariffs.map((t) => ({
            people: t.people,
            price_eur: String(t.price_eur ?? 0),
            activo: Boolean(t.activo),
        })),
    );
    const [saving, setSaving] = useState(false);

    const preview = useMemo(
        () =>
            rows.map((row) => {
                const total = Number(String(row.price_eur).replace(",", ".")) || 0;
                const deposit = (total * (Number(depositPercentage) || 0)) / 100;
                return {
                    people: row.people,
                    total,
                    deposit,
                    remaining: Math.max(0, total - deposit),
                    perPerson: row.people > 0 ? total / row.people : 0,
                };
            }),
        [rows, depositPercentage],
    );

    const updateRow = (people, patch) => {
        setRows((prev) =>
            prev.map((row) => (row.people === people ? { ...row, ...patch } : row)),
        );
    };

    const submit = (e) => {
        e.preventDefault();
        setSaving(true);
        router.put(
            hrefFor("admin.catalog.private-lessons.update"),
            {
                tariffs: rows.map((row) => ({
                    people: row.people,
                    price_eur: Number(String(row.price_eur).replace(",", ".")) || 0,
                    activo: row.activo,
                })),
            },
            {
                preserveScroll: true,
                onFinish: () => setSaving(false),
            },
        );
    };

    return (
        <>
            <Head title="Admin · Servicios · Clases particulares" />
            <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
                <CatalogOfferTabs active="particulares" />

                <header>
                    <h1 className="text-2xl font-bold text-white sm:text-3xl">
                        Tarifa de clases particulares
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
                        Precio <strong className="text-slate-200">total del grupo</strong> para
                        una clase de {durationLabel(baseMinutes)}. Otras duraciones se calculan
                        proporcionalmente y se redondean al euro. Al reservar por la web se
                        cobra el{" "}
                        <strong className="text-slate-200">{depositPercentage} %</strong> como
                        señal; el resto se cobra en mostrador el día de la clase.
                    </p>
                </header>

                {flash?.success ? (
                    <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                        {flash.success}
                    </div>
                ) : null}

                <form onSubmit={submit} className="space-y-4">
                    <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70">
                        <table className="w-full text-sm">
                            <thead className="bg-white/5 text-left text-[11px] uppercase tracking-wider text-slate-400">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">Personas</th>
                                    <th className="px-4 py-3 font-semibold">Precio total (€)</th>
                                    <th className="px-4 py-3 font-semibold">Por persona</th>
                                    <th className="px-4 py-3 font-semibold">Señal online</th>
                                    <th className="px-4 py-3 font-semibold">Resto</th>
                                    <th className="px-4 py-3 font-semibold">Visible</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {rows.map((row, idx) => (
                                    <tr key={row.people} className="text-slate-300">
                                        <td className="px-4 py-3 font-semibold text-white">
                                            {row.people}
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="number"
                                                min="0"
                                                step="1"
                                                inputMode="decimal"
                                                value={row.price_eur}
                                                onChange={(e) =>
                                                    updateRow(row.people, {
                                                        price_eur: e.target.value,
                                                    })
                                                }
                                                className="w-28 rounded-lg border border-white/15 bg-slate-950/70 px-3 py-1.5 text-sm text-white focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-400/40"
                                            />
                                        </td>
                                        <td className="px-4 py-3 tabular-nums text-slate-400">
                                            {formatEur(preview[idx]?.perPerson)}
                                        </td>
                                        <td className="px-4 py-3 tabular-nums text-emerald-300">
                                            {formatEur(preview[idx]?.deposit)}
                                        </td>
                                        <td className="px-4 py-3 tabular-nums text-slate-400">
                                            {formatEur(preview[idx]?.remaining)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-slate-400">
                                                <input
                                                    type="checkbox"
                                                    checked={row.activo}
                                                    onChange={(e) =>
                                                        updateRow(row.people, {
                                                            activo: e.target.checked,
                                                        })
                                                    }
                                                    className="h-4 w-4 rounded border-white/20 bg-slate-950 text-cyan-500 focus:ring-cyan-400/40"
                                                />
                                                {row.activo ? "Sí" : "No"}
                                            </label>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <p className="text-xs text-slate-500">
                        Desactivar un tamaño de grupo lo retira del tarifario público y de la
                        solicitud online. Los cambios no afectan a las clases ya reservadas.
                    </p>

                    <div className="flex justify-end gap-2">
                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {saving ? "Guardando…" : "Guardar tarifa"}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}
