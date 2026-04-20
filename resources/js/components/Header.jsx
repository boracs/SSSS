import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, router, usePage } from "@inertiajs/react";
import {
    AcademicCapIcon,
    BanknotesIcon,
    BuildingStorefrontIcon,
    ChevronDownIcon,
    CreditCardIcon,
    MapIcon,
    ShoppingBagIcon,
    ShoppingCartIcon,
    UsersIcon,
    WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";

function cx(...parts) {
    return parts.filter(Boolean).join(" ");
}

function NavItem({ href, active, children }) {
    return (
        <Link
            href={href}
            className={cx(
                "inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-white transition-all duration-200",
                active
                    ? "bg-white/20 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.24)]"
                    : "hover:bg-cyan-300/20 hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)]"
            )}
        >
            {children}
        </Link>
    );
}

function MenuDropdown({ label, badge = 0, children }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-white transition-all duration-200 hover:bg-cyan-300/20 hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)]"
            >
                {label}
                {badge > 0 ? (
                    <span className="inline-flex min-w-[1.3rem] items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {badge}
                    </span>
                ) : null}
                <ChevronDownIcon className={cx("h-4 w-4 transition-transform", open ? "rotate-180" : "")} />
            </button>
            <div className={cx("absolute right-0 top-full z-[600] w-80 pt-2 transition-all", open ? "opacity-100 scale-100" : "pointer-events-none opacity-0 scale-95")}>
                <div className="rounded-2xl border border-gray-700 bg-gray-800 p-2 shadow-xl">
                    {children}
                </div>
            </div>
        </div>
    );
}

function AccountDropdown({ user }) {
    const [open, setOpen] = useState(false);
    const displayName = user?.nombre || user?.name || user?.email || "Cuenta";
    return (
        <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-amber-400 px-4 text-sm font-semibold text-white shadow-lg transition-all hover:brightness-110"
            >
                {displayName}
                <ChevronDownIcon className={cx("h-4 w-4 transition-transform", open ? "rotate-180" : "")} />
            </button>
            <div className={cx("absolute right-0 top-full z-[600] w-56 pt-2 transition-all", open ? "opacity-100 scale-100" : "pointer-events-none opacity-0 scale-95")}>
                <div className="rounded-2xl border border-gray-700 bg-gray-800 p-2 shadow-xl">
                    <Link href={route("profile.edit")} className="flex h-10 items-center rounded-xl px-3 text-sm font-medium text-gray-200 hover:bg-gray-700">
                        Perfil
                    </Link>
                    <button
                        type="button"
                        onClick={() => router.post(route("logout"))}
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
            <div className={cx("absolute right-0 top-full z-[600] w-56 pt-2 transition-all", open ? "opacity-100 scale-100" : "pointer-events-none opacity-0 scale-95")}>
                <div className="rounded-2xl border border-gray-700 bg-gray-800 p-2 shadow-xl">
                    <Link href={route("register")} className="flex h-10 items-center rounded-xl px-3 text-sm font-medium text-gray-200 hover:bg-gray-700">
                        Registrarse
                    </Link>
                    <Link href={route("login")} className="flex h-10 items-center rounded-xl px-3 text-sm font-medium text-gray-200 hover:bg-gray-700">
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

    const pendingPaymentsGlobalCount = Number(props?.adminStats?.pendingPaymentsGlobalCount || 0);
    const pendingRentalsCount = Number(props?.adminStats?.pendingRentalsCount || 0);
    const submittedLockerPaymentsCount = Number(props?.adminStats?.submittedLockerPaymentsCount || 0);
    const vipRenewalAlertCount = Number(props?.adminStats?.vipRenewalAlertCount || 0);
    const cartCount = Number(props?.cart?.count || props?.cartCount || 0);

    const [mobileOpen, setMobileOpen] = useState(false);
    const [menuVisible, setMenuVisible] = useState(true);
    const lastScrollYRef = useRef(0);

    const active = (matcher) => (typeof matcher === "function" ? matcher(url || "") : false);

    const links = useMemo(() => {
        const publicLinks = !isAdmin
            ? [
                  { label: "Home", href: route("Pag_principal"), match: (u) => u === "/" },
                  { label: "Nosotros", href: route("nosotros"), match: (u) => u.startsWith("/nosotros") },
                  { label: user ? "Reservar Clases" : "Clases", href: user ? route("academy.lessons.index") : route("servicios.surf"), match: (u) => u.startsWith("/academia") || u.startsWith("/servicios/surf") },
                  { label: "Alquilar Tabla", href: route("rentals.surfboards.index"), match: (u) => u.startsWith("/tablas-alquiler") },
                  { label: "Contacto", href: route("contacto"), match: (u) => u.startsWith("/contacto") },
                  ...(!user ? [{ label: "Tienda", href: route("tienda"), match: (u) => u.startsWith("/tienda") }] : []),
              ]
            : [];

        const studentLinks = user && !isAdmin
            ? [
                  { label: "Tienda", href: route("tienda"), match: (u) => u.startsWith("/tienda") },
                  { label: "Mis Reservas", href: route("my-reservations.index"), match: (u) => u.startsWith("/mis-reservas") },
              ]
            : [];

        const vipLinks = user && !isAdmin && isVip ? [{ label: "⭐ Mis Bonos / Comprar", href: route("bonos.index"), match: (u) => u.startsWith("/bonos") }] : [];

        const adminDirect = isAdmin
            ? [
                  { label: "Usuarios VIP", href: route("admin.users.index"), match: (u) => u.startsWith("/admin/users"), icon: UsersIcon },
                  { label: "Pagos", href: route("admin.payments.global"), match: (u) => u.startsWith("/admin/payments/global-dashboard"), icon: CreditCardIcon, badge: pendingPaymentsGlobalCount },
              ]
            : [];

        const adminShopModule = isAdmin
            ? [
                  { label: "Gestor de Productos", href: route("mostrar.productos"), icon: ShoppingBagIcon },
                  { label: "Gestor de Pedidos", href: route("gestor.pedidos"), icon: ShoppingBagIcon },
              ]
            : [];

        const classesModule = isAdmin
            ? [
                  { label: "Gestor de Clases", href: route("admin.academy.index"), icon: AcademicCapIcon },
                  { label: "💎 Gestor de Créditos VIP", href: route("admin.vip-manager.index"), icon: AcademicCapIcon },
                  { label: "Packs de Bonos", href: route("admin.bonos.index"), icon: CreditCardIcon },
              ]
            : [];

        const rentalsModule = isAdmin
            ? [{ label: "Inventario de Tablas", href: route("admin.surfboards.index"), icon: BuildingStorefrontIcon }]
            : [];

        const adminClientView = isAdmin
            ? [
                  { label: "Clases", href: route("academy.lessons.index"), icon: AcademicCapIcon },
                  { label: "Alquiler de Tablas", href: route("rentals.surfboards.index"), icon: BuildingStorefrontIcon },
                  { label: "Tienda", href: route("tienda"), icon: ShoppingBagIcon },
              ]
            : [];

        const lockersModule = isAdmin
            ? [
                  { label: "Verificar Pagos", href: route("taquilla.pagos.queue"), icon: BanknotesIcon, badge: submittedLockerPaymentsCount },
                  { label: "Mapa de Taquillas", href: route("asignar.taquilla.mostrar"), icon: MapIcon },
                  { label: "Configuración de Planes", href: route("taquilla.index.admin"), icon: WrenchScrewdriverIcon },
              ]
            : [];

        return { publicLinks, studentLinks, vipLinks, adminDirect, adminShopModule, classesModule, rentalsModule, lockersModule, adminClientView };
    }, [user, isAdmin, isVip, pendingPaymentsGlobalCount, submittedLockerPaymentsCount, vipRenewalAlertCount]);

    useEffect(() => {
        const onScroll = () => {
            const currentY = window.scrollY || 0;
            const lastY = lastScrollYRef.current;
            if (currentY <= 80) {
                setMenuVisible(true);
                lastScrollYRef.current = currentY;
                return;
            }
            if (currentY < lastY) setMenuVisible(true);
            else if (currentY > lastY && currentY > 140) setMenuVisible(false);
            lastScrollYRef.current = currentY;
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <header className="relative z-[500] mb-[50px]">
            <div className="border-b border-emerald-500/20 px-4 py-6 sm:px-6" style={{ background: "linear-gradient(95deg, #071a2f 0%, #0b2a43 45%, #114d4b 100%)" }}>
                <div className="mx-auto max-w-7xl">
                    <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-lime-400">S4 - SAN SEBASTIAN SURF SCHOOL</p>
                    <h1 className="mt-2 text-3xl font-extrabold leading-tight text-white sm:text-5xl">
                        Domina el Cantabrico con <span className="text-emerald-400">S4</span>
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm text-slate-200 sm:text-base">Escuela de surf premium en San Sebastian. Seguridad, tecnica y experiencia local en La Concha y Zurriola.</p>
                </div>
            </div>

            <div className={cx("sticky top-0 z-[500] border-b border-cyan-950 bg-[#0f5f74] transition-transform duration-300", menuVisible ? "translate-y-0" : "-translate-y-full")}>
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
                    <Link href={route("Pag_principal")} className="inline-flex items-center gap-2">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-sm font-extrabold text-white">S4</span>
                        <span className="hidden sm:inline text-xl font-bold leading-5 text-white">San Sebastian<br />Surf School</span>
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
                                        <span className="inline-flex min-w-[1.3rem] items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white">{l.badge}</span>
                                    ) : null}
                                </NavItem>
                            );
                        })}

                        {isAdmin ? (
                            <MenuDropdown label="Tienda" badge={0}>
                                {links.adminShopModule.map((l) => {
                                    const Icon = l.icon;
                                    return (
                                        <Link key={l.label} href={l.href} className="flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-gray-200 hover:bg-gray-700">
                                            <Icon className="h-4 w-4" />
                                            <span>{l.label}</span>
                                        </Link>
                                    );
                                })}
                            </MenuDropdown>
                        ) : null}

                        {isAdmin ? (
                            <MenuDropdown label="Módulo Clases" badge={0}>
                                {links.classesModule.map((l) => {
                                    const Icon = l.icon;
                                    return (
                                        <Link key={l.label} href={l.href} className="flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-gray-200 hover:bg-gray-700">
                                            <Icon className="h-4 w-4" />
                                            <span>{l.label}</span>
                                        </Link>
                                    );
                                })}
                            </MenuDropdown>
                        ) : null}
                        {isAdmin ? (
                            <MenuDropdown label="Módulo Alquileres" badge={pendingRentalsCount}>
                                {links.rentalsModule.map((l) => {
                                    const Icon = l.icon;
                                    return (
                                        <Link key={l.label} href={l.href} className="flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-gray-200 hover:bg-gray-700">
                                            <Icon className="h-4 w-4" />
                                            <span>{l.label}</span>
                                        </Link>
                                    );
                                })}
                            </MenuDropdown>
                        ) : null}
                        {isAdmin ? (
                            <MenuDropdown label="Gestor Taquillas" badge={submittedLockerPaymentsCount}>
                                {links.lockersModule.map((l) => {
                                    const Icon = l.icon;
                                    return (
                                        <Link key={l.label} href={l.href} className="flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-gray-200 hover:bg-gray-700">
                                            <Icon className="h-4 w-4" />
                                            <span>{l.label}</span>
                                            {Number(l.badge || 0) > 0 ? (
                                                <span className="ml-auto inline-flex min-w-[1.3rem] items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white">{l.badge}</span>
                                            ) : null}
                                        </Link>
                                    );
                                })}
                            </MenuDropdown>
                        ) : null}
                        {isAdmin ? (
                            <MenuDropdown label="V.cliente" badge={0}>
                                {links.adminClientView.map((l) => {
                                    const Icon = l.icon;
                                    return (
                                        <Link key={l.label} href={l.href} className="flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-gray-200 hover:bg-gray-700">
                                            <Icon className="h-4 w-4" />
                                            <span>{l.label}</span>
                                        </Link>
                                    );
                                })}
                            </MenuDropdown>
                        ) : null}
                    </nav>

                    <div className="flex items-center gap-2">
                        {user && !isAdmin && hasActiveLocker ? (
                            <>
                                <Link
                                    href={route("pedidos")}
                                    className={cx(
                                        "relative hidden lg:inline-flex h-10 items-center gap-2 rounded-xl border border-cyan-200/30 bg-white/10 px-3 text-sm font-semibold text-white hover:bg-white/20",
                                        active((u) => u.startsWith("/pedidos")) ? "bg-white/20" : ""
                                    )}
                                >
                                    <ShoppingBagIcon className="h-4 w-4" />
                                    <span>Pedidos</span>
                                </Link>
                                <Link href={route("carrito")} className={cx("relative hidden lg:inline-flex h-10 items-center gap-2 rounded-xl border border-cyan-200/30 bg-white/10 px-3 text-sm font-semibold text-white hover:bg-white/20", active((u) => u.startsWith("/carrito")) ? "bg-white/20" : "")}>
                                <ShoppingCartIcon className="h-4 w-4" />
                                <span>Carrito</span>
                                {cartCount > 0 ? (
                                    <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">{cartCount}</span>
                                ) : null}
                            </Link>
                            </>
                        ) : null}
                        {user ? (
                            <div className="hidden lg:block">
                                <AccountDropdown user={user} />
                            </div>
                        ) : (
                            <div className="hidden lg:block">
                                <GuestAccountDropdown />
                            </div>
                        )}
                        <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-xl hover:bg-white/10 lg:hidden" onClick={() => setMobileOpen((v) => !v)} aria-label="Abrir menú">
                            <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {mobileOpen ? (
                <div className="fixed inset-0 z-[120] bg-gray-950/70" onClick={() => setMobileOpen(false)}>
                    <aside className="ml-auto h-full w-[85vw] max-w-sm border-l border-gray-700 bg-gray-800 p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="mb-4 flex items-center justify-between">
                            <p className="font-semibold text-gray-100">Menú</p>
                            <button type="button" className="rounded-lg px-3 py-1 text-gray-200 hover:bg-gray-700" onClick={() => setMobileOpen(false)}>Cerrar</button>
                        </div>
                        <nav className="flex flex-col gap-1">
                            {links.publicLinks.map((l) => (
                                <Link key={l.label} href={l.href} onClick={() => setMobileOpen(false)} className="block rounded-xl px-3 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700">
                                    {l.label}
                                </Link>
                            ))}
                            {links.studentLinks.map((l) => (
                                <Link key={l.label} href={l.href} onClick={() => setMobileOpen(false)} className="block rounded-xl px-3 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700">
                                    {l.label}
                                </Link>
                            ))}
                            {links.vipLinks.map((l) => (
                                <Link key={l.label} href={l.href} onClick={() => setMobileOpen(false)} className="block rounded-xl px-3 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700">
                                    {l.label}
                                </Link>
                            ))}
                            {isAdmin ? (
                                <>
                                    {links.adminDirect.map((l) => {
                                        const Icon = l.icon;
                                        return (
                                            <Link key={l.label} href={l.href} onClick={() => setMobileOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700">
                                                <Icon className="h-4 w-4" />
                                                <span>{l.label}</span>
                                                {Number(l.badge || 0) > 0 ? (
                                                    <span className="ml-auto inline-flex min-w-[1.3rem] items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white">{l.badge}</span>
                                                ) : null}
                                            </Link>
                                        );
                                    })}
                                    <details className="rounded-xl border border-gray-700">
                                        <summary className="cursor-pointer list-none px-3 py-2 text-sm font-semibold text-gray-200">
                                            Tienda
                                        </summary>
                                        <div className="pb-2">
                                            {links.adminShopModule.map((l) => {
                                                const Icon = l.icon;
                                                return (
                                                    <Link key={l.label} href={l.href} onClick={() => setMobileOpen(false)} className="mx-2 mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700">
                                                        <Icon className="h-4 w-4" />
                                                        <span>{l.label}</span>
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    </details>
                                    <details className="rounded-xl border border-gray-700">
                                        <summary className="cursor-pointer list-none px-3 py-2 text-sm font-semibold text-gray-200">
                                            V.cliente
                                        </summary>
                                        <div className="pb-2">
                                            {links.adminClientView.map((l) => {
                                                const Icon = l.icon;
                                                return (
                                                    <Link key={l.label} href={l.href} onClick={() => setMobileOpen(false)} className="mx-2 mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700">
                                                        <Icon className="h-4 w-4" />
                                                        <span>{l.label}</span>
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    </details>
                                </>
                            ) : null}
                            {user ? (
                                <>
                                    {user && !isAdmin && hasActiveLocker ? (
                                        <Link href={route("pedidos")} onClick={() => setMobileOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700">
                                            <ShoppingBagIcon className="h-4 w-4" />
                                            <span>Pedidos</span>
                                        </Link>
                                    ) : null}
                                    <Link href={route("profile.edit")} onClick={() => setMobileOpen(false)} className="block rounded-xl px-3 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700">
                                        Perfil
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMobileOpen(false);
                                            router.post(route("logout"));
                                        }}
                                        className="inline-flex h-10 items-center justify-center rounded-xl bg-brand-accent px-3 text-sm font-semibold text-white hover:bg-brand-accent/90"
                                    >
                                        Cerrar sesión
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Link href={route("login")} onClick={() => setMobileOpen(false)} className="block rounded-xl px-3 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700">
                                        Iniciar sesión
                                    </Link>
                                    <Link href={route("register")} onClick={() => setMobileOpen(false)} className="block rounded-xl px-3 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700">
                                        Registrarse
                                    </Link>
                                </>
                            )}
                        </nav>
                    </aside>
                </div>
            ) : null}
        </header>
    );
}
