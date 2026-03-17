import { defineConfig } from "vite";
import laravel from "laravel-vite-plugin";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    laravel({
      // Grafo de entradas: debe coincidir exactamente con @vite() en resources/views/app.blade.php
      input: ["resources/css/app.css", "resources/js/app.jsx"],
      refresh: true,
    }),
    react(),
  ],
  server: {
    // Compatible con local Windows y Docker. En local, Vite sirve en localhost:5173 (ver public/hot).
    host: "localhost",
    port: 5173,
    strictPort: true,
    hmr: { host: "localhost" },
  },
});
