import React from "react";
import { Link } from "@inertiajs/react";

/**
 * Migas de pan. items: [{ label, href? }]. El último sin href es la página actual.
 */
export default function Breadcrumbs({ items = [], className = "", variant = "light" }) {
    if (!items?.length) return null;

    const isDark = variant === "dark";
    const rootClass = isDark ? "text-gray-300" : "text-slate-600";
    const separatorClass = isDark ? "text-gray-500" : "text-slate-400";
    const currentClass = isDark ? "font-medium text-gray-100" : "font-medium text-slate-900";
    const linkClass = isDark
        ? "text-gray-200 transition-colors duration-300 ease-in-out hover:text-white"
        : "transition-colors duration-300 ease-in-out hover:text-brand-primary";

    return (
        <nav aria-label="Breadcrumb" className={className}>
            <ol className={`flex flex-wrap items-center gap-1 text-sm ${rootClass}`}>
                {items.map((item, i) => {
                    const isLast = i === items.length - 1;
                    return (
                        <li key={i} className="flex items-center gap-1">
                            {i > 0 && (
                                <span className={separatorClass} aria-hidden>
                                    /
                                </span>
                            )}
                            {isLast || !item.href ? (
                                <span className={currentClass}>
                                    {item.label}
                                </span>
                            ) : (
                                <Link
                                    href={item.href}
                                    className={linkClass}
                                >
                                    {item.label}
                                </Link>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
