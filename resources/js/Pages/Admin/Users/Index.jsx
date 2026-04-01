import { Head, Link, router, usePage } from "@inertiajs/react";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import {
    ChartBarIcon,
    EllipsisHorizontalIcon,
    StarIcon,
} from "@heroicons/react/24/solid";
import { StarIcon as StarIconOutline } from "@heroicons/react/24/outline";
import { useMemo, useState } from "react";

function UserRowActionsMenu({ user, onOpenVipConfirm }) {
    const analysisHref = `${route("admin.vips.analysis", user.id)}?from=users&target_user_id=${user.id}`;

    return (
        <Menu as="div" className="relative inline-block text-left">
            <MenuButton
                type="button"
                className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300"
                aria-label={`Acciones para ${user.email}`}
            >
                <EllipsisHorizontalIcon className="h-5 w-5" aria-hidden />
            </MenuButton>

            <MenuItems
                transition
                anchor="bottom end"
                modal={false}
                className="z-[100] mt-1 w-[min(18rem,calc(100vw-2rem))] origin-top-right rounded-xl border border-gray-200 bg-white py-1 shadow-lg outline-none ring-1 ring-black/5 transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0 [--anchor-gap:6px]"
            >
                {user.is_vip ? (
                    <>
                        <MenuItem
                            as={Link}
                            href={analysisHref}
                            className="group flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm text-gray-700 data-[focus]:bg-gray-50"
                        >
                            <ChartBarIcon className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" aria-hidden />
                            <span className="leading-snug">Ver Tablón de Entrenamiento y Bonos</span>
                        </MenuItem>
                        <MenuItem>
                            {({ close }) => (
                                <button
                                    type="button"
                                    onClick={() => {
                                        close();
                                        onOpenVipConfirm(user);
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-rose-600 data-[focus]:bg-rose-50"
                                >
                                    <span className="relative inline-flex h-4 w-4 shrink-0 items-center justify-center" aria-hidden>
                                        <StarIconOutline className="h-4 w-4 text-rose-500" />
                                        <span className="absolute inset-0 flex items-center justify-center">
                                            <span className="h-px w-[120%] rotate-45 rounded-full bg-rose-500" />
                                        </span>
                                    </span>
                                    Desactivar VIP
                                </button>
                            )}
                        </MenuItem>
                    </>
                ) : (
                    <MenuItem>
                        {({ close }) => (
                            <button
                                type="button"
                                onClick={() => {
                                    close();
                                    onOpenVipConfirm(user);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-emerald-700 data-[focus]:bg-emerald-50"
                            >
                                <StarIcon className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                                Hacer VIP
                            </button>
                        )}
                    </MenuItem>
                )}
            </MenuItems>
        </Menu>
    );
}

function VipStatusIcon({ isVip }) {
    const label = isVip ? "Alumno VIP Activo" : "Alumno Normal";
    return (
        <span className="inline-flex justify-center" title={label}>
            <StarIcon
                className={`h-5 w-5 ${isVip ? "text-yellow-500" : "text-gray-300"}`}
                aria-hidden
            />
            <span className="sr-only">{label}</span>
        </span>
    );
}

export default function AdminUsersIndex({ users = [], filters = {} }) {
    const { flash } = usePage().props;
    const [search, setSearch] = useState(filters.search || "");
    const [vip, setVip] = useState(filters.vip || "all");
    const [vipConfirmUser, setVipConfirmUser] = useState(null);
    const [vipToggleBusy, setVipToggleBusy] = useState(false);

    const applyFilters = () => {
        router.get(route("admin.users.index"), { search, vip }, { preserveState: true, preserveScroll: true });
    };

    const closeVipConfirm = () => {
        if (!vipToggleBusy) setVipConfirmUser(null);
    };

    const confirmVipToggle = () => {
        if (!vipConfirmUser) return;
        setVipToggleBusy(true);
        router.patch(
            route("admin.users.toggle-vip", vipConfirmUser.id),
            {},
            {
                preserveScroll: true,
                onFinish: () => {
                    setVipToggleBusy(false);
                    setVipConfirmUser(null);
                },
            }
        );
    };

    const vipConfirmDisplayName =
        vipConfirmUser &&
        `${vipConfirmUser.nombre ?? ""} ${vipConfirmUser.apellido ?? ""}`.trim() || "";
    const vipConfirmIsActivate = vipConfirmUser && !vipConfirmUser.is_vip;

    const toast = flash?.success || flash?.error;
    const rows = useMemo(() => users, [users]);

    return (
        <>
            <Head title="Admin · Usuarios" />
            <div className="mx-auto max-w-4xl space-y-6 p-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Gestión de Usuarios</h1>
                    <p className="mt-1 text-sm text-gray-500">Consola compacta: filtros, estado VIP y acciones en menú.</p>
                </div>

                {toast ? (
                    <div
                        className={`fixed right-4 top-24 z-50 rounded-xl px-4 py-3 text-sm font-semibold shadow-lg ${
                            flash?.success ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
                        }`}
                    >
                        {toast}
                    </div>
                ) : null}

                <div className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_1fr_minmax(8rem,auto)_auto]">
                    <input
                        className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 sm:col-span-2"
                        placeholder="Buscar por nombre o email"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <select
                        className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
                        value={vip}
                        onChange={(e) => setVip(e.target.value)}
                    >
                        <option value="all">Todos</option>
                        <option value="vip">Solo VIP</option>
                        <option value="non_vip">Solo No VIP</option>
                    </select>
                    <button
                        type="button"
                        onClick={applyFilters}
                        className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
                    >
                        Filtrar
                    </button>
                </div>

                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full table-fixed text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50/80 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    <th className="w-[32%] px-4 py-3 pl-5">Usuario</th>
                                    <th className="w-[36%] px-4 py-3">Email</th>
                                    <th className="w-[14%] px-4 py-3">Rol</th>
                                    <th className="w-[10%] px-4 py-3 text-center">VIP</th>
                                    <th className="w-[8%] px-4 py-3 pr-5 text-right">
                                        <span className="sr-only">Acciones</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-gray-900">
                                {rows.map((u) => {
                                    const name = `${u.nombre ?? ""} ${u.apellido ?? ""}`.trim() || "—";
                                    return (
                                        <tr key={u.id} className="transition-colors hover:bg-gray-50/60">
                                            <td className="px-4 py-3 pl-5 align-middle">
                                                <span className="font-medium text-gray-900">{name}</span>
                                            </td>
                                            <td className="px-4 py-3 align-middle">
                                                <span className="block truncate text-sm text-gray-500" title={u.email}>
                                                    {u.email}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 align-middle">
                                                <span className="text-xs font-medium uppercase tracking-wide text-gray-600">
                                                    {u.role ?? "user"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center align-middle">
                                                <VipStatusIcon isVip={!!u.is_vip} />
                                            </td>
                                            <td className="px-4 py-3 pr-5 text-right align-middle">
                                                <UserRowActionsMenu user={u} onOpenVipConfirm={setVipConfirmUser} />
                                            </td>
                                        </tr>
                                    );
                                })}
                                {rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-5 py-10 text-center text-sm text-gray-500">
                                            No hay usuarios para los filtros seleccionados.
                                        </td>
                                    </tr>
                                ) : null}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {vipConfirmUser ? (
                <div
                    className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-900/50 p-4 backdrop-blur-[2px] sm:items-center"
                    role="presentation"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) closeVipConfirm();
                    }}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="vip-confirm-title"
                        aria-describedby="vip-confirm-desc"
                        className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl ring-1 ring-black/5"
                    >
                        <div
                            className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${
                                vipConfirmIsActivate ? "bg-emerald-100" : "bg-rose-100"
                            }`}
                        >
                            {vipConfirmIsActivate ? (
                                <StarIcon className="h-6 w-6 text-emerald-600" aria-hidden />
                            ) : (
                                <span className="relative inline-flex h-6 w-6 items-center justify-center" aria-hidden>
                                    <StarIconOutline className="h-6 w-6 text-rose-500" />
                                    <span className="absolute inset-0 flex items-center justify-center">
                                        <span className="h-px w-[140%] rotate-45 rounded-full bg-rose-500" />
                                    </span>
                                </span>
                            )}
                        </div>
                        <h2 id="vip-confirm-title" className="text-center text-lg font-bold text-gray-900">
                            {vipConfirmIsActivate ? "¿Activar estado VIP?" : "¿Quitar estado VIP?"}
                        </h2>
                        <p id="vip-confirm-desc" className="mt-2 text-center text-sm leading-relaxed text-gray-600">
                            {vipConfirmIsActivate ? (
                                <>
                                    Vas a marcar como <strong className="font-semibold text-gray-800">VIP</strong> a{" "}
                                    <strong className="font-semibold text-gray-900">
                                        {vipConfirmDisplayName || "este usuario"}
                                    </strong>
                                    {vipConfirmUser.email ? (
                                        <>
                                            {" "}
                                            <span className="text-gray-500">({vipConfirmUser.email})</span>
                                        </>
                                    ) : null}
                                    . Tendrá acceso al tablón de entrenamiento y flujos reservados a alumnos VIP.
                                </>
                            ) : (
                                <>
                                    Vas a <strong className="font-semibold text-rose-800">revocar</strong> el VIP de{" "}
                                    <strong className="font-semibold text-gray-900">
                                        {vipConfirmDisplayName || "este usuario"}
                                    </strong>
                                    {vipConfirmUser.email ? (
                                        <>
                                            {" "}
                                            <span className="text-gray-500">({vipConfirmUser.email})</span>
                                        </>
                                    ) : null}
                                    . Perderá el acceso asociado al programa VIP hasta que lo reactives.
                                </>
                            )}
                        </p>
                        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                disabled={vipToggleBusy}
                                onClick={closeVipConfirm}
                                className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                disabled={vipToggleBusy}
                                onClick={confirmVipToggle}
                                className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-50 ${
                                    vipConfirmIsActivate
                                        ? "bg-emerald-600 hover:bg-emerald-700"
                                        : "bg-rose-600 hover:bg-rose-700"
                                }`}
                            >
                                {vipToggleBusy
                                    ? "Aplicando…"
                                    : vipConfirmIsActivate
                                      ? "Sí, activar VIP"
                                      : "Sí, quitar VIP"}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
}
