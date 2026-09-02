import { Head, router, usePage } from "@inertiajs/react";
import React, { useMemo, useRef, useState } from "react";
import { toast as notify } from "react-toastify";
import { Combobox } from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon, TrashIcon } from "@heroicons/react/24/outline";
import PageShell from "@/layouts/PageShell";
import Breadcrumbs from "../components/Breadcrumbs";
import { showInertiaErrors } from "../lib/inertiaErrors";
import { whatsappUrlFromPhone } from "../lib/whatsapp";
import WhatsAppIcon from "../components/icons/WhatsAppIcon";
import { listAssignableLockerOptions, PHYSICAL_LOCKER_MAX } from "@/components/admin/LockerNumberCombobox";

function ComboboxGroupLabel({ children }) {
    return (
        <div className="sticky top-0 z-[1] bg-slate-900 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {children}
        </div>
    );
}

/** Tokens visuales alineados con Planes / Vigencia / Registro de pagos */
const cardClass =
    "rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-black/20 backdrop-blur-sm sm:p-6";
const sectionEyebrow =
    "mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-cyan-400";
const sectionHint = "mb-4 text-xs text-slate-500";
const labelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400";
const inputClass =
    "w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 transition focus:border-s4-cyan/50 focus:outline-none focus:ring-2 focus:ring-s4-cyan/20";
const comboboxOptionsClass = `
    z-[100] w-[var(--input-width)] !max-h-64 overflow-auto rounded-xl
    border border-white/10 bg-slate-900 p-1.5
    shadow-[0_20px_50px_rgba(0,0,0,0.75)] ring-1 ring-white/10
    focus:outline-none empty:invisible
    [&::-webkit-scrollbar]:w-1.5
    [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-950
    [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-600
    hover:[&::-webkit-scrollbar-thumb]:bg-slate-500
`;
const optionItemClass = ({ active, selected }) =>
    `cursor-pointer rounded-lg px-3 py-2.5 text-sm transition-colors ${
        active ? "bg-s4-cyan/20 text-cyan-50" : "text-slate-200"
    } ${selected ? "ring-1 ring-s4-cyan/40" : ""}`;
const btnPrimary =
    "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-s4-cyan px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-s4-cyan/90 disabled:cursor-not-allowed disabled:opacity-50";
const btnGhost =
    "rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/10 disabled:opacity-50";
const modalShell =
    "w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-2xl ring-1 ring-white/5";
const amberNotice =
    "mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs font-semibold text-amber-200";

function fullName(u) {
    return `${u?.nombre || ""} ${u?.apellido || ""}`.trim() || "usuario";
}

export default function AsignarTaquilla() {
    const { usuarios = [], flash = {}, sharedLockerNumbers = [500, 600] } = usePage().props;
    const [query, setQuery] = useState("");
    const [selectedUser, setSelectedUser] = useState(null);
    const [numeroTaquilla, setNumeroTaquilla] = useState("");
    const [lockerQuery, setLockerQuery] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [releasingId, setReleasingId] = useState(null);
    const [releaseConfirmUser, setReleaseConfirmUser] = useState(null);
    const [releaseAlsoRemoveVip, setReleaseAlsoRemoveVip] = useState(false);
    const syncingRef = useRef(false);
    const flashError = flash?.error || null;

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

    const filteredUsersWithoutLocker = useMemo(
        () => filteredUsers.filter((u) => !u.numeroTaquilla),
        [filteredUsers],
    );
    const filteredUsersWithLocker = useMemo(
        () => filteredUsers.filter((u) => !!u.numeroTaquilla),
        [filteredUsers],
    );

    const usersWithLocker = useMemo(
        () =>
            sortedUsers
                .filter((u) => !!u.numeroTaquilla)
                .sort((a, b) => Number(a.numeroTaquilla) - Number(b.numeroTaquilla)),
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
    const hasLockerValue = numeroTaquilla !== "" && numeroTaquilla != null && Number.isFinite(lockerValue);
    const lockerIsFree = hasLockerValue && !occupiedMap.has(lockerValue) && !sharedSet.has(lockerValue);
    const lockerIsShared = hasLockerValue && sharedSet.has(lockerValue);
    /** Destino ocupado por otro socio (no debería ocurrir con el selector; red de seguridad). */
    const destinationBlocked =
        hasLockerValue &&
        !sharedSet.has(lockerValue) &&
        occupiedMap.has(lockerValue) &&
        !!selectedUser &&
        Number(occupiedMap.get(lockerValue)?.id) !== Number(selectedUser.id);

    const totalLockers = PHYSICAL_LOCKER_MAX;
    const occupiedCount = usersWithLocker.length;
    const freeCount = Math.max(0, totalLockers - occupiedCount);
    const freePct = Math.round((freeCount / totalLockers) * 100);

    const sharedLockersSorted = useMemo(
        () => [...sharedLockerNumbers].map(Number).sort((a, b) => a - b),
        [sharedLockerNumbers],
    );

    const lockerOptions = useMemo(() => {
        const occupied = usersWithLocker
            .map((u) => Number(u.numeroTaquilla))
            .filter((n) => Number.isFinite(n) && n > 0);
        return listAssignableLockerOptions(occupied, sharedLockerNumbers);
    }, [usersWithLocker, sharedLockerNumbers]);

    const filteredLockerOptions = useMemo(() => {
        const q = lockerQuery.trim().toLowerCase();
        if (!q) return lockerOptions;
        return lockerOptions.filter(
            (o) =>
                String(o.n).includes(q) ||
                o.title.toLowerCase().includes(q) ||
                o.subtitle.toLowerCase().includes(q),
        );
    }, [lockerOptions, lockerQuery]);

    const selectedLockerOption = useMemo(() => {
        if (!hasLockerValue) return null;
        return (
            lockerOptions.find((o) => o.n === lockerValue) || {
                n: lockerValue,
                kind: lockerIsShared ? "shared" : lockerIsFree ? "free" : "current",
                title: `Taquilla #${lockerValue}`,
                subtitle: lockerIsShared
                    ? "Compartida"
                    : lockerIsFree
                      ? "Libre"
                      : selectedUser?.numeroTaquilla &&
                          Number(selectedUser.numeroTaquilla) === lockerValue
                        ? "Su taquilla actual"
                        : "",
            }
        );
    }, [hasLockerValue, lockerValue, lockerOptions, lockerIsShared, lockerIsFree, selectedUser]);

    const isSharedLocker = (n) => sharedSet.has(Number(n));

    const selectUser = (u) => {
        setSelectedUser(u);
        if (!u) return;
        if (syncingRef.current) return;
        syncingRef.current = true;
        if (u.numeroTaquilla) {
            if (String(numeroTaquilla) !== String(u.numeroTaquilla)) {
                setNumeroTaquilla(String(u.numeroTaquilla));
                setLockerQuery("");
            }
        } else if (numeroTaquilla !== "") {
            setNumeroTaquilla("");
            setLockerQuery("");
        }
        queueMicrotask(() => {
            syncingRef.current = false;
        });
    };

    const selectLocker = (opt) => {
        const next = opt ? String(opt.n) : "";
        setNumeroTaquilla(next);
        setLockerQuery("");
    };

    const submitAssign = () => {
        if (!selectedUser?.id || !hasLockerValue || destinationBlocked) return;

        const toName = fullName(selectedUser);
        const assignedLocker = lockerValue;
        setIsSubmitting(true);
        router.post(
            route("asignar.taquilla"),
            {
                usuario_id: selectedUser.id,
                numero_taquilla: assignedLocker,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setNumeroTaquilla("");
                    setLockerQuery("");
                    setQuery("");
                    setSelectedUser(null);
                    notify.success(`Taquilla #${assignedLocker} asignada correctamente a ${toName}.`);
                },
                onError: (errors) => showInertiaErrors(errors, notify, "No se pudo asignar la taquilla."),
                onFinish: () => setIsSubmitting(false),
            },
        );
    };

    const handleAssign = (e) => {
        e.preventDefault();
        if (!selectedUser?.id || !hasLockerValue || isSubmitting || destinationBlocked) return;
        submitAssign();
    };

    const handleRelease = (userId, desasignarVip = false) => {
        setReleasingId(userId);
        router.post(
            route("asignar.taquilla.liberar", userId),
            { desasignar_vip: desasignarVip ? 1 : 0 },
            {
                preserveScroll: true,
                onSuccess: () =>
                    notify.success(
                        desasignarVip
                            ? "Taquilla liberada y VIP desactivado."
                            : "Taquilla liberada.",
                    ),
                onError: (errors) => showInertiaErrors(errors, notify, "No se pudo liberar la taquilla."),
                onFinish: () => {
                    setReleasingId(null);
                    setReleaseConfirmUser(null);
                },
            },
        );
    };

    const selectedWa = selectedUser ? whatsappUrlFromPhone(selectedUser.telefono) : null;
    const canSubmit =
        !!selectedUser?.id && hasLockerValue && !destinationBlocked && !isSubmitting;

    const renderLockerOption = (opt) => (
        <Combobox.Option key={`${opt.kind}-${opt.n}`} value={opt} className={optionItemClass}>
            <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 truncate font-semibold leading-snug">
                    {opt.title}
                    {opt.kind === "shared" ? (
                        <span className="ml-1.5 text-xs font-medium text-violet-300/90">· compartida</span>
                    ) : null}
                </div>
                <CheckIcon
                    className="h-4 w-4 shrink-0 text-emerald-400"
                    aria-label={opt.kind === "shared" ? "Compartida" : "Libre"}
                    title={opt.kind === "shared" ? "Compartida" : "Libre"}
                />
            </div>
        </Combobox.Option>
    );

    const renderUserOption = (u) => (
        <Combobox.Option key={u.id} value={u} className={optionItemClass}>
            <div className="truncate font-semibold leading-snug">{fullName(u)}</div>
            <div className="mt-1 truncate text-xs text-slate-400">
                {u.email || "sin email"}
                <span className="text-slate-600"> · </span>
                {u.numeroTaquilla ? `#${u.numeroTaquilla}` : "sin taquilla"}
            </div>
        </Combobox.Option>
    );

    return (
        <PageShell variant="slate">
            <Head title="Asignador de Taquillas" />

            <div className="relative overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
                <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-cyan-500/10 blur-[100px]" />
                    <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-s4-cyan/10 blur-[90px]" />
                </div>

                <div className="relative mx-auto max-w-7xl space-y-6">
                    <header>
                        <Breadcrumbs
                            items={[
                                { label: "Admin", href: route("Pag_principal") },
                                { label: "Taquillas", href: route("taquilla.index.admin") },
                                { label: "Asignador" },
                            ]}
                            variant="dark"
                            className="mb-3 hidden sm:flex"
                        />
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-400">
                            Admin · Taquillas
                        </p>
                        <h1 className="mt-2 font-heading text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                            Asignador de Taquillas
                        </h1>
                        <p className="mt-2 max-w-2xl text-sm text-slate-400">
                            Gestiona la ocupación del club: asigna plazas a socios y libera taquillas cuando sea
                            necesario.
                        </p>
                    </header>

                    {flashError ? (
                        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-200">
                            {flashError}
                        </div>
                    ) : null}

                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(300px,380px)_minmax(0,1fr)]">
                        <div className="space-y-4">
                            <section className={`${cardClass} !p-4 sm:!p-5`}>
                                <h2 className={sectionEyebrow}>Disponibilidad rápida</h2>
                                <p className="mb-3 text-xs text-slate-500">
                                    {occupiedCount} de {totalLockers} taquillas en uso.
                                </p>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-2.5 text-center ring-1 ring-inset ring-emerald-500/10">
                                        <p className="text-xl font-extrabold tabular-nums text-emerald-300 sm:text-2xl">
                                            {occupiedCount}
                                        </p>
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-400/80">
                                            Ocupadas
                                        </p>
                                    </div>
                                    <div className="rounded-xl border border-s4-cyan/30 bg-s4-cyan/10 p-2.5 text-center ring-1 ring-inset ring-s4-cyan/10">
                                        <p className="text-xl font-extrabold tabular-nums text-cyan-300 sm:text-2xl">
                                            {freeCount}
                                        </p>
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-cyan-400/80">
                                            Libres
                                        </p>
                                    </div>
                                    <div className="rounded-xl border border-violet-500/25 bg-violet-500/10 p-2.5 text-center ring-1 ring-inset ring-violet-500/10">
                                        <p className="text-xl font-extrabold tabular-nums text-violet-300 sm:text-2xl">
                                            {freePct}%
                                        </p>
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-400/80">
                                            Disponible
                                        </p>
                                    </div>
                                </div>
                            </section>

                            <section className={`relative z-20 overflow-visible ${cardClass}`}>
                                <h2 className={sectionEyebrow}>Formulario de asignación</h2>
                                <p className={sectionHint}>
                                    Solo aparecen taquillas libres (y las compartidas{" "}
                                    {sharedLockersSorted.map((n) => `#${n}`).join(" y ")}
                                    ). Si un socio ya tiene taquilla, puedes moverlo a otra libre sin
                                    liberar antes. Para dar a alguien una plaza que tiene otro socio,
                                    libérala primero en la tabla de la derecha.
                                </p>

                                <form onSubmit={handleAssign} className="space-y-4 overflow-visible">
                                    <div className="relative z-40">
                                        <label className={labelClass}>Buscar usuario</label>
                                        <Combobox value={selectedUser} onChange={selectUser} nullable>
                                            <div className="relative">
                                                <Combobox.Input
                                                    className={`${inputClass} pr-10`}
                                                    onChange={(event) => setQuery(event.target.value)}
                                                    displayValue={(u) => (u ? fullName(u) : "")}
                                                    placeholder="Nombre o email..."
                                                />
                                                <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-200">
                                                    <ChevronUpDownIcon className="h-5 w-5" />
                                                </Combobox.Button>
                                                <Combobox.Options
                                                    anchor="bottom start"
                                                    className={comboboxOptionsClass}
                                                >
                                                    {filteredUsers.length === 0 ? (
                                                        <div className="px-3 py-3 text-sm text-slate-500">
                                                            Sin resultados
                                                        </div>
                                                    ) : (
                                                        <>
                                                            {filteredUsersWithoutLocker.length > 0 ? (
                                                                <>
                                                                    <ComboboxGroupLabel>
                                                                        Sin taquilla
                                                                    </ComboboxGroupLabel>
                                                                    {filteredUsersWithoutLocker.map(renderUserOption)}
                                                                </>
                                                            ) : null}
                                                            {filteredUsersWithLocker.length > 0 ? (
                                                                <>
                                                                    <ComboboxGroupLabel>
                                                                        Con taquilla
                                                                    </ComboboxGroupLabel>
                                                                    {filteredUsersWithLocker.map(renderUserOption)}
                                                                </>
                                                            ) : null}
                                                        </>
                                                    )}
                                                </Combobox.Options>
                                            </div>
                                        </Combobox>
                                    </div>

                                    <div className="relative z-30">
                                        <label className={labelClass}>Número de taquilla</label>
                                        <Combobox
                                            value={selectedLockerOption}
                                            onChange={selectLocker}
                                            by={(a, b) => Number(a?.n) === Number(b?.n)}
                                            nullable
                                        >
                                            <div className="relative">
                                                <Combobox.Input
                                                    className={`${inputClass} pr-10`}
                                                    onChange={(e) => setLockerQuery(e.target.value)}
                                                    displayValue={(opt) => (opt ? opt.title : "")}
                                                    placeholder="Buscar n.º libre…"
                                                />
                                                <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-200">
                                                    <ChevronUpDownIcon className="h-5 w-5" />
                                                </Combobox.Button>
                                                <Combobox.Options
                                                    anchor="bottom start"
                                                    className={comboboxOptionsClass}
                                                >
                                                    {filteredLockerOptions.length === 0 ? (
                                                        <div className="px-3 py-3 text-sm text-slate-500">
                                                            Sin resultados
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <ComboboxGroupLabel>Disponibles</ComboboxGroupLabel>
                                                            {filteredLockerOptions.map(renderLockerOption)}
                                                        </>
                                                    )}
                                                </Combobox.Options>
                                            </div>
                                        </Combobox>
                                    </div>

                                    {selectedUser || hasLockerValue ? (
                                        <div className="rounded-xl border border-s4-cyan/25 bg-s4-cyan/10 p-3.5 text-sm ring-1 ring-inset ring-s4-cyan/10">
                                            {selectedUser ? (
                                                <>
                                                    <p className="font-semibold text-white">
                                                        {fullName(selectedUser)}
                                                    </p>
                                                    <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-slate-400">
                                                        <span>
                                                            {selectedUser.email || "sin email"} ·{" "}
                                                            {selectedUser.telefono || "sin teléfono"}
                                                        </span>
                                                        {selectedWa ? (
                                                            <a
                                                                href={selectedWa}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                title="Abrir WhatsApp"
                                                                aria-label={`WhatsApp de ${fullName(selectedUser)}`}
                                                                className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white transition hover:bg-emerald-500"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <WhatsAppIcon className="h-3 w-3" />
                                                            </a>
                                                        ) : null}
                                                    </p>
                                                </>
                                            ) : null}

                                            {destinationBlocked ? (
                                                <p className={amberNotice}>
                                                    Esa taquilla ya está ocupada. Libérala primero en
                                                    «Socios con taquilla».
                                                </p>
                                            ) : !selectedUser?.numeroTaquilla &&
                                              selectedUser &&
                                              !hasLockerValue ? (
                                                <p className={amberNotice}>No tiene taquilla asignada</p>
                                            ) : lockerIsFree ? (
                                                <p className={amberNotice}>
                                                    Taquilla libre — sin dueño adjudicado
                                                </p>
                                            ) : lockerIsShared ? (
                                                <p className="mt-2 text-xs font-semibold text-violet-300/90">
                                                    Taquilla #{lockerValue} · compartida
                                                </p>
                                            ) : selectedUser?.numeroTaquilla ? (
                                                <p className="mt-2 text-xs text-cyan-300/90">
                                                    Estado actual: Taquilla #{selectedUser.numeroTaquilla}
                                                    {hasLockerValue &&
                                                    Number(selectedUser.numeroTaquilla) !== lockerValue
                                                        ? ` → destino #${lockerValue}`
                                                        : ""}
                                                </p>
                                            ) : null}
                                        </div>
                                    ) : null}

                                    <button type="submit" disabled={!canSubmit} className={btnPrimary}>
                                        {isSubmitting ? (
                                            <>
                                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                                Asignando…
                                            </>
                                        ) : (
                                            "Asignar taquilla"
                                        )}
                                    </button>
                                </form>
                            </section>

                        </div>

                        <section className={cardClass}>
                            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                                <div>
                                    <h2 className={sectionEyebrow}>Socios con taquilla</h2>
                                    <p className="mt-1 text-xs text-slate-500">
                                        {occupiedCount} asignaciones · pulsa Liberar para vaciar una plaza
                                    </p>
                                </div>
                            </div>

                            <div className="overflow-hidden rounded-xl border border-white/10 ring-1 ring-inset ring-white/5">
                                <div className="max-h-[min(70vh,720px)] overflow-auto">
                                    <table className="min-w-full text-sm">
                                        <thead className="sticky top-0 z-[1] bg-slate-900/95 text-[11px] font-semibold uppercase tracking-wide text-slate-400 backdrop-blur">
                                            <tr className="border-b border-white/10">
                                                <th className="px-3 py-2.5 text-left">Usuario</th>
                                                <th className="px-3 py-2.5 text-left">Taquilla</th>
                                                <th className="px-3 py-2.5 text-right">Acción</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {usersWithLocker.length === 0 ? (
                                                <tr>
                                                    <td
                                                        colSpan={3}
                                                        className="px-3 py-8 text-center text-sm text-slate-500"
                                                    >
                                                        No hay taquillas asignadas.
                                                    </td>
                                                </tr>
                                            ) : (
                                                usersWithLocker.map((u, idx) => (
                                                    <tr
                                                        key={u.id}
                                                        className={`transition-colors hover:bg-white/[0.04] ${
                                                            idx % 2 === 0 ? "bg-slate-950/40" : "bg-slate-900/20"
                                                        }`}
                                                    >
                                                        <td className="px-3 py-2.5">
                                                            <p className="font-medium text-slate-100">
                                                                {fullName(u)}
                                                            </p>
                                                            <p className="text-xs text-slate-500">
                                                                {u.email || "sin email"}
                                                            </p>
                                                        </td>
                                                        <td className="px-3 py-2.5">
                                                            <span
                                                                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ring-inset ${
                                                                    isSharedLocker(u.numeroTaquilla)
                                                                        ? "bg-violet-500/15 text-violet-200 ring-violet-500/30"
                                                                        : "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
                                                                }`}
                                                            >
                                                                #{u.numeroTaquilla}
                                                                {isSharedLocker(u.numeroTaquilla)
                                                                    ? " · comp."
                                                                    : ""}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2.5 text-right">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setReleaseAlsoRemoveVip(false);
                                                                    setReleaseConfirmUser(u);
                                                                }}
                                                                disabled={releasingId === u.id}
                                                                className="inline-flex items-center gap-1 rounded-lg border border-rose-500/25 bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/20 disabled:opacity-50"
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
                    className="fixed inset-0 z-modal grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
                    onClick={() => !releasingId && setReleaseConfirmUser(null)}
                >
                    <div className={modalShell} onClick={(e) => e.stopPropagation()}>
                        <h3 className="font-heading text-lg font-bold text-white">Confirmar liberación</h3>
                        <p className="mt-2 text-sm text-slate-400">
                            ¿Seguro que quieres liberar la taquilla de{" "}
                            <span className="font-semibold text-slate-200">
                                {fullName(releaseConfirmUser)}
                            </span>
                            ?
                        </p>
                        {Boolean(releaseConfirmUser.is_vip) ? (
                            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-3">
                                <input
                                    type="checkbox"
                                    checked={releaseAlsoRemoveVip}
                                    onChange={(e) => setReleaseAlsoRemoveVip(e.target.checked)}
                                    disabled={!!releasingId}
                                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-amber-400/50 bg-slate-950 text-rose-500 focus:ring-rose-500/40"
                                />
                                <span>
                                    <span className="block text-sm font-semibold text-amber-100">
                                        Quitar también el VIP
                                    </span>
                                    <span className="mt-0.5 block text-xs leading-relaxed text-amber-200/80">
                                        Este socio es VIP. Márcalo si quieres desactivarle el VIP al
                                        liberar la taquilla.
                                    </span>
                                </span>
                            </label>
                        ) : null}
                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                disabled={!!releasingId}
                                onClick={() => setReleaseConfirmUser(null)}
                                className={btnGhost}
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                disabled={!!releasingId}
                                onClick={() =>
                                    handleRelease(
                                        releaseConfirmUser.id,
                                        Boolean(releaseConfirmUser.is_vip) && releaseAlsoRemoveVip,
                                    )
                                }
                                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:opacity-50"
                            >
                                {releasingId === releaseConfirmUser.id ? "…" : "Liberar"}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </PageShell>
    );
}
