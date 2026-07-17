import React, { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2, Minus, Plus, Radio, RotateCcw } from "lucide-react";

const HLS_SRC =
    "https://58f14c0895a20.streamlock.net/camaramar/GIP_zurriola_169.stream/playlist.m3u8";
const HLS_JS = "https://cdn.jsdelivr.net/npm/hls.js@1.5.15/dist/hls.min.js";
const OFFLINE_IMAGE = "/img/webcam/zurriola-offline.webp";

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.5;

const OFFLINE_TITLE = "La cámara está inhabilitada";
const OFFLINE_SUBTITLE = "Sentimos las molestias. Vuelve a intentarlo más tarde.";

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

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function clampPan(x, y, zoom, width, height) {
    if (zoom <= 1 || width <= 0 || height <= 0) {
        return { x: 0, y: 0 };
    }
    const maxX = ((zoom - 1) * width) / (2 * zoom);
    const maxY = ((zoom - 1) * height) / (2 * zoom);
    return {
        x: clamp(x, -maxX, maxX),
        y: clamp(y, -maxY, maxY),
    };
}

function isZoomUiTarget(target) {
    return target instanceof Element && Boolean(target.closest("[data-zoom-ui]"));
}

export default function ZurriolaWebcamPlayer() {
    const videoRef = useRef(null);
    const viewportRef = useRef(null);
    const hlsRef = useRef(null);
    const zoomRef = useRef(1);
    const panRef = useRef({ x: 0, y: 0 });
    const gestureRef = useRef({
        mode: null,
        startZoom: 1,
        startPan: { x: 0, y: 0 },
        startDist: 0,
        startPoint: { x: 0, y: 0 },
        lastTapAt: 0,
        moved: false,
    });

    const [status, setStatus] = useState("loading");
    const [errorMsg, setErrorMsg] = useState("");
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [animate, setAnimate] = useState(false);

    const commitView = useCallback((nextZoom, nextPan = null, withAnimation = false) => {
        const viewport = viewportRef.current;
        const width = viewport?.clientWidth ?? 0;
        const height = viewport?.clientHeight ?? 0;
        const z = Number(clamp(nextZoom, MIN_ZOOM, MAX_ZOOM).toFixed(2));
        const basePan = nextPan ?? (z <= 1 ? { x: 0, y: 0 } : panRef.current);
        const clamped = clampPan(basePan.x, basePan.y, z, width, height);

        zoomRef.current = z;
        panRef.current = clamped;
        setAnimate(withAnimation);
        setZoom(z);
        setPan(clamped);
    }, []);

    const zoomIn = (event) => {
        event?.preventDefault?.();
        event?.stopPropagation?.();
        commitView(zoomRef.current + ZOOM_STEP, null, true);
    };

    const zoomOut = (event) => {
        event?.preventDefault?.();
        event?.stopPropagation?.();
        commitView(zoomRef.current - ZOOM_STEP, null, true);
    };

    const zoomReset = (event) => {
        event?.preventDefault?.();
        event?.stopPropagation?.();
        commitView(1, { x: 0, y: 0 }, true);
    };

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
                    setErrorMsg(OFFLINE_TITLE);
                });
            } catch (err) {
                if (!cancelled) {
                    setStatus("error");
                    setErrorMsg(OFFLINE_TITLE);
                }
            }
        };

        const onVideoError = () => {
            if (cancelled) return;
            setStatus("error");
            setErrorMsg(OFFLINE_TITLE);
        };

        video.addEventListener("error", onVideoError);
        start();

        return () => {
            cancelled = true;
            video.removeEventListener("error", onVideoError);
            cleanup();
        };
    }, []);

    useEffect(() => {
        const viewport = viewportRef.current;
        if (!viewport) return undefined;

        const touchDistance = (touches) => {
            const [a, b] = touches;
            return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        };

        const onTouchStart = (event) => {
            if (isZoomUiTarget(event.target)) return;

            const g = gestureRef.current;
            g.moved = false;

            if (event.touches.length === 2) {
                event.preventDefault();
                g.mode = "pinch";
                g.startZoom = zoomRef.current;
                g.startPan = { ...panRef.current };
                g.startDist = touchDistance(event.touches) || 1;
                return;
            }

            if (event.touches.length === 1) {
                g.mode = zoomRef.current > 1 ? "pan" : "tap";
                g.startPan = { ...panRef.current };
                g.startPoint = {
                    x: event.touches[0].clientX,
                    y: event.touches[0].clientY,
                };
            }
        };

        const onTouchMove = (event) => {
            const g = gestureRef.current;
            if (g.mode === "pinch" && event.touches.length === 2) {
                event.preventDefault();
                g.moved = true;
                const ratio = touchDistance(event.touches) / (g.startDist || 1);
                commitView(g.startZoom * ratio, g.startPan, false);
                return;
            }

            if ((g.mode === "pan" || g.mode === "tap") && event.touches.length === 1) {
                const dx = event.touches[0].clientX - g.startPoint.x;
                const dy = event.touches[0].clientY - g.startPoint.y;
                if (Math.hypot(dx, dy) > 8) {
                    g.moved = true;
                    g.mode = "pan";
                }
                if (g.mode === "pan" && zoomRef.current > 1) {
                    event.preventDefault();
                    const z = zoomRef.current;
                    commitView(z, {
                        x: g.startPan.x + dx / z,
                        y: g.startPan.y + dy / z,
                    }, false);
                }
            }
        };

        const onTouchEnd = (event) => {
            if (isZoomUiTarget(event.target)) {
                gestureRef.current.mode = null;
                return;
            }

            const g = gestureRef.current;
            if (event.touches.length === 0) {
                const now = Date.now();
                if (!g.moved && g.mode !== "pinch" && now - g.lastTapAt < 280) {
                    if (zoomRef.current <= 1) {
                        commitView(2, null, true);
                    } else {
                        commitView(1, { x: 0, y: 0 }, true);
                    }
                    g.lastTapAt = 0;
                } else if (!g.moved && g.mode !== "pinch") {
                    g.lastTapAt = now;
                }
                g.mode = null;
                g.moved = false;
            } else if (event.touches.length === 1 && zoomRef.current > 1) {
                g.mode = "pan";
                g.startPan = { ...panRef.current };
                g.startPoint = {
                    x: event.touches[0].clientX,
                    y: event.touches[0].clientY,
                };
            }
        };

        const onWheel = (event) => {
            if (!event.ctrlKey && !event.metaKey) return;
            event.preventDefault();
            const delta = event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
            commitView(zoomRef.current + delta, null, true);
        };

        const onPointerDown = (event) => {
            if (isZoomUiTarget(event.target)) return;
            if (event.pointerType !== "mouse" || event.button !== 0 || zoomRef.current <= 1) return;

            const g = gestureRef.current;
            g.mode = "pan";
            g.moved = false;
            g.startPan = { ...panRef.current };
            g.startPoint = { x: event.clientX, y: event.clientY };
            viewport.setPointerCapture(event.pointerId);
        };

        const onPointerMove = (event) => {
            const g = gestureRef.current;
            if (g.mode !== "pan" || event.pointerType !== "mouse") return;
            g.moved = true;
            const z = zoomRef.current;
            commitView(z, {
                x: g.startPan.x + (event.clientX - g.startPoint.x) / z,
                y: g.startPan.y + (event.clientY - g.startPoint.y) / z,
            }, false);
        };

        const onPointerUp = () => {
            gestureRef.current.mode = null;
            gestureRef.current.moved = false;
        };

        viewport.addEventListener("touchstart", onTouchStart, { passive: false });
        viewport.addEventListener("touchmove", onTouchMove, { passive: false });
        viewport.addEventListener("touchend", onTouchEnd);
        viewport.addEventListener("wheel", onWheel, { passive: false });
        viewport.addEventListener("pointerdown", onPointerDown);
        viewport.addEventListener("pointermove", onPointerMove);
        viewport.addEventListener("pointerup", onPointerUp);
        viewport.addEventListener("pointercancel", onPointerUp);

        return () => {
            viewport.removeEventListener("touchstart", onTouchStart);
            viewport.removeEventListener("touchmove", onTouchMove);
            viewport.removeEventListener("touchend", onTouchEnd);
            viewport.removeEventListener("wheel", onWheel);
            viewport.removeEventListener("pointerdown", onPointerDown);
            viewport.removeEventListener("pointermove", onPointerMove);
            viewport.removeEventListener("pointerup", onPointerUp);
            viewport.removeEventListener("pointercancel", onPointerUp);
        };
    }, [commitView]);

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

                {status !== "error" ? (
                    <div data-zoom-ui className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={zoomOut}
                            disabled={zoom <= MIN_ZOOM}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="Alejar"
                            title="Alejar"
                        >
                            <Minus className="h-4 w-4" />
                        </button>
                        <span className="min-w-[2.5rem] text-center text-[11px] font-semibold tabular-nums text-cyan-200">
                            {zoom.toFixed(1)}×
                        </span>
                        <button
                            type="button"
                            onClick={zoomIn}
                            disabled={zoom >= MAX_ZOOM}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="Acercar"
                            title="Acercar"
                        >
                            <Plus className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            onClick={zoomReset}
                            disabled={zoom <= MIN_ZOOM}
                            className="ml-0.5 flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="Restablecer zoom"
                            title="Restablecer"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                    </div>
                ) : (
                    <Radio className="h-4 w-4 text-cyan-400" aria-hidden />
                )}
            </div>

            <div
                ref={viewportRef}
                className={`relative aspect-video overflow-hidden bg-black ${zoom > 1 ? "cursor-grab active:cursor-grabbing" : ""}`}
                style={{ touchAction: "none" }}
            >
                <div
                    className="h-full w-full origin-center will-change-transform"
                    style={{
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                        transition: animate ? "transform 140ms ease-out" : "none",
                    }}
                >
                    <video
                        ref={videoRef}
                        className="h-full w-full object-cover"
                        playsInline
                        muted
                        autoPlay
                        controls={false}
                        title="Webcam en directo — Playa de Zurriola, Donostia"
                    />
                </div>

                {status === "loading" ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/70 text-cyan-100">
                        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
                        <p className="text-sm">Conectando con la cámara…</p>
                    </div>
                ) : null}

                {status === "error" ? (
                    <div className="absolute inset-0" role="alert">
                        <img
                            src={OFFLINE_IMAGE}
                            alt="Zurriola al atardecer — imagen de cortesía mientras la webcam no está disponible"
                            className="h-full w-full object-cover"
                            width={700}
                            height={433}
                            decoding="async"
                        />
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-t from-slate-950/90 via-slate-950/55 to-slate-950/35 px-6 text-center">
                            <AlertCircle className="h-8 w-8 text-amber-300 drop-shadow" aria-hidden />
                            <p className="text-base font-semibold text-white drop-shadow sm:text-lg">
                                {errorMsg || OFFLINE_TITLE}
                            </p>
                            <p className="max-w-sm text-sm text-slate-200/95 drop-shadow">
                                {OFFLINE_SUBTITLE}
                            </p>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
