#!/usr/bin/env node
/**
 * C4 migration helper — one-shot Layout1 → PageShell
 * Run from repo root: node scripts/migrate-c4-pageshell.mjs
 */
import fs from "fs";
import path from "path";

const ROOT = path.resolve("resources/js");

const layoutReplacements = [
    ["Pages/Academy/Index.jsx", { shell: '<PageShell variant="slate">', innerStrip: /min-h-screen bg-slate-950 / }],
    ["Pages/Auctions/Index.jsx", { shell: '<PageShell variant="night">', innerStrip: /relative min-h-screen overflow-hidden bg-\[#070b14\]/, innerReplace: "relative overflow-hidden" }],
    ["Pages/Auctions/Show.jsx", { shell: '<PageShell variant="night">', innerStrip: /relative overflow-hidden bg-\[#070b14\]/, innerReplace: "relative overflow-hidden" }],
    ["Pages/Auctions/AccessRequired.jsx", { shell: '<PageShell variant="night">' }],
    ["Pages/SecondHand/Index.jsx", { shell: '<PageShell variant="slate">' }],
    ["Pages/SecondHand/Show.jsx", { shell: '<PageShell variant="slate">' }],
    ["Pages/AsignarTaquilla.jsx", { shell: '<PageShell variant="slate">', innerStrip: /relative min-h-screen overflow-hidden bg-slate-950 /, innerReplace: "relative overflow-hidden " }],
    ["Pages/Pag_principal.jsx", { shell: '<PageShell variant="light" className="bg-transparent">' }],
    ["Pages/Contacto.jsx", { shell: '<PageShell variant="light">' }],
    ["Pages/Nosotros.jsx", { shell: '<PageShell variant="light">' }],
    ["Pages/Tienda.jsx", { shell: '<PageShell variant="light">' }],
    ["Pages/Carrito.jsx", { shell: '<PageShell variant="light">' }],
    ["Pages/Taller/Index.jsx", { shell: '<PageShell variant="light">' }],
    ["Pages/Taller/Show.jsx", { shell: '<PageShell variant="light">' }],
    ["Pages/Productos.jsx", { shell: '<PageShell variant="light">' }],
    ["Pages/ProductoVer.jsx", { shell: '<PageShell variant="light">' }],
    ["Pages/Pedido.jsx", { shell: '<PageShell variant="light">' }],
    ["Pages/Pedidos.jsx", { shell: '<PageShell variant="light">' }],
    ["Pages/GestorPedidos.jsx", { shell: '<PageShell variant="light">' }],
    ["Pages/CrearProducto.jsx", { shell: '<PageShell variant="light">' }],
    ["Pages/ProductoCreado.jsx", { shell: '<PageShell variant="light">' }],
    ["Pages/ProductoModificado.jsx", { shell: '<PageShell variant="light">' }],
    ["Pages/Profile/MeQuedeSinLlave.jsx", { shell: '<PageShell variant="light">' }],
    ["Pages/Admin/Auctions/Index.jsx", { shell: '<PageShell variant="slate">' }],
    ["Pages/Admin/Auctions/Create.jsx", { shell: '<PageShell variant="slate">' }],
    ["Pages/Admin/Auctions/Edit.jsx", { shell: '<PageShell variant="slate">' }],
    ["Pages/Admin/SecondHand/Create.jsx", { shell: '<PageShell variant="slate">' }],
    ["Pages/Admin/SecondHand/Edit.jsx", { shell: '<PageShell variant="slate">' }],
    ["Pages/Admin/Chatbot/Index.jsx", { shell: '<PageShell variant="slate">' }],
    ["Pages/Admin/EmergencyKeys/Index.jsx", { shell: '<PageShell variant="slate">' }],
    ["Pages/Admin/Payments/Datafono/Index.jsx", { shell: '<PageShell variant="slate">' }],
    ["Pages/Admin/Taquillas/Vigencia.jsx", { shell: '<PageShell variant="slate">' }],
];

const gradientReplacements = [
    ["Pages/Servicios.jsx", "dark", "min-h-screen bg-gradient-to-b from-slate-950 via-[#0a2233] to-slate-950 text-white"],
    ["Pages/Servicios_ClasesDeSurf.jsx", "teal", "min-h-screen bg-gradient-to-b from-slate-950 via-[#0a2a33] to-slate-950 text-white"],
    ["Pages/Servicios_ReparacionNeoprenos.jsx", "royal", "min-h-screen bg-gradient-to-b from-slate-950 via-[#1a0f2e] to-slate-950 text-white"],
    ["Pages/Servicios_SurfSkate.jsx", "warm", "min-h-screen bg-gradient-to-b from-slate-950 via-[#241405] to-slate-950 text-white"],
    ["Pages/Servicios_SurfskateGuia.jsx", "warm", "min-h-screen bg-gradient-to-b from-slate-950 via-[#241405] to-slate-950 text-white"],
    ["Pages/Servicios_Videograbaciones.jsx", "teal", "min-h-screen bg-gradient-to-b from-slate-950 via-[#0a2a33] to-slate-950 text-white"],
    ["Pages/PlanesTaquillasPublic.jsx", "dark", "min-h-screen bg-gradient-to-b from-slate-950 via-[#0a2233] to-slate-950 text-white"],
];

function migrateLayoutFile(relPath, opts) {
    const filePath = path.join(ROOT, relPath);
    if (!fs.existsSync(filePath)) {
        console.warn("SKIP missing", relPath);
        return;
    }
    let src = fs.readFileSync(filePath, "utf8");
    if (!src.includes("Layout1")) {
        console.warn("SKIP no Layout1", relPath);
        return;
    }

    src = src.replace(/import Layout1 from ["'][^"']+["'];\n?/g, 'import PageShell from "@/layouts/PageShell";\n');
    src = src.replace(/<Layout1 className="bg-transparent">/g, opts.shell);
    src = src.replace(/<Layout1>/g, opts.shell);
    src = src.replace(/<\/Layout1>/g, "</PageShell>");

    if (opts.innerStrip && opts.innerReplace) {
        src = src.replace(opts.innerStrip, opts.innerReplace);
    } else if (opts.innerStrip) {
        src = src.replace(opts.innerStrip, "");
    }

    fs.writeFileSync(filePath, src);
    console.log("OK layout", relPath);
}

function migrateGradientFile(relPath, variant, oldClass) {
    const filePath = path.join(ROOT, relPath);
    if (!fs.existsSync(filePath)) {
        console.warn("SKIP missing", relPath);
        return;
    }
    let src = fs.readFileSync(filePath, "utf8");
    if (!src.includes(oldClass)) {
        console.warn("SKIP no gradient div", relPath);
        return;
    }
    if (!src.includes("PageShell")) {
        src = src.replace(/^import .+;\n/m, (m) => `${m}import PageShell from "@/layouts/PageShell";\n`);
    }
    src = src.replace(`<div className="${oldClass}">`, `<PageShell variant="${variant}" withGradient>`);
    const tail = src.lastIndexOf("\n    );");
    if (tail === -1) {
        console.warn("SKIP no tail", relPath);
        return;
    }
    const beforeTail = src.slice(0, tail);
    const lastDiv = beforeTail.lastIndexOf("</div>");
    if (lastDiv === -1) {
        console.warn("SKIP no closing div", relPath);
        return;
    }
    src = `${src.slice(0, lastDiv)}</PageShell>${src.slice(lastDiv + 6)}`;
    fs.writeFileSync(filePath, src);
    console.log("OK gradient", relPath);
}

function migrateAdminPageShell() {
    const filePath = path.join(ROOT, "components/admin/ui/AdminPageShell.jsx");
    let src = fs.readFileSync(filePath, "utf8");
    src = src.replace(/import Layout1 from ["'][^"']+["'];\n/, 'import PageShell from "@/layouts/PageShell";\n');
    src = src.replace("<Layout1>", '<PageShell variant="slate">');
    src = src.replace("</Layout1>", "</PageShell>");
    src = src.replace(/ \* Layout1 \+ fondo oscuro/, " * PageShell + fondo oscuro");
    fs.writeFileSync(filePath, src);
    console.log("OK AdminPageShell");
}

for (const [rel, opts] of layoutReplacements) {
    migrateLayoutFile(rel, opts);
}
for (const [rel, variant, oldClass] of gradientReplacements) {
    migrateGradientFile(rel, variant, oldClass);
}
migrateAdminPageShell();
console.log("Done.");
