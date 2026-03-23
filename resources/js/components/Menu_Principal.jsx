import React, { useMemo, useState } from "react";
import { Link, usePage } from "@inertiajs/react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import {
    AcademicCapIcon,
    BanknotesIcon,
    BuildingStorefrontIcon,
    ShoppingCartIcon,
    CreditCardIcon,
    ShoppingBagIcon,
    WrenchScrewdriverIcon,
    UsersIcon,
} from "@heroicons/react/24/outline";

function cx(...parts) {
    return parts.filter(Boolean).join(" ");
}

function NavLinkItem({ href, children, onClick, active = false }) {
    return (
        <Link
            href={href}
            onClick={onClick}
            className={cx(
                "inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium transition-all duration-200",
                active ? "bg-slate-100 text-brand-deep" : "text-brand-deep/90 hover:bg-slate-100 hover:text-brand-accent"
            )}
        >
            {children}
        </Link>
    );
}

function Dropdown({ label, badge = 0, children }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-brand-deep/90 hover:bg-slate-100 hover:text-brand-accent"
            >
                {label}
                {badge > 0 ? (
                    <span className="inline-flex min-w-[1.3rem] items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {badge}
                    </span>
                ) : null}
                <ChevronDownIcon className={cx("h-4 w-4 transition-transform", open ? "rotate-180" : "")} />
            </button>
            <div
                className={cx(
                    "absolute right-0 top-full z-50 w-80 pt-2 transition-all",
                    open ? "opacity-100 scale-100" : "pointer-events-none opacity-0 scale-95"
                )}
            >
                <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                    {children}
                </div>
            </div>
        </div>
    );
}

const Menu_Principal = () => {
    const { auth, adminStats } = usePage().props;
    const user = auth?.user;
    const isAdmin = !!user && String(user?.role) === "admin";
    const isVip = user?.is_vip === true || String(user?.is_vip) === "1";
    const hasActiveLocker =
        user?.has_locker === true ||
        String(user?.has_locker) === "1" ||
        user?.has_active_locker === true ||
        String(user?.has_active_locker) === "1";
    const pendingBonosCount = Number(adminStats?.pendingBonosCount || 0);
    const pendingPaymentsGlobalCount = Number(adminStats?.pendingPaymentsGlobalCount || 0);
    const pendingRentalsCount = Number(adminStats?.pendingRentalsCount || 0);

    const [mobileOpen, setMobileOpen] = useState(false);

    const links = useMemo(() => {
        const publicLinks = !isAdmin ? [
            { label: "Home", href: route("Pag_principal") },
            { label: "Nosotros", href: route("nosotros") },
            { label: "Alquilar Tabla", href: route("rentals.surfboards.index") },
            { label: user ? "Reservar Clases" : "Clases", href: user ? route("academy.lessons.index") : route("servicios.surf") },
            { label: "Contacto", href: route("contacto") },
            ...(!user ? [{ label: "Tienda", href: route("tienda") }] : []),
        ] : [];

        const studentLinks = user && !isAdmin ? [
            { label: "Tienda", href: route("tienda") },
            { label: "Mis Reservas", href: route("my-reservations.index") },
            { label: "Perfil", href: route("profile.edit") },
        ] : [];

        const vipLinks = user && !isAdmin && isVip ? [
            { label: "⭐ Mis Bonos / Comprar", href: route("bonos.index") },
        ] : [];

        const adminDirect = isAdmin ? [
            { label: "Gestor de Pedidos", href: route("gestor.pedidos"), icon: ShoppingBagIcon },
            { label: "Usuarios VIP", href: route("admin.users.index"), icon: UsersIcon },
            { label: "Pagos", href: route("admin.payments.global"), icon: CreditCardIcon, badge: pendingPaymentsGlobalCount },
        ] : [];

        const classesModule = isAdmin ? [
            { label: "Gestor de Clases", href: route("admin.academy.index"), icon: AcademicCapIcon },
            { label: "Packs de Bonos", href: route("admin.bonos.index"), icon: CreditCardIcon },
        ] : [];

        const rentalsModule = isAdmin ? [
            { label: "Inventario de Tablas", href: route("admin.surfboards.index"), icon: BuildingStorefrontIcon },
        ] : [];

        const adminClientView = isAdmin ? [
            { label: "Clases", href: route("academy.lessons.index"), icon: AcademicCapIcon },
            { label: "Alquiler de Tablas", href: route("rentals.surfboards.index"), icon: BuildingStorefrontIcon },
            { label: "Tienda", href: route("tienda"), icon: ShoppingBagIcon },
        ] : [];

        const lockersModule = isAdmin ? [
            { label: "Asignador", href: route("asignar.taquilla.mostrar"), icon: WrenchScrewdriverIcon },
            { label: "Estado de Pagos", href: route("taquilla.index.admin"), icon: BanknotesIcon },
        ] : [];

        return { publicLinks, studentLinks, vipLinks, adminDirect, classesModule, rentalsModule, lockersModule, adminClientView };
    }, [user, isAdmin, isVip, pendingPaymentsGlobalCount]);

    return (
        <nav className="border-b border-slate-200/60 bg-white/95">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
                <Link href={route("Pag_principal")} className="inline-flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-accent text-sm font-extrabold text-white">S4</span>
                    <span className="font-heading text-lg font-semibold text-brand-deep">San Sebastian Surf School</span>
                </Link>

                <div className="hidden lg:flex items-center gap-1">
                    {links.publicLinks.map((l) => (
                        <NavLinkItem key={l.label} href={l.href}>{l.label}</NavLinkItem>
                    ))}
                    {links.studentLinks.map((l) => (
                        <NavLinkItem key={l.label} href={l.href}>{l.label}</NavLinkItem>
                    ))}
                    {links.vipLinks.map((l) => (
                        <NavLinkItem key={l.label} href={l.href}>{l.label}</NavLinkItem>
                    ))}
                    {user && !isAdmin && hasActiveLocker ? (
                        <NavLinkItem href={route("carrito")}>
                            <ShoppingCartIcon className="h-4 w-4" />
                            <span>Carrito</span>
                        </NavLinkItem>
                    ) : null}

                    {isAdmin ? (
                        <>
                            {links.adminDirect.map((l) => {
                                const Icon = l.icon;
                                return (
                                    <NavLinkItem key={l.label} href={l.href}>
                                        <Icon className="h-4 w-4" />
                                        <span>{l.label}</span>
                                        {l.badge > 0 ? (
                                            <span className="inline-flex min-w-[1.3rem] items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                                {l.badge}
                                            </span>
                                        ) : null}
                                    </NavLinkItem>
                                );
                            })}

                            <Dropdown label="Módulo Clases" badge={0}>
                                {links.classesModule.map((l) => {
                                    const Icon = l.icon;
                                    return (
                                        <Link key={l.label} href={l.href} className="flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-brand-deep/80 hover:bg-slate-50 hover:text-brand-accent">
                                            <Icon className="h-4 w-4" />
                                            <span>{l.label}</span>
                                        </Link>
                                    );
                                })}
                            </Dropdown>
                            <Dropdown label="Módulo Alquileres" badge={pendingRentalsCount}>
                                {links.rentalsModule.map((l) => {
                                    const Icon = l.icon;
                                    return (
                                        <Link key={l.label} href={l.href} className="flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-brand-deep/80 hover:bg-slate-50 hover:text-brand-accent">
                                            <Icon className="h-4 w-4" />
                                            <span>{l.label}</span>
                                        </Link>
                                    );
                                })}
                            </Dropdown>
                            <Dropdown label="Gestor Taquillas" badge={0}>
                                {links.lockersModule.map((l) => {
                                    const Icon = l.icon;
                                    return (
                                        <Link key={l.label} href={l.href} className="flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-brand-deep/80 hover:bg-slate-50 hover:text-brand-accent">
                                            <Icon className="h-4 w-4" />
                                            <span>{l.label}</span>
                                        </Link>
                                    );
                                })}
                            </Dropdown>
                            <Dropdown label="Vista Cliente" badge={0}>
                                {links.adminClientView.map((l) => {
                                    const Icon = l.icon;
                                    return (
                                        <Link key={l.label} href={l.href} className="flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-brand-deep/80 hover:bg-slate-50 hover:text-brand-accent">
                                            <Icon className="h-4 w-4" />
                                            <span>{l.label}</span>
                                        </Link>
                                    );
                                })}
                            </Dropdown>
                        </>
                    ) : null}
                </div>

                <button type="button" onClick={() => setMobileOpen((v) => !v)} className="lg:hidden rounded-xl p-2 hover:bg-slate-100" aria-label="Abrir menú">
                    <svg className="h-6 w-6 text-brand-deep" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
            </div>

            {mobileOpen ? (
                <div className="border-t border-slate-200/60 bg-brand-deep px-4 py-3 lg:hidden">
                    <div className="space-y-1">
                        {links.publicLinks.map((l) => (
                            <Link key={l.label} href={l.href} onClick={() => setMobileOpen(false)} className="block rounded-xl px-3 py-2 text-sm font-medium text-white hover:bg-white/10 hover:text-brand-accent">
                                {l.label}
                            </Link>
                        ))}
                        {links.studentLinks.map((l) => (
                            <Link key={l.label} href={l.href} onClick={() => setMobileOpen(false)} className="block rounded-xl px-3 py-2 text-sm font-medium text-white hover:bg-white/10 hover:text-brand-accent">
                                {l.label}
                            </Link>
                        ))}
                        {links.vipLinks.map((l) => (
                            <Link key={l.label} href={l.href} onClick={() => setMobileOpen(false)} className="block rounded-xl px-3 py-2 text-sm font-medium text-white hover:bg-white/10 hover:text-brand-accent">
                                {l.label}
                            </Link>
                        ))}
                        {user && !isAdmin && hasActiveLocker ? (
                            <Link href={route("carrito")} onClick={() => setMobileOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-white hover:bg-white/10 hover:text-brand-accent">
                                <ShoppingCartIcon className="h-4 w-4" />
                                <span>Carrito</span>
                            </Link>
                        ) : null}

                        {isAdmin ? (
                            <>
                                <p className="px-3 pt-2 text-xs font-semibold uppercase tracking-wider text-white/70">Admin Directo</p>
                                {links.adminDirect.map((l) => {
                                    const Icon = l.icon;
                                    return (
                                        <Link key={l.label} href={l.href} onClick={() => setMobileOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-white hover:bg-white/10 hover:text-brand-accent">
                                            <Icon className="h-4 w-4" />
                                            <span>{l.label}</span>
                                            {l.badge > 0 ? (
                                                <span className="ml-auto inline-flex min-w-[1.3rem] items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                                    {l.badge}
                                                </span>
                                            ) : null}
                                        </Link>
                                    );
                                })}

                                <p className="px-3 pt-2 text-xs font-semibold uppercase tracking-wider text-white/70">Módulo Clases</p>
                                {links.classesModule.map((l) => {
                                    const Icon = l.icon;
                                    return (
                                        <Link key={l.label} href={l.href} onClick={() => setMobileOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-white hover:bg-white/10 hover:text-brand-accent">
                                            <Icon className="h-4 w-4" />
                                            <span>{l.label}</span>
                                        </Link>
                                    );
                                })}
                                <p className="px-3 pt-2 text-xs font-semibold uppercase tracking-wider text-white/70">Módulo Alquileres</p>
                                {links.rentalsModule.map((l) => {
                                    const Icon = l.icon;
                                    return (
                                        <Link key={l.label} href={l.href} onClick={() => setMobileOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-white hover:bg-white/10 hover:text-brand-accent">
                                            <Icon className="h-4 w-4" />
                                            <span>{l.label}</span>
                                        </Link>
                                    );
                                })}
                                <p className="px-3 pt-2 text-xs font-semibold uppercase tracking-wider text-white/70">Gestor Taquillas</p>
                                {links.lockersModule.map((l) => {
                                    const Icon = l.icon;
                                    return (
                                        <Link key={l.label} href={l.href} onClick={() => setMobileOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-white hover:bg-white/10 hover:text-brand-accent">
                                            <Icon className="h-4 w-4" />
                                            <span>{l.label}</span>
                                        </Link>
                                    );
                                })}
                                <p className="px-3 pt-2 text-xs font-semibold uppercase tracking-wider text-white/70">Vista Cliente</p>
                                {links.adminClientView.map((l) => {
                                    const Icon = l.icon;
                                    return (
                                        <Link key={l.label} href={l.href} onClick={() => setMobileOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-white hover:bg-white/10 hover:text-brand-accent">
                                            <Icon className="h-4 w-4" />
                                            <span>{l.label}</span>
                                        </Link>
                                    );
                                })}
                            </>
                        ) : null}
                    </div>
                </div>
            ) : null}
        </nav>
    );
};

export default Menu_Principal;

