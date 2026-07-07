import React, { useCallback, useEffect, useRef, useState } from "react";
import { getCsrfFetchHeaders, syncCsrfMeta } from "@/lib/csrf.js";
import { Head, usePage } from "@inertiajs/react";
import { toast } from "react-toastify";
import Modal from "@/components/Modal";
import {
    Play,
    Pause,
    Rewind,
    FastForward,
    Pencil,
    Eraser,
    Upload,
    Waves,
    Info,
    Trash2,
    ShieldAlert,
    Check,
} from "lucide-react";

const SPEEDS = [0.1, 0.25, 0.5, 0.75, 1];

function labelize(value) {
    if (!value) return value;
    return value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, " ");
}

/** Marco 16:9 fijo: el vídeo escala con object-contain (vertical, cuadrado, horizontal). */
function VideoFrame({ videoRef, canvasRef, progress, onProgress, onScrubStart, onScrubEnd, label, paintEnabled }) {
    const containerRef = useRef(null);
    const isDrawing = useRef(false);

    const syncFrame = useCallback(() => {
        const container = containerRef.current;
        const canvas = canvasRef.current;
        if (!container || !canvas) return;

        const nextWidth = container.clientWidth;
        const nextHeight = container.clientHeight;
        if (nextWidth < 1 || nextHeight < 1) return;
        if (canvas.width === nextWidth && canvas.height === nextHeight) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const prevWidth = canvas.width;
        const prevHeight = canvas.height;
        let snapshot = null;

        if (prevWidth > 0 && prevHeight > 0) {
            snapshot = document.createElement("canvas");
            snapshot.width = prevWidth;
            snapshot.height = prevHeight;
            snapshot.getContext("2d")?.drawImage(canvas, 0, 0);
        }

        canvas.width = nextWidth;
        canvas.height = nextHeight;

        if (snapshot) {
            ctx.drawImage(snapshot, 0, 0, prevWidth, prevHeight, 0, 0, nextWidth, nextHeight);
        }
    }, [canvasRef]);

    const canvasPoint = useCallback((canvas, clientX, clientY) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY,
        };
    }, []);

    const stopDrawing = useCallback(() => {
        isDrawing.current = false;
    }, []);

    const handlePointerDown = useCallback((e) => {
        if (!paintEnabled) return;

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;

        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        isDrawing.current = true;

        ctx.strokeStyle = "#f97316";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        const { x, y } = canvasPoint(canvas, e.clientX, e.clientY);
        ctx.beginPath();
        ctx.moveTo(x, y);
    }, [canvasRef, canvasPoint, paintEnabled]);

    const handlePointerMove = useCallback((e) => {
        if (!paintEnabled || !isDrawing.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;

        e.preventDefault();
        const { x, y } = canvasPoint(canvas, e.clientX, e.clientY);
        ctx.lineTo(x, y);
        ctx.stroke();
    }, [canvasRef, canvasPoint, paintEnabled]);

    useEffect(() => {
        if (!paintEnabled) {
            isDrawing.current = false;
        }
    }, [paintEnabled]);

    useEffect(() => {
        syncFrame();
        window.addEventListener("resize", syncFrame);
        return () => window.removeEventListener("resize", syncFrame);
    }, [syncFrame]);

    useEffect(() => {
        window.addEventListener("pointerup", stopDrawing);
        window.addEventListener("pointercancel", stopDrawing);
        return () => {
            window.removeEventListener("pointerup", stopDrawing);
            window.removeEventListener("pointercancel", stopDrawing);
        };
    }, [stopDrawing]);

    return (
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40">
            <p className="absolute left-3 top-3 z-10 rounded-full bg-black/50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-cyan-200">
                {label}
            </p>
            {paintEnabled ? (
                <p className="absolute right-3 top-3 z-10 rounded-full bg-orange-500/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    Modo dibujo
                </p>
            ) : null}
            <div
                ref={containerRef}
                className="relative aspect-video w-full bg-black"
            >
                <video
                    ref={videoRef}
                    className={`absolute inset-0 h-full w-full object-contain object-center ${paintEnabled ? "pointer-events-none" : "cursor-pointer"}`}
                    muted
                    playsInline
                    onLoadedMetadata={syncFrame}
                    onClick={() => {
                        if (paintEnabled) return;
                        const v = videoRef.current;
                        if (!v) return;
                        if (v.paused) v.play().catch(() => {});
                        else v.pause();
                    }}
                />
                <canvas
                    ref={canvasRef}
                    className={`absolute inset-0 h-full w-full touch-none ${paintEnabled ? "pointer-events-auto cursor-crosshair" : "pointer-events-none"}`}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={stopDrawing}
                    onPointerLeave={stopDrawing}
                    onPointerCancel={stopDrawing}
                />
            </div>
            <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-3 pb-2.5 pt-8">
                <input
                    type="range"
                    min={0}
                    max={100}
                    step={0.05}
                    value={Number.isFinite(progress) ? progress : 0}
                    aria-label={`Posición de reproducción — ${label}`}
                    onInput={(e) => onProgress(Number(e.target.value))}
                    onChange={(e) => onProgress(Number(e.target.value))}
                    onPointerDown={(e) => {
                        e.stopPropagation();
                        onScrubStart?.();
                    }}
                    onPointerUp={() => onScrubEnd?.()}
                    onPointerCancel={() => onScrubEnd?.()}
                    onLostPointerCapture={() => onScrubEnd?.()}
                    className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-cyan-400 [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-cyan-400 [&::-moz-range-thumb]:shadow-md [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:shadow-md active:[&::-moz-range-thumb]:cursor-grabbing active:[&::-webkit-slider-thumb]:cursor-grabbing"
                />
            </div>
        </div>
    );
}

function ConfirmDeleteVideosModal({ open, onClose, onConfirm, processing, clipCount }) {
    return (
        <Modal show={open} onClose={onClose} maxWidth="md" closeable={!processing}>
            <div className="p-6 sm:p-7">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/15 ring-1 ring-rose-400/30">
                    <ShieldAlert className="h-6 w-6 text-rose-400" />
                </div>
                <h2 className="text-lg font-bold text-white sm:text-xl">
                    ¿Eliminar tus vídeos del servidor?
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    Se borrarán de forma permanente e inmediata. Nadie podrá recuperarlos
                    y liberarás espacio en el servidor. Recomendado cuando termines de comparar.
                </p>
                {clipCount > 0 ? (
                    <p className="mt-4 rounded-xl border border-rose-500/25 bg-rose-950/40 px-3 py-2.5 text-xs text-rose-200">
                        Tienes <strong className="font-bold text-rose-100">{clipCount}</strong>{" "}
                        {clipCount === 1 ? "clip listado" : "clips listados"} en esta sesión.
                    </p>
                ) : (
                    <p className="mt-4 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-slate-400">
                        Se eliminarán todos los vídeos asociados a tu sesión actual en el comparador.
                    </p>
                )}
                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={processing}
                        className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={processing}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Trash2 className="h-4 w-4" />
                        {processing ? "Eliminando…" : "Sí, eliminar mis vídeos"}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

function UploadThumb({ url, name, onSelect, isSelected }) {
    return (
        <button
            type="button"
            onClick={onSelect}
            aria-pressed={isSelected}
            aria-label={isSelected ? `${name} (clip activo)` : name}
            className={`group relative shrink-0 overflow-hidden rounded-xl p-2 text-left transition-all duration-200 ${
                isSelected
                    ? "border-2 border-cyan-400 bg-cyan-950/50 shadow-lg shadow-cyan-900/30 ring-2 ring-cyan-400/25"
                    : "border border-white/15 bg-slate-900/60 hover:border-cyan-500/40 hover:bg-slate-900/80"
            }`}
        >
            {isSelected ? (
                <span className="absolute right-2.5 top-2.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-cyan-400 text-slate-950 shadow-md ring-2 ring-slate-900/80">
                    <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                </span>
            ) : (
                <span
                    className="absolute right-2.5 top-2.5 z-10 h-2 w-2 rounded-full bg-white/25 opacity-0 transition-opacity group-hover:opacity-100"
                    aria-hidden
                />
            )}

            <div
                className={`relative flex aspect-video w-32 items-center justify-center overflow-hidden rounded-lg bg-black ${
                    isSelected ? "ring-1 ring-inset ring-cyan-400/50" : ""
                }`}
            >
                <video
                    src={url}
                    className="max-h-full max-w-full object-contain object-center"
                    muted
                    playsInline
                    preload="metadata"
                />
                {isSelected ? (
                    <span className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-cyan-400 via-teal-300 to-cyan-400" />
                ) : null}
            </div>

            <p
                className={`mt-1.5 max-w-[8rem] truncate text-[10px] ${
                    isSelected ? "font-semibold text-cyan-200" : "text-slate-400 group-hover:text-slate-300"
                }`}
            >
                {isSelected ? "● " : null}
                {name}
            </p>
        </button>
    );
}

export default function AutoCoachIndex({ limits }) {
    const { csrf } = usePage().props;
    const proRef = useRef(null);
    const userRef = useRef(null);
    const canvasProRef = useRef(null);
    const canvasUserRef = useRef(null);

    const [sports, setSports] = useState([]);
    const [postures, setPostures] = useState([]);
    const [tricks, setTricks] = useState([]);
    const [sport, setSport] = useState("");
    const [posture, setPosture] = useState("");
    const [trick, setTrick] = useState("");
    const [speed, setSpeed] = useState(1);
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const isScrubbingRef = useRef(false);
    const [uploads, setUploads] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [deletingUploads, setDeletingUploads] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [paintEnabled, setPaintEnabled] = useState(false);
    const [selectedClipUrl, setSelectedClipUrl] = useState(null);

    const api = (name, params = {}) => {
        try {
            return route(`autocoach.api.${name}`, params, false);
        } catch {
            return "#";
        }
    };

    useEffect(() => {
        syncCsrfMeta(csrf);
    }, [csrf]);

    useEffect(() => {
        fetch(api("sports"))
            .then((r) => r.json())
            .then((d) => d.success && setSports(d.sports ?? []))
            .catch(() => setError("No se pudieron cargar los deportes."));
    }, []);

    useEffect(() => {
        if (!sport) {
            setPostures([]);
            setPosture("");
            return;
        }
        fetch(`${api("postures")}?sport=${encodeURIComponent(sport)}`)
            .then((r) => r.json())
            .then((d) => {
                if (d.success) setPostures(d.postures ?? []);
            });
        setPosture("");
        setTrick("");
        setTricks([]);
    }, [sport]);

    useEffect(() => {
        if (!sport || !posture) {
            setTricks([]);
            setTrick("");
            return;
        }
        fetch(`${api("tricks")}?sport=${encodeURIComponent(sport)}&posture=${encodeURIComponent(posture)}`)
            .then((r) => r.json())
            .then((d) => {
                if (d.success) setTricks(d.tricks ?? []);
            });
        setTrick("");
    }, [sport, posture]);

    useEffect(() => {
        if (!sport || !posture || !trick) return;
        fetch(
            `${api("video")}?sport=${encodeURIComponent(sport)}&posture=${encodeURIComponent(posture)}&trick=${encodeURIComponent(trick)}`,
        )
            .then((r) => r.json())
            .then((d) => {
                if (d.success && proRef.current) {
                    proRef.current.src = d.video_url;
                    proRef.current.load();
                    setProgress(0);
                } else {
                    setError(d.message || "Vídeo no encontrado.");
                }
            });
    }, [sport, posture, trick]);

    useEffect(() => {
        const tick = () => {
            if (isScrubbingRef.current) return;

            const v = proRef.current;
            if (v?.duration && Number.isFinite(v.duration)) {
                setProgress((v.currentTime / v.duration) * 100);
            }
        };
        const id = setInterval(tick, 100);
        return () => clearInterval(id);
    }, []);

    const syncProgressFromVideos = useCallback(() => {
        const v = proRef.current;
        if (v?.duration && Number.isFinite(v.duration)) {
            setProgress((v.currentTime / v.duration) * 100);
        }
    }, []);

    const seekBoth = useCallback((pct) => {
        [proRef, userRef].forEach((ref) => {
            const v = ref.current;
            if (v?.duration && Number.isFinite(v.duration)) {
                v.currentTime = (pct / 100) * v.duration;
            }
        });
    }, []);

    const handleSeek = useCallback(
        (pct) => {
            setProgress(pct);
            seekBoth(pct);
        },
        [seekBoth],
    );

    const handleScrubStart = useCallback(() => {
        isScrubbingRef.current = true;
        [proRef, userRef].forEach((ref) => ref.current?.pause());
        setPlaying(false);
    }, []);

    const handleScrubEnd = useCallback(() => {
        isScrubbingRef.current = false;
        syncProgressFromVideos();
    }, [syncProgressFromVideos]);

    useEffect(() => {
        [proRef.current, userRef.current].forEach((v) => {
            if (v) v.playbackRate = speed;
        });
    }, [speed]);

    const toggleGlobalPlay = () => {
        const v1 = proRef.current;
        const v2 = userRef.current;
        const shouldPlay = v1?.paused ?? true;
        if (shouldPlay) {
            v1?.play().catch(() => {});
            v2?.play().catch(() => {});
            setPlaying(true);
        } else {
            v1?.pause();
            v2?.pause();
            setPlaying(false);
        }
    };

    const nudge = (delta) => {
        [proRef, userRef].forEach((ref) => {
            const v = ref.current;
            if (!v) return;
            v.currentTime = Math.min(Math.max(0, v.currentTime + delta), v.duration || 0);
        });
        syncProgressFromVideos();
    };

    const formatMb = (bytes) => (bytes / (1024 * 1024)).toFixed(1);

    const handleUpload = async (e) => {
        const files = Array.from(e.target.files ?? []);
        e.target.value = "";
        if (!files.length) return;

        if (files.length > limits.maxBatch) {
            setError(`Máximo ${limits.maxBatch} vídeos por subida.`);
            return;
        }

        const maxFileBytes = limits.maxFileMb * 1024 * 1024;
        const maxBatchBytes = (limits.maxBatchMb ?? limits.maxFileMb * limits.maxBatch) * 1024 * 1024;
        const oversized = files.filter((f) => f.size > maxFileBytes);
        if (oversized.length) {
            setError(
                `${oversized.length === 1 ? "Un vídeo supera" : "Varios vídeos superan"} los ${limits.maxFileMb} MB por archivo.`,
            );
            return;
        }

        const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
        if (totalBytes > maxBatchBytes) {
            setError(
                `La tanda pesa ${formatMb(totalBytes)} MB y el máximo es ${limits.maxBatchMb ?? limits.maxFileMb * limits.maxBatch} MB. Sube menos vídeos o archivos más pequeños.`,
            );
            return;
        }

        setUploading(true);
        setUploadProgress(10);
        setError("");
        setMessage("");

        const fd = new FormData();
        files.forEach((f) => fd.append("videos[]", f));

        try {
            const res = await fetch(api("upload"), {
                method: "POST",
                body: fd,
                headers: getCsrfFetchHeaders(),
                credentials: "same-origin",
            });
            setUploadProgress(90);

            if (res.status === 419) {
                setError("Sesión expirada. Recarga la página (F5) e inténtalo de nuevo.");
                return;
            }

            if (res.status === 413) {
                setError(
                    `El servidor rechazó la subida porque el total supera el límite PHP (post_max_size ≈ ${limits.serverPostLimitMb ?? "?"} MB). ` +
                        "Reinicia con «composer run serve» o «composer run dev», o sube menos vídeos a la vez.",
                );
                return;
            }

            let data;
            try {
                data = await res.json();
            } catch {
                setError("El servidor no aceptó la subida (respuesta inválida). Prueba con vídeos más pequeños.");
                return;
            }
            if (data.uploaded?.length) {
                setUploads((prev) => [...data.uploaded, ...prev]);
                setMessage(data.message);
                selectUserClip(data.uploaded[0].url);
            }
            if (data.errors?.length) setError(data.errors.join(" "));
            if (!data.success && data.message) setError(data.message);
        } catch {
            setError("Error al subir los vídeos.");
        } finally {
            setUploadProgress(100);
            setUploading(false);
            setTimeout(() => setUploadProgress(0), 800);
        }
    };

    const selectUserClip = (url) => {
        if (!userRef.current) return;
        setSelectedClipUrl(url);
        userRef.current.src = url;
        userRef.current.load();
        setProgress(0);
        userRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    const handleDeleteMyVideos = async () => {
        setDeletingUploads(true);
        setError("");

        try {
            const res = await fetch(api("uploads.destroy"), {
                method: "DELETE",
                headers: getCsrfFetchHeaders(),
                credentials: "same-origin",
            });

            if (res.status === 419) {
                setError("Sesión expirada. Recarga la página (F5) e inténtalo de nuevo.");
                return;
            }

            const data = await res.json();

            if (!data.success) {
                toast.error(data.message || "No se pudieron eliminar los vídeos.");
                return;
            }

            const deletedUrls = new Set(uploads.map((u) => u.url));
            setUploads([]);
            setDeleteConfirmOpen(false);

            if (userRef.current && selectedClipUrl && deletedUrls.has(selectedClipUrl)) {
                userRef.current.removeAttribute("src");
                userRef.current.load();
                setSelectedClipUrl(null);
                setProgress(0);
            }

            clearCanvases();
            toast.success(data.message || "Tus vídeos se han eliminado del servidor.");
        } catch {
            toast.error("Error al eliminar los vídeos del servidor.");
        } finally {
            setDeletingUploads(false);
        }
    };

    const clearCanvases = () => {
        [canvasProRef, canvasUserRef].forEach((ref) => {
            const canvas = ref.current;
            const ctx = canvas?.getContext("2d");
            if (!canvas || !ctx) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        });
    };

    const togglePaint = () => {
        setPaintEnabled((enabled) => !enabled);
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-[#0a2230] to-slate-950 text-white">
            <Head title="Comparador de maniobras | S4 AutoCoach" />

            <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
                <header className="mb-8 text-center">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
                        S4 AutoCoach
                    </p>
                    <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">
                        Compara tu maniobra con un pro
                    </h1>
                    <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-400">
                        Elige deporte, postura y maniobra. Sincroniza la reproducción a cámara lenta,
                        sube tus clips (máx. {limits.maxBatch} por tanda) y compáralos lado a lado.
                        Tus vídeos se borran solos tras {limits.ttlMinutes} minutos.
                    </p>
                </header>

                <div className="mb-6 grid gap-3 sm:grid-cols-3">
                    <select
                        value={sport}
                        onChange={(e) => setSport(e.target.value)}
                        className="rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2.5 text-sm text-white"
                    >
                        <option value="">Deporte</option>
                        {sports.map((s) => (
                            <option key={s} value={s}>{labelize(s)}</option>
                        ))}
                    </select>
                    <select
                        value={posture}
                        onChange={(e) => setPosture(e.target.value)}
                        disabled={!sport}
                        className="rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2.5 text-sm text-white disabled:opacity-40"
                    >
                        <option value="">Regular / Goofy</option>
                        {postures.map((p) => (
                            <option key={p} value={p}>{labelize(p)}</option>
                        ))}
                    </select>
                    <select
                        value={trick}
                        onChange={(e) => setTrick(e.target.value)}
                        disabled={!posture}
                        className="rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2.5 text-sm text-white disabled:opacity-40"
                    >
                        <option value="">Maniobra</option>
                        {tricks.map((t) => (
                            <option key={t.trick} value={t.trick}>{labelize(t.trick)}</option>
                        ))}
                    </select>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                    <VideoFrame
                        videoRef={proRef}
                        canvasRef={canvasProRef}
                        progress={progress}
                        onProgress={handleSeek}
                        onScrubStart={handleScrubStart}
                        onScrubEnd={handleScrubEnd}
                        label="Referencia pro"
                        paintEnabled={paintEnabled}
                    />
                    <VideoFrame
                        videoRef={userRef}
                        canvasRef={canvasUserRef}
                        progress={progress}
                        onProgress={handleSeek}
                        onScrubStart={handleScrubStart}
                        onScrubEnd={handleScrubEnd}
                        label="Tu clip"
                        paintEnabled={paintEnabled}
                    />
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <button type="button" onClick={toggleGlobalPlay} className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-500">
                        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        {playing ? "Pausa" : "Play"}
                    </button>
                    <button
                        type="button"
                        onClick={() => nudge(-1)}
                        className="inline-flex items-center rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-sm shadow-emerald-900/40 transition hover:bg-emerald-500"
                    >
                        <Rewind className="mr-1 inline h-3.5 w-3.5" />-1s
                    </button>
                    <button
                        type="button"
                        onClick={() => nudge(1)}
                        className="inline-flex items-center rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-sm shadow-emerald-900/40 transition hover:bg-emerald-500"
                    >
                        +1s <FastForward className="ml-1 inline h-3.5 w-3.5" />
                    </button>
                    {SPEEDS.map((s) => (
                        <button
                            key={s}
                            type="button"
                            onClick={() => setSpeed(s)}
                            className={`rounded-xl px-3 py-2 text-xs font-bold ${speed === s ? "bg-orange-500 text-white" : "border border-white/15 hover:bg-white/10"}`}
                        >
                            x{s}
                        </button>
                    ))}
                    <button
                        type="button"
                        onClick={togglePaint}
                        aria-pressed={paintEnabled}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${
                            paintEnabled
                                ? "bg-orange-500 text-white shadow-md shadow-orange-900/50 ring-2 ring-orange-300/80 ring-offset-2 ring-offset-slate-900"
                                : "border border-white/20 bg-slate-800/90 text-slate-300 hover:border-orange-400/40 hover:bg-slate-700 hover:text-white"
                        }`}
                    >
                        <Pencil className="h-3.5 w-3.5" />
                        {paintEnabled ? "Dibujando…" : "Dibujar"}
                    </button>
                    <button
                        type="button"
                        onClick={clearCanvases}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-rose-400/40 bg-rose-950/40 px-3 py-2 text-xs font-bold text-rose-200 transition hover:border-rose-300 hover:bg-rose-600/30 hover:text-white"
                    >
                        <Eraser className="h-3.5 w-3.5" /> Borrar trazos
                    </button>
                </div>

                <section className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className="flex items-center gap-2 text-lg font-bold">
                                <Upload className="h-5 w-5 text-cyan-300" />
                                Sube tus clips
                            </h2>
                            <p className="mt-1 text-xs text-slate-400">
                                Hasta {limits.maxBatch} vídeos por tanda · máx. {limits.maxFileMb} MB c/u · tanda ≤{" "}
                                {limits.maxBatchMb ?? limits.maxFileMb * limits.maxBatch} MB · MP4/MOV/WebM
                            </p>
                        </div>
                        <label className="cursor-pointer rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 px-4 py-2.5 text-sm font-bold text-white hover:brightness-110">
                            Elegir vídeos
                            <input type="file" accept="video/mp4,video/quicktime,video/webm" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
                        </label>
                    </div>

                    {uploadProgress > 0 && (
                        <div className="mt-4">
                            <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                                <div className="h-full bg-cyan-500 transition-all" style={{ width: `${uploadProgress}%` }} />
                            </div>
                        </div>
                    )}

                    {message ? <p className="mt-3 text-sm text-emerald-300">{message}</p> : null}
                    {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}

                    {uploads.length > 0 ? (
                        <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
                            {uploads.map((u) => (
                                <UploadThumb
                                    key={u.id}
                                    url={u.url}
                                    name={u.name}
                                    isSelected={selectedClipUrl === u.url}
                                    onSelect={() => selectUserClip(u.url)}
                                />
                            ))}
                        </div>
                    ) : null}

                    <div className="mt-5 border-t border-white/10 pt-4">
                        <button
                            type="button"
                            onClick={() => setDeleteConfirmOpen(true)}
                            disabled={deletingUploads || uploading}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/40 bg-rose-950/50 px-4 py-3 text-sm font-bold text-rose-100 transition hover:border-rose-400 hover:bg-rose-900/60 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                        >
                            <Trash2 className="h-4 w-4" />
                            {deletingUploads ? "Eliminando…" : "Borrar mis vídeos del servidor"}
                        </button>
                        <p className="mt-2 text-xs text-slate-400">
                            Cuando termines de comparar, elimina tus clips para proteger tu privacidad y liberar espacio.
                            Si no lo haces, se borrarán solos a los {limits.ttlMinutes} minutos.
                        </p>
                    </div>
                </section>

                <div className="mt-6 flex items-start gap-2 rounded-xl border border-cyan-500/20 bg-cyan-950/30 px-4 py-3 text-xs text-slate-300">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                    <p>
                        Protección anti-abuso: cupo por IP cada {limits.ipQuotaWindow} min.
                        Los vídeos que subes no se almacenan de forma permanente — se eliminan automáticamente
                        a los {limits.ttlMinutes} minutos para no saturar el servidor.
                    </p>
                </div>

                <p className="mt-8 flex items-center justify-center gap-1.5 text-center text-xs text-slate-500">
                    <Waves className="h-3.5 w-3.5" />
                    San Sebastian Surf School · Herramienta de análisis visual
                </p>
            </div>

            <ConfirmDeleteVideosModal
                open={deleteConfirmOpen}
                onClose={() => setDeleteConfirmOpen(false)}
                onConfirm={handleDeleteMyVideos}
                processing={deletingUploads}
                clipCount={uploads.length}
            />
        </div>
    );
}
