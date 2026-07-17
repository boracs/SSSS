import { Head, router, usePage } from "@inertiajs/react";
import React, { useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Combobox } from "@headlessui/react";
import { ChevronUpDownIcon, TrashIcon } from "@heroicons/react/24/outline";
import Layout1 from "../layouts/Layout1";
import { showInertiaErrors } from "../lib/inertiaErrors";

const inputClass =
    "w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20";

export default function AsignarTaquilla() {
    const { usuarios = [], flash = {}, success, sharedLockerNumbers = [500, 600] } = usePage().props;
    const [query, setQuery] = useState("");
    const [selectedUser, setSelectedUser] = useState(null);
    const [numeroTaquilla, setNumeroTaquilla] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [releasingId, setReleasingId] = useState(null);
    const [releaseConfirmUser, setReleaseConfirmUser] = useState(null);
    const toast = flash?.success || flash?.error || (success ? "Operación completada." : null);

    const sortedUsers = useMemo(
        () => [...usuarios].sort((a, b) => `${a.nombre} ${a.apellido}`.localeCompare(`${b.nombre} ${b.apellido}`)),
        [usuarios],
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
        [sortedUsers],
    );

    const sharedSet = useMemo(
        () => new Set(sharedLockerNumbers.map((n) => Number(n))),
        [sharedLockerNumbers],
    );

    const occupiedMap = useMemo(() => {
        const map = new Map();
        usersWithLocker.forEach((u) => {
            const num = Number(u.numeroTaquilla);
            if (!sharedSet.has(num)) {
                map.set(num, u);
            }
        });
        return map;
    }, [usersWithLocker, sharedSet]);

    const lockerValue = Number(numeroTaquilla);
    const occupiedBy =
        Number.isFinite(lockerValue) && !sharedSet.has(lockerValue) ? occupiedMap.get(lockerValue) : null;
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

    const sharedLockersSorted = useMemo(
        () => [...sharedLockerNumbers].map(Number).sort((a, b) => a - b),
        [sharedLockerNumbers],
    );

    const isSharedLocker = (n) => sharedSet.has(Number(n));

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
                    toast.success("Taquilla asignada correctamente.");
                },
                onError: (errors) => showInertiaErrors(errors, toast, "No se pudo asignar la taquilla."),
                onFinish: () => setIsSubmitting(false),
            },
        );
    };

    const handleRelease = (userId) => {
        setReleasingId(userId);
        router.post(route("asignar.taquilla.liberar", userId), {}, {
            preserveScroll: true,
            onSuccess: () => toast.success("Taquilla liberada."),
            onError: (errors) => showInertiaErrors(errors, toast, "No se pudo liberar la taquilla."),
            onFinish: () => setReleasingId(null),
        });
    };

    return (
        <Layout1>
            <Head title="Asignación de taquillas" />

            <div className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-8 sm:px-6 lg:px-8">
                <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-cyan-500/10 blur-[100px]" />
                    <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-orange-500/10 blur-[90px]" />
                </div>

                <div className="relative mx-auto max-w-7xl">
                    <header className="mb-8">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-400">
                            Admin · Taquillas
                        </p>
                        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                            Asignación de taquillas
                        </h1>
                        <p className="mt-2 max-w-2xl text-sm text-slate-400">
                            Gestiona la ocupación del club: asigna plazas a socios y libera taquillas cuando sea necesario.
                        </p>
                    </header>

                    {toast ? (
                        <div
                            className={`mb-6 rounded-xl border px-4 py-3 text-sm font-semibold ${
                                flash?.error
                                    ? "border-rose-500/30 bg-rose-500/15 text-rose-200"
                                    : "border-emerald-500/30 bg-emerald-500/15 text-emerald-200"
                            }`}
                        >
                            {toast}
                        </div>
                    ) : null}

                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                        {/* Formulario */}
                        <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/90 to-slate-950/90 p-5 shadow-xl shadow-black/20 backdrop-blur-sm sm:p-6">
                            <h2 className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-orange-300/90">
                                Formulario de asignación
                            </h2>
                            <p className="mb-5 text-xs text-slate-500">
                                Busca un usuario y elige una taquilla libre. Las taquillas{" "}
                                {sharedLockersSorted.map((n) => `#${n}`).join(" y ")} son compartidas: puedes
                                asignarlas a varios usuarios (descuento tienda sin casillero físico).
                            </p>

                            <form onSubmit={handleAssign} className="space-y-4">
                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                                        Buscar usuario
                                    </label>
                                    <Combobox value={selectedUser} onChange={setSelectedUser}>
                                        <div className="relative">
                                            <Combobox.Input
                                                className={inputClass}
                                                onChange={(event) => setQuery(event.target.value)}
                                                displayValue={(u) => (u ? `${u.nombre || ""} ${u.apellido || ""}`.trim() : "")}
                                                placeholder="Nombre o email..."
                                            />
                                            <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500">
                                                <ChevronUpDownIcon className="h-5 w-5" />
                                            </Combobox.Button>
                                            <Combobox.Options className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-white/10 bg-slate-900 p-1 shadow-2xl shadow-black/40">
                                                {filteredUsers.length === 0 ? (
                                                    <div className="px-3 py-2 text-sm text-slate-500">Sin resultados</div>
                                                ) : (
                                                    filteredUsers.map((u) => (
                                                        <Combobox.Option
                                                            key={u.id}
                                                            value={u}
                                                            className={({ active }) =>
                                                                `cursor-pointer rounded-lg px-3 py-2 text-sm ${
                                                                    active
                                                                        ? "bg-cyan-500/15 text-cyan-100"
                                                                        : "text-slate-200"
                                                                }`
                                                            }
                                                        >
                                                            <div className="font-medium">{`${u.nombre || ""} ${u.apellido || ""}`.trim()}</div>
                                                            <div className="text-xs text-slate-500">
                                                                {u.email || "sin email"} ·{" "}
                                                                {u.numeroTaquilla ? `Taquilla #${u.numeroTaquilla}` : "sin taquilla"}
                                                            </div>
                                                        </Combobox.Option>
                                                    ))
                                                )}
                                            </Combobox.Options>
                                        </div>
                                    </Combobox>
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                                        Número de taquilla
                                    </label>
                                    <select
                                        value={numeroTaquilla}
                                        onChange={(e) => setNumeroTaquilla(e.target.value)}
                                        className={`${inputClass} ${
                                            conflict
                                                ? "border-rose-500/50 bg-rose-950/30 text-rose-200 focus:ring-rose-500/20"
                                                : ""
                                        }`}
                                        required
                                    >
                                        <option value="">Selecciona una taquilla disponible</option>
                                        {availableLockers.length > 0 ? (
                                            <optgroup label="Taquillas físicas (1–200)">
                                                {availableLockers.map((n) => (
                                                    <option key={n} value={n}>
                                                        Taquilla #{n}
                                                    </option>
                                                ))}
                                            </optgroup>
                                        ) : null}
                                        {sharedLockersSorted.length > 0 ? (
                                            <optgroup label="Compartidas (varios usuarios)">
                                                {sharedLockersSorted.map((n) => (
                                                    <option key={`shared-${n}`} value={n}>
                                                        Taquilla #{n} · compartida
                                                    </option>
                                                ))}
                                            </optgroup>
                                        ) : null}
                                    </select>
                                    {conflict ? (
                                        <p className="mt-1.5 text-xs font-semibold text-rose-300">
                                            Taquilla ocupada por {occupiedBy?.nombre} {occupiedBy?.apellido}. Elige otra.
                                        </p>
                                    ) : null}
                                </div>

                                {selectedUser ? (
                                    <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/25 p-3.5 text-sm">
                                        <p className="font-semibold text-white">
                                            {selectedUser.nombre} {selectedUser.apellido}
                                        </p>
                                        <p className="mt-0.5 text-slate-400">
                                            {selectedUser.email || "sin email"} · {selectedUser.telefono || "sin teléfono"}
                                        </p>
                                        <p className="mt-2 text-xs text-cyan-300/90">
                                            Estado actual:{" "}
                                            {selectedUser.numeroTaquilla
                                                ? `Taquilla #${selectedUser.numeroTaquilla}`
                                                : "Sin taquilla asignada"}
                                        </p>
                                    </div>
                                ) : null}

                                <button
                                    type="submit"
                                    disabled={isSubmitting || !selectedUser?.id || !lockerValue || conflict}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-cyan-900/30 transition hover:from-cyan-500 hover:to-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
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

                        {/* Disponibilidad */}
                        <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/90 to-slate-950/90 p-5 shadow-xl shadow-black/20 backdrop-blur-sm sm:p-6">
                            <h2 className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-teal-300/90">
                                Disponibilidad rápida
                            </h2>
                            <p className="mb-5 text-xs text-slate-500">
                                {occupiedCount} de {totalLockers} taquillas en uso.
                            </p>

                            <div className="mb-5 grid grid-cols-3 gap-2 sm:gap-3">
                                <div className="rounded-xl border border-emerald-500/25 bg-emerald-950/30 p-3 text-center">
                                    <p className="text-2xl font-extrabold tabular-nums text-emerald-300">{occupiedCount}</p>
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-400/80">Ocupadas</p>
                                </div>
                                <div className="rounded-xl border border-cyan-500/25 bg-cyan-950/30 p-3 text-center">
                                    <p className="text-2xl font-extrabold tabular-nums text-cyan-300">{freeCount}</p>
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-cyan-400/80">Libres</p>
                                </div>
                                <div className="rounded-xl border border-violet-500/25 bg-violet-950/30 p-3 text-center">
                                    <p className="text-2xl font-extrabold tabular-nums text-violet-300">{freePct}%</p>
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-400/80">Disponible</p>
                                </div>
                            </div>

                            <div className="overflow-hidden rounded-xl border border-white/10">
                                <div className="max-h-[410px] overflow-auto">
                                    <table className="min-w-full text-sm">
                                        <thead className="sticky top-0 bg-slate-800 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                            <tr>
                                                <th className="px-3 py-2.5 text-left">Usuario</th>
                                                <th className="px-3 py-2.5 text-left">Taquilla</th>
                                                <th className="px-3 py-2.5 text-right">Acción</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5 bg-slate-950/80">
                                            {usersWithLocker.length === 0 ? (
                                                <tr>
                                                    <td colSpan={3} className="px-3 py-8 text-center text-sm text-slate-500">
                                                        No hay taquillas asignadas.
                                                    </td>
                                                </tr>
                                            ) : (
                                                usersWithLocker.map((u, idx) => (
                                                    <tr
                                                        key={u.id}
                                                        className={idx % 2 === 0 ? "bg-slate-900/30" : "bg-slate-900/10"}
                                                    >
                                                        <td className="px-3 py-2.5">
                                                            <p className="font-medium text-slate-100">
                                                                {u.nombre} {u.apellido}
                                                            </p>
                                                            <p className="text-xs text-slate-500">{u.email || "sin email"}</p>
                                                        </td>
                                                        <td className="px-3 py-2.5">
                                                            <span
                                                                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${
                                                                    isSharedLocker(u.numeroTaquilla)
                                                                        ? "bg-violet-500/15 text-violet-200 ring-violet-500/30"
                                                                        : "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
                                                                }`}
                                                            >
                                                                #{u.numeroTaquilla}
                                                                {isSharedLocker(u.numeroTaquilla) ? " · comp." : ""}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2.5 text-right">
                                                            <button
                                                                type="button"
                                                                onClick={() => setReleaseConfirmUser(u)}
                                                                disabled={releasingId === u.id}
                                                                className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/15 px-2.5 py-1 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/25 disabled:opacity-50"
                                                                title="Liberar taquilla"
                                                            >
                                                                <TrashIcon className="h-4 w-4" />
                                                                {releasingId === u.id ? "..." : "Liberar"}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </div>

            {releaseConfirmUser ? (
                <div
                    className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
                    onClick={() => setReleaseConfirmUser(null)}
                >
                    <div
                        className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-bold text-white">Confirmar liberación</h3>
                        <p className="mt-2 text-sm text-slate-400">
                            ¿Seguro que quieres liberar la taquilla de{" "}
                            <span className="font-semibold text-slate-200">
                                {releaseConfirmUser.nombre} {releaseConfirmUser.apellido}
                            </span>
                            ?
                        </p>
                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setReleaseConfirmUser(null)}
                                className="rounded-xl border border-white/10 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-700"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    handleRelease(releaseConfirmUser.id);
                                    setReleaseConfirmUser(null);
                                }}
                                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500"
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
