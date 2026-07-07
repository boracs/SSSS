/**
 * Genera variantes WebP/PNG del logo patrocinador The Bunker Surf Shop.
 * Fuentes: public/img/sponsors/bunker/source/bunker-*-master.png
 * Uso: npm run sponsor:assets
 */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sponsorDir = path.join(root, "public/img/sponsors/bunker");
const sourceDir = path.join(sponsorDir, "source");

const SRC = {
    navy: path.join(sourceDir, "bunker-navy-master.png"),
    white: path.join(sourceDir, "bunker-white-master.png"),
};

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

function stripDarkBackdropPixels(data) {
    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 8) continue;

        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const avg = (r + g + b) / 3;
        const spread = Math.max(r, g, b) - Math.min(r, g, b);

        const isDarkNavyBg = spread < 35 && avg < 55;
        if (isDarkNavyBg) {
            data[i + 3] = 0;
        }
    }
}

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

async function loadProcessedBuffer(srcPath, { mode = "navy" } = {}) {
    const { data, info } = await sharp(srcPath)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

    const pixels = Buffer.from(data);

    if (mode === "navy") {
        stripBackdropPixels(pixels);
        stripDarkBackdropPixels(pixels);
    } else if (mode === "white-from-navy") {
        stripBackdropPixels(pixels);
        stripDarkBackdropPixels(pixels);
        navyToWhitePixels(pixels);
    } else if (mode === "white") {
        stripBackdropPixels(pixels);
        stripDarkBackdropPixels(pixels);
    }

    return sharp(pixels, {
        raw: { width: info.width, height: info.height, channels: 4 },
    }).png();
}

async function exportVariant(pipeline, baseName, height) {
    const webp = path.join(sponsorDir, `${baseName}.webp`);
    const png = path.join(sponsorDir, `${baseName}.png`);

    const sized = pipeline.clone().resize({ height, withoutEnlargement: true });

    await sized.clone().webp({ quality: 86, effort: 6, alphaQuality: 95 }).toFile(webp);
    await sized.clone().png({ compressionLevel: 9, palette: false }).toFile(png);

    const meta = await sharp(webp).metadata();
    return { webp, png, width: meta.width, height: meta.height };
}

async function main() {
    await mkdir(sponsorDir, { recursive: true });
    await mkdir(sourceDir, { recursive: true });

    const navyPipeline = await loadProcessedBuffer(SRC.navy, { mode: "navy" });
    const whitePipeline = await loadProcessedBuffer(SRC.white, { mode: "white" });

    const variants = [
        ["bunker-white-nav", whitePipeline, 36],
        ["bunker-white-mark", whitePipeline, 64],
        ["bunker-white-hero", whitePipeline, 120],
        ["bunker-navy-nav", navyPipeline, 36],
        ["bunker-navy-mark", navyPipeline, 64],
        ["bunker-navy-hero", navyPipeline, 120],
    ];

    for (const [name, pipeline, h] of variants) {
        const out = await exportVariant(pipeline, name, h);
        console.log(`✓ ${name} → ${out.width}x${out.height}`);
    }

    for (const [label, pipeline] of [
        ["bunker-navy-full", navyPipeline],
        ["bunker-white-full", whitePipeline],
    ]) {
        await exportVariant(pipeline, label, 400);
        console.log(`✓ ${label} (master)`);
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
