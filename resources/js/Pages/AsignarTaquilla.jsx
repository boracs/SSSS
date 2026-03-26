import { router, usePage } from "@inertiajs/react";
import React, { useMemo, useState } from "react";
import { Combobox } from "@headlessui/react";
import { ChevronUpDownIcon, TrashIcon } from "@heroicons/react/24/outline";
import Layout1 from "../layouts/Layout1";

export default function AsignarTaquilla() {
    const { usuarios = [], flash = {}, success } = usePage().props;
    const [query, setQuery] = useState("");
    const [selectedUser, setSelectedUser] = useState(null);
    const [numeroTaquilla, setNumeroTaquilla] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [releasingId, setReleasingId] = useState(null);
    const [releaseConfirmUser, setReleaseConfirmUser] = useState(null);
    const toast = flash?.success || flash?.error || (success ? "Operación completada." : null);

    const sortedUsers = useMemo(
        () => [...usuarios].sort((a, b) => `${a.nombre} ${a.apellido}`.localeCompare(`${b.nombre} ${b.apellido}`)),
        [usuarios]
    );

    const filteredUsers = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return sortedUsers;
        return sortedUsers.filter((u) => {
            const full = `${u.nombre || ""} ${u.apellido || ""}`.toLowerCase();
            return full.includes(q) || String(u.email || "").toLowerCase().includes(q);
        });
    }, [sortedUsers, query]);

    const usersWithLocker = useMemo(
        () => sortedUsers.filter((u) => !!u.numeroTaquilla).sort((a, b) => Number(a.numeroTaquilla) - Number(b.numeroTaquilla)),
        [sortedUsers]
    );

    const occupiedMap = useMemo(() => {
        const map = new Map();
        usersWithLocker.forEach((u) => map.set(Number(u.numeroTaquilla), u));
        return map;
    }, [usersWithLocker]);

    const lockerValue = Number(numeroTaquilla);
    const occupiedBy = Number.isFinite(lockerValue) ? occupiedMap.get(lockerValue) : null;
    const conflict =
        !!occupiedBy &&
        (!selectedUser || Number(occupiedBy.id) !== Number(selectedUser.id));

    const totalLockers = 200;
    const occupiedCount = usersWithLocker.length;
    const freeCount = Math.max(0, totalLockers - occupiedCount);
    const freePct = Math.round((freeCount / totalLockers) * 100);

    const availableLockers = useMemo(() => {
        const list = [];
        for (let i = 1; i <= 200; i += 1) {
            if (!occupiedMap.has(i) || (selectedUser && Number(selectedUser.numeroTaquilla) === i)) {
                list.push(i);
            }
        }
        return list;
    }, [occupiedMap, selectedUser]);

    const handleAssign = (e) => {
        e.preventDefault();
        if (!selectedUser?.id || !lockerValue || conflict) return;

        setIsSubmitting(true);
        router.post(
            route("asignar.taquilla"),
            {
                usuario_id: selectedUser.id,
                numero_taquilla: lockerValue,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setNumeroTaquilla("");
                    setQuery("");
                    setSelectedUser(null);
                },
                onFinish: () => setIsSubmitting(false),
            }
        );
    };

    const handleRelease = (userId) => {
        setReleasingId(userId);
        router.post(route("asignar.taquilla.liberar", userId), {}, {
            preserveScroll: true,
            onFinish: () => setReleasingId(null),
        });
    };

    return (
        <Layout1>
            <div className="mx-auto max-w-7xl p-6 font-sans">
                <h1 className="mb-6 text-2xl font-bold text-slate-900">Asignación de Taquillas</h1>

                {toast ? (
                    <div className={`mb-4 rounded-xl px-4 py-3 text-sm font-semibold text-white ${flash?.error ? "bg-rose-600" : "bg-emerald-600"}`}>
                        {toast}
                    </div>
                ) : null}

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">Formulario de Asignación</h2>
                        <form onSubmit={handleAssign} className="space-y-4">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">Buscar usuario</label>
                                <Combobox value={selectedUser} onChange={setSelectedUser}>
                                    <div className="relative">
                                        <Combobox.Input
                                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                                            onChange={(event) => setQuery(event.target.value)}
                                            displayValue={(u) => (u ? `${u.nombre || ""} ${u.apellido || ""}`.trim() : "")}
                                            placeholder="Nombre o email..."
                                        />
                                        <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2 text-slate-400">
                                            <ChevronUpDownIcon className="h-5 w-5" />
                                        </Combobox.Button>
                                        <Combobox.Options className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                                            {filteredUsers.length === 0 ? (
                                                <div className="px-3 py-2 text-sm text-slate-500">Sin resultados</div>
                                            ) : (
                                                filteredUsers.map((u) => (
                                                    <Combobox.Option
                                                        key={u.id}
                                                        value={u}
                                                        className={({ active }) =>
                                                            `cursor-pointer rounded-lg px-3 py-2 text-sm ${
                                                                active ? "bg-sky-50 text-sky-700" : "text-slate-700"
                                                            }`
                                                        }
                                                    >
                                                        <div className="font-medium">{`${u.nombre || ""} ${u.apellido || ""}`.trim()}</div>
                                                        <div className="text-xs text-slate-500">{u.email || "sin email"} · {u.numeroTaquilla ? `Taquilla #${u.numeroTaquilla}` : "sin taquilla"}</div>
                                                    </Combobox.Option>
                                                ))
                                            )}
                                        </Combobox.Options>
                                    </div>
                                </Combobox>
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">Número de taquilla</label>
                                <select
                                    value={numeroTaquilla}
                                    onChange={(e) => setNumeroTaquilla(e.target.value)}
                                    className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                                        conflict
                                            ? "border-rose-400 bg-rose-50 text-rose-700 focus:ring-rose-200"
                                            : "border-slate-300 focus:border-sky-500 focus:ring-sky-200"
                                    }`}
                                    required
                                >
                                    <option value="">Selecciona una taquilla disponible</option>
                                    {availableLockers.map((n) => (
                                        <option key={n} value={n}>
                                            Taquilla #{n}
                                        </option>
                                    ))}
                                </select>
                                {conflict ? (
                                    <p className="mt-1 text-xs font-semibold text-rose-600">
                                        Taquilla ocupada por {occupiedBy?.nombre} {occupiedBy?.apellido}. Elige otra.
                                    </p>
                                ) : null}
                            </div>

                            {selectedUser ? (
                                <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                                    <p className="font-semibold text-slate-900">{selectedUser.nombre} {selectedUser.apellido}</p>
                                    <p>{selectedUser.email || "sin email"} · {selectedUser.telefono || "sin teléfono"}</p>
                                    <p className="mt-1 text-xs text-slate-500">
                                        Estado actual: {selectedUser.numeroTaquilla ? `Taquilla #${selectedUser.numeroTaquilla}` : "Sin taquilla asignada"}
                                    </p>
                                </div>
                            ) : null}

                            <button
                                type="submit"
                                disabled={isSubmitting || !selectedUser?.id || !lockerValue || conflict}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isSubmitting ? (
                                    <>
                                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                        Asignando...
                                    </>
                                ) : (
                                    "Asignar taquilla"
                                )}
                            </button>
                        </form>
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">Disponibilidad rápida</h2>
                        <div className="mb-4 grid grid-cols-3 gap-3 text-center text-sm">
                            <div className="rounded-xl bg-emerald-50 p-3">
                                <p className="text-xl font-bold text-emerald-700">{occupiedCount}</p>
                                <p className="text-xs text-emerald-700">Ocupadas</p>
                            </div>
                            <div className="rounded-xl bg-sky-50 p-3">
                                <p className="text-xl font-bold text-sky-700">{freeCount}</p>
                                <p className="text-xs text-sky-700">Plazas libres</p>
                            </div>
                            <div className="rounded-xl bg-indigo-50 p-3">
                                <p className="text-xl font-bold text-indigo-700">{freePct}%</p>
                                <p className="text-xs text-indigo-700">Disponibilidad</p>
                            </div>
                        </div>

                        <div className="max-h-[410px] overflow-auto rounded-xl border border-slate-200">
                            <table className="min-w-full text-sm">
                                <thead className="sticky top-0 bg-slate-50 text-slate-700">
                                    <tr>
                                        <th className="px-3 py-2 text-left">Usuario</th>
                                        <th className="px-3 py-2 text-left">Taquilla</th>
                                        <th className="px-3 py-2 text-right">Acción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {usersWithLocker.map((u) => (
                                        <tr key={u.id} className="border-t border-slate-100">
                                            <td className="px-3 py-2">
                                                <p className="font-medium text-slate-900">{u.nombre} {u.apellido}</p>
                                                <p className="text-xs text-slate-500">{u.email || "sin email"}</p>
                                            </td>
                                            <td className="px-3 py-2">
                                                <span className="inline-flex rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                                                    #{u.numeroTaquilla}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => setReleaseConfirmUser(u)}
                                                    disabled={releasingId === u.id}
                                                    className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                                                    title="Liberar taquilla"
                                                >
                                                    <TrashIcon className="h-4 w-4" />
                                                    {releasingId === u.id ? "..." : "Liberar"}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>
            </div>
            {releaseConfirmUser ? (
                <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 p-4" onClick={() => setReleaseConfirmUser(null)}>
                    <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-slate-900">Confirmar liberación</h3>
                        <p className="mt-2 text-sm text-slate-700">
                            ¿Seguro que quieres liberar la taquilla de{" "}
                            <span className="font-semibold">
                                {releaseConfirmUser.nombre} {releaseConfirmUser.apellido}
                            </span>
                            ?
                        </p>
                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setReleaseConfirmUser(null)}
                                className="rounded-lg bg-slate-200 px-3 py-1 text-sm font-semibold text-slate-700"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    handleRelease(releaseConfirmUser.id);
                                    setReleaseConfirmUser(null);
                                }}
                                className="rounded-lg bg-rose-600 px-3 py-1 text-sm font-semibold text-white"
                            >
                                Liberar
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </Layout1>
    );
}
