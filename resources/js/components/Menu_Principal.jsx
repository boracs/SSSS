import React, { useState } from "react";
import { usePage, Link, router } from "@inertiajs/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faShoppingCart,
    faUser,
    faBars,
} from "@fortawesome/free-solid-svg-icons"; // Íconos
import { ChevronDownIcon } from "@heroicons/react/24/solid"; // Ícono de flecha
import Dropdown from "../components/Dropdown";
import { useCartContext } from "../../js/Contexts/cartContext";
import ToggleMenu from "../components/ToggleMenu";

const Menu_Principal = ({ headerVariant = "solid" }) => {
    const { cartCount } = useCartContext();
    const { auth } = usePage().props;
    const isHero = headerVariant === "hero";
    const user = auth?.user;
    const isAdmin = user && String(user.role) === "admin";
    const hasTaquilla = user && Number(user.numeroTaquilla) > 0;
    const [menuOpen, setMenuOpen] = useState(false);

    const toggleMenu = () => {
        setMenuOpen(!menuOpen);
    };

    // Servicios: un solo dropdown (Alquiler Material, Clases de Surf, Tienda) para mantener menú en una línea
    const menuItemsServicios = [
        { href: "rentals.surfboards.index", label: "Alquiler Material" },
        { href: user ? "academy.lessons.index" : "servicios.surf", label: "Clases de Surf" },
        { href: "tienda", label: "Tienda" },
    ];

    // Admin: Gestores (un solo dropdown)
    const menuItemsGestores = [
        { href: "admin.surfboards.index", label: "Gestor Alquileres" },
        { href: "admin.academy.index", label: "Gestor Clases" },
        { href: "asignar.taquilla.mostrar", label: "Gestor Taquillas" },
        { href: "taquilla.index.admin", label: "Pagos.T" },
        { href: "gestor.pedidos", label: "Gestor Pedidos" },
    ];

    const handleLogout = async () => {
        try {
            // Logout directo por Axios para no depender del estado de Inertia
            await window?.axios?.post?.(route("logout"));
        } catch {
            // Si hay error (incl. 419), forzamos salida igual
        } finally {
            window.location.href = "/";
        }
    };

    const navBg = isHero ? "bg-transparent" : "bg-white/95 shadow-sm border-b border-slate-200/60";
    const textLink = isHero ? "text-white/90 hover:text-brand-accent" : "text-brand-deep/90 hover:text-brand-accent";
    const textLogo = isHero ? "text-white group-hover:text-brand-accent" : "text-brand-deep group-hover:text-brand-accent";
    const logoBadge = "bg-brand-accent text-white";
    const lineBg = isHero ? "bg-white/20" : "bg-slate-200/60";

    return (
        <nav className={`${navBg} transition-all duration-300 ease-out`}>
            <div className={`w-full h-px ${lineBg}`} />
            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
                {/* Logo / Marca S4 */}
                <Link
                    href={route("Pag_principal")}
                    className="flex items-center gap-2 group"
                >
                    <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full font-heading text-sm font-extrabold tracking-[0.15em] ${logoBadge}`}>
                        S4
                    </span>
                    <span className={`font-heading text-lg sm:text-xl font-semibold tracking-tight transition-s4 truncate max-w-[10rem] sm:max-w-none ${textLogo}`}>
                        San Sebastian Surf School
                    </span>
                </Link>

                {/* Menú desktop: una sola línea (flex-nowrap), Servicios y Gestores agrupados */}
                <div className="hidden lg:flex lg:flex-nowrap lg:items-center lg:gap-4 xl:gap-5 shrink min-w-0">
                    <Link href={route("Pag_principal")} className={`${textLink} shrink-0 whitespace-nowrap text-sm font-medium`}>
                        Inicio
                    </Link>
                    <Link href={route("nosotros")} className={`${textLink} shrink-0 whitespace-nowrap text-sm font-medium`}>
                        Nosotros
                    </Link>
                    <ToggleMenu menuItems={menuItemsServicios}>
                        <div className="flex items-center gap-0.5 cursor-pointer group shrink-0">
                            <span className={`${textLink} whitespace-nowrap text-sm font-medium`}>Servicios</span>
                            <ChevronDownIcon className={`w-4 h-4 shrink-0 ${isHero ? "text-white/80" : "text-brand-deep/80"}`} />
                        </div>
                    </ToggleMenu>
                    {(!user || !isAdmin) && (
                        <Link href={route("contacto")} className={`${textLink} shrink-0 whitespace-nowrap text-sm font-medium`}>
                            Contacto
                        </Link>
                    )}
                    {user && !isAdmin && (
                        <>
                            <Link href={route("pedidos")} className={`${textLink} shrink-0 whitespace-nowrap text-sm font-medium`}>
                                Pedidos
                            </Link>
                            {hasTaquilla && (
                                <Link href={route("taquillas.index.client")} className={`${textLink} shrink-0 whitespace-nowrap text-sm font-medium`}>
                                    Pago.T
                                </Link>
                            )}
                            {hasTaquilla ? (
                                <Link href={route("carrito")} className={`flex items-center gap-1.5 shrink-0 ${textLink} text-sm font-medium`}>
                                    <FontAwesomeIcon icon={faShoppingCart} className="shrink-0" />
                                    <span className="whitespace-nowrap">Carrito</span>
                                    {cartCount > 0 && (
                                        <span className="bg-brand-accent text-white text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
                                            {cartCount}
                                        </span>
                                    )}
                                </Link>
                            ) : (
                                <button
                                    type="button"
                                    className={`flex items-center shrink-0 ${isHero ? "text-white/60" : "text-slate-400"} cursor-not-allowed relative group text-sm font-medium`}
                                    disabled
                                    title="Necesitas una taquilla para acceder al carrito"
                                >
                                    <FontAwesomeIcon icon={faShoppingCart} className="mr-1" />
                                    <span className="whitespace-nowrap">Carrito</span>
                                </button>
                            )}
                        </>
                    )}
                    {isAdmin && (
                        <>
                            <Link href={route("mostrar.productos")} className={`${textLink} shrink-0 whitespace-nowrap text-sm font-medium`}>
                                Productos
                            </Link>
                            <ToggleMenu menuItems={menuItemsGestores}>
                                <div className="flex items-center gap-0.5 cursor-pointer group shrink-0">
                                    <span className={`${textLink} whitespace-nowrap text-sm font-medium`}>Gestores</span>
                                    <ChevronDownIcon className={`w-4 h-4 shrink-0 ${isHero ? "text-white/80" : "text-brand-deep/80"}`} />
                                </div>
                            </ToggleMenu>
                            <Link href={route("admin.bookings.index")} className={`${textLink} shrink-0 whitespace-nowrap text-sm font-medium`}>
                                Reserva de tablas
                            </Link>
                        </>
                    )}
                </div>

                {/* Menú de Cuenta (Login/Register o Perfil) */}
                <div className="flex items-center space-x-4">
                    {user ? (
                        <Dropdown>
                            <Dropdown.Trigger>
                                <span className="inline-flex rounded-md">
                                    <span className={`mx-5 text-lg font-extrabold ${isHero ? "text-white" : "text-brand-deep"}`}>
                                        ! Hola{" "}
                                        <span className={isHero ? "text-green-300" : "text-brand-accent"}>
                                            {user.nombre}...
                                        </span>{" "}
                                        ¡
                                    </span>
                                    <button
                                        type="button"
                                        className="inline-flex items-center rounded-md border border-transparent bg-brand-accent px-3 py-2 text-sm font-medium leading-4 text-white hover:bg-brand-accent/90 transition-all duration-300 focus:outline-none"
                                    >
                                        <FontAwesomeIcon
                                            icon={faUser}
                                            className="mr-2"
                                        />
                                        {user.name || "Mi cuenta"}
                                        <ChevronDownIcon className="-me-0.5 ms-2 h-4 w-4" />
                                    </button>
                                </span>
                            </Dropdown.Trigger>
                            <Dropdown.Overlay />
                            <Dropdown.Content>
                                <Dropdown.Action
                                    onClick={() =>
                                        router.get(route("profile.edit"))
                                    }
                                >
                                    Perfil
                                </Dropdown.Action>
                                <Dropdown.Action
                                    onClick={handleLogout}
                                >
                                    Cerrar sesión
                                </Dropdown.Action>
                            </Dropdown.Content>
                        </Dropdown>
                    ) : (
                        <Dropdown>
                            <Dropdown.Trigger>
                                <span className="inline-flex rounded-md">
                                    <button
                                        type="button"
                                        className="inline-flex items-center rounded-md border border-transparent bg-brand-accent px-3 py-2 text-sm font-medium leading-4 text-white hover:bg-brand-accent/90 transition-all duration-300 focus:outline-none"
                                    >
                                        <FontAwesomeIcon icon={faUser} className="mr-2" />
                                        Cuenta
                                        <ChevronDownIcon className="-me-0.5 ms-2 h-4 w-4" />
                                    </button>
                                </span>
                            </Dropdown.Trigger>
                            <Dropdown.Overlay />
                            <Dropdown.Content>
                                <Dropdown.Action
                                    onClick={() =>
                                        router.get(route("login"))
                                    }
                                >
                                    Login
                                </Dropdown.Action>
                                <Dropdown.Action
                                    onClick={() =>
                                        router.get(route("register"))
                                    }
                                >
                                    Register
                                </Dropdown.Action>
                            </Dropdown.Content>
                        </Dropdown>
                    )}
                </div>

                {/* ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////// */}
                {/* ////////////////////////////////////////////MENU MOVIL DESPLEGABLE///////////////////////////////////////////////////////// */}
                {/* ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////// */}
                {/* Menú desplegable en dispositivos móviles */}

                {/* Menú hamburguesa para móviles */}
                <button
                    onClick={toggleMenu}
                    className="lg:hidden flex flex-col space-y-1.5 p-2 focus:outline-none"
                >
                    <FontAwesomeIcon
                        icon={faBars}
                        className={`w-6 h-6 ${isHero ? "text-white hover:text-brand-accent" : "text-brand-deep hover:text-brand-accent"} transition-s4`}
                    />
                </button>
            </div>

            <div className={`lg:hidden ${menuOpen ? "block" : "hidden"} border-t border-slate-200/60 bg-brand-deep shadow-lg`}>
                <div className="px-4 py-3 space-y-1">
                    <Link href={route("Pag_principal")} className="block rounded-xl px-3 py-2 text-sm font-medium text-white hover:bg-white/10 hover:text-brand-accent transition-all duration-300">
                        Inicio
                    </Link>
                    <Link href={route("nosotros")} className="block rounded-xl px-3 py-2 text-sm font-medium text-white hover:bg-white/10 hover:text-brand-accent transition-all duration-300">
                        Nosotros
                    </Link>
                    <ToggleMenu menuItems={menuItemsServicios}>
                        <div className="flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-white hover:bg-white/10 cursor-pointer">
                            <span>Servicios</span>
                            <ChevronDownIcon className="w-4 h-4" />
                        </div>
                    </ToggleMenu>
                    <Link href={route("contacto")} className="block rounded-xl px-3 py-2 text-sm font-medium text-white hover:bg-white/10 hover:text-brand-accent transition-all duration-300">
                        Contacto
                    </Link>
                    {user && !isAdmin && (
                        <>
                            <Link href={route("pedidos")} className="block rounded-xl px-3 py-2 text-sm font-medium text-white hover:bg-white/10 hover:text-brand-accent transition-all duration-300">
                                Pedidos
                            </Link>
                            {hasTaquilla && (
                                <Link href={route("taquillas.index.client")} className="block rounded-xl px-3 py-2 text-sm font-medium text-white hover:bg-white/10 hover:text-brand-accent transition-all duration-300">
                                    Pago.T
                                </Link>
                            )}
                            {hasTaquilla ? (
                                <Link href={route("carrito")} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-white hover:bg-white/10 hover:text-brand-accent transition-all duration-300">
                                    <FontAwesomeIcon icon={faShoppingCart} /> Carrito
                                    {cartCount > 0 && <span className="bg-brand-accent text-white text-xs rounded-full px-1.5 py-0.5">{cartCount}</span>}
                                </Link>
                            ) : (
                                <span className="block rounded-xl px-3 py-2 text-sm text-white/50">Carrito (requiere taquilla)</span>
                            )}
                        </>
                    )}
                    {isAdmin && (
                        <>
                            <Link href={route("mostrar.productos")} className="block rounded-xl px-3 py-2 text-sm font-medium text-white hover:bg-white/10 hover:text-brand-accent transition-all duration-300">
                                Productos
                            </Link>
                            <ToggleMenu menuItems={menuItemsGestores}>
                                <div className="flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-white hover:bg-white/10 cursor-pointer">
                                    <span>Gestores</span>
                                    <ChevronDownIcon className="w-4 h-4" />
                                </div>
                            </ToggleMenu>
                            <Link href={route("admin.bookings.index")} className="block rounded-xl px-3 py-2 text-sm font-medium text-white hover:bg-white/10 hover:text-brand-accent transition-all duration-300">
                                Reserva de tablas
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Menu_Principal;
