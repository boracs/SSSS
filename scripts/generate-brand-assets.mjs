/**
 * Genera variantes WebP/PNG del logo S4 y favicons.
 * Fuentes: public/img/brand/source/logo-s4-*-master.png
 * Uso: npm run brand:assets
 */
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const brandDir = path.join(root, "public/img/brand");
const sourceDir = path.join(brandDir, "source");
const publicDir = path.join(root, "public");

const SRC = {
    navy: path.join(sourceDir, "logo-s4-navy-master.png"),
    white: path.join(sourceDir, "logo-s4-white-master.png"),
};

/** Marca transparente el checkerboard y fondos claros de la IA. */
function stripBackdropPixels(data) {
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const avg = (r + g + b) / 3;
        const spread = Math.max(r, g, b) - Math.min(r, g, b);

        const isNeutralLight = spread < 28 && avg > 175;
        const isPureWhite = r > 248 && g > 248 && b > 248;

        if (isNeutralLight || isPureWhite) {
            data[i + 3] = 0;
        }
    }
}

/** Convierte tintes navy oscuros a blanco (nav sobre fondo #071326). */
function navyToWhitePixels(data) {
    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 8) continue;

        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const isDarkNavy = r < 95 && g < 110 && b < 140 && b >= g - 20;
        if (isDarkNavy) {
            data[i] = 255;
            data[i + 1] = 255;
            data[i + 2] = 255;
        }
    }
}

/** Quita el relleno gris del logo blanco generado por IA. */
function stripGreyBadgeFill(data) {
    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 8) continue;

        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const spread = Math.max(r, g, b) - Math.min(r, g, b);
        const avg = (r + g + b) / 3;

        const isGreyFill = spread < 22 && avg > 95 && avg < 210;
        if (isGreyFill) {
            data[i + 3] = 0;
        }
    }
}

async function loadProcessedBuffer(srcPath, { mode = "navy" } = {}) {
    const { data, info } = await sharp(srcPath)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

    const pixels = Buffer.from(data);

    if (mode === "navy") {
        stripBackdropPixels(pixels);
    } else if (mode === "white-from-navy") {
        stripBackdropPixels(pixels);
        navyToWhitePixels(pixels);
    } else if (mode === "white") {
        stripBackdropPixels(pixels);
        stripGreyBadgeFill(pixels);
    }

    return sharp(pixels, {
        raw: { width: info.width, height: info.height, channels: 4 },
    }).png();
}

async function exportVariant(pipeline, baseName, height) {
    const webp = path.join(brandDir, `${baseName}.webp`);
    const png = path.join(brandDir, `${baseName}.png`);

    const sized = pipeline.clone().resize({ height, withoutEnlargement: true });

    await sized.clone().webp({ quality: 86, effort: 6, alphaQuality: 95 }).toFile(webp);
    await sized.clone().png({ compressionLevel: 9, palette: false }).toFile(png);

    const meta = await sharp(webp).metadata();
    return { webp, png, width: meta.width, height: meta.height };
}

async function buildFavicons(navyPipeline) {
    // Logo navy/color sobre fondo blanco → legible en splash PWA (fondo claro).
    const logoMaster = await navyPipeline.clone().trim().png().toBuffer();
    const bg = { r: 255, g: 255, b: 255, alpha: 1 };

    async function makeIcon(size, paddingRatio, fileName) {
        const inner = Math.round(size * (1 - paddingRatio * 2));
        const logo = await sharp(logoMaster)
            .resize(inner, inner, {
                fit: "contain",
                background: { r: 0, g: 0, b: 0, alpha: 0 },
            })
            .png()
            .toBuffer();

        await sharp({
            create: { width: size, height: size, channels: 4, background: bg },
        })
            .composite([{ input: logo, gravity: "centre" }])
            .png({ compressionLevel: 9 })
            .toFile(path.join(publicDir, fileName));
    }

    await makeIcon(16, 0.06, "favicon-16.png");
    await makeIcon(32, 0.06, "favicon-32.png");
    await makeIcon(48, 0.06, "favicon-48.png");
    await makeIcon(180, 0.08, "apple-touch-icon.png");
    await makeIcon(192, 0.08, "favicon-192.png");
    await makeIcon(512, 0.08, "favicon-512.png");
    await makeIcon(512, 0.18, "favicon-512-maskable.png");

    await sharp(path.join(publicDir, "favicon-32.png")).toFile(path.join(publicDir, "favicon.ico"));

    await sharp(path.join(publicDir, "favicon-512.png"))
        .webp({ quality: 85 })
        .toFile(path.join(brandDir, "og-share.webp"));
    await sharp(path.join(publicDir, "favicon-512.png"))
        .jpeg({ quality: 82, mozjpeg: true })
        .toFile(path.join(brandDir, "og-share.jpg"));
}

async function buildFaviconSvg() {
    // SVG = logo real embebido (nada de ola/placeholder genérico).
    const png = await sharp(path.join(publicDir, "favicon-192.png")).png().toBuffer();
    const b64 = png.toString("base64");
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 192 192" role="img" aria-label="San Sebastián Surf School">
  <image width="192" height="192" xlink:href="data:image/png;base64,${b64}"/>
</svg>
`;
    await writeFile(path.join(publicDir, "favicon.svg"), svg, "utf8");
}

async function main() {
    await mkdir(brandDir, { recursive: true });
    await mkdir(sourceDir, { recursive: true });

    const navyPipeline = await loadProcessedBuffer(SRC.navy, { mode: "navy" });
    const whitePipeline = await loadProcessedBuffer(SRC.navy, { mode: "white-from-navy" });

    const variants = [
        ["logo-white-nav", whitePipeline, 44],
        ["logo-white-hero", whitePipeline, 168],
        ["logo-white-mark", whitePipeline, 88],
        ["logo-navy-nav", navyPipeline, 44],
        ["logo-navy-hero", navyPipeline, 168],
        ["logo-navy-mark", navyPipeline, 88],
    ];

    for (const [name, pipeline, h] of variants) {
        const out = await exportVariant(pipeline, name, h);
        console.log(`✓ ${name} → ${out.width}x${out.height}`);
    }

    for (const [label, pipeline] of [
        ["logo-navy-full", navyPipeline],
        ["logo-white-full", whitePipeline],
    ]) {
        await exportVariant(pipeline, label, 512);
        console.log(`✓ ${label} (master)`);
    }

    await buildFavicons(navyPipeline);
    await buildFaviconSvg();
    console.log("✓ favicons + og-share generados en public/");
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
