import React from "react";

export default function Layout1({ children, className = "" }) {
    return (
        <div
            className={`min-h-screen bg-white text-slate-900 dark:bg-gray-900 dark:text-gray-100 ${className}`.trim()}
        >
            <main>{children}</main>
        </div>
    );
}
