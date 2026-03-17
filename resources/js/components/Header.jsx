import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, usePage } from "@inertiajs/react";

function cx(...parts) {
    return parts.filter(Boolean).join(" ");
}

function useScrolled(threshold = 1) {
    const [scrolled, setScrolled] = useState(false);
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > threshold);
        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
        return () => window.removeEventListener("scroll", onScroll);
    }, [threshold]);
    return scrolled;
}

function HeaderLink({ href, active, children, className = "" }) {
    return (
        <Link
            href={href}
            className={cx(
                "relative inline-flex h-10 items-center rounded-xl px-3 text-sm font-medium transition-all duration-300",
                active
                    ? "text-brand-deep font-bold border-b-2 border-brand-accent rounded-b-none"
                    : "text-brand-deep/80 hover:text-brand-accent hover:bg-slate-100",
                className
            )}
        >
            {children}
        </Link>
    );
}

function Dropdown({ label, active, children }) {
    const [open, setOpen] = useState(false);
    const closeTimer = useRef(null);

    const openNow = () => {
        if (closeTimer.current) {
            window.clearTimeout(closeTimer.current);
            closeTimer.current = null;
        }
        setOpen(true);
    };

    const closeWithDelay = () => {
        if (closeTimer.current) window.clearTimeout(closeTimer.current);
        closeTimer.current = window.setTimeout(() => {
            setOpen(false);
            closeTimer.current = null;
        }, 180);
    };

    return (
        <div
            className="relative menu-trigger"
            onMouseEnter={openNow}
            onMouseLeave={closeWithDelay}
        >
            <button
                type="button"
                className={cx(
                    "inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-medium transition-all duration-300",
                    active
                        ? "text-brand-deep font-bold border-b-2 border-brand-accent rounded-b-none"
                        : "text-brand-deep/80 hover:text-brand-accent hover:bg-slate-100"
                )}
                onClick={() => setOpen((v) => !v)}
            >
                {label}
                <svg className={cx("h-4 w-4 transition-transform duration-300", open ? "rotate-180" : "")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            <div
                className={cx(
                    "absolute left-0 top-full z-dropdown mt-2 w-64 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-xl ring-1 ring-slate-200/60 backdrop-blur-sm transition-all duration-200",
                    open ? "pointer-events-auto opacity-100 scale-100 backdrop-blur-none" : "pointer-events-none opacity-0 scale-95"
                )}
                onMouseEnter={openNow}
                onMouseLeave={closeWithDelay}
            >
                {children}
            </div>
        </div>
    );
}

function Drawer({ open, onClose, children }) {
    return (
        <>
            <div
                className={cx(
                    "fixed inset-0 z-modal bg-slate-900/30 backdrop-blur-sm transition-opacity duration-200",
                    open ? "opacity-100" : "pointer-events-none opacity-0"
                )}
                onClick={onClose}
                aria-hidden={!open}
            />
            <div
                className={cx(
                    "fixed inset-y-0 right-0 z-modal w-[85vw] max-w-sm transform bg-white shadow-2xl transition-transform duration-300",
                    open ? "translate-x-0" : "translate-x-full"
                )}
                role="dialog"
                aria-modal="true"
            >
                <div className="flex items-center justify-between border-b border-slate-200/60 px-4 py-4">
                    <span className="font-heading text-base font-bold text-brand-deep">Menú</span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl hover:bg-slate-100 transition-all duration-300"
                        aria-label="Cerrar menú"
                    >
                        <svg className="h-5 w-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="px-4 py-3">{children}</div>
            </div>
        </>
    );
}

function AccountMenu({ user, onLogout }) {
    const [open, setOpen] = useState(false);
    const closeTimer = useRef(null);

    const openNow = () => {
        if (closeTimer.current) {
            window.clearTimeout(closeTimer.current);
            closeTimer.current = null;
        }
        setOpen(true);
    };
    const closeWithDelay = () => {
        if (closeTimer.current) window.clearTimeout(closeTimer.current);
        closeTimer.current = window.setTimeout(() => {
            setOpen(false);
            closeTimer.current = null;
        }, 180);
    };

    return (
        <div
            className="relative menu-trigger"
            onMouseEnter={openNow}
            onMouseLeave={closeWithDelay}
        >
            <button
                type="button"
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-accent px-3 text-sm font-semibold text-white transition-all duration-300 hover:bg-brand-accent/90"
                onClick={() => setOpen((v) => !v)}
            >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14a7 7 0 100-14 7 7 0 000 14z" />
                </svg>
                {user ? (user.name || user.nombre || "Mi cuenta") : "Cuenta"}
                <svg className={cx("h-4 w-4 transition-transform duration-300", open ? "rotate-180" : "")} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            <div
                className={cx(
                    "absolute right-0 top-full z-dropdown mt-2 w-56 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-xl ring-1 ring-slate-200/60 backdrop-blur-xl transition-all duration-200",
                    open ? "pointer-events-auto opacity-100 scale-100" : "pointer-events-none opacity-0 scale-95"
                )}
                onMouseEnter={openNow}
                onMouseLeave={closeWithDelay}
            >
                {user ? (
                    <div className="p-1">
                        <Link
                            href={route("profile.edit")}
                            className="flex h-11 items-center rounded-xl px-3 text-sm font-medium text-brand-deep/80 hover:bg-slate-50 hover:text-brand-accent transition-all duration-300"
                        >
                            Perfil
                        </Link>
                        <button
                            type="button"
                            onClick={onLogout}
                            className="flex h-11 w-full items-center rounded-xl px-3 text-left text-sm font-medium text-brand-deep/80 hover:bg-slate-50 hover:text-brand-accent transition-all duration-300"
                        >
                            Cerrar sesión
                        </button>
                    </div>
                ) : (
                    <div className="p-1">
                        <Link
                            href={route("login")}
                            className="flex h-11 items-center rounded-xl px-3 text-sm font-medium text-brand-deep/80 hover:bg-slate-50 hover:text-brand-accent transition-all duration-300"
                        >
                            Login
                        </Link>
                        <Link
                            href={route("register")}
                            className="flex h-11 items-center rounded-xl px-3 text-sm font-medium text-brand-deep/80 hover:bg-slate-50 hover:text-brand-accent transition-all duration-300"
                        >
                            Register
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function Header() {
    const { url, props } = usePage();
    const user = props?.auth?.user;
    const isAdmin =
        !!user &&
        (String(user.role) === "admin" ||
            user.is_admin === true ||
            String(user.is_admin) === "1");
    const scrolled = useScrolled(0);
    const scrolledTight = useScrolled(40);
    const [drawerOpen, setDrawerOpen] = useState(false);

    const nav = useMemo(() => {
        const base = [
            { label: "Inicio", href: route("Pag_principal"), match: (u) => u === "/" },
            { label: "Nosotros", href: route("nosotros"), match: (u) => u.startsWith("/nosotros") },
        ];
        const services = [
            { label: "Alquiler Material", href: route("rentals.surfboards.index"), match: (u) => u.startsWith("/tablas-alquiler") },
            { label: "Clases", href: user ? route("academy.lessons.index") : route("servicios.surf"), match: (u) => u.startsWith("/academia") || u.startsWith("/servicios") },
            { label: "Tienda", href: route("tienda"), match: (u) => u.startsWith("/tienda") },
        ];
        const publicTail = [{ label: "Contacto", href: route("contacto"), match: (u) => u.startsWith("/contacto") }];

        const userLinks = [];
        if (user && !isAdmin) {
            userLinks.push({ label: "Pedidos", href: route("pedidos"), match: (u) => u.startsWith("/pedidos") });
            if (Number(user.numeroTaquilla) > 0) {
                userLinks.push({ label: "Pago.T", href: route("taquillas.index.client"), match: (u) => u.startsWith("/taquilla/planes") });
                userLinks.push({ label: "Carrito", href: route("carrito"), match: (u) => u.startsWith("/carrito") });
            }
        }

        const adminLinks = [];
        if (isAdmin) {
            adminLinks.push({ label: "Productos", href: route("mostrar.productos"), match: (u) => u.startsWith("/productos") });
        }
        const adminGestores = isAdmin
            ? [
                  { label: "Gestor Alquileres", href: route("admin.surfboards.index") },
                  { label: "Gestor Clases", href: route("admin.academy.index") },
                  { label: "Gestor Taquillas", href: route("asignar.taquilla.mostrar") },
                  { label: "Gestor Pedidos", href: route("gestor.pedidos") },
                  { label: "Pagos.T", href: route("taquilla.index.admin") },
              ]
            : [];

        return { base, services, publicTail, userLinks, adminLinks, adminGestores };
    }, [user, isAdmin]);

    const active = (matcher) => (typeof matcher === "function" ? matcher(url || "") : false);
    const isServicesActive = nav.services.some((i) => active(i.match));
    const isGestoresActive = isAdmin && (url || "").startsWith("/admin") || (url || "").startsWith("/taquilla") || (url || "").startsWith("/gestor-pedidos") || (url || "").startsWith("/asignar-taquilla");

    const handleLogout = async () => {
        try {
            await window?.axios?.post?.(route("logout"));
        } catch {
            // noop
        } finally {
            window.location.href = "/";
        }
    };

    return (
        <header className="w-full">
            {/* Nivel 1: Branding Bar (se oculta al hacer scroll) */}
            <div
                className={cx(
                    "h-10 bg-[#0d234d] text-white transition-all duration-300",
                    scrolledTight ? "opacity-0 -translate-y-2 h-0 overflow-hidden" : "opacity-100 translate-y-0"
                )}
            >
                <div className="mx-auto flex h-10 max-w-7xl items-center justify-between px-4 sm:px-6">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-xs font-extrabold tracking-[0.15em]">
                        S4
                    </span>
                    <p className="truncate px-3 text-[10px] sm:text-xs tracking-widest text-white/80 text-center flex-1">
                        <span className="hidden lg:inline">
                            Domina el Cantábrico con S4 — San Sebastian Surf School
                        </span>
                        <span className="lg:hidden">S4 — San Sebastian</span>
                    </p>
                    <span className="w-7" aria-hidden />
                </div>
            </div>

            {/* Nivel 2: Action Bar (Sticky & Glassmorphism) */}
            <div className="sticky top-0 z-[100] w-full">
                <div
                    className={cx(
                        "bg-white/70 backdrop-blur-xl border-b border-slate-200/50 transition-all duration-300",
                        scrolledTight ? "shadow-md bg-white/65" : "shadow-sm bg-white/75"
                    )}
                >
                    <div className="mx-auto max-w-7xl px-4 sm:px-6">
                        <div className={cx("flex items-center justify-between gap-3 transition-all duration-300", scrolledTight ? "h-14" : "h-16")}>
                        <Link
                            href={route("Pag_principal")}
                            className="group flex items-center gap-2 transition-transform duration-300 hover:scale-105 active:scale-95"
                        >
                            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-accent text-white font-heading text-sm font-extrabold tracking-[0.15em]">
                                S4
                            </span>
                            <span className="hidden sm:inline font-heading text-base font-bold tracking-tight text-brand-deep">
                                San Sebastian Surf School
                            </span>
                            {isAdmin && (
                                <span className="ml-2 hidden sm:inline-flex items-center rounded-full bg-gradient-to-r from-brand-deep to-brand-accent px-2.5 py-1 text-[10px] font-bold tracking-wider text-white">
                                    ADMIN
                                </span>
                            )}
                        </Link>

                        <nav className="hidden lg:flex min-w-0 flex-1 items-center justify-center gap-2 flex-nowrap">
                            {nav.base.map((i) => (
                                <HeaderLink key={i.label} href={i.href} active={active(i.match)}>
                                    {i.label}
                                </HeaderLink>
                            ))}

                            <Dropdown label="Servicios" active={isServicesActive}>
                                <div className="p-1">
                                    {nav.services.map((i) => (
                                        <Link
                                            key={i.label}
                                            href={i.href}
                                            className="flex h-11 items-center rounded-xl px-3 text-sm font-medium text-brand-deep/80 hover:bg-slate-50 hover:text-brand-accent transition-all duration-300"
                                        >
                                            {i.label}
                                        </Link>
                                    ))}
                                </div>
                            </Dropdown>

                            {!isAdmin &&
                                nav.publicTail.map((i) => (
                                    <HeaderLink key={i.label} href={i.href} active={active(i.match)}>
                                        {i.label}
                                    </HeaderLink>
                                ))}

                            {user && !isAdmin &&
                                nav.userLinks.map((i) => (
                                    <HeaderLink key={i.label} href={i.href} active={active(i.match)}>
                                        {i.label}
                                    </HeaderLink>
                                ))}

                            {isAdmin && (
                                <>
                                    {nav.adminLinks.map((i) => (
                                        <HeaderLink key={i.label} href={i.href} active={active(i.match)}>
                                            {i.label}
                                        </HeaderLink>
                                    ))}
                                    <Dropdown label="Gestores" active={isGestoresActive}>
                                        <div className="p-1">
                                            {nav.adminGestores.map((i) => (
                                                <Link
                                                    key={i.label}
                                                    href={i.href}
                                                    className="flex h-11 items-center rounded-xl px-3 text-sm font-medium text-brand-deep/80 hover:bg-slate-50 hover:text-brand-accent transition-all duration-300"
                                                >
                                                    {i.label}
                                                </Link>
                                            ))}
                                        </div>
                                    </Dropdown>
                                    <HeaderLink href={route("admin.bookings.index")} active={(url || "").startsWith("/admin/bookings")}>
                                        Reserva de tablas
                                    </HeaderLink>
                                </>
                            )}
                        </nav>

                        <div className="flex items-center gap-2">
                            <div className="hidden lg:block">
                                <AccountMenu user={user} onLogout={handleLogout} />
                            </div>
                            <button
                                type="button"
                                className="inline-flex h-10 w-10 items-center justify-center rounded-xl hover:bg-slate-100 transition-all duration-300 lg:hidden"
                                onClick={() => setDrawerOpen(true)}
                                aria-label="Abrir menú"
                            >
                                <svg className="h-6 w-6 text-brand-deep" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                        </div>
                        </div>
                    </div>
                </div>
            </div>

            <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
                <div className="space-y-1">
                    {[...nav.base].map((i) => (
                        <Link
                            key={i.label}
                            href={i.href}
                            onClick={() => setDrawerOpen(false)}
                            className="flex h-11 items-center rounded-xl px-3 text-sm font-medium text-brand-deep hover:bg-slate-100 transition-all duration-300"
                        >
                            {i.label}
                        </Link>
                    ))}
                    <div className="pt-2">
                        <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Servicios</p>
                        {nav.services.map((i) => (
                            <Link
                                key={i.label}
                                href={i.href}
                                onClick={() => setDrawerOpen(false)}
                                className="mt-1 flex h-11 items-center rounded-xl px-3 text-sm font-medium text-brand-deep hover:bg-slate-100 transition-all duration-300"
                            >
                                {i.label}
                            </Link>
                        ))}
                    </div>
                    {!isAdmin &&
                        nav.publicTail.map((i) => (
                            <Link
                                key={i.label}
                                href={i.href}
                                onClick={() => setDrawerOpen(false)}
                                className="flex h-11 items-center rounded-xl px-3 text-sm font-medium text-brand-deep hover:bg-slate-100 transition-all duration-300"
                            >
                                {i.label}
                            </Link>
                        ))}

                    {user && !isAdmin &&
                        nav.userLinks.map((i) => (
                            <Link
                                key={i.label}
                                href={i.href}
                                onClick={() => setDrawerOpen(false)}
                                className="flex h-11 items-center rounded-xl px-3 text-sm font-medium text-brand-deep hover:bg-slate-100 transition-all duration-300"
                            >
                                {i.label}
                            </Link>
                        ))}

                    {isAdmin && (
                        <div className="pt-2">
                            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Consola</p>
                            {nav.adminLinks.map((i) => (
                                <Link
                                    key={i.label}
                                    href={i.href}
                                    onClick={() => setDrawerOpen(false)}
                                    className="mt-1 flex h-11 items-center rounded-xl px-3 text-sm font-medium text-brand-deep hover:bg-slate-100 transition-all duration-300"
                                >
                                    {i.label}
                                </Link>
                            ))}
                            {nav.adminGestores.map((i) => (
                                <Link
                                    key={i.label}
                                    href={i.href}
                                    onClick={() => setDrawerOpen(false)}
                                    className="mt-1 flex h-11 items-center rounded-xl px-3 text-sm font-medium text-brand-deep hover:bg-slate-100 transition-all duration-300"
                                >
                                    {i.label}
                                </Link>
                            ))}
                            <Link
                                href={route("admin.bookings.index")}
                                onClick={() => setDrawerOpen(false)}
                                className="mt-1 flex h-11 items-center rounded-xl px-3 text-sm font-medium text-brand-deep hover:bg-slate-100 transition-all duration-300"
                            >
                                Reserva de tablas
                            </Link>
                        </div>
                    )}

                    <div className="pt-3">
                        {user ? (
                            <button type="button" onClick={handleLogout} className="btn-secondary w-full">
                                Cerrar sesión
                            </button>
                        ) : (
                            <Link href={route("login")} className="btn-primary w-full" onClick={() => setDrawerOpen(false)}>
                                Entrar
                            </Link>
                        )}
                    </div>
                </div>
            </Drawer>
        </header>
    );
}

