import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { Link, router, usePage } from "@inertiajs/react";
import { ShoppingCart, Menu as MenuIcon, X as XIcon, ChevronDown, UserCircle } from "lucide-react";
import BrandLogo from "./BrandLogo";

const HOVER_CLOSE_DELAY_MS = 150;

function safeRoute(name, params, fallback = "#") {
    try {
        return route(name, params);
    } catch (e) {
        return fallback;
    }
}

function AccountMenuIdentity({ user }) {
    if (!user) return null;

    const displayName =
        [user.nombre, user.apellido].filter(Boolean).join(" ").trim() || String(user.name || "").trim();

    if (!displayName && !user.email) return null;

    return (
        <div className="mb-1 border-b border-white/10 px-3 pb-2 pt-1">
            {displayName ? <p className="truncate text-xs font-semibold text-white">{displayName}</p> : null}
            {user.email ? <p className="truncate text-[10px] text-slate-500">{user.email}</p> : null}
        </div>
    );
}

/**
 * Construye la navegacion segun el rol (middlewares).
 * - type "link": enlace directo en la barra.
 * - type "flyout": abre panel a todo el ancho con columnas (grupos).
 */
function buildMenus({ isAdmin, isAuth, isVip, hasLocker, canAccessAuctions }) {
    const publicTopLinks = [
        { type: "link", id: "autocoach", label: "Comparador de maniobras", href: safeRoute("autocoach.index") },
        { type: "link", id: "taller", label: "Taller de Surf", href: safeRoute("taller.index") },
        { type: "link", id: "nosotros", label: "Sobre nosotros", href: safeRoute("nosotros") },
    ];
    const contactoLink = { type: "link", id: "contacto", label: "Contacto", href: safeRoute("contacto") };

    if (isAdmin) {
        return [
            { type: "link", id: "inicio", label: "Inicio", href: safeRoute("Pag_principal") },
            {
                type: "flyout",
                id: "admin-gestion",
                label: "Gestión",
                groups: [
                    {
                        title: "Taquillas",
                        links: [
                            { label: "Planes y Vigencia", href: safeRoute("taquilla.index.admin"), featured: true },
                            { label: "Verificar Pagos", href: safeRoute("taquilla.pagos.queue") },
                            { label: "Mapa de Taquillas", href: safeRoute("asignar.taquilla.mostrar") },
                            { label: "Candado emergencia", href: safeRoute("admin.emergency-keys.index") },
                        ],
                    },
                    {
                        title: "Tienda",
                        links: [
                            { label: "Gestor de Pedidos", href: safeRoute("gestor.pedidos"), featured: true },
                            { label: "Gestor de Productos", href: safeRoute("mostrar.productos") },
                        ],
                    },
                    {
                        title: "Alquileres",
                        links: [
                            { label: "Inventario de Tablas", href: safeRoute("admin.surfboards.index"), featured: true },
                            { label: "Reservas de Alquiler", href: safeRoute("admin.bookings.index") },
                            { label: "Segunda Mano", href: safeRoute("admin.second-hand.index") },
                            { label: "Subastas", href: safeRoute("admin.auctions.index") },
                        ],
                    },
                    {
                        title: "Clases",
                        links: [
                            { label: "Gestor de Clases", href: safeRoute("admin.class-manager.index"), featured: true },
                            { label: "Packs de Bonos", href: safeRoute("admin.bonos.index") },
                        ],
                    },
                    {
                        title: "Chatbot",
                        links: [
                            { label: "Casos derivados", href: safeRoute("admin.chatbot.index"), featured: true },
                        ],
                    },
                    {
                        title: "Usuarios",
                        links: [
                            { label: "Usuarios y VIP", href: safeRoute("admin.users.index"), featured: true },
                            { label: "Seguimiento VIP", href: safeRoute("admin.vips.index") },
                            { label: "Lista de Usuarios", href: safeRoute("listaUsuarios") },
                        ],
                    },
                    {
                        title: "Pagos",
                        links: [
                            { label: "Dashboard Global", href: safeRoute("admin.payments.global"), featured: true },
                            { label: "Clientes · Historial de pagos", href: safeRoute("admin.payments.clients.index") },
                            { label: "Validacion de Bonos", href: safeRoute("admin.payment-validation.index") },
                        ],
                    },
                ],
            },
            {
                type: "flyout",
                id: "admin-extras",
                label: "Extras",
                groups: [
                    {
                        title: "Herramientas",
                        links: [
                            { label: "Comparador de maniobras", href: safeRoute("autocoach.index"), featured: true },
                            { label: "Webcams", href: safeRoute("servicios.webcams") },
                        ],
                    },
                ],
            },
            contactoLink,
        ];
    }

    // Clases (zona dentro de Servicios)
    const clasesLinks = [];
    if (isAuth) {
        clasesLinks.push({ label: "Reservar Clases", href: safeRoute("academy.lessons.index"), featured: true });
        clasesLinks.push({
            label: "Mis clases reservadas",
            href: `${safeRoute("my-reservations.index")}?tab=classes`,
        });
    }
    clasesLinks.push(
        { label: "Surf", href: safeRoute("servicios.surf"), featured: !isAuth },
        { label: "Surfskate", href: safeRoute("servicios.surfSkate") },
        { label: "Guía de equipamiento", href: safeRoute("servicios.surfSkate.guia") },
        { label: "Surftrips", href: safeRoute("servicios.surfTrips") },
    );

    // Taquillas (zona dentro de Servicios)
    const taquillasLinks = [];
    if (hasLocker) {
        taquillasLinks.push({ label: "Mi Taquilla", href: safeRoute("taquillas.index.client"), featured: true });
        taquillasLinks.push({
            label: "Me quedé sin llave",
            href: safeRoute("emergency-key.show"),
        });
    }
    if (isAuth && !isVip) {
        clasesLinks.push({ label: "Bonos VIP (solicitar acceso)", href: safeRoute("bonos.index") });
    }
    if (isVip) {
        clasesLinks.push({ label: "Mis Bonos VIP", href: safeRoute("bonos.index"), featured: !hasLocker });
    }
    taquillasLinks.push({
        label: "Planes y Cuotas",
        href: isAuth ? safeRoute("taquillas.index.client") : safeRoute("taquillas.planes"),
        featured: !hasLocker,
    });

    const alquileresLinks = [
        { label: "Tablas de alquiler", href: safeRoute("rentals.surfboards.index"), featured: true },
    ];
    if (isAuth && !isAdmin) {
        alquileresLinks.push({ label: "Mis reservas · alquileres", href: `${safeRoute("my-reservations.index")}?tab=rentals` });
    }

    const tiendaLinks = [
        { label: "Tienda oficial S4", href: safeRoute("tienda"), featured: true },
        { label: "Tablas de Segunda Mano", href: safeRoute("second-hand.index") },
    ];
    if (isAuth && !isAdmin) {
        tiendaLinks.splice(1, 0, { label: "Mis Pedidos", href: safeRoute("pedidos") });
    }

    const serviciosLinks = [
        { label: "Reparaciones", href: safeRoute("servicios"), featured: true },
        {
            label: "Neoprenos",
            href: safeRoute("servicios.reparacionNeoprenos", undefined, "/servicios/reparacion-neoprenos"),
        },
    ];
    if (canAccessAuctions) {
        serviciosLinks.push({ label: "Subastas", href: safeRoute("auctions.index") });
    }

    const serviciosGroups = [
            {
                title: "Tienda",
                links: tiendaLinks,
            },
            {
                title: "Servicios",
                links: serviciosLinks,
            },
            {
                title: "Alquileres",
                links: alquileresLinks,
            },
            {
                title: "Taquillas",
                links: taquillasLinks,
            },
            {
                title: "Clases",
                links: clasesLinks,
            },
    ];

    if (isAuth && !isAdmin) {
        serviciosGroups.push({
            title: "Mi Perfil",
            links: [{ label: "Mi Perfil", href: safeRoute("my-profile.index"), featured: true }],
        });
    }

    serviciosGroups.push({
                title: "Multimedia",
                links: [
                    { label: "Comparador de maniobras", href: safeRoute("autocoach.index"), featured: true },
                    { label: "Fotografia", href: safeRoute("servicios.fotografia") },
                    { label: "Videograbaciones", href: safeRoute("servicios.videograbaciones") },
                    { label: "Webcams", href: safeRoute("servicios.webcams") },
                ],
            });

    const servicios = {
        type: "flyout",
        id: "servicios",
        label: "Servicios",
        groups: serviciosGroups,
    };

    return [
        { type: "link", id: "inicio", label: "Inicio", href: safeRoute("Pag_principal") },
        publicTopLinks[0],
        publicTopLinks[1],
        publicTopLinks[2],
        servicios,
        contactoLink,
    ];
}

function FlyoutGroup({ group }) {
    return (
        <div className="min-w-[170px] max-w-[230px] flex-1">
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-300/70">{group.title}</h3>
            <ul className="space-y-1.5">
                {group.links.map((link) => (
                    <li key={link.label}>
                        <Link
                            href={link.href}
                            className="block text-sm text-slate-200 transition-colors hover:text-cyan-300"
                        >
                            {link.label}
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default function GlobalNav() {
    const { props, url } = usePage();
    const user = props?.auth?.user;
    const isAuth = Boolean(user);
    const isAdmin = isAuth && String(user?.role) === "admin";
    const isVip = user?.is_vip === true || String(user?.is_vip) === "1";
    const hasLocker =
        user?.has_physical_locker === true || String(user?.has_physical_locker) === "1";
    const canAccessAuctions =
        user?.can_access_auctions === true || String(user?.can_access_auctions) === "1";
    const cartCount = Number(props?.cart?.count ?? props?.cartCount ?? 0);

    const menus = buildMenus({ isAdmin, isAuth, isVip, hasLocker, canAccessAuctions });

    const baseId = useId();
    const closeTimerRef = useRef(null);
    const [activeMenuId, setActiveMenuId] = useState(null);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [mobileSection, setMobileSection] = useState(null);
    const [accountOpen, setAccountOpen] = useState(false);

    const activeMenu = menus.find((m) => m.id === activeMenuId && m.type === "flyout") ?? null;
    const panelOpen = Boolean(activeMenu);

    const clearCloseTimer = useCallback(() => {
        if (closeTimerRef.current) {
            window.clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }
    }, []);

    const closePanel = useCallback(() => {
        clearCloseTimer();
        setActiveMenuId(null);
    }, [clearCloseTimer]);

    const scheduleClose = useCallback(() => {
        clearCloseTimer();
        closeTimerRef.current = window.setTimeout(() => setActiveMenuId(null), HOVER_CLOSE_DELAY_MS);
    }, [clearCloseTimer]);

    const openMenu = useCallback(
        (menuId) => {
            clearCloseTimer();
            setActiveMenuId(menuId);
        },
        [clearCloseTimer],
    );

    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key === "Escape") {
                closePanel();
                setAccountOpen(false);
            }
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [closePanel]);

    useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);

    const accountLinks = [{ label: "Editar mi cuenta", href: safeRoute("profile.edit") }];
    if (!isAdmin) {
        accountLinks.push(
            { label: "Mis clases reservadas", href: `${safeRoute("my-reservations.index")}?tab=classes` },
            { label: "Mis alquileres", href: `${safeRoute("my-reservations.index")}?tab=rentals` },
            { label: "Mis Pedidos", href: safeRoute("pedidos") },
            { label: "Mis facturas", href: safeRoute("my-invoices.index") },
        );
        if (hasLocker) {
            accountLinks.push({ label: "Me quedé sin llave", href: safeRoute("emergency-key.show") });
        }
        if (isVip) {
            accountLinks.push(
                { label: "Mi Perfil", href: safeRoute("my-profile.index") },
                { label: "Recargar bono", href: safeRoute("bonos.index") },
            );
        }
    }

    return (
        <div className="relative z-[600] w-full bg-[#071326] text-slate-100" onMouseLeave={scheduleClose}>
            <nav aria-label="Navegacion global" className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
                <Link href={safeRoute("Pag_principal")} aria-label="San Sebastián Surf School — Inicio" className="inline-flex shrink-0 items-center gap-2.5">
                    <BrandLogo variant="whiteNav" className="h-10 w-10 sm:h-11 sm:w-11" priority />
                    <span className="hidden text-sm font-bold leading-tight text-white lg:inline">San Sebastian Surf School</span>
                </Link>

                <ul className="hidden flex-1 items-center justify-center gap-1 lg:flex">
                    {menus.map((menu) => {
                        if (menu.type === "link") {
                            return (
                                <li key={menu.id} className="list-none" onMouseEnter={closePanel}>
                                    <Link
                                        href={menu.href}
                                        className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:text-white"
                                    >
                                        {menu.label}
                                    </Link>
                                </li>
                            );
                        }
                        const expanded = activeMenuId === menu.id;
                        return (
                            <li key={menu.id} className="list-none" onMouseEnter={() => openMenu(menu.id)}>
                                <button
                                    type="button"
                                    id={`${baseId}-trigger-${menu.id}`}
                                    aria-expanded={expanded}
                                    aria-haspopup="true"
                                    onFocus={() => openMenu(menu.id)}
                                    className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${expanded ? "text-white" : "text-slate-300 hover:text-white"}`}
                                >
                                    {menu.label}
                                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
                                </button>
                            </li>
                        );
                    })}
                </ul>

                <div className="flex shrink-0 items-center gap-2">
                    {isAuth && !isAdmin ? (
                        <Link
                            href={safeRoute("carrito")}
                            aria-label="Carrito"
                            className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-200 transition-colors hover:bg-white/10 hover:text-cyan-300"
                        >
                            <ShoppingCart className="h-5 w-5" />
                            {cartCount > 0 ? (
                                <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white">
                                    {cartCount > 9 ? "9+" : cartCount}
                                </span>
                            ) : null}
                        </Link>
                    ) : null}

                    {isAuth ? (
                        <div className="hidden items-center gap-2 lg:flex">
                            <button
                                type="button"
                                onClick={() => router.post(safeRoute("logout"))}
                                className="rounded-xl border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/10"
                            >
                                Salir
                            </button>
                            <div className="relative" onMouseLeave={() => setAccountOpen(false)}>
                                <button
                                    type="button"
                                    aria-label="Mi cuenta"
                                    aria-expanded={accountOpen}
                                    onClick={() => setAccountOpen((v) => !v)}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-200 transition-colors hover:bg-white/10 hover:text-cyan-300"
                                >
                                    <UserCircle className="h-6 w-6" />
                                </button>
                                <div
                                    className={`absolute right-0 top-full z-[40] w-56 pt-2 transition-all ${accountOpen ? "opacity-100" : "pointer-events-none -translate-y-1 opacity-0"}`}
                                >
                                    <div className="rounded-2xl border border-white/10 bg-[#0b1d33] p-2 shadow-xl">
                                        <AccountMenuIdentity user={user} />
                                        {accountLinks.map((link) => (
                                            <Link
                                                key={link.label}
                                                href={link.href}
                                                onClick={() => setAccountOpen(false)}
                                                className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-white/10 hover:text-cyan-300"
                                            >
                                                {link.label}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="hidden items-center gap-2 lg:flex">
                            <Link href={safeRoute("login")} className="rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/10">
                                Acceder
                            </Link>
                            <Link href={safeRoute("register")} className="rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-400">
                                Registrarse
                            </Link>
                        </div>
                    )}

                    <button
                        type="button"
                        aria-label="Abrir menu"
                        onClick={() => setMobileOpen((v) => !v)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-200 hover:bg-white/10 lg:hidden"
                    >
                        {mobileOpen ? <XIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
                    </button>
                </div>
            </nav>

            {/* Panel flyout a todo el ancho (desktop) - fondo solido azulado */}
            <div
                className={`absolute left-0 right-0 top-full w-full overflow-hidden border-t border-white/10 bg-[#0b1d33] shadow-2xl transition-[max-height,opacity] duration-300 ease-out ${panelOpen ? "max-h-[560px] opacity-100" : "pointer-events-none max-h-0 opacity-0"}`}
                onMouseEnter={clearCloseTimer}
                onMouseLeave={scheduleClose}
            >
                {activeMenu ? (
                    <div role="region" aria-labelledby={`${baseId}-trigger-${activeMenu.id}`} className="mx-auto max-w-7xl px-6 py-8">
                        <div className="flex flex-wrap gap-x-10 gap-y-8 lg:gap-x-14">
                            {activeMenu.groups.map((group) => (
                                <FlyoutGroup key={group.title} group={group} />
                            ))}
                        </div>
                    </div>
                ) : null}
            </div>

            {/* Menu movil (acordeon) */}
            {mobileOpen ? (
                <div className="border-t border-white/10 bg-[#0b1d33] lg:hidden">
                    <div className="mx-auto max-w-7xl px-4 py-3">
                        {menus.map((menu) => {
                            if (menu.type === "link") {
                                return (
                                    <Link
                                        key={menu.id}
                                        href={menu.href}
                                        onClick={() => setMobileOpen(false)}
                                        className="block border-b border-white/5 py-3 text-sm font-semibold text-slate-100 last:border-0"
                                    >
                                        {menu.label}
                                    </Link>
                                );
                            }
                            const open = mobileSection === menu.id;
                            return (
                                <div key={menu.id} className="border-b border-white/5 last:border-0">
                                    <button
                                        type="button"
                                        onClick={() => setMobileSection(open ? null : menu.id)}
                                        className="flex w-full items-center justify-between py-3 text-left text-sm font-semibold text-slate-100"
                                    >
                                        {menu.label}
                                        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
                                    </button>
                                    {open ? (
                                        <div className="pb-3">
                                            {menu.groups.map((group) => (
                                                <div key={group.title} className="mb-2">
                                                    <p className="mb-1 text-[11px] uppercase tracking-wider text-cyan-300/70">{group.title}</p>
                                                    {group.links.map((link) => (
                                                        <Link
                                                            key={link.label}
                                                            href={link.href}
                                                            onClick={() => setMobileOpen(false)}
                                                            className="block rounded-lg px-2 py-2 text-sm text-slate-200 hover:bg-white/10 hover:text-cyan-300"
                                                        >
                                                            {link.label}
                                                        </Link>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    ) : null}
                                </div>
                            );
                        })}

                        <div className="mt-3 space-y-1">
                            {isAuth ? (
                                <>
                                    <AccountMenuIdentity user={user} />
                                    {accountLinks.map((link) => (
                                        <Link
                                            key={link.label}
                                            href={link.href}
                                            onClick={() => setMobileOpen(false)}
                                            className="block rounded-lg px-2 py-2 text-sm text-slate-200 hover:bg-white/10 hover:text-cyan-300"
                                        >
                                            {link.label}
                                        </Link>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMobileOpen(false);
                                            router.post(safeRoute("logout"));
                                        }}
                                        className="mt-1 w-full rounded-xl bg-rose-600 px-3 py-2 text-center text-sm font-semibold text-white"
                                    >
                                        Salir
                                    </button>
                                </>
                            ) : (
                                <div className="flex gap-2">
                                    <Link href={safeRoute("login")} onClick={() => setMobileOpen(false)} className="flex-1 rounded-xl border border-white/15 px-3 py-2 text-center text-sm font-medium text-slate-200">
                                        Acceder
                                    </Link>
                                    <Link href={safeRoute("register")} onClick={() => setMobileOpen(false)} className="flex-1 rounded-xl bg-emerald-500 px-3 py-2 text-center text-sm font-semibold text-white">
                                        Registrarse
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
