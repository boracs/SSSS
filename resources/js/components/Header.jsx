import React, { useMemo, useState } from "react";
import { Link, usePage } from "@inertiajs/react";
import {
    AcademicCapIcon,
    BanknotesIcon,
    BuildingStorefrontIcon,
    ShoppingCartIcon,
    CreditCardIcon,
    ShoppingBagIcon,
    WrenchScrewdriverIcon,
    UsersIcon,
    ChevronDownIcon,
} from "@heroicons/react/24/outline";

function cx(...parts) {
    return parts.filter(Boolean).join(" ");
}

function NavItem({ href, active, children, onClick }) {
    return (
        <Link
            href={href}
            onClick={onClick}
            className={cx(
                "inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium transition-all duration-200",
                active ? "bg-slate-100 text-brand-deep" : "text-brand-deep/80 hover:bg-slate-100 hover:text-brand-accent"
            )}
        >
            {children}
        </Link>
    );
}

function AdminDropdown({ label, active, badge, children }) {
    const [open, setOpen] = useState(false);

    return (
        <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className={cx(
                    "inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium transition-all duration-200",
                    active ? "bg-slate-100 text-brand-deep" : "text-brand-deep/80 hover:bg-slate-100 hover:text-brand-accent"
                )}
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

function AccountDropdown({ user, onLogout }) {
    const [open, setOpen] = useState(false);
    const displayName = user?.nombre || user?.name || user?.email || "Cuenta";

    return (
        <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 px-3 text-sm font-semibold text-brand-deep hover:bg-slate-100"
            >
                {displayName}
                <ChevronDownIcon className={cx("h-4 w-4 transition-transform", open ? "rotate-180" : "")} />
            </button>
            <div
                className={cx(
                    "absolute right-0 top-full z-50 w-56 pt-2 transition-all",
                    open ? "opacity-100 scale-100" : "pointer-events-none opacity-0 scale-95"
                )}
            >
                <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                    <Link href={route("profile.edit")} className="flex h-10 items-center rounded-xl px-3 text-sm font-medium text-brand-deep/80 hover:bg-slate-50 hover:text-brand-accent">
                        Perfil
                    </Link>
                    <button
                        type="button"
                        onClick={onLogout}
                        className="flex h-10 w-full items-center rounded-xl px-3 text-left text-sm font-medium text-rose-700 hover:bg-rose-50"
                    >
                        Cerrar sesión
                    </button>
                </div>
            </div>
        </div>
    );
}

function GuestAccountDropdown() {
    const [open, setOpen] = useState(false);

    return (
        <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-accent px-3 text-sm font-semibold text-white hover:bg-brand-accent/90"
            >
                Iniciar sesión
                <ChevronDownIcon className={cx("h-4 w-4 transition-transform", open ? "rotate-180" : "")} />
            </button>
            <div
                className={cx(
                    "absolute right-0 top-full z-50 w-56 pt-2 transition-all",
                    open ? "opacity-100 scale-100" : "pointer-events-none opacity-0 scale-95"
                )}
            >
                <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                    <Link href={route("register")} className="flex h-10 items-center rounded-xl px-3 text-sm font-medium text-brand-deep/80 hover:bg-slate-50 hover:text-brand-accent">
                        Registrarse
                    </Link>
                    <Link href={route("login")} className="flex h-10 items-center rounded-xl px-3 text-sm font-medium text-brand-deep/80 hover:bg-slate-50 hover:text-brand-accent">
                        Iniciar sesión
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function Header() {
    const { url, props } = usePage();
    const user = props?.auth?.user;
    const isAdmin = !!user && String(user?.role) === "admin";
    const isVip = user?.is_vip === true || String(user?.is_vip) === "1";
    const hasActiveLocker =
        user?.has_locker === true ||
        String(user?.has_locker) === "1" ||
        user?.has_active_locker === true ||
        String(user?.has_active_locker) === "1";

    const pendingBonosCount = Number(props?.adminStats?.pendingBonosCount || 0);
    const pendingClassesCount = Number(props?.adminStats?.pendingClassesCount || 0);
    const pendingRentalsCount = Number(props?.adminStats?.pendingRentalsCount || 0);
    const pendingPaymentsGlobalCount = Number(props?.adminStats?.pendingPaymentsGlobalCount || 0);

    const [mobileOpen, setMobileOpen] = useState(false);

    const active = (matcher) => (typeof matcher === "function" ? matcher(url || "") : false);

    const links = useMemo(() => {
        const publicLinks = !isAdmin ? [
            { label: "Home", href: route("Pag_principal"), match: (u) => u === "/" },
            { label: "Nosotros", href: route("nosotros"), match: (u) => u.startsWith("/nosotros") },
            { label: user ? "Reservar Clases" : "Clases", href: user ? route("academy.lessons.index") : route("servicios.surf"), match: (u) => u.startsWith("/academia") || u.startsWith("/servicios/surf") },
            { label: "Alquilar Tabla", href: route("rentals.surfboards.index"), match: (u) => u.startsWith("/tablas-alquiler") },
            { label: "Contacto", href: route("contacto"), match: (u) => u.startsWith("/contacto") },
            ...(!user ? [{ label: "Tienda", href: route("tienda"), match: (u) => u.startsWith("/tienda") }] : []),
        ] : [];

        const studentLinks = user && !isAdmin ? [
            { label: "Tienda", href: route("tienda"), match: (u) => u.startsWith("/tienda") },
            { label: "Mis Reservas", href: route("my-reservations.index"), match: (u) => u.startsWith("/mis-reservas") },
        ] : [];

        const vipLinks = user && !isAdmin && isVip ? [
            { label: "⭐ Mis Bonos / Comprar", href: route("bonos.index"), match: (u) => u.startsWith("/bonos") },
        ] : [];

        const adminDirect = isAdmin ? [
            { label: "Gestor de Pedidos", href: route("gestor.pedidos"), match: (u) => u.startsWith("/gestor-pedidos"), icon: ShoppingBagIcon },
            { label: "Usuarios VIP", href: route("admin.users.index"), match: (u) => u.startsWith("/admin/users"), icon: UsersIcon },
            { label: "Pagos", href: route("admin.payments.global"), match: (u) => u.startsWith("/admin/payments/global-dashboard"), icon: CreditCardIcon, badge: pendingPaymentsGlobalCount },
        ] : [];

        const classesModule = isAdmin ? [
            { label: "Gestor de Clases", href: route("admin.academy.index"), icon: AcademicCapIcon },
            { label: "Packs de Bonos", href: route("admin.bonos.index"), icon: CreditCardIcon },
        ] : [];

        const rentalsModule = isAdmin ? [
            { label: "Inventario de Tablas", href: route("admin.surfboards.index"), icon: BuildingStorefrontIcon },
            // Estructura preparada para agregar "Neoprenos" en el futuro.
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

    const handleLogout = async () => {
        try {
            await window?.axios?.post?.(route("logout"));
        } catch {}
        window.location.href = "/";
    };

    return (
        <header className="sticky top-0 z-[100] border-b border-slate-200/60 bg-white/90 backdrop-blur">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
                <Link href={route("Pag_principal")} className="inline-flex items-center gap-2">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-accent text-sm font-extrabold text-white">S4</span>
                    <span className="hidden sm:inline font-heading text-base font-bold text-brand-deep">San Sebastian Surf School</span>
                </Link>

                <nav className="hidden lg:flex items-center gap-1">
                    {links.publicLinks.map((l) => (
                        <NavItem key={l.label} href={l.href} active={active(l.match)}>{l.label}</NavItem>
                    ))}
                    {links.studentLinks.map((l) => (
                        <NavItem key={l.label} href={l.href} active={active(l.match)}>{l.label}</NavItem>
                    ))}
                    {links.vipLinks.map((l) => (
                        <NavItem key={l.label} href={l.href} active={active(l.match)}>{l.label}</NavItem>
                    ))}

                    {isAdmin && links.adminDirect.map((l) => {
                        const Icon = l.icon;
                        return (
                            <NavItem key={l.label} href={l.href} active={active(l.match)}>
                                <Icon className="h-4 w-4" />
                                <span>{l.label}</span>
                                {l.badge > 0 ? (
                                    <span className="inline-flex min-w-[1.3rem] items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                        {l.badge}
                                    </span>
                                ) : null}
                            </NavItem>
                        );
                    })}

                    {isAdmin ? (
                        <AdminDropdown label="Módulo Clases" active={(url || "").startsWith("/admin/academy") || (url || "").startsWith("/admin/bonos")} badge={0}>
                            {links.classesModule.map((l) => {
                                const Icon = l.icon;
                                return (
                                    <Link key={l.label} href={l.href} className="flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-brand-deep/80 hover:bg-slate-50 hover:text-brand-accent">
                                        <Icon className="h-4 w-4" />
                                        <span>{l.label}</span>
                                    </Link>
                                );
                            })}
                        </AdminDropdown>
                    ) : null}
                    {isAdmin ? (
                        <AdminDropdown label="Módulo Alquileres" active={(url || "").startsWith("/admin/surfboards")} badge={pendingRentalsCount}>
                            {links.rentalsModule.map((l) => {
                                const Icon = l.icon;
                                return (
                                    <Link key={l.label} href={l.href} className="flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-brand-deep/80 hover:bg-slate-50 hover:text-brand-accent">
                                        <Icon className="h-4 w-4" />
                                        <span>{l.label}</span>
                                    </Link>
                                );
                            })}
                        </AdminDropdown>
                    ) : null}
                    {isAdmin ? (
                        <AdminDropdown label="Gestor Taquillas" active={(url || "").startsWith("/taquilla") || (url || "").startsWith("/asignar-taquilla-mostrar")} badge={0}>
                            {links.lockersModule.map((l) => {
                                const Icon = l.icon;
                                return (
                                    <Link key={l.label} href={l.href} className="flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-brand-deep/80 hover:bg-slate-50 hover:text-brand-accent">
                                        <Icon className="h-4 w-4" />
                                        <span>{l.label}</span>
                                    </Link>
                                );
                            })}
                        </AdminDropdown>
                    ) : null}
                    {isAdmin ? (
                        <AdminDropdown
                            label="Vista Cliente"
                            active={(url || "").startsWith("/academia") || (url || "").startsWith("/tablas-alquiler") || (url || "").startsWith("/tienda")}
                            badge={0}
                        >
                            {links.adminClientView.map((l) => {
                                const Icon = l.icon;
                                return (
                                    <Link key={l.label} href={l.href} className="flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-brand-deep/80 hover:bg-slate-50 hover:text-brand-accent">
                                        <Icon className="h-4 w-4" />
                                        <span>{l.label}</span>
                                    </Link>
                                );
                            })}
                        </AdminDropdown>
                    ) : null}
                </nav>

                <div className="flex items-center gap-2">
                    {user && !isAdmin && hasActiveLocker ? (
                        <Link
                            href={route("carrito")}
                            className={cx(
                                "hidden lg:inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 px-3 text-sm font-semibold text-brand-deep hover:bg-slate-100",
                                active((u) => u.startsWith("/carrito")) ? "bg-slate-100" : ""
                            )}
                        >
                            <ShoppingCartIcon className="h-4 w-4" />
                            <span>Carrito</span>
                        </Link>
                    ) : null}
                    {user ? (
                        <div className="hidden lg:block">
                            <AccountDropdown user={user} onLogout={handleLogout} />
                        </div>
                    ) : (
                        <div className="hidden lg:block">
                            <GuestAccountDropdown />
                        </div>
                    )}
                    <button
                        type="button"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl hover:bg-slate-100 lg:hidden"
                        onClick={() => setMobileOpen(true)}
                        aria-label="Abrir menú"
                    >
                        <svg className="h-6 w-6 text-brand-deep" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                </div>
            </div>

            {mobileOpen ? (
                <div className="fixed inset-0 z-[120] bg-slate-900/40" onClick={() => setMobileOpen(false)}>
                    <aside className="ml-auto h-full w-[85vw] max-w-sm bg-white p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="mb-4 flex items-center justify-between">
                            <p className="font-semibold text-brand-deep">Menú</p>
                            <button type="button" className="rounded-lg px-3 py-1 hover:bg-slate-100" onClick={() => setMobileOpen(false)}>Cerrar</button>
                        </div>

                        <nav className="flex flex-col gap-1">
                            {links.publicLinks.map((l) => (
                                <NavItem key={l.label} href={l.href} active={active(l.match)} onClick={() => setMobileOpen(false)}>{l.label}</NavItem>
                            ))}
                            {links.studentLinks.map((l) => (
                                <NavItem key={l.label} href={l.href} active={active(l.match)} onClick={() => setMobileOpen(false)}>{l.label}</NavItem>
                            ))}
                            {links.vipLinks.map((l) => (
                                <NavItem key={l.label} href={l.href} active={active(l.match)} onClick={() => setMobileOpen(false)}>{l.label}</NavItem>
                            ))}
                            {user && !isAdmin && hasActiveLocker ? (
                                <NavItem href={route("carrito")} active={active((u) => u.startsWith("/carrito"))} onClick={() => setMobileOpen(false)}>
                                    <ShoppingCartIcon className="h-4 w-4" />
                                    <span>Carrito</span>
                                </NavItem>
                            ) : null}
                            {user ? (
                                <>
                                    <NavItem href={route("profile.edit")} active={active((u) => u.startsWith("/profile"))} onClick={() => setMobileOpen(false)}>
                                        <span>Perfil</span>
                                    </NavItem>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMobileOpen(false);
                                            handleLogout();
                                        }}
                                        className="inline-flex h-10 items-center justify-center rounded-xl bg-brand-accent px-3 text-sm font-semibold text-white hover:bg-brand-accent/90"
                                    >
                                        Cerrar sesión
                                    </button>
                                </>
                            ) : (
                                <>
                                    <NavItem href={route("login")} active={active((u) => u.startsWith("/login"))} onClick={() => setMobileOpen(false)}>
                                        <span>Iniciar sesión</span>
                                    </NavItem>
                                    <NavItem href={route("register")} active={active((u) => u.startsWith("/register"))} onClick={() => setMobileOpen(false)}>
                                        <span>Registrarse</span>
                                    </NavItem>
                                </>
                            )}

                            {isAdmin ? (
                                <>
                                    <p className="mt-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Admin Directo</p>
                                    {links.adminDirect.map((l) => {
                                        const Icon = l.icon;
                                        return (
                                            <NavItem key={l.label} href={l.href} active={active(l.match)} onClick={() => setMobileOpen(false)}>
                                                <Icon className="h-4 w-4" />
                                                <span>{l.label}</span>
                                                {l.badge > 0 ? (
                                                    <span className="inline-flex min-w-[1.3rem] items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                                        {l.badge}
                                                    </span>
                                                ) : null}
                                            </NavItem>
                                        );
                                    })}

                                    <p className="mt-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Módulo Clases</p>
                                    {links.classesModule.map((l) => {
                                        const Icon = l.icon;
                                        return (
                                            <NavItem key={l.label} href={l.href} active={false} onClick={() => setMobileOpen(false)}>
                                                <Icon className="h-4 w-4" />
                                                <span>{l.label}</span>
                                            </NavItem>
                                        );
                                    })}
                                    <p className="mt-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Módulo Alquileres</p>
                                    {links.rentalsModule.map((l) => {
                                        const Icon = l.icon;
                                        return (
                                            <NavItem key={l.label} href={l.href} active={false} onClick={() => setMobileOpen(false)}>
                                                <Icon className="h-4 w-4" />
                                                <span>{l.label}</span>
                                            </NavItem>
                                        );
                                    })}
                                    <p className="mt-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Gestor Taquillas</p>
                                    {links.lockersModule.map((l) => {
                                        const Icon = l.icon;
                                        return (
                                            <NavItem key={l.label} href={l.href} active={false} onClick={() => setMobileOpen(false)}>
                                                <Icon className="h-4 w-4" />
                                                <span>{l.label}</span>
                                            </NavItem>
                                        );
                                    })}
                                    <p className="mt-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Vista Cliente</p>
                                    {links.adminClientView.map((l) => {
                                        const Icon = l.icon;
                                        return (
                                            <NavItem key={l.label} href={l.href} active={false} onClick={() => setMobileOpen(false)}>
                                                <Icon className="h-4 w-4" />
                                                <span>{l.label}</span>
                                            </NavItem>
                                        );
                                    })}
                                </>
                            ) : null}
                        </nav>
                    </aside>
                </div>
            ) : null}
        </header>
    );
}

