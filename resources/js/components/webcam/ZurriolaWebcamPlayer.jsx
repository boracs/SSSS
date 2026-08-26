import React, { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2, Maximize2, Minimize2, Minus, Plus, Radio, RotateCcw } from "lucide-react";

const HLS_SRC =
    "https://58f14c0895a20.streamlock.net/camaramar/GIP_zurriola_169.stream/playlist.m3u8";
const HLS_JS = "https://cdn.jsdelivr.net/npm/hls.js@1.5.15/dist/hls.min.js";
const OFFLINE_IMAGE = "/img/webcam/zurriola-offline.webp";

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.5;
const LIVE_LAG_S = 2.5;
const MIN_DVR_WINDOW_S = 3;
const USABLE_DVR_S = 18;
const FALLBACK_DVR_S = 18;
const SEEK_HEADROOM_S = 0.6;
const STALL_MS = 2200;

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

function readTimeRangeWindow(ranges) {
    if (!ranges || ranges.length === 0) return null;
    const start = ranges.start(0);
    const end = ranges.end(ranges.length - 1);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end - start < MIN_DVR_WINDOW_S) {
        return null;
    }
    return { start, end };
}

function readHlsPlaylistWindow(hls) {
    if (!hls) return null;
    const details =
        (hls.currentLevel >= 0 ? hls.levels?.[hls.currentLevel]?.details : null) ||
        hls.levels?.[hls.loadLevel]?.details ||
        hls.levels?.[0]?.details ||
        null;
    const fragments = details?.fragments;
    if (!fragments?.length) return null;

    // El fragmento más viejo del sliding window de Wowza suele haber caído ya.
    const firstPlayable = fragments.length >= 3 ? fragments[1] : fragments[0];
    const start = Number(firstPlayable.start);
    const last = fragments[fragments.length - 1];
    const playlistEnd = Number(last.start) + Number(last.duration || 0);
    const liveEdgeRaw = hls.liveSyncPosition;
    const detailsEdge = Number(details.edge);
    const endCandidates = [playlistEnd];
    if (Number.isFinite(liveEdgeRaw)) endCandidates.push(liveEdgeRaw);
    if (Number.isFinite(detailsEdge)) endCandidates.push(detailsEdge);
    const end = Math.max(...endCandidates);

    if (!Number.isFinite(start) || !Number.isFinite(end) || end - start < MIN_DVR_WINDOW_S) {
        return null;
    }
    return { start, end };
}

function clipToUsableDvr(start, end) {
    const clippedStart = Math.max(start, end - USABLE_DVR_S);
    if (end - clippedStart < MIN_DVR_WINDOW_S) return null;
    return { start: clippedStart, end };
}

function readLiveWindow(video, hls) {
    if (!video) return null;

    const playlist = readHlsPlaylistWindow(hls);
    const buffered = readTimeRangeWindow(video.buffered);

    let start = null;
    let end = null;

    if (playlist) {
        end = playlist.end;
        start = playlist.start;
        // seekable en HLS live suele ser un stub de 1–2 s; no lo uses para el ancho.
        if (buffered && buffered.end - buffered.start >= MIN_DVR_WINDOW_S) {
            start = Math.max(start, buffered.start);
        }
    } else if (buffered) {
        start = buffered.start;
        end = buffered.end;
    }

    if (start == null || end == null || end - start < MIN_DVR_WINDOW_S) {
        const liveEdge = Number.isFinite(hls?.liveSyncPosition)
            ? hls.liveSyncPosition
            : Number.isFinite(video.currentTime) && video.currentTime > MIN_DVR_WINDOW_S
              ? video.currentTime
              : null;
        if (liveEdge == null) return null;
        start = Math.max(0, liveEdge - FALLBACK_DVR_S);
        end = liveEdge;
    }

    const clipped = clipToUsableDvr(start, end);
    if (!clipped) return null;
    start = clipped.start;
    end = clipped.end;

    const raw = Number(video.currentTime);
    const inWindow = Number.isFinite(raw) && raw >= start - 0.5 && raw <= end + 1.5;
    const current = inWindow ? clamp(raw, start, end) : end;

    return {
        start,
        end,
        current,
    };
}

function liveEdgeTime(video, hls) {
    const windowLive = readLiveWindow(video, hls);
    if (Number.isFinite(hls?.liveSyncPosition)) {
        const edge = hls.liveSyncPosition;
        if (windowLive) return clamp(edge, windowLive.start, windowLive.end);
        return edge;
    }
    return windowLive?.end ?? null;
}

function formatDelay(secondsBehind) {
    const total = Math.max(0, Math.round(secondsBehind));
    const minutes = Math.floor(total / 60);
    const secs = total % 60;
    return `−${minutes}:${String(secs).padStart(2, "0")}`;
}

function isZoomUiTarget(target) {
    return target instanceof Element && Boolean(target.closest("[data-zoom-ui]"));
}

export default function ZurriolaWebcamPlayer() {
    const playerRef = useRef(null);
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
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [dvr, setDvr] = useState(null);
    const [behindLive, setBehindLive] = useState(false);
    const [scrubbing, setScrubbing] = useState(false);
    const scrubbingRef = useRef(false);
    const userSeekedRef = useRef(false);
    const lastMediaTimeRef = useRef(0);
    const lastProgressAtRef = useRef(0);

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

    const toggleFullscreen = async (event) => {
        event?.preventDefault?.();
        event?.stopPropagation?.();
        const el = playerRef.current;
        if (!el) return;

        try {
            if (document.fullscreenElement === el) {
                await document.exitFullscreen?.();
                return;
            }
            if (el.requestFullscreen) {
                await el.requestFullscreen();
            } else if (el.webkitRequestFullscreen) {
                el.webkitRequestFullscreen();
            }
        } catch {
            // Algunos navegadores bloquean fullscreen sin gesto válido.
        }
    };

    useEffect(() => {
        const onFullscreenChange = () => {
            const active = document.fullscreenElement === playerRef.current;
            setIsFullscreen(active);
            // Recalcular pan cuando cambia el tamaño del viewport.
            commitView(zoomRef.current, panRef.current, false);
        };

        document.addEventListener("fullscreenchange", onFullscreenChange);
        document.addEventListener("webkitfullscreenchange", onFullscreenChange);
        return () => {
            document.removeEventListener("fullscreenchange", onFullscreenChange);
            document.removeEventListener("webkitfullscreenchange", onFullscreenChange);
        };
    }, [commitView]);

    useEffect(() => {
        let cancelled = false;
        const video = videoRef.current;
        if (!video) return undefined;

        const cleanup = () => {
            if (hlsRef.current) {
                try {
                    hlsRef.current.stopLoad();
                    hlsRef.current.detachMedia();
                    hlsRef.current.destroy();
                } catch {
                    // destroy() puede lanzar si el media ya se soltó
                }
                hlsRef.current = null;
            }
            video.pause();
            video.removeAttribute("src");
            video.srcObject = null;
        };

        const snapToLive = () => {
            const edge = liveEdgeTime(video, hlsRef.current);
            const buffered = video.buffered;
            const bufEnd =
                buffered.length > 0 ? buffered.end(buffered.length - 1) : null;
            let target = edge;
            if (Number.isFinite(edge) && Number.isFinite(bufEnd) && edge > bufEnd + 1) {
                target = bufEnd;
            } else if (!Number.isFinite(target) && Number.isFinite(bufEnd)) {
                target = bufEnd;
            }
            if (Number.isFinite(target) && Math.abs(video.currentTime - target) > 0.45) {
                video.currentTime = target;
            }
            video.play().catch(() => {});
            hlsRef.current?.startLoad?.();
        };

        const start = async () => {
            try {
                setStatus("loading");
                setErrorMsg("");
                userSeekedRef.current = false;

                try {
                    await loadHlsScript();
                } catch {
                    // Safari usa HLS nativo; el script puede fallar sin bloquear.
                }
                if (cancelled) return;

                if (window.Hls?.isSupported()) {
                    const hls = new window.Hls({
                        enableWorker: true,
                        lowLatencyMode: false,
                        startPosition: -1,
                        backBufferLength: FALLBACK_DVR_S,
                        liveSyncDurationCount: 1,
                        liveMaxLatencyDurationCount: 3,
                        maxBufferHole: 0.5,
                        nudgeMaxRetry: 8,
                    });
                    hlsRef.current = hls;
                    hls.attachMedia(video);
                    let joinedLive = false;
                    const markLive = () => {
                        if (cancelled) return;
                        if (!joinedLive) joinedLive = true;
                        video.play().catch(() => {});
                        setStatus("live");
                    };
                    hls.on(window.Hls.Events.MEDIA_ATTACHED, () => {
                        if (cancelled) return;
                        hls.loadSource(HLS_SRC);
                    });
                    hls.on(window.Hls.Events.MANIFEST_PARSED, markLive);
                    hls.on(window.Hls.Events.FRAG_BUFFERED, () => {
                        if (cancelled) return;
                        if (!joinedLive) markLive();
                        else video.play().catch(() => {});
                    });
                    hls.on(window.Hls.Events.ERROR, (_event, data) => {
                        if (cancelled || !data) return;
                        if (!data.fatal) {
                            if (
                                data.details === "bufferStalledError" ||
                                data.details === "fragLoadError" ||
                                data.details === "fragLoadTimeOut"
                            ) {
                                video.play().catch(() => {});
                                hls.startLoad();
                            }
                            return;
                        }
                        if (data.type === window.Hls.ErrorTypes.MEDIA_ERROR) {
                            hls.recoverMediaError();
                            snapToLive();
                            return;
                        }
                        if (data.type === window.Hls.ErrorTypes.NETWORK_ERROR) {
                            hls.startLoad();
                            return;
                        }
                        setStatus("error");
                        setErrorMsg(OFFLINE_TITLE);
                    });
                    return;
                }

                if (video.canPlayType("application/vnd.apple.mpegurl")) {
                    video.src = HLS_SRC;
                    await video.play().catch(() => {});
                    if (!cancelled) setStatus("live");
                    return;
                }

                throw new Error("Tu navegador no soporta la reproducción en directo");
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

        const onWaiting = () => {
            if (cancelled || scrubbingRef.current) return;
            window.setTimeout(() => {
                if (cancelled || scrubbingRef.current) return;
                if (!video.paused && video.readyState >= 3) return;
                video.play().catch(() => {});
                hlsRef.current?.startLoad?.();
            }, 900);
        };

        const onPlaying = () => {
            if (!cancelled) setStatus("live");
        };

        video.addEventListener("error", onVideoError);
        video.addEventListener("waiting", onWaiting);
        video.addEventListener("playing", onPlaying);
        start();

        return () => {
            cancelled = true;
            video.removeEventListener("error", onVideoError);
            video.removeEventListener("waiting", onWaiting);
            video.removeEventListener("playing", onPlaying);
            cleanup();
        };
    }, []);

    useEffect(() => {
        if (status !== "live") {
            setDvr(null);
            setBehindLive(false);
            return undefined;
        }

        const tick = () => {
            const video = videoRef.current;
            const windowLive = readLiveWindow(video, hlsRef.current);
            if (!windowLive || !video) {
                setDvr(null);
                setBehindLive(false);
                return;
            }

            const now = Date.now();
            const mediaTime = video.currentTime;
            if (!scrubbingRef.current && !video.paused && mediaTime > 0) {
                if (Math.abs(mediaTime - lastMediaTimeRef.current) > 0.05) {
                    lastMediaTimeRef.current = mediaTime;
                    lastProgressAtRef.current = now;
                } else if (
                    lastProgressAtRef.current > 0 &&
                    now - lastProgressAtRef.current > STALL_MS
                ) {
                    lastProgressAtRef.current = now;
                    const buffered = video.buffered;
                    const bufEnd =
                        buffered.length > 0
                            ? buffered.end(buffered.length - 1)
                            : null;
                    if (Number.isFinite(bufEnd) && bufEnd > mediaTime + 0.4) {
                        video.currentTime = bufEnd - 0.15;
                    }
                    video.play().catch(() => {});
                    hlsRef.current?.startLoad?.();
                }
            }

            const lagNow = windowLive.end - windowLive.current;
            const pinLive = !scrubbingRef.current && !userSeekedRef.current;
            const shownCurrent = pinLive ? windowLive.end : windowLive.current;
            setBehindLive(!pinLive && lagNow > LIVE_LAG_S);
            if (!scrubbingRef.current) {
                setDvr({ ...windowLive, current: shownCurrent });
            } else {
                setDvr((prev) =>
                    prev
                        ? { ...windowLive, current: clamp(prev.current, windowLive.start, windowLive.end) }
                        : { ...windowLive, current: shownCurrent },
                );
            }
        };

        tick();
        const id = window.setInterval(tick, 400);
        return () => window.clearInterval(id);
    }, [status]);

    const seekTo = (time) => {
        const video = videoRef.current;
        if (!video) return;
        const windowLive = readLiveWindow(video, hlsRef.current);
        if (!windowLive) {
            const edge = liveEdgeTime(video, hlsRef.current);
            if (Number.isFinite(edge)) video.currentTime = edge;
            video.play().catch(() => {});
            return;
        }
        const minSeek = windowLive.start + SEEK_HEADROOM_S;
        const maxSeek = windowLive.end;
        const next = clamp(time, minSeek, maxSeek);
        if (!Number.isFinite(next)) return;
        video.currentTime = next;
        video.play().catch(() => {});
    };

    const seekLive = (event) => {
        event?.preventDefault?.();
        event?.stopPropagation?.();
        const video = videoRef.current;
        scrubbingRef.current = false;
        setScrubbing(false);
        userSeekedRef.current = false;
        setBehindLive(false);
        setDvr((prev) => (prev ? { ...prev, current: prev.end } : prev));
        const edge = liveEdgeTime(video, hlsRef.current);
        if (video && Number.isFinite(edge)) {
            video.currentTime = edge;
            video.play().catch(() => {});
        } else {
            video?.play?.().catch(() => {});
        }
    };

    const onScrubStart = () => {
        scrubbingRef.current = true;
        setScrubbing(true);
    };

    const onScrubChange = (event) => {
        const next = Number(event.target.value);
        const liveEnd = Number(event.target.max);
        if (!Number.isFinite(next)) return;
        setDvr((prev) => (prev ? { ...prev, current: next } : prev));
        if (Number.isFinite(liveEnd)) {
            setBehindLive(liveEnd - next > LIVE_LAG_S);
        }
    };

    const onScrubEnd = (event) => {
        const next = Number(event.target.value);
        const liveEnd = Number(event.target.max);
        const wasScrubbing = scrubbingRef.current;
        scrubbingRef.current = false;
        setScrubbing(false);
        if (!Number.isFinite(next)) return;
        if (Number.isFinite(liveEnd)) {
            const behind = liveEnd - next > LIVE_LAG_S;
            userSeekedRef.current = behind;
            if (wasScrubbing || event.type === "keyup") {
                lastProgressAtRef.current = Date.now();
                if (behind) {
                    seekTo(next);
                } else {
                    seekLive();
                }
            }
            return;
        }
    };

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
        <div
            ref={playerRef}
            className={`relative overflow-hidden border border-cyan-500/20 bg-slate-950 shadow-2xl shadow-cyan-950/40 ${
                isFullscreen ? "flex h-full w-full flex-col rounded-none" : "rounded-2xl"
            }`}
        >
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

                <div data-zoom-ui className="flex items-center gap-1">
                    {status !== "error" ? (
                        <>
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
                        </>
                    ) : (
                        <Radio className="mr-1 h-4 w-4 text-cyan-400" aria-hidden />
                    )}
                    <button
                        type="button"
                        onClick={toggleFullscreen}
                        className="ml-1 flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 text-white transition hover:bg-white/10"
                        aria-label={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
                        title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
                    >
                        {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </button>
                </div>
            </div>

            <div
                ref={viewportRef}
                className={`relative overflow-hidden bg-black ${
                    isFullscreen ? "min-h-0 flex-1" : "aspect-video"
                } ${zoom > 1 ? "cursor-grab active:cursor-grabbing" : ""}`}
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
                        preload="auto"
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

            {status === "live" ? (
                <div
                    data-zoom-ui
                    className="flex flex-col gap-2 overflow-visible border-t border-cyan-400/25 bg-slate-900 px-4 py-2.5 sm:flex-row sm:items-center sm:gap-3 sm:px-5"
                >
                    {dvr ? (
                        <>
                            <label className="flex min-h-11 min-w-0 flex-1 items-center px-1">
                                <span className="sr-only">Ir unos segundos atrás en la señal en directo</span>
                                <input
                                    type="range"
                                    min={dvr.start}
                                    max={dvr.end}
                                    step={0.25}
                                    value={dvr.current}
                                    onPointerDown={onScrubStart}
                                    onMouseDown={onScrubStart}
                                    onTouchStart={onScrubStart}
                                    onChange={onScrubChange}
                                    onPointerUp={onScrubEnd}
                                    onPointerCancel={onScrubEnd}
                                    onMouseUp={onScrubEnd}
                                    onTouchEnd={onScrubEnd}
                                    onKeyUp={onScrubEnd}
                                    aria-valuetext={
                                        behindLive
                                            ? `${formatDelay(dvr.end - dvr.current)} respecto al directo`
                                            : "Al vivo"
                                    }
                                    className="h-11 w-full cursor-pointer accent-cyan-400"
                                />
                            </label>
                            <div className="flex min-h-11 items-center justify-between gap-2 sm:justify-end">
                                <span className="min-w-[3.25rem] text-right text-[11px] font-semibold tabular-nums text-cyan-100">
                                    {behindLive || (scrubbing && dvr.end - dvr.current > LIVE_LAG_S)
                                        ? formatDelay(dvr.end - dvr.current)
                                        : "Al vivo"}
                                </span>
                                {behindLive || (scrubbing && dvr.end - dvr.current > LIVE_LAG_S) ? (
                                    <button
                                        type="button"
                                        onClick={seekLive}
                                        className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-red-600 px-3 text-sm font-semibold text-white transition hover:bg-red-500"
                                    >
                                        <Radio className="h-3.5 w-3.5" aria-hidden />
                                        Volver al directo
                                    </button>
                                ) : (
                                    <span className="text-[11px] font-medium text-slate-400">
                                        Últimos {Math.max(5, Math.round(dvr.end - dvr.start))} s
                                    </span>
                                )}
                            </div>
                        </>
                    ) : (
                        <p className="min-h-11 text-sm text-cyan-100/80">
                            Sincronizando la señal reciente…
                        </p>
                    )}
                </div>
            ) : null}
        </div>
    );
}
