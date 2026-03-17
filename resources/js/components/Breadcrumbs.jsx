import React from "react";
import { Link } from "@inertiajs/react";

/**
 * Migas de pan. items: [{ label, href? }]. El último sin href es la página actual.
 */
export default function Breadcrumbs({ items = [], className = "" }) {
    if (!items?.length) return null;

    return (
        <nav aria-label="Breadcrumb" className={className}>
            <ol className="flex flex-wrap items-center gap-1 text-sm text-slate-600">
                {items.map((item, i) => {
                    const isLast = i === items.length - 1;
                    return (
                        <li key={i} className="flex items-center gap-1">
                            {i > 0 && (
                                <span className="text-slate-400" aria-hidden>
                                    /
                                </span>
                            )}
                            {isLast || !item.href ? (
                                <span className="font-medium text-slate-900">
                                    {item.label}
                                </span>
                            ) : (
                                <Link
                                    href={item.href}
                                    className="hover:text-brand-primary transition-colors duration-300 ease-in-out"
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
