import React from "react";
import PublicLayout from "./PublicLayout";

/** Alias de PublicLayout — misma navegación global para usuarios autenticados. */
export default function AuthenticatedLayout({ children }) {
    return <PublicLayout>{children}</PublicLayout>;
}
