import { Link, usePage } from "@inertiajs/react";
import { useEffect, useMemo, useOptimistic, useState } from "react";
import {
    BookOpen,
    Contact,
    GraduationCap,
    KeyRound,
    LayoutDashboard,
    PackageCheck,
    ShieldAlert,
    ShoppingBag,
    ShoppingCart,
    Star,
    Surfboard,
    Users,
    Waves,
} from "lucide-react";
import {
    NavigationMenu,
    NavigationMenuContent,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";

type SharedUser = {
    role?: "admin" | "user" | string;
    is_vip?: boolean;
    hasActiveLocker?: boolean;
    has_active_locker?: boolean;
};

type SharedProps = {
    auth?: {
        user?: SharedUser;
    };
    cart?: {
        count?: number;
    };
    cartCount?: number;
};

type QuickLink = {
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    startsWith: string;
};

export default function NavigationMenuMain() {
    const { props, url } = usePage<SharedProps>();
    const user = props.auth?.user;
    const currentPath = String(url ?? "").split("?")[0];

    const isAdmin = user?.role === "admin";
    const isVip = Boolean(user?.is_vip);
    const hasActiveLocker = Boolean(user?.hasActiveLocker);
    const hasLockerAssigned = Boolean(user?.has_active_locker);
    const serverCartCount = Number(props.cart?.count ?? props.cartCount ?? 0);

    const [systemTheme, setSystemTheme] = useState<"dark" | "light">("dark");
    const [optimisticCartCount, setOptimisticCartCount] = useOptimistic<
        number,
        number
    >(serverCartCount, (_previous, next) => next);
    const [optimisticPath, setOptimisticPath] = useOptimistic<string, string>(
        currentPath,
        (_previous, next) => next,
    );

    useEffect(() => {
        setOptimisticCartCount(serverCartCount);
    }, [serverCartCount, setOptimisticCartCount]);

    useEffect(() => {
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const applyTheme = () =>
            setSystemTheme(mediaQuery.matches ? "dark" : "light");

        applyTheme();
        mediaQuery.addEventListener("change", applyTheme);

        return () => mediaQuery.removeEventListener("change", applyTheme);
    }, []);

    const darkMode = systemTheme === "dark";
    const visualPath = optimisticPath || currentPath;

    const navTone = darkMode
        ? "border-slate-800 bg-slate-950 text-slate-100"
        : "border-slate-200 bg-white text-slate-900";

    const linkTone = darkMode
        ? "text-slate-400 hover:text-sky-400 data-[active=true]:text-sky-400"
        : "text-slate-600 hover:text-sky-600 data-[active=true]:text-sky-600";

    const quickLinks = useMemo<QuickLink[]>(() => {
        const links: QuickLink[] = [
            {
                label: "Nosotros",
                href: route("nosotros"),
                icon: Users,
                startsWith: "/nosotros",
            },
            {
                label: "Contacto",
                href: route("contacto"),
                icon: Contact,
                startsWith: "/contacto",
            },
            {
                label: "Reservas",
                href: route("my-reservations.index"),
                icon: BookOpen,
                startsWith: "/mis-reservas",
            },
            ...(isVip
                ? [
                      {
                          label: "Bonos",
                          href: route("bonos.index"),
                          icon: Star,
                          startsWith: "/bonos",
                      },
                  ]
                : []),
            ...(hasActiveLocker
                ? [
                      {
                          label: "Me quedé sin llave",
                          href: route("emergency-key.show"),
                          icon: KeyRound,
                          startsWith: "/profile/me-quede-sin-llave",
                      },
                  ]
                : []),
            ...(hasLockerAssigned
                ? [
                      {
                          label: "Pedidos",
                          href: route("pedidos"),
                          icon: PackageCheck,
                          startsWith: "/pedidos",
                      },
                  ]
                : []),
            ...(isAdmin
                ? [
                      {
                          label: "Admin",
                          href: route("admin.emergency-keys.index"),
                          icon: LayoutDashboard,
                          startsWith: "/admin/emergency-keys",
                      },
                  ]
                : []),
        ];

        return links;
    }, [hasActiveLocker, hasLockerAssigned, isAdmin, isVip]);

    return (
        <div className={cn("w-full rounded-2xl border px-3 py-2", navTone)}>
            <div className="flex w-full items-center justify-between gap-3">
                <NavigationMenu
                    viewport={false}
                    className="w-full max-w-none justify-start"
                >
                    <NavigationMenuList className="w-full flex-wrap items-center justify-start gap-1">
                        <NavigationMenuItem>
                            <NavigationMenuTrigger
                                className={cn(
                                    "h-9 rounded-lg bg-transparent px-2.5 text-xs font-semibold md:text-sm",
                                    linkTone,
                                )}
                            >
                                Servicios
                            </NavigationMenuTrigger>
                            <NavigationMenuContent
                                className={cn(
                                    "min-w-[260px] rounded-xl border p-2 shadow-md",
                                    navTone,
                                )}
                            >
                                <ul className="space-y-1">
                                    <li>
                                        <NavigationMenuLink asChild>
                                            <Link
                                                href={route(
                                                    "academy.lessons.index",
                                                )}
                                                onClick={() =>
                                                    setOptimisticPath(
                                                        "/academia",
                                                    )
                                                }
                                                className={cn(
                                                    "flex items-center gap-2 rounded-lg px-2 py-2 text-sm",
                                                    darkMode
                                                        ? "hover:bg-slate-900 hover:text-sky-400"
                                                        : "hover:bg-slate-100 hover:text-sky-600",
                                                )}
                                            >
                                                <GraduationCap className="h-4 w-4 text-sky-500" />
                                                Clases
                                            </Link>
                                        </NavigationMenuLink>
                                    </li>
                                    <li>
                                        <NavigationMenuLink asChild>
                                            <Link
                                                href={route(
                                                    "rentals.surfboards.index",
                                                )}
                                                onClick={() =>
                                                    setOptimisticPath(
                                                        "/tablas-alquiler",
                                                    )
                                                }
                                                className={cn(
                                                    "flex items-center gap-2 rounded-lg px-2 py-2 text-sm",
                                                    darkMode
                                                        ? "hover:bg-slate-900 hover:text-sky-400"
                                                        : "hover:bg-slate-100 hover:text-sky-600",
                                                )}
                                            >
                                                <Surfboard className="h-4 w-4 text-sky-500" />
                                                Tablas
                                            </Link>
                                        </NavigationMenuLink>
                                    </li>
                                    {hasLockerAssigned ? (
                                        <li>
                                            <NavigationMenuLink asChild>
                                                <Link
                                                    href={route(
                                                        "taquillas.index.client",
                                                    )}
                                                    onClick={() =>
                                                        setOptimisticPath(
                                                            "/taquilla/planes",
                                                        )
                                                    }
                                                    className={cn(
                                                        "flex items-center gap-2 rounded-lg px-2 py-2 text-sm",
                                                        darkMode
                                                            ? "hover:bg-slate-900 hover:text-sky-400"
                                                            : "hover:bg-slate-100 hover:text-sky-600",
                                                    )}
                                                >
                                                    <Waves className="h-4 w-4 text-emerald-500" />
                                                    A. Taquilla
                                                </Link>
                                            </NavigationMenuLink>
                                        </li>
                                    ) : null}
                                </ul>
                            </NavigationMenuContent>
                        </NavigationMenuItem>

                        <NavigationMenuItem>
                            <NavigationMenuTrigger
                                className={cn(
                                    "h-9 rounded-lg bg-transparent px-2.5 text-xs font-semibold md:text-sm",
                                    linkTone,
                                )}
                            >
                                Tienda
                            </NavigationMenuTrigger>
                            <NavigationMenuContent
                                className={cn(
                                    "min-w-[240px] rounded-xl border p-2 shadow-md",
                                    navTone,
                                )}
                            >
                                <ul className="space-y-1">
                                    <li>
                                        <NavigationMenuLink asChild>
                                            <Link
                                                href={route("tienda")}
                                                onClick={() =>
                                                    setOptimisticPath("/tienda")
                                                }
                                                className={cn(
                                                    "flex items-center gap-2 rounded-lg px-2 py-2 text-sm",
                                                    darkMode
                                                        ? "hover:bg-slate-900 hover:text-sky-400"
                                                        : "hover:bg-slate-100 hover:text-sky-600",
                                                )}
                                            >
                                                <ShoppingBag className="h-4 w-4 text-sky-500" />
                                                Tienda oficial S4
                                            </Link>
                                        </NavigationMenuLink>
                                    </li>
                                    {user && String(user.role) !== "admin" ? (
                                        <li>
                                            <NavigationMenuLink asChild>
                                                <Link
                                                    href={route("pedidos")}
                                                    onClick={() =>
                                                        setOptimisticPath("/pedidos")
                                                    }
                                                    className={cn(
                                                        "flex items-center gap-2 rounded-lg px-2 py-2 text-sm",
                                                        darkMode
                                                            ? "hover:bg-slate-900 hover:text-sky-400"
                                                            : "hover:bg-slate-100 hover:text-sky-600",
                                                    )}
                                                >
                                                    <PackageCheck className="h-4 w-4 text-sky-500" />
                                                    Mis Pedidos
                                                </Link>
                                            </NavigationMenuLink>
                                        </li>
                                    ) : null}
                                    <li>
                                        <NavigationMenuLink asChild>
                                            <Link
                                                href={route(
                                                    "second-hand.index",
                                                )}
                                                onClick={() =>
                                                    setOptimisticPath(
                                                        "/tablas-segunda-mano",
                                                    )
                                                }
                                                className={cn(
                                                    "flex items-center gap-2 rounded-lg px-2 py-2 text-sm",
                                                    darkMode
                                                        ? "hover:bg-slate-900 hover:text-sky-400"
                                                        : "hover:bg-slate-100 hover:text-sky-600",
                                                )}
                                            >
                                                <ShieldAlert className="h-4 w-4 text-sky-500" />
                                                Segunda Mano
                                            </Link>
                                        </NavigationMenuLink>
                                    </li>
                                </ul>
                            </NavigationMenuContent>
                        </NavigationMenuItem>

                        {quickLinks.map((link) => {
                            const Icon = link.icon;
                            const isActive = visualPath.startsWith(
                                link.startsWith,
                            );
                            return (
                                <NavigationMenuItem key={link.label}>
                                    <NavigationMenuLink
                                        asChild
                                        data-active={isActive}
                                    >
                                        <Link
                                            href={link.href}
                                            onClick={() =>
                                                setOptimisticPath(
                                                    link.startsWith,
                                                )
                                            }
                                            className={cn(
                                                "inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors md:text-sm",
                                                linkTone,
                                            )}
                                        >
                                            <Icon
                                                className={cn(
                                                    "h-4 w-4",
                                                    link.label === "Bonos"
                                                        ? "text-amber-400"
                                                        : "text-sky-500",
                                                )}
                                            />
                                            <span>{link.label}</span>
                                            {link.label ===
                                            "Me quedé sin llave" ? (
                                                <span
                                                    className={cn(
                                                        "rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase",
                                                        darkMode
                                                            ? "bg-sky-500/15 text-sky-300"
                                                            : "bg-sky-100 text-sky-700",
                                                    )}
                                                >
                                                    Emergencia
                                                </span>
                                            ) : null}
                                        </Link>
                                    </NavigationMenuLink>
                                </NavigationMenuItem>
                            );
                        })}
                    </NavigationMenuList>
                </NavigationMenu>

                <Link
                    href={route("carrito")}
                    onClick={() => {
                        setOptimisticPath("/carrito");
                        setOptimisticCartCount(
                            Math.max(optimisticCartCount, serverCartCount),
                        );
                    }}
                    className={cn(
                        "relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors",
                        darkMode
                            ? "text-slate-200 hover:bg-slate-800 hover:text-sky-400"
                            : "text-slate-700 hover:bg-slate-100 hover:text-sky-600",
                    )}
                    aria-label="Abrir carrito"
                >
                    <ShoppingCart className="h-5 w-5" />
                    {optimisticCartCount > 0 ? (
                        <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white">
                            {optimisticCartCount}
                        </span>
                    ) : null}
                </Link>
            </div>
        </div>
    );
}
