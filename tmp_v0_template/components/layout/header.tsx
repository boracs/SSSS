"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  ChevronDown,
  Bell,
  User,
  ShoppingCart,
  LogIn,
  Waves,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { NavItem, User as UserType, Notification } from "@/types";

// ============================================
// TYPES
// ============================================
interface HeaderProps {
  navigation: NavItem[];
  user?: UserType | null;
  notifications?: Notification[];
  cartItemsCount?: number;
  onLogin?: () => void;
  onLogout?: () => void;
  className?: string;
}

// ============================================
// SUBCOMPONENTS
// ============================================

// Logo Component
function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 group">
      <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground transition-transform group-hover:scale-105">
        <Waves className="h-5 w-5" />
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-bold leading-none text-foreground">
          San Sebastián
        </span>
        <span className="text-xs font-medium text-muted-foreground">
          Surf School
        </span>
      </div>
    </Link>
  );
}

// Desktop Navigation Item
function DesktopNavItem({ item }: { item: NavItem }) {
  const hasChildren = item.children && item.children.length > 0;

  if (hasChildren) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            {item.label}
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          {item.children?.map((child) => (
            <DropdownMenuItem key={child.href} asChild>
              <Link href={child.href} className="flex items-center gap-2">
                {child.label}
                {child.badge && (
                  <Badge variant="secondary" className="ml-auto text-[10px]">
                    {child.badge}
                  </Badge>
                )}
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Link
      href={item.href}
      className={cn(
        "relative px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
        "after:absolute after:bottom-0 after:left-3 after:right-3 after:h-0.5 after:scale-x-0 after:bg-accent after:transition-transform after:duration-200",
        "hover:after:scale-x-100"
      )}
    >
      {item.label}
      {item.badge && (
        <Badge
          variant="destructive"
          className="ml-1.5 h-4 min-w-4 px-1 text-[10px]"
        >
          {item.badge}
        </Badge>
      )}
    </Link>
  );
}

// Notification Bell
function NotificationBell({
  notifications = [],
}: {
  notifications?: Notification[];
}) {
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4.5 w-4.5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
          <span className="sr-only">Notificaciones</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificaciones</span>
          {unreadCount > 0 && (
            <Badge variant="secondary">{unreadCount} sin leer</Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            No tienes notificaciones
          </div>
        ) : (
          notifications.slice(0, 5).map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className={cn(
                "flex flex-col items-start gap-1 py-3",
                !notification.read && "bg-accent/5"
              )}
            >
              <span className="font-medium">{notification.title}</span>
              <span className="text-xs text-muted-foreground line-clamp-2">
                {notification.message}
              </span>
            </DropdownMenuItem>
          ))
        )}
        {notifications.length > 5 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                href="/notifications"
                className="justify-center text-accent"
              >
                Ver todas
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// User Menu
function UserMenu({
  user,
  onLogout,
}: {
  user: UserType;
  onLogout?: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <span className="text-sm font-medium">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <span className="sr-only">Menú de usuario</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-1">
            <p className="font-medium">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard">Mi Panel</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/reservas">Mis Reservas</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/perfil">Mi Perfil</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onLogout}
          className="text-destructive focus:text-destructive"
        >
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Mobile Menu
function MobileMenu({
  isOpen,
  navigation,
  user,
  onClose,
  onLogin,
  onLogout,
}: {
  isOpen: boolean;
  navigation: NavItem[];
  user?: UserType | null;
  onClose: () => void;
  onLogin?: () => void;
  onLogout?: () => void;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
            onClick={onClose}
          />

          {/* Menu Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-sm glass-dark lg:hidden"
          >
            <div className="flex h-full flex-col">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
                <Logo />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="text-white hover:bg-white/10"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Navigation */}
              <nav className="flex-1 overflow-y-auto px-4 py-6">
                <ul className="space-y-1">
                  {navigation.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                      >
                        {item.label}
                        {item.badge && (
                          <Badge variant="destructive" className="ml-auto">
                            {item.badge}
                          </Badge>
                        )}
                      </Link>
                      {item.children && (
                        <ul className="ml-6 mt-1 space-y-1">
                          {item.children.map((child) => (
                            <li key={child.href}>
                              <Link
                                href={child.href}
                                onClick={onClose}
                                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/60 transition-colors hover:bg-white/5 hover:text-white/80"
                              >
                                {child.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>

              {/* Footer Actions */}
              <div className="border-t border-white/10 p-4">
                {user ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 rounded-lg bg-white/5 p-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground">
                        <span className="font-medium">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-white">{user.name}</p>
                        <p className="text-xs text-white/60">{user.email}</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full border-white/20 text-white hover:bg-white/10"
                      onClick={onLogout}
                    >
                      Cerrar sesión
                    </Button>
                  </div>
                ) : (
                  <Button className="w-full" onClick={onLogin}>
                    <LogIn className="mr-2 h-4 w-4" />
                    Iniciar sesión
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================
export function Header({
  navigation,
  user,
  notifications = [],
  cartItemsCount = 0,
  onLogin,
  onLogout,
  className,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b border-border/50 bg-background/80 backdrop-blur-lg",
        className
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Logo />

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 lg:flex">
          {navigation.map((item) => (
            <DesktopNavItem key={item.href} item={item} />
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Cart */}
          <Button variant="ghost" size="icon" className="relative" asChild>
            <Link href="/carrito">
              <ShoppingCart className="h-4.5 w-4.5" />
              {cartItemsCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-medium text-accent-foreground">
                  {cartItemsCount > 9 ? "9+" : cartItemsCount}
                </span>
              )}
              <span className="sr-only">Carrito</span>
            </Link>
          </Button>

          {/* Notifications (only for logged in users) */}
          {user && <NotificationBell notifications={notifications} />}

          {/* User Menu / Login */}
          {user ? (
            <UserMenu user={user} onLogout={onLogout} />
          ) : (
            <Button
              onClick={onLogin}
              className="hidden gap-2 sm:inline-flex"
            >
              <LogIn className="h-4 w-4" />
              Iniciar sesión
            </Button>
          )}

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Abrir menú</span>
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={mobileMenuOpen}
        navigation={navigation}
        user={user}
        onClose={() => setMobileMenuOpen(false)}
        onLogin={onLogin}
        onLogout={onLogout}
      />
    </header>
  );
}

// Default navigation export
export const defaultNavigation: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Nosotros", href: "/nosotros" },
  {
    label: "Clases",
    href: "/clases",
    children: [
      { label: "Clases de Surf", href: "/clases/surf" },
      { label: "Surfskate", href: "/clases/surfskate" },
      { label: "Surf Trips", href: "/clases/surftrips" },
    ],
  },
  { label: "Alquiler Tablas", href: "/alquiler" },
  { label: "Contacto", href: "/contacto" },
  { label: "Tienda", href: "/tienda" },
];
