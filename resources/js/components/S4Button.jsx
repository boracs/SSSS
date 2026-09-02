import React from "react";
import { Link } from "@inertiajs/react";
import { cn } from "@/lib/utils";

const VARIANT_CLASS = {
    primary: "s4-btn-primary",
    secondary: "s4-btn-secondary",
    onMedia: "s4-btn-on-media",
    ghost: "s4-btn-ghost",
    accent: "s4-btn-accent",
};

const SIZE_CLASS = {
    sm: "s4-btn--sm",
    md: "s4-btn--md",
    lg: "s4-btn--lg",
};

/**
 * CTA S4 reutilizable (button | Link Inertia | <a> externo).
 * Tokens: resources/css/app.css (.s4-btn*).
 */
export default function S4Button({
    href,
    external = false,
    variant = "primary",
    size = "md",
    className = "",
    children,
    type = "button",
    ...props
}) {
    const classes = cn(
        "s4-btn",
        VARIANT_CLASS[variant] ?? VARIANT_CLASS.primary,
        SIZE_CLASS[size] ?? SIZE_CLASS.md,
        className,
    );

    if (href) {
        const isExternal =
            external ||
            href.startsWith("http") ||
            href.startsWith("mailto:") ||
            href.startsWith("tel:");

        if (isExternal) {
            return (
                <a href={href} className={classes} {...props}>
                    {children}
                </a>
            );
        }

        if (href.startsWith("#")) {
            return (
                <a href={href} className={classes} {...props}>
                    {children}
                </a>
            );
        }

        return (
            <Link href={href} className={classes} {...props}>
                {children}
            </Link>
        );
    }

    return (
        <button type={type} className={classes} {...props}>
            {children}
        </button>
    );
}
