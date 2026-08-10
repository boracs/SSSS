#!/usr/bin/env node
/**
 * deepseek-ask.mjs — Consulta a DeepSeek (API oficial) con contexto automático del repo.
 *
 * MOTIVACIÓN: DeepSeek-web no puede leer el repo y obliga a pegar archivos a mano.
 * Este script lee los archivos localmente y se los envía en la petición: sin copy-paste.
 * Reutiliza el master prompt (docs/taller-prompts/MASTER-PROMPT-DEEPSEEK.md) como
 * system prompt, con lo que el "router" se automatiza por tema.
 *
 * USO:
 *   node scripts/deepseek-ask.mjs "tu pregunta"
 *   node scripts/deepseek-ask.mjs "rediseña este modal" --topic diseño
 *   node scripts/deepseek-ask.mjs "pregunta" --topic ticket   (temas: ver docs/taller-prompts/RUTAS-CONTEXTO.json)
 *   node scripts/deepseek-ask.mjs "pregunta" --context docs/foo.md resources/js/Bar.jsx
 *   node scripts/deepseek-ask.mjs "pregunta" --model deepseek-reasoner
 *
 * CONFIG: DEEPSEEK_API_KEY en .env (o variable de entorno). Crearla en
 * https://platform.deepseek.com (API keys). La API es de pago (tokens), el chat web no.
 *
 * LIMITACIONES: solo texto (deepseek-chat/reasoner no ven imágenes). Contexto limitado:
 * el script recorta el contexto a ~100K caracteres para no reventar la ventana.
 */
import { readFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const MASTER_PATH = resolve(ROOT, "docs/taller-prompts/MASTER-PROMPT-DEEPSEEK.md");
const MAX_CTX_CHARS = 100_000; // ~25K tokens aprox (ventana DeepSeek 64K)

/** Router único: docs/taller-prompts/RUTAS-CONTEXTO.json (fuente máquina; vista humana en CONTRATO-IA.md §3). */
const ROUTER_PATH = resolve(ROOT, "docs/taller-prompts/RUTAS-CONTEXTO.json");
function loadRouter() {
    if (!existsSync(ROUTER_PATH)) {
        console.warn("⚠️  No existe RUTAS-CONTEXTO.json: --topic no adjuntará archivos");
        return {};
    }
    try {
        return JSON.parse(readFileSync(ROUTER_PATH, "utf8")).router || {};
    } catch (e) {
        console.warn("⚠️  RUTAS-CONTEXTO.json inválido:", e.message);
        return {};
    }
}

function readEnvKey() {
    if (process.env.DEEPSEEK_API_KEY) return process.env.DEEPSEEK_API_KEY;
    const envPath = resolve(ROOT, ".env");
    if (!existsSync(envPath)) return null;
    const line = readFileSync(envPath, "utf8")
        .split(/\r?\n/)
        .find((l) => /^DEEPSEEK_API_KEY\s*=/.test(l));
    if (!line) return null;
    return line.replace(/^DEEPSEEK_API_KEY\s*=\s*/, "").replace(/^["']|["']$/g, "").trim();
}

/** Expande una ruta: si es directorio, adjunta todos los .md que contiene (no recursivo). */
function expandPath(path) {
    const full = resolve(ROOT, path);
    if (!existsSync(full)) {
        console.warn(`⚠️  No existe: ${path} (se omite)`);
        return [];
    }
    if (statSync(full).isDirectory()) {
        return readdirSync(full).filter((f) => f.endsWith(".md")).sort().map((f) => resolve(full, f));
    }
    return [full];
}

function parseArgs(argv) {
    const out = { question: "", topics: [], files: [], model: "deepseek-chat" };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === "--topic") out.topics.push(argv[++i]?.toLowerCase() || "");
        else if (a === "--context") {
            while (argv[i + 1] && !argv[i + 1].startsWith("--")) out.files.push(argv[++i]);
        } else if (a === "--model") out.model = argv[++i] || "deepseek-chat";
        else if (!a.startsWith("--")) out.question += (out.question ? " " : "") + a;
    }
    return out;
}

async function main() {
    const { question, topics, files, model } = parseArgs(process.argv.slice(2));
    const TOPIC_FILES = loadRouter();
    if (!question) {
        const topics = Object.keys(loadRouter()).join("|");
        console.error(`Uso:
  node scripts/deepseek-ask.mjs "pregunta" [--topic ${topics}] [--context archivo...] [--model deepseek-reasoner]`);
        process.exit(1);
    }

    const apiKey = readEnvKey();
    if (!apiKey) {
        console.error("❌ Falta DEEPSEEK_API_KEY.\n  Crea una en https://platform.deepseek.com y añádela al .env:\n  DEEPSEEK_API_KEY=sk-...");
        process.exit(1);
    }

    // 1) System prompt = master prompt (núcleo + router de DeepSeek)
    const system = existsSync(MASTER_PATH)
        ? readFileSync(MASTER_PATH, "utf8")
        : "Eres un senior software architect y consultor de producto del proyecto S4 (Laravel 11 + React 19/Inertia). Respuesta en español.";

    // 2) Contexto = archivos por tema + archivos explícitos
    const paths = new Set();
    topics.forEach((t) => (TOPIC_FILES[t] || []).forEach((p) => expandPath(p).forEach((f) => paths.add(f))));
    files.forEach((f) => expandPath(f).forEach((p) => paths.add(p)));

    let ctx = "";
    for (const p of [...paths]) {
        const content = readFileSync(p, "utf8");
        const block = `\n===== ARCHIVO: ${p.replace(ROOT + "/", "")} =====\n${content}`;
        if (ctx.length + block.length > MAX_CTX_CHARS) {
            console.warn(`⚠️  Contexto máximo (${(MAX_CTX_CHARS / 1000).toFixed(0)}K chars): se omite ${p}`);
            break;
        }
        ctx += block;
    }

    const user = `${question}\n\n${ctx || "(sin contexto adicional)"}`;

    // 3) Llamada a la API
    const res = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
            model,
            messages: [
                { role: "system", content: system },
                { role: "user", content: user },
            ],
            stream: false,
        }),
    });

    if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.error(`❌ API DeepSeek ${res.status}: ${body.slice(0, 400)}`);
        process.exit(1);
    }

    const data = await res.json();
    const reply = data?.choices?.[0]?.message?.content;
    if (!reply) {
        console.error("❌ Respuesta vacía o inesperada:", JSON.stringify(data).slice(0, 400));
        process.exit(1);
    }
    console.log(reply);
    if (data.usage) console.log(`\n— tokens: ${data.usage.total_tokens} (${data.usage.prompt_tokens} entrada / ${data.usage.completion_tokens} salida)`);
}

main().catch((e) => {
    console.error("❌ Error:", e.message);
    process.exit(1);
});
