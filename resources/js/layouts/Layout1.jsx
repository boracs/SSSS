import React from "react";

export default function Layout1({ children }) {
    return (
        <div className="min-h-screen bg-slate-100 text-slate-900">
            <main>{children}</main>
        </div>
    );
}
