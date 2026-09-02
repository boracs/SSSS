import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { Link, router, usePage } from "@inertiajs/react";
import {
    ShoppingCart,
    Menu as MenuIcon,
    X as XIcon,
    ChevronDown,
    LogOut,
    Pencil,
    UserCircle,
} from "lucide-react";
import BrandLogo from "./BrandLogo";
import PressRipple from "./PressRipple";

const HOVER_CLOSE_DELAY_MS = 220;
/** Margen de error (~20px) entre trigger y panel para no cerrar al cruzar el hueco. */
const HOVER_BRIDGE_PX = "1.25rem"; // 20px

function safeRoute(name, params, fallback = "#") {
    try {
        // Rutas relativas: evita que Ziggy apunte a APP_URL/túnel distinto del host actual.
        return route(name, params, false);
    } catch (e) {
        return fallback;
    }
}

function AccountMenuIdentity({ user, compact = false, nameAside = null }) {
    if (!user) return null;

    const displayName =
        [user.nombre, user.apellido].filter(Boolean).join(" ").trim() ||
        String(user.name || "").trim();

    if (!displayName && !user.email) return null;

    return (
        <div
            className={
                compact
                    ? "min-w-0"
                    : "mb-1 border-b border-white/10 px-3 pb-2 pt-1"
            }
        >
            {displayName ? (
                <div className="flex min-w-0 items-center gap-1">
                    <p className="truncate text-xs font-semibold text-white">
                        {displayName}
                    </p>
                    {nameAside}
                </div>
            ) : (
                nameAside
            )}
            {user.email ? (
                <p className="truncate text-[10px] text-slate-500">
                    {user.email}
                </p>
            ) : null}
        </div>
    );
}

/** En tablet (lg–xl): shortLabel si existe; en xl+ el label completo. Sin wrap. */
function NavLabel({ label, shortLabel }) {
    if (!shortLabel || shortLabel === label) {
        return <span className="whitespace-nowrap">{label}</span>;
    }
    return (
        <>
            <span className="whitespace-nowrap xl:hidden">{shortLabel}</span>
            <span className="hidden whitespace-nowrap xl:inline">{label}</span>
        </>
    );
}

const NAV_LINK_CLASS =
    "inline-flex items-center rounded-lg px-2 py-2 text-xs font-medium text-slate-400 transition-colors hover:text-white xl:px-3 xl:text-sm";
const NAV_FLYOUT_BTN_BASE =
    "inline-flex items-center gap-1 rounded-lg px-2 py-2 text-xs font-medium transition-colors xl:px-3 xl:text-sm";

/**
 * Construye la navegacion segun el rol (middlewares).
 * - type "link": enlace directo en la barra.
 * - type "flyout": abre panel a todo el ancho con columnas (grupos).
 */
function buildMenus({ isAdmin, isAuth, isVip, hasLocker }) {
    const contactoLink = {
        type: "link",
        id: "contacto",
        label: "Contacto",
        href: safeRoute("contacto"),
    };

    if (isAdmin) {
        return [
            {
                type: "link",
                id: "inicio",
                label: "Inicio",
                href: safeRoute("Pag_principal"),
            },
            // Mar/olas: mismos deep-links que el menú cliente (no solo forecast).
            {
                type: "flyout",
                id: "admin-zurriola",
                label: "La Zurriola",
                shortLabel: "Zurriola",
                groups: [
                    {
                        title: "Webcam y parte",
                        links: [
                            {
                                label: "Webcam Zurriola en directo",
                                href: `${safeRoute("servicios.webcams")}#webcam-directo`,
                                featured: true,
                            },
                            {
                                label: "Parte de hoy",
                                href: `${safeRoute("servicios.webcams")}#parte-s4-hoy`,
                            },
                            {
                                label: "Forecast / parte",
                                href: `${safeRoute("servicios.webcams")}#prevision-forecast`,
                            },
                        ],
                    },
                ],
            },
            // Gestión admin: orden por frecuencia de mostrador (cobros → ops → catálogo).
            // Barra: Inicio · La Zurriola · Gestión · Extras · Contacto
            {
                type: "flyout",
                id: "admin-gestion",
                label: "Gestión",
                groups: [
                    {
                        title: "Cobros",
                        links: [
                            {
                                label: "Pagos datáfono",
                                href: safeRoute("admin.payments.datafono.index"),
                                featured: true,
                            },
                            {
                                label: "Clientes · Historial de pagos",
                                href: safeRoute("admin.payments.clients.index"),
                            },
                        ],
                    },
                    {
                        title: "Taquillas",
                        links: [
                            {
                                label: "Esquema taquillas",
                                href: safeRoute("taquilla.esquema"),
                                featured: true,
                            },
                            {
                                label: "Asignador de Taquillas",
                                href: safeRoute("asignar.taquilla.mostrar"),
                            },
                            {
                                label: "Vigencia",
                                href: safeRoute("taquilla.vigencia"),
                            },
                            {
                                label: "Registro de Pagos",
                                href: safeRoute("taquilla.pagos.registro"),
                            },
                            {
                                label: "Candado de emergencia",
                                href: safeRoute("admin.emergency-keys.index"),
                            },
                        ],
                    },
                    {
                        title: "Clases",
                        links: [
                            {
                                label: "Gestor de Clases",
                                href: safeRoute("admin.class-manager.index"),
                                featured: true,
                            },
                            {
                                label: "Gestor de clases diario",
                                href: safeRoute("admin.academy.index"),
                            },
                            {
                                label: "Tarifas particulares",
                                href: safeRoute("admin.catalog.private-lessons"),
                            },
                        ],
                    },
                    {
                        title: "Tienda",
                        links: [
                            {
                                label: "Gestor de Pedidos",
                                href: safeRoute("gestor.pedidos"),
                                featured: true,
                            },
                            {
                                label: "Gestor de Productos",
                                href: safeRoute("mostrar.productos"),
                            },
                            {
                                label: "Inventario de Tablas",
                                href: safeRoute("admin.surfboards.index"),
                            },
                            {
                                label: "Tablas segunda mano",
                                href: safeRoute("admin.second-hand.index"),
                            },
                            {
                                label: "Subastas",
                                href: safeRoute("admin.auctions.index"),
                            },
                            {
                                label: "Reservas de Alquiler",
                                href: safeRoute("admin.bookings.index"),
                            },
                        ],
                    },
                    {
                        title: "Catálogo",
                        links: [
                            {
                                label: "Gestor de servicios",
                                href: safeRoute("admin.catalog.index"),
                                featured: true,
                            },
                            {
                                label: "Planes taquillas",
                                href: safeRoute("taquilla.index.admin"),
                            },
                            {
                                label: "Packs de Bonos VIP",
                                href: safeRoute("admin.bonos.index"),
                            },
                            {
                                label: "Packs de fotos",
                                href: safeRoute("admin.photos.index"),
                            },
                        ],
                    },
                    {
                        title: "Clientes",
                        links: [
                            {
                                label: "Usuarios y VIP",
                                href: safeRoute("admin.users.index"),
                                featured: true,
                            },
                            {
                                label: "Casos chatbot",
                                href: safeRoute("admin.chatbot.index"),
                            },
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
                            {
                                label: "Comparador de maniobras",
                                href: safeRoute("autocoach.index"),
                                featured: true,
                            },
                        ],
                    },
                ],
            },
            contactoLink,
        ];
    }

    // ── Usuario normal / cliente: jerarquía por intención (no admin) ──
    // Barra: Inicio · Clases · Mar · Club · Tienda · Reparaciones · Más · Contacto
    // Cuenta (perfil) vive en el icono de usuario, no en el mega-menú.

    const clasesLinks = [
        {
            label: "Reservar clases",
            href: safeRoute("academy.lessons.index"),
            featured: true,
        },
    ];
    if (isAuth) {
        clasesLinks.push({
            label: "Mis clases reservadas",
            href: `${safeRoute("my-reservations.index")}?tab=classes`,
        });
    }
    clasesLinks.push(
        { label: "Info · Clases de surf", href: safeRoute("servicios.surf") },
        {
            label: "Info · Clases surfskate",
            href: safeRoute("servicios.surfSkate"),
        },
        {
            label: "Guía surfskate",
            href: safeRoute("servicios.surfSkate.guia"),
        },
        { label: "Surftrips", href: safeRoute("servicios.surfTrips") },
    );
    if (isAuth && !isVip) {
        clasesLinks.push({
            label: "Bonos VIP (solicitar acceso)",
            href: safeRoute("bonos.index"),
        });
    }
    if (isVip) {
        clasesLinks.push({
            label: "Mis Bonos VIP · Recargar",
            href: safeRoute("bonos.index"),
            featured: !hasLocker,
        });
    }

    const marLinks = [
        {
            label: "Webcam Zurriola en directo",
            href: `${safeRoute("servicios.webcams")}#webcam-directo`,
            featured: true,
        },
        {
            label: "Parte de hoy",
            href: `${safeRoute("servicios.webcams")}#parte-s4-hoy`,
        },
        {
            label: "Forecast / parte",
            href: `${safeRoute("servicios.webcams")}#prevision-forecast`,
        },
    ];

    const clubLinks = [];
    if (hasLocker) {
        clubLinks.push({
            label: "Mi Taquilla",
            href: safeRoute("taquillas.index.client"),
            featured: true,
        });
        clubLinks.push({
            label: "Me quedé sin llave",
            href: safeRoute("emergency-key.show"),
        });
    } else {
        clubLinks.push({
            label: "Planes y Cuotas",
            href: isAuth
                ? safeRoute("taquillas.index.client")
                : safeRoute("taquillas.planes"),
            featured: true,
        });
    }
    clubLinks.push({
        label: "Micro-servicios del club",
        href: `${safeRoute("nosotros")}#micro-servicios-club`,
    });

    const tiendaLinks = [
        {
            label: "Tienda oficial S4",
            href: safeRoute("tienda"),
            featured: true,
        },
    ];
    if (isAuth) {
        // Solo menú cliente: buildMenus hace return temprano si isAdmin.
        // Pedidos personales del usuario; el admin gestiona pedidos en Gestión → Gestor de Pedidos.
        tiendaLinks.push({
            label: "Mis Pedidos",
            href: safeRoute("pedidos"),
        });
    }
    tiendaLinks.push(
        {
            label: "Tablas segunda mano",
            href: safeRoute("second-hand.index"),
        },
        {
            label: "Subastas",
            href: safeRoute("auctions.index"),
        },
    );

    const reparacionesLinks = [
        {
            label: "Rep. tablas",
            href: safeRoute("servicios"),
            featured: true,
        },
        {
            label: "Rep. neoprenos",
            href: safeRoute(
                "servicios.reparacionNeoprenos",
                undefined,
                "/servicios/reparacion-neoprenos",
            ),
        },
    ];

    const masLinks = [
        {
            label: "Alquiler de tablas",
            href: safeRoute("rentals.surfboards.index"),
            featured: true,
        },
    ];
    if (isAuth) {
        // Solo menú cliente (admin no llega aquí). Acceso a reservas propias de alquiler.
        masLinks.push({
            label: "Mis reservas · alquileres",
            href: `${safeRoute("my-reservations.index")}?tab=rentals`,
        });
    }
    masLinks.push(
        {
            label: "Comparador de maniobras",
            href: safeRoute("autocoach.index"),
        },
        {
            label: "Fotografía",
            href: safeRoute("servicios.fotografia"),
        },
        {
            label: "Videograbaciones",
            href: safeRoute("servicios.videograbaciones"),
        },
        {
            label: "Blog educativo",
            href: safeRoute("taller.index"),
        },
        {
            label: "Sobre nosotros",
            href: safeRoute("nosotros"),
        },
    );

    return [
        {
            type: "link",
            id: "inicio",
            label: "Inicio",
            href: safeRoute("Pag_principal"),
        },
        {
            type: "flyout",
            id: "clases",
            label: "Clases",
            groups: [{ title: "Clases", links: clasesLinks }],
        },
        {
            type: "flyout",
            id: "mar",
            label: "La Zurriola",
            shortLabel: "Zurriola",
            groups: [{ title: "Webcam y parte", links: marLinks }],
        },
        {
            type: "flyout",
            id: "club",
            label: "Club",
            groups: [{ title: "Club y taquillas", links: clubLinks }],
        },
        {
            type: "flyout",
            id: "tienda",
            label: "Tienda",
            groups: [{ title: "Tienda", links: tiendaLinks }],
        },
        {
            type: "flyout",
            id: "reparaciones",
            label: "Reparaciones",
            shortLabel: "Reparac.",
            groups: [{ title: "Reparaciones", links: reparacionesLinks }],
        },
        {
            type: "flyout",
            id: "mas",
            label: "Más",
            groups: [{ title: "Más", links: masLinks }],
        },
        contactoLink,
    ];
}

function scrollToHrefHash(href) {
    const hash =
        typeof href === "string" && href.includes("#")
            ? href.split("#")[1]
            : "";
    if (!hash) {
        return;
    }
    window.setTimeout(() => {
        document.getElementById(hash)?.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });
    }, 120);
}

function FlyoutGroup({ group }) {
    return (
        <div className="min-w-0">
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-300/70">
                {group.title}
            </h3>
            <ul className="space-y-1.5">
                {group.links.map((link) => (
                    <li key={link.label}>
                        <PressRipple
                            as={Link}
                            href={link.href}
                            onClick={() => scrollToHrefHash(link.href)}
                            className="block rounded-lg py-1.5 pr-2 text-sm text-slate-400 transition-colors hover:text-white"
                        >
                            {link.label}
                        </PressRipple>
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
        user?.has_physical_locker === true ||
        String(user?.has_physical_locker) === "1";
    const cartCount = Number(props?.cart?.count ?? props?.cartCount ?? 0);

    const menus = buildMenus({
        isAdmin,
        isAuth,
        isVip,
        hasLocker,
    });

    const baseId = useId();
    const closeTimerRef = useRef(null);
    const [activeMenuId, setActiveMenuId] = useState(null);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [mobileSection, setMobileSection] = useState(null);
    const [mobileAccountOpen, setMobileAccountOpen] = useState(false);
    const [accountOpen, setAccountOpen] = useState(false);
    const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
    const accountWrapRef = useRef(null);
    const accountCloseTimerRef = useRef(null);

    const clearAccountCloseTimer = useCallback(() => {
        if (accountCloseTimerRef.current) {
            window.clearTimeout(accountCloseTimerRef.current);
            accountCloseTimerRef.current = null;
        }
    }, []);

    const openAccountMenu = useCallback(() => {
        clearAccountCloseTimer();
        setAccountOpen(true);
    }, [clearAccountCloseTimer]);

    const scheduleAccountClose = useCallback(() => {
        clearAccountCloseTimer();
        accountCloseTimerRef.current = window.setTimeout(
            () => setAccountOpen(false),
            HOVER_CLOSE_DELAY_MS,
        );
    }, [clearAccountCloseTimer]);

    const performLogout = useCallback(() => {
        setLogoutConfirmOpen(false);
        setMobileOpen(false);
        setAccountOpen(false);
        router.post(safeRoute("logout"));
    }, []);

    const activeMenu =
        menus.find((m) => m.id === activeMenuId && m.type === "flyout") ?? null;
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
        closeTimerRef.current = window.setTimeout(
            () => setActiveMenuId(null),
            HOVER_CLOSE_DELAY_MS,
        );
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

    // Cerrar menú de cuenta al clic fuera (no al cruzar el hueco hacia el panel).
    useEffect(() => {
        if (!accountOpen) return;
        const onPointerDown = (e) => {
            const root = accountWrapRef.current;
            if (root && !root.contains(e.target)) {
                setAccountOpen(false);
            }
        };
        document.addEventListener("pointerdown", onPointerDown);
        return () => document.removeEventListener("pointerdown", onPointerDown);
    }, [accountOpen]);

    useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);
    useEffect(() => () => clearAccountCloseTimer(), [clearAccountCloseTimer]);

    // Diálogo de logout: Escape lo cierra y bloquea el scroll del body mientras está abierto.
    useEffect(() => {
        if (!logoutConfirmOpen) return;
        const onKeyDown = (e) => {
            if (e.key === "Escape") setLogoutConfirmOpen(false);
        };
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.body.style.overflow = prevOverflow;
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [logoutConfirmOpen]);

    useEffect(() => {
        if (!mobileOpen) setMobileAccountOpen(false);
    }, [mobileOpen]);

    const accountLinks = [
        { label: "Editar mi cuenta", href: safeRoute("profile.edit") },
    ];
    // Admin: no listar Mis Pedidos/Reservas/facturas aquí — ya tiene Gestión; evita duplicar con el rol cliente.
    if (!isAdmin) {
        accountLinks.push(
            {
                label: "Mis clases reservadas",
                href: `${safeRoute("my-reservations.index")}?tab=classes`,
            },
            {
                label: "Mis alquileres",
                href: `${safeRoute("my-reservations.index")}?tab=rentals`,
            },
            { label: "Mis Pedidos", href: safeRoute("pedidos") },
            { label: "Mis facturas", href: safeRoute("my-invoices.index") },
        );
        if (hasLocker) {
            accountLinks.push({
                label: "Me quedé sin llave",
                href: safeRoute("emergency-key.show"),
            });
        }
        if (isVip) {
            accountLinks.push(
                { label: "Mi Perfil", href: safeRoute("my-profile.index") },
                { label: "Recargar bono", href: safeRoute("bonos.index") },
            );
        }
    }

    /** Móvil «Mi espacio»: mismos links personales sin duplicar Editar mi cuenta. */
    const mobileSpaceLinks = accountLinks.filter(
        (link) => link.label !== "Editar mi cuenta",
    );

    return (
        <div
            className="relative w-full bg-[#071326] text-slate-100"
            onMouseLeave={scheduleClose}
        >
            <nav
                aria-label="Navegación global"
                className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6"
            >
                <Link
                    href={safeRoute("Pag_principal")}
                    aria-label="San Sebastián Surf School — Inicio"
                    className="inline-flex shrink-0 items-center gap-2.5"
                >
                    <BrandLogo
                        variant="whiteNav"
                        className="h-10 w-10 sm:h-11 sm:w-11"
                        priority
                    />
                    {/* Nombre largo solo en desktop ancho; en tablet libera sitio al menú */}
                    <span className="hidden text-sm font-bold leading-tight text-white xl:inline">
                        San Sebastián Surf School
                    </span>
                </Link>

                <ul className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 lg:flex xl:gap-1">
                    {menus.map((menu) => {
                        if (menu.type === "link") {
                            return (
                                <li
                                    key={menu.id}
                                    className="list-none"
                                    onMouseEnter={closePanel}
                                >
                                    <PressRipple
                                        as={Link}
                                        href={menu.href}
                                        onClick={() =>
                                            scrollToHrefHash(menu.href)
                                        }
                                        className={NAV_LINK_CLASS}
                                    >
                                        <NavLabel
                                            label={menu.label}
                                            shortLabel={menu.shortLabel}
                                        />
                                    </PressRipple>
                                </li>
                            );
                        }
                        const expanded = activeMenuId === menu.id;
                        return (
                            <li
                                key={menu.id}
                                className="list-none"
                                onMouseEnter={() => openMenu(menu.id)}
                            >
                                <PressRipple
                                    as="button"
                                    type="button"
                                    id={`${baseId}-trigger-${menu.id}`}
                                    aria-expanded={expanded}
                                    aria-haspopup="true"
                                    active={expanded}
                                    onFocus={() => openMenu(menu.id)}
                                    className={`${NAV_FLYOUT_BTN_BASE} ${expanded ? "text-white" : "text-slate-400 hover:text-white"}`}
                                >
                                    <NavLabel
                                        label={menu.label}
                                        shortLabel={menu.shortLabel}
                                    />
                                    <ChevronDown
                                        className={`h-3.5 w-3.5 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
                                    />
                                </PressRipple>
                            </li>
                        );
                    })}
                </ul>

                <div className="flex shrink-0 items-center gap-2">
                    {isAuth && !isAdmin ? (
                        <Link
                            href={safeRoute("carrito", undefined, "/carrito")}
                            aria-label="Carrito"
                            title="Ver carrito"
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
                                onClick={() => setLogoutConfirmOpen(true)}
                                title="Cerrar sesión"
                                className="group inline-flex items-center gap-1.5 rounded-xl border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-300"
                            >
                                Salir
                                <LogOut className="h-3.5 w-3.5 shrink-0 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden />
                            </button>
                            <div
                                ref={accountWrapRef}
                                className="relative"
                                onMouseEnter={openAccountMenu}
                                onMouseLeave={scheduleAccountClose}
                            >
                                {/* Hit-area ampliada ~20px alrededor del icono */}
                                <div
                                    className="absolute -inset-5 z-0"
                                    aria-hidden
                                />
                                <button
                                    type="button"
                                    aria-label="Mi cuenta"
                                    aria-expanded={accountOpen}
                                    aria-haspopup="menu"
                                    onClick={() =>
                                        setAccountOpen((v) => !v)
                                    }
                                    className="relative z-10 inline-flex h-9 items-center gap-0.5 rounded-full pl-1.5 pr-1.5 text-slate-200 transition-colors hover:bg-white/10 hover:text-cyan-300"
                                >
                                    <UserCircle className="h-6 w-6 shrink-0" aria-hidden />
                                    <ChevronDown
                                        className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200 ${
                                            accountOpen ? "rotate-180 text-cyan-300" : ""
                                        }`}
                                        aria-hidden
                                    />
                                </button>
                                <div
                                    role="menu"
                                    className={`absolute right-0 top-full z-dropdown w-56 transition-all ${
                                        accountOpen
                                            ? "pointer-events-auto opacity-100"
                                            : "pointer-events-none -translate-y-1 opacity-0"
                                    }`}
                                    style={{ paddingTop: HOVER_BRIDGE_PX }}
                                >
                                    <div className="rounded-2xl border border-white/10 bg-[#040b16] p-2 shadow-xl">
                                        <AccountMenuIdentity user={user} />
                                        {accountLinks.map((link) => (
                                            <PressRipple
                                                key={link.label}
                                                as={Link}
                                                href={link.href}
                                                role="menuitem"
                                                onClick={() =>
                                                    setAccountOpen(false)
                                                }
                                                className="block rounded-xl py-2 pl-3 pr-3 text-sm font-medium text-slate-400 transition-colors hover:text-white"
                                            >
                                                {link.label}
                                            </PressRipple>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="hidden items-center gap-1.5 lg:flex">
                            <PressRipple
                                as={Link}
                                href={safeRoute("login")}
                                className="rounded-xl px-3 py-1.5 pl-3 text-xs font-semibold text-slate-400 transition-colors hover:text-white"
                            >
                                Acceder
                            </PressRipple>
                            <Link
                                href={safeRoute("register")}
                                className="rounded-xl bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-cyan-950/40 transition-colors hover:bg-cyan-500"
                            >
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
                        {mobileOpen ? (
                            <XIcon className="h-5 w-5" />
                        ) : (
                            <MenuIcon className="h-5 w-5" />
                        )}
                    </button>
                </div>
            </nav>

            {/* Puente invisible ~20px entre la barra y el flyout */}
            {panelOpen ? (
                <div
                    className="absolute inset-x-0 top-full z-[39] h-5 -translate-y-full"
                    onMouseEnter={clearCloseTimer}
                    aria-hidden
                />
            ) : null}

            {/* Panel flyout a todo el ancho (desktop) - fondo solido azulado */}
            <div
                className={`absolute left-0 right-0 top-full w-full overflow-hidden border-t border-white/10 bg-[#040b16] shadow-2xl transition-[max-height,opacity] duration-300 ease-out ${panelOpen ? "max-h-[min(70vh,520px)] opacity-100" : "pointer-events-none max-h-0 opacity-0"}`}
                onMouseEnter={clearCloseTimer}
                onMouseLeave={scheduleClose}
            >
                {activeMenu ? (
                    <div
                        role="region"
                        aria-labelledby={`${baseId}-trigger-${activeMenu.id}`}
                        className="mx-auto max-h-[min(70vh,520px)] max-w-7xl overflow-y-auto overscroll-contain px-6 py-5 sm:py-6"
                    >
                        <div className="grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-12 lg:gap-y-8">
                            {activeMenu.groups.map((group) => (
                                <FlyoutGroup key={group.title} group={group} />
                            ))}
                        </div>
                    </div>
                ) : null}
            </div>

            {/* Menu movil (acordeon): auth arriba, navegación debajo */}
            {mobileOpen ? (
                <div className="border-t border-white/10 bg-[#040b16] lg:hidden">
                    <div className="mx-auto max-w-7xl px-4 py-3">
                        {isAuth ? (
                            <div className="mb-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-500/15 text-cyan-200 ring-1 ring-cyan-400/25">
                                        <UserCircle className="h-5 w-5" aria-hidden />
                                    </div>
                                    <div className="min-w-0 flex-1 pt-0.5">
                                        <AccountMenuIdentity
                                            user={user}
                                            compact
                                            nameAside={
                                                <Link
                                                    href={safeRoute("profile.edit")}
                                                    onClick={() => setMobileOpen(false)}
                                                    aria-label="Editar mi cuenta"
                                                    title="Editar mi cuenta"
                                                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-white/5 hover:text-cyan-300"
                                                >
                                                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                                                </Link>
                                            }
                                        />
                                    </div>
                                    <PressRipple
                                        as="button"
                                        type="button"
                                        onClick={() => setLogoutConfirmOpen(true)}
                                        title="Cerrar sesión"
                                        aria-label="Cerrar sesión"
                                        className="group inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-red-500/10 hover:text-red-300 active:bg-red-500/10 active:text-red-300"
                                    >
                                        <LogOut
                                            className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover:translate-x-0.5"
                                            aria-hidden
                                        />
                                    </PressRipple>
                                </div>
                            </div>
                        ) : (
                            <div className="mb-3 rounded-2xl border border-cyan-400/20 bg-gradient-to-b from-cyan-500/10 to-transparent p-3">
                                <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-cyan-300/80">
                                    Tu cuenta
                                </p>
                                <p className="mb-2.5 text-[11px] leading-snug text-slate-400">
                                    Reserva clases y gestiona tu bono desde tu cuenta.
                                </p>
                                <div className="flex gap-2">
                                    <PressRipple
                                        as={Link}
                                        href={safeRoute("login")}
                                        onClick={() => setMobileOpen(false)}
                                        className="flex flex-1 items-center justify-center rounded-xl border border-white/15 bg-white/5 py-2.5 pl-3 pr-3 text-center text-sm font-semibold text-slate-200 transition-colors hover:border-white/25 hover:text-white"
                                    >
                                        Acceder
                                    </PressRipple>
                                    <Link
                                        href={safeRoute("register")}
                                        onClick={() => setMobileOpen(false)}
                                        className="flex flex-1 items-center justify-center rounded-xl bg-cyan-600 px-3 py-2.5 text-center text-sm font-semibold text-white shadow-sm shadow-cyan-950/40 transition-colors hover:bg-cyan-500"
                                    >
                                        Registrarse
                                    </Link>
                                </div>
                            </div>
                        )}

                        {menus.map((menu) => {
                            if (menu.type === "link") {
                                return (
                                    <PressRipple
                                        key={menu.id}
                                        as={Link}
                                        href={menu.href}
                                        onClick={() => {
                                            setMobileOpen(false);
                                            scrollToHrefHash(menu.href);
                                        }}
                                        className="block w-full border-b border-white/5 py-3 pl-3 text-sm font-semibold text-slate-100 last:border-0"
                                    >
                                        {menu.label}
                                    </PressRipple>
                                );
                            }
                            const open = mobileSection === menu.id;
                            return (
                                <div
                                    key={menu.id}
                                    className="border-b border-white/5 last:border-0"
                                >
                                    <PressRipple
                                        as="button"
                                        type="button"
                                        aria-expanded={open}
                                        onClick={() =>
                                            setMobileSection(
                                                open ? null : menu.id,
                                            )
                                        }
                                        className="flex w-full items-center justify-between py-3 pl-3 text-left text-sm font-semibold text-slate-100"
                                    >
                                        {menu.label}
                                        <ChevronDown
                                            className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
                                        />
                                    </PressRipple>
                                    {open ? (
                                        <div className="pb-3">
                                            {menu.groups.map((group) => (
                                                <div
                                                    key={group.title}
                                                    className="mb-2"
                                                >
                                                    <p className="mb-1 text-[11px] uppercase tracking-wider text-cyan-300/70">
                                                        {group.title}
                                                    </p>
                                                    {group.links.map((link) => (
                                                        <PressRipple
                                                            key={link.label}
                                                            as={Link}
                                                            href={link.href}
                                                            onClick={() => {
                                                                setMobileOpen(
                                                                    false,
                                                                );
                                                                scrollToHrefHash(
                                                                    link.href,
                                                                );
                                                            }}
                                                            className="block w-full rounded-lg py-2 pl-3 pr-2 text-sm text-slate-400 hover:text-white"
                                                        >
                                                            {link.label}
                                                        </PressRipple>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    ) : null}
                                </div>
                            );
                        })}

                        {isAuth && mobileSpaceLinks.length > 0 ? (
                            <div className="border-b border-white/5">
                                <PressRipple
                                    as="button"
                                    type="button"
                                    aria-expanded={mobileAccountOpen}
                                    onClick={() =>
                                        setMobileAccountOpen((v) => !v)
                                    }
                                    className="flex w-full items-center justify-between gap-2 py-3 pl-3 pr-2 text-left"
                                >
                                    <span className="min-w-0">
                                        <span className="block text-sm font-semibold text-slate-100">
                                            Mi espacio
                                        </span>
                                        <span className="mt-0.5 block text-[11px] font-normal text-slate-500">
                                            Clases, pedidos, alquileres, bonos…
                                        </span>
                                    </span>
                                    <ChevronDown
                                        className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
                                            mobileAccountOpen ? "rotate-180" : ""
                                        }`}
                                        aria-hidden
                                    />
                                </PressRipple>
                                {mobileAccountOpen ? (
                                    <div className="space-y-0.5 pb-3">
                                        {mobileSpaceLinks.map((link) => (
                                            <PressRipple
                                                key={link.label}
                                                as={Link}
                                                href={link.href}
                                                onClick={() =>
                                                    setMobileOpen(false)
                                                }
                                                className="block w-full rounded-lg py-2 pl-3 pr-2 text-sm text-slate-400 transition-colors hover:text-white"
                                            >
                                                {link.label}
                                            </PressRipple>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                </div>
            ) : null}

            {/* Dialogo de confirmacion de cierre de sesion */}
            {logoutConfirmOpen ? (
                <div
                    className="fixed inset-0 z-modal grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm"
                    onClick={() => setLogoutConfirmOpen(false)}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="logout-confirm-title"
                >
                    <div
                        className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#040b16] p-6 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="mb-4 flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-300 ring-1 ring-red-400/25">
                                <LogOut className="h-5 w-5" aria-hidden />
                            </div>
                            <div>
                                <h3
                                    id="logout-confirm-title"
                                    className="text-sm font-bold text-white"
                                >
                                    ¿Cerrar sesión?
                                </h3>
                                <p className="text-xs text-slate-400">
                                    Volverás a la zona pública de la tienda.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                autoFocus
                                onClick={() => setLogoutConfirmOpen(false)}
                                className="flex-1 rounded-xl border border-white/15 px-3 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/10 hover:text-white"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={performLogout}
                                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm shadow-red-950/40 transition-colors hover:bg-red-500"
                            >
                                <LogOut className="h-4 w-4 shrink-0" aria-hidden />
                                Salir
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
