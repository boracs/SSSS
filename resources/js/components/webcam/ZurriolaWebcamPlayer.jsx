import React, { useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2, Radio } from "lucide-react";

const HLS_SRC =
    "https://58f14c0895a20.streamlock.net/camaramar/GIP_zurriola_169.stream/playlist.m3u8";
const HLS_JS = "https://cdn.jsdelivr.net/npm/hls.js@1.5.15/dist/hls.min.js";

function loadHlsScript() {
    if (typeof window !== "undefined" && window.Hls) {
        return Promise.resolve();
    }
    const existing = document.querySelector(`script[src="${HLS_JS}"]`);
    if (existing) {
        return new Promise((resolve, reject) => {
            existing.addEventListener("load", () => resolve(), { once: true });
            existing.addEventListener("error", reject, { once: true });
        });
    }
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = HLS_JS;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("No se pudo cargar el reproductor"));
        document.head.appendChild(script);
    });
}

export default function ZurriolaWebcamPlayer() {
    const videoRef = useRef(null);
    const hlsRef = useRef(null);
    const [status, setStatus] = useState("loading");
    const [errorMsg, setErrorMsg] = useState("");

    useEffect(() => {
        let cancelled = false;
        const video = videoRef.current;
        if (!video) return undefined;

        const cleanup = () => {
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
            video.removeAttribute("src");
            video.load();
        };

        const start = async () => {
            try {
                setStatus("loading");
                setErrorMsg("");

                if (video.canPlayType("application/vnd.apple.mpegurl")) {
                    video.src = HLS_SRC;
                    await video.play().catch(() => {});
                    if (!cancelled) setStatus("live");
                    return;
                }

                await loadHlsScript();
                if (cancelled || !window.Hls?.isSupported()) {
                    throw new Error("Tu navegador no soporta la reproducción en directo");
                }

                const hls = new window.Hls({ enableWorker: true, lowLatencyMode: true });
                hlsRef.current = hls;
                hls.loadSource(HLS_SRC);
                hls.attachMedia(video);
                hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
                    if (cancelled) return;
                    video.play().catch(() => {});
                    setStatus("live");
                });
                hls.on(window.Hls.Events.ERROR, (_event, data) => {
                    if (cancelled || !data.fatal) return;
                    setStatus("error");
                    setErrorMsg("No se pudo conectar con la cámara en directo.");
                });
            } catch (err) {
                if (!cancelled) {
                    setStatus("error");
                    setErrorMsg(err?.message || "Error al cargar la webcam.");
                }
            }
        };

        start();

        return () => {
            cancelled = true;
            cleanup();
        };
    }, []);

    return (
        <div className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-slate-950 shadow-2xl shadow-cyan-950/40">
            <div className="flex items-center justify-between border-b border-white/10 bg-slate-900/80 px-4 py-3">
                <div className="flex items-center gap-2">
                    <span
                        className={`inline-flex h-2.5 w-2.5 rounded-full ${
                            status === "live" ? "animate-pulse bg-red-500" : "bg-slate-500"
                        }`}
                        aria-hidden
                    />
                    <span className="text-sm font-semibold text-white">Playa de Zurriola</span>
                    {status === "live" ? (
                        <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-300">
                            En directo
                        </span>
                    ) : null}
                </div>
                <Radio className="h-4 w-4 text-cyan-400" aria-hidden />
            </div>

            <div className="relative aspect-video bg-black">
                <video
                    ref={videoRef}
                    className="h-full w-full object-cover"
                    controls
                    playsInline
                    muted
                    autoPlay
                    title="Webcam en directo — Playa de Zurriola, Donostia"
                />

                {status === "loading" ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/70 text-cyan-100">
                        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
                        <p className="text-sm">Conectando con la cámara…</p>
                    </div>
                ) : null}

                {status === "error" ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/90 px-6 text-center">
                        <AlertCircle className="h-8 w-8 text-amber-400" />
                        <p className="text-sm text-slate-200">{errorMsg}</p>
                        <p className="text-xs text-slate-500">
                            Puedes ver la imagen en la web oficial de la Diputación de Gipuzkoa.
                        </p>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
