import React from "react";
import AdminPageShell from "@/components/admin/ui/AdminPageShell";
import LockerOccupancyMap from "@/components/admin/taquillas/LockerOccupancyMap";

export default function TaquillasEsquema({ lockerMap = null }) {
    return (
        <AdminPageShell
            headTitle="Esquema taquillas"
            title="Esquema taquillas"
            showCatalogTabs={false}
        >
            <LockerOccupancyMap lockerMap={lockerMap} />
        </AdminPageShell>
    );
}
