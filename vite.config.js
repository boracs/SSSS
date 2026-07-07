import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import laravel from "laravel-vite-plugin";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROUTE_HELPER = path.resolve(__dirname, "resources/js/lib/route.js");
const ROUTE_IMPORT_RE = /import\s+\{\s*route\s*\}\s+from\s+['"]@route['"]/;
const ROUTE_HELPER_RE = /resources[\\/]js[\\/]lib[\\/]route\.js$/;

/** Inyecta import de route en módulos que lo usan sin importarlo (ESM no expone window.route como global). */
function injectRouteImport() {
  return {
    name: "inject-route-import",
    enforce: "pre",
    transform(code, id) {
      if (!id.includes("resources/js/") && !id.includes("resources\\js\\")) {
        return null;
      }
      if (ROUTE_HELPER_RE.test(id) || id.endsWith("bootstrap.js")) {
        return null;
      }
      if (!/\broute\s*\(/.test(code) || ROUTE_IMPORT_RE.test(code)) {
        return null;
      }
      return {
        code: `import { route } from "@route";\n${code}`,
        map: null,
      };
    },
  };
}

export default defineConfig({
  plugins: [
    laravel({
      // Grafo de entradas: debe coincidir exactamente con @vite() en resources/views/app.blade.php
      input: ["resources/css/app.css", "resources/js/app.jsx"],
      refresh: true,
    }),
    react(),
    injectRouteImport(),
  ],
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      "@route": ROUTE_HELPER,
    },
  },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }
          if (id.includes("lucide-react")) {
            return "vendor-icons";
          }
          // Solo librerías sin runtime React (framer-motion, inertia, radix, etc. → vendor-react).
          const nonReactVendor = [
            "firebase/",
            "date-fns",
            "/zod/",
            "remark-gfm",
            "micromark",
            "mdast-",
            "unist-",
            "devlop",
          ];
          if (nonReactVendor.some((pkg) => id.includes(pkg))) {
            return "vendor-misc";
          }
          return "vendor-react";
        },
      },
    },
  },
  server: {
    // Compatible con local Windows y Docker. En local, Vite sirve en localhost:5173 (ver public/hot).
    host: "localhost",
    port: 5173,
    strictPort: true,
    hmr: { host: "localhost" },
  },
});
