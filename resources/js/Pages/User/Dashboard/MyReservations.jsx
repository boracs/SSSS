import React, { useMemo, useState, useEffect, useRef } from "react";
import { Head, Link, router, useForm, usePage } from "@inertiajs/react";
import {
    AcademicCapIcon,
    BuildingStorefrontIcon,
    ClockIcon,
    PencilSquareIcon,
    StarIcon,
    TrophyIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import { AnimatePresence, motion } from "framer-motion";

const TAB_CLASSES = "classes";
const TAB_RENTALS = "rentals";
const TAB_BONOS = "bonos";

/** Recarga parcial: siempre incluir identidad y filas para no mezclar contexto admin/alumno en caché de Inertia. */
const RESERVATIONS_PARTIAL_KEYS = [
    "performanceData",
    "analysisNav",
    "isAdminView",
    "targetUser",
    "classRows",
    "rentalRows",
    "bonoRows",
];

// Navegación mensual del heatmap: solo refrescar datos necesarios del mes.
const MONTH_NAV_PARTIAL_KEYS = ["performanceData", "analysisNav"];

function badgeByStatus(row) {
    if (row?.payment_status === "confirmed" || row?.status === "confirmed") {
        return { label: "Confirmado", cls: "bg-emerald-100 text-emerald-700" };
    }
    if (row?.payment_status === "submitted") {
        return { label: "Validando Pago", cls: "bg-amber-100 text-amber-700" };
    }
    if (row?.payment_status === "pending" || row?.status === "pending") {
        return { label: "Pendiente de Pago", cls: "bg-rose-100 text-rose-700" };
    }
    if (row?.status === "cancelled_late_lost") {
        return {
            label: "Cancelada fuera de plazo (clase perdida)",
            cls: "bg-rose-100 text-rose-700",
        };
    }
    if (row?.status === "cancelled_late_rescued") {
        return {
            label: "Cancelada fuera de plazo (clase rescatada)",
            cls: "bg-amber-100 text-amber-700",
        };
    }
    if (row?.status === "cancelled_free" || row?.status === "cancelled") {
        return {
            label: "Cancelada sin penalización",
            cls: "bg-slate-200 text-slate-700",
        };
    }
    return { label: row?.status || "—", cls: "bg-slate-100 text-slate-700" };
}

/** Fecha local YYYY-MM-DD (evita desfase UTC con toISOString en el calendario). */
function toLocalYmd(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

/** Agrupa filas contiguas con el mismo user_bono_id (orden como envía el backend). */
function groupConsumptionHistoryByBono(history) {
    if (!Array.isArray(history) || history.length === 0) return [];
    const groups = [];
    let currentKey = null;
    let bucket = [];
    const keyOf = (h) =>
        h.user_bono_id != null && h.user_bono_id !== ""
            ? String(h.user_bono_id)
            : "_";
    for (const h of history) {
        const k = keyOf(h);
        if (currentKey === null) {
            currentKey = k;
        }
        if (k !== currentKey) {
            if (bucket.length) groups.push(bucket);
            bucket = [];
            currentKey = k;
        }
        bucket.push(h);
    }
    if (bucket.length) groups.push(bucket);
    return groups;
}

/** Bono activo primero; resto por sesión más reciente del grupo. */
function sortConsumptionHistoryGroups(groups) {
    const rowTime = (h) => {
        const s = h?.lesson?.starts_at || h?.consumed_at;
        return s ? new Date(s).getTime() : 0;
    };
    const groupLatest = (g) => Math.max(0, ...g.map(rowTime));
    return [...groups].sort((a, b) => {
        const aAct = a[0]?.bono_is_active ? 1 : 0;
        const bAct = b[0]?.bono_is_active ? 1 : 0;
        if (bAct !== aAct) return bAct - aAct;
        return groupLatest(b) - groupLatest(a);
    });
}

const BONO_GROUP_ACTIVE_STYLE = {
    band: "bg-emerald-50/90",
    hdr: "border-y border-emerald-200/90 bg-gradient-to-r from-emerald-100/95 to-teal-50/90",
    hdrText: "text-emerald-950",
};

const BONO_GROUP_INACTIVE_STYLE = {
    band: "bg-rose-50/90",
    hdr: "border-y border-rose-200/80 bg-gradient-to-r from-rose-100/90 to-orange-50/70",
    hdrText: "text-rose-950",
};

function formatCountdown(isoDate) {
    if (!isoDate) return null;
    const end = new Date(isoDate).getTime() + 30 * 60 * 1000;
    const now = Date.now();
    const diff = end - now;
    if (diff <= 0) return "Reserva Expirada";
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")} min`;
}

function skuColorToken(sku = "") {
    if (!sku) return { bg: "", border: "border-slate-200/60" };
    const palette = [
        { bg: "bg-sky-50/70", border: "border-sky-200/80" },
        { bg: "bg-emerald-50/70", border: "border-emerald-200/80" },
        { bg: "bg-violet-50/70", border: "border-violet-200/80" },
        { bg: "bg-amber-50/70", border: "border-amber-200/80" },
        { bg: "bg-rose-50/70", border: "border-rose-200/80" },
        { bg: "bg-cyan-50/70", border: "border-cyan-200/80" },
    ];
    const hash = Array.from(String(sku)).reduce(
        (acc, ch) => acc + ch.charCodeAt(0),
        0,
    );
    return palette[hash % palette.length];
}

function BonoWallet({ performanceData = null }) {
    const bono = performanceData?.activeBono ?? null;
    const resolvedPackName = bono?.name ?? null;
    const resolvedTotal = bono?.num_classes;
    const resolvedRemaining = bono?.remaining_uc ?? bono?.remaining;
    const lastPackTotal = Math.max(0, Number(bono?.last_pack_total_uc ?? 0));
    const lastPackConsumedRaw = Number(bono?.last_pack_consumed_uc ?? 0);
    const lastPackConsumed = Number.isFinite(lastPackConsumedRaw)
        ? lastPackConsumedRaw
        : 0;
    const lastPackExtraConsumedRaw = Number(
        bono?.last_pack_extra_consumed_uc ?? 0,
    );
    const lastPackExtraConsumed = Number.isFinite(lastPackExtraConsumedRaw)
        ? lastPackExtraConsumedRaw
        : 0;
    const lastPackAvailable = Math.max(0, lastPackTotal - lastPackConsumed);
    const resolvedPrediction = performanceData?.prediction;
    const resolvedStats = performanceData?.stats;

    const totalNum = Math.max(0, Number(resolvedTotal ?? 0));
    const remainingRaw = Number(resolvedRemaining ?? 0);
    const remainingNum = Number.isFinite(remainingRaw) ? remainingRaw : 0;
    const isOverdrawn = remainingNum < 0;
    const percentage =
        totalNum > 0 ? (Math.max(remainingNum, 0) / totalNum) * 100 : 0;
    const progressFraction = totalNum > 0 ? percentage / 100 : 0;
    const radius = 44;
    const strokeWidth = 10;
    const c = 2 * Math.PI * radius;
    const strokeDasharray = `${c}`;
    const strokeDashoffset = c * (1 - progressFraction);
    const progressStroke = isOverdrawn ? "#ef4444" : "#0ea5e9";
    const stats = resolvedStats || {};

    return (
        <div className="relative overflow-hidden rounded-3xl border border-white/40 bg-gradient-to-br from-sky-500/25 via-white/60 to-indigo-500/25 p-5 shadow-xl backdrop-blur-md">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-sky-300/30 blur-2xl" />
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Elite Surf Club Wallet
                    </p>
                    <h3 className="mt-1 text-xl font-bold text-slate-900">
                        {resolvedPackName || "Sin créditos activos"}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                        {resolvedPrediction
                            ? resolvedPrediction.replace(
                                  "Al ritmo actual, tus créditos durarán hasta el",
                                  "Con tu ritmo actual, te alcanza aprox. hasta el",
                              )
                            : "Sin predicción disponible."}
                    </p>
                    {bono && totalNum > 0 ? (
                        <p className="mt-1 text-xs font-medium text-slate-500">
                            Créditos disponibles hoy:{" "}
                            <span
                                className={`tabular-nums font-semibold ${remainingNum < 0 ? "text-red-600" : "text-slate-700"}`}
                            >
                                {remainingNum}
                            </span>
                            <span className="ml-2 text-slate-400">|</span>
                            <span className="ml-2">
                                Total comprados:{" "}
                                <span className="tabular-nums text-slate-700">
                                    {totalNum}
                                </span>
                            </span>
                        </p>
                    ) : null}
                    {bono && lastPackTotal > 0 ? (
                        <div className="mt-2 rounded-lg border border-slate-200/70 bg-white/65 px-2.5 py-2 text-[11px] leading-relaxed text-slate-600">
                            <p>
                                Última recarga:{" "}
                                <span className="font-semibold text-slate-800">
                                    {bono.sku || "—"}
                                </span>
                                {" · "}
                                <span className="tabular-nums font-semibold text-slate-800">
                                    {lastPackTotal}
                                </span>{" "}
                                créditos
                            </p>
                            <p>
                                Consumidos de esta recarga:{" "}
                                <span className="tabular-nums font-semibold text-slate-800">
                                    {lastPackConsumed}
                                </span>
                                /
                                <span className="tabular-nums">
                                    {lastPackTotal}
                                </span>
                                {" · "}Disponible de esta recarga:{" "}
                                <span className="tabular-nums font-semibold text-slate-800">
                                    {lastPackAvailable}
                                </span>
                            </p>
                            {lastPackExtraConsumed > 0 ? (
                                <p className="text-amber-700">
                                    Consumo adicional tras agotar esta recarga:{" "}
                                    <span className="tabular-nums font-semibold">
                                        {lastPackExtraConsumed}
                                    </span>{" "}
                                    créditos.
                                </p>
                            ) : null}
                        </div>
                    ) : null}
                </div>
                <div className="flex flex-col items-center">
                    <svg
                        viewBox="0 0 120 120"
                        className="h-28 w-28 shrink-0"
                        aria-hidden
                    >
                        <circle
                            cx="60"
                            cy="60"
                            r={radius}
                            stroke="#cbd5e1"
                            strokeWidth={strokeWidth}
                            fill="none"
                        />
                        <circle
                            cx="60"
                            cy="60"
                            r={radius}
                            stroke={progressStroke}
                            strokeWidth={strokeWidth}
                            fill="none"
                            strokeLinecap="round"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            transform="rotate(-90 60 60)"
                            className="transition-[stroke-dashoffset] duration-700 ease-out"
                        />
                        <text
                            x="60"
                            y="60"
                            textAnchor="middle"
                            dominantBaseline="central"
                            className={`${isOverdrawn ? "fill-red-600" : "fill-slate-900"} font-semibold`}
                            style={{
                                fontSize: "28px",
                                fontFeatureSettings: '"tnum"',
                                letterSpacing: "-0.02em",
                            }}
                        >
                            {remainingNum}
                        </text>
                    </svg>
                    <div className="mt-4 w-full max-w-[12rem] text-center">
                        <p className="text-xs font-medium text-slate-600">
                            Indicador de Créditos
                        </p>
                        {totalNum > 0 ? (
                            <p className="mt-2 tabular-nums text-[11px] font-normal leading-relaxed text-slate-500">
                                Saldo actual: {remainingNum} de {totalNum}{" "}
                                créditos · Consumidos:{" "}
                                {Math.max(0, totalNum - remainingNum)}
                            </p>
                        ) : null}
                        {isOverdrawn ? (
                            <p className="mt-1 text-[11px] font-semibold text-red-600">
                                Créditos Adelantados: {Math.abs(remainingNum)}
                            </p>
                        ) : null}
                    </div>
                </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                <div className="rounded-xl bg-white/60 p-3">
                    <p className="text-xs text-slate-500">Total Surfeado</p>
                    <p className="font-semibold text-slate-900">
                        {Number(stats.total_surfed_hours || 0).toFixed(1)} h
                    </p>
                </div>
                <div className="rounded-xl bg-white/60 p-3">
                    <p className="text-xs text-slate-500">Ratio Solo/Grupal</p>
                    <p className="font-semibold text-slate-900">
                        {Number(stats.solo_ratio_percent || 0)}% solo
                    </p>
                </div>
                <div className="rounded-xl bg-white/60 p-3">
                    <p className="text-xs text-slate-500">Progreso de Nivel</p>
                    <p className="font-semibold text-slate-900">
                        {stats.level_progress || "Iniciación"}
                    </p>
                </div>
            </div>
        </div>
    );
}

function buildAdminNoteFormState(targetUser, selectedData) {
    const lu = selectedData?.lesson_user_id;
    const lessonId = selectedData?.lesson?.id;
    if (!targetUser?.id || !lu || Number(lu) < 1) {
        return {
            user_id: String(targetUser?.id ?? ""),
            body: "",
            reservation_type: "lesson_user",
            reservation_id: "",
            lesson_id: lessonId ? String(lessonId) : "",
            attendance_note_id: "",
            is_visible_to_student: true,
        };
    }
    const adminNote = selectedData.admin_note;
    return {
        user_id: String(targetUser.id),
        body: adminNote?.body ?? "",
        reservation_type: "lesson_user",
        reservation_id: String(lu),
        lesson_id: lessonId ? String(lessonId) : "",
        attendance_note_id: adminNote?.id ? String(adminNote.id) : "",
        is_visible_to_student: adminNote
            ? !!adminNote.is_visible_to_student
            : true,
    };
}

function AdminAttendanceNoteForm({
    targetUser,
    selectedData,
    selectedLessonUserId = null,
}) {
    const form = useForm(buildAdminNoteFormState(targetUser, selectedData));
    const lu = Number(
        selectedLessonUserId ?? selectedData?.lesson_user_id ?? 0,
    );
    const hasLinkedEnrollment = Boolean(selectedData && lu > 0);
    const canUseAdminForm = Boolean(selectedData);
    const selectedLessonId = Number(selectedData?.lesson?.id ?? 0);

    useEffect(() => {
        const next = buildAdminNoteFormState(targetUser, selectedData);
        if (lu > 0) {
            next.reservation_id = String(lu);
            next.reservation_type = "lesson_user";
        }
        form.setData(next);
    }, [targetUser?.id, selectedData, lu]);

    const submit = (e) => {
        e.preventDefault();
        if (!canUseAdminForm || form.processing) return;
        form.transform((data) => {
            const out = {
                user_id: parseInt(data.user_id, 10),
                body: data.body,
                reservation_type: "lesson_user",
                reservation_id: lu > 0 ? lu : null,
                lesson_id: selectedLessonId > 0 ? selectedLessonId : null,
                is_visible_to_student: !!data.is_visible_to_student,
            };
            if (data.attendance_note_id) {
                out.attendance_note_id = parseInt(data.attendance_note_id, 10);
            }
            return out;
        });
        form.post(route("admin.vips.attendance-notes.store"), {
            preserveScroll: true,
            only: RESERVATIONS_PARTIAL_KEYS,
            onFinish: () => {
                form.transform((d) => d);
            },
        });
    };

    if (!canUseAdminForm) {
        return (
            <p className="text-sm text-slate-500">
                Selecciona una clase del calendario para guardar feedback.
            </p>
        );
    }

    return (
        <form className="space-y-3" onSubmit={submit}>
            <div>
                <label
                    htmlFor="admin-attendance-note"
                    className="text-xs font-bold uppercase tracking-wider text-slate-600"
                >
                    Feedback del administrador
                </label>
                <textarea
                    id="admin-attendance-note"
                    rows={5}
                    value={form.data.body}
                    onChange={(e) => form.setData("body", e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-inner outline-none ring-slate-200 transition focus:border-sky-500 focus:ring-2"
                    placeholder="Escribe correcciones de la clase u objetivo trabajado (texto plano)."
                />
                {form.errors.body ? (
                    <p className="mt-1 text-xs text-rose-600">
                        {form.errors.body}
                    </p>
                ) : null}
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                    type="checkbox"
                    checked={!!form.data.is_visible_to_student}
                    onChange={(e) =>
                        form.setData("is_visible_to_student", e.target.checked)
                    }
                    className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                Visible para el alumno (trofeo en calendario)
            </label>
            {form.errors.user_id ? (
                <p className="text-xs text-rose-600">{form.errors.user_id}</p>
            ) : null}
            {form.errors.reservation_id ? (
                <p className="text-xs text-rose-600">
                    {form.errors.reservation_id}
                </p>
            ) : null}
            {form.errors.attendance_note_id ? (
                <p className="text-xs text-rose-600">
                    {form.errors.attendance_note_id}
                </p>
            ) : null}
            <div className="flex justify-end pt-1">
                <button
                    type="submit"
                    disabled={form.processing || selectedLessonId <= 0}
                    className="inline-flex min-w-[9rem] items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
                >
                    {form.processing ? (
                        <>
                            <span
                                className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                                aria-hidden
                            />
                            Guardando…
                        </>
                    ) : (
                        "Guardar nota"
                    )}
                </button>
            </div>
        </form>
    );
}

function AttendanceHeatmap({
    attendanceMap = [],
    performanceMonth = null,
    keepHistoryLoaded = false,
    identityKey = "self",
    isAdminAnalysisMode = false,
    targetUserIdForApi = null,
    adminAnalysisFrom = "vips",
    renderAdminFeedback = null,
}) {
    const [direction, setDirection] = useState(1);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedLessonId, setSelectedLessonId] = useState(null);
    const [selectedEntryIndex, setSelectedEntryIndex] = useState(0);
    const [touchX, setTouchX] = useState(null);
    const [isLoadingMonth, setIsLoadingMonth] = useState(false);
    const [monthCursor, setMonthCursor] = useState(
        () => performanceMonth || toLocalYmd(new Date()).slice(0, 7),
    );
    const prevIdentityKey = useRef(identityKey);

    useEffect(() => {
        if (prevIdentityKey.current !== identityKey) {
            prevIdentityKey.current = identityKey;
            setMonthCursor(
                performanceMonth || toLocalYmd(new Date()).slice(0, 7),
            );
        }
    }, [identityKey, performanceMonth]);

    const parsedMonth = useMemo(() => {
        const [y, m] = monthCursor.split("-").map((x) => Number(x));
        return new Date(y, m - 1, 1);
    }, [monthCursor]);

    const monthLabel = parsedMonth.toLocaleDateString("es-ES", {
        month: "long",
        year: "numeric",
    });
    const firstDayMondayBased = (parsedMonth.getDay() + 6) % 7;
    const daysInMonth = new Date(
        parsedMonth.getFullYear(),
        parsedMonth.getMonth() + 1,
        0,
    ).getDate();

    const mapByDate = useMemo(() => {
        const out = {};
        attendanceMap.forEach((r) => {
            if (!out[r.date]) out[r.date] = [];
            out[r.date].push(r);
        });
        return out;
    }, [attendanceMap]);

    const days = useMemo(() => {
        const cells = [];
        const prevMonthDays = new Date(
            parsedMonth.getFullYear(),
            parsedMonth.getMonth(),
            0,
        ).getDate();

        for (let i = 0; i < firstDayMondayBased; i += 1) {
            const day = prevMonthDays - firstDayMondayBased + i + 1;
            const d = new Date(
                parsedMonth.getFullYear(),
                parsedMonth.getMonth() - 1,
                day,
            );
            const iso = toLocalYmd(d);
            cells.push({
                iso,
                dayNumber: day,
                isCurrentMonth: false,
                entries: mapByDate[iso] || [],
            });
        }
        for (let d = 1; d <= daysInMonth; d += 1) {
            const date = new Date(
                parsedMonth.getFullYear(),
                parsedMonth.getMonth(),
                d,
            );
            const iso = toLocalYmd(date);
            cells.push({
                iso,
                dayNumber: d,
                isCurrentMonth: true,
                entries: mapByDate[iso] || [],
            });
        }
        while (cells.length < 42) {
            const nextDay =
                cells.length - (firstDayMondayBased + daysInMonth) + 1;
            const d = new Date(
                parsedMonth.getFullYear(),
                parsedMonth.getMonth() + 1,
                nextDay,
            );
            const iso = toLocalYmd(d);
            cells.push({
                iso,
                dayNumber: nextDay,
                isCurrentMonth: false,
                entries: mapByDate[iso] || [],
            });
        }
        return cells;
    }, [parsedMonth, firstDayMondayBased, daysInMonth, mapByDate]);

    useEffect(() => {
        const monthRows = days.filter(
            (d) => d.isCurrentMonth && (d.entries?.length || 0) > 0,
        );
        if (monthRows.length > 0) {
            const latest = monthRows[monthRows.length - 1];
            setSelectedDate((prev) =>
                prev && monthRows.some((r) => r.iso === prev)
                    ? prev
                    : latest.iso,
            );
        } else {
            setSelectedDate(null);
        }
    }, [days]);

    const selectedEntries = useMemo(() => {
        const rows = selectedDate ? mapByDate[selectedDate] || [] : [];
        return [...rows].sort((a, b) => {
            const ta = a?.lesson?.starts_at
                ? new Date(a.lesson.starts_at).getTime()
                : 0;
            const tb = b?.lesson?.starts_at
                ? new Date(b.lesson.starts_at).getTime()
                : 0;
            return ta - tb;
        });
    }, [selectedDate, mapByDate]);

    useEffect(() => {
        if (!selectedEntries.length) {
            setSelectedLessonId(null);
            setSelectedEntryIndex(0);
            return;
        }
        const withSavedNote = selectedEntries.find((entry) =>
            Boolean(entry?.admin_note?.id || entry?.note?.text),
        );
        const preferred = withSavedNote || selectedEntries[0];
        const preferredIndex = Math.max(
            0,
            selectedEntries.findIndex((entry) => entry === preferred),
        );
        setSelectedEntryIndex(preferredIndex);
    }, [selectedDate, selectedEntries]);

    useEffect(() => {
        const row = selectedEntries[selectedEntryIndex] || null;
        const lu = Number(row?.lesson_user_id ?? 0);
        setSelectedLessonId(lu > 0 ? lu : null);
    }, [selectedEntries, selectedEntryIndex]);

    useEffect(() => {
        if (String(performanceMonth ?? "") === String(monthCursor)) {
            return;
        }

        if (isAdminAnalysisMode) {
            if (!targetUserIdForApi) {
                return;
            }
        }

        setIsLoadingMonth(true);
        const url =
            isAdminAnalysisMode && targetUserIdForApi
                ? route("admin.vips.analysis", targetUserIdForApi)
                : route("my-reservations.index");
        const params = {
            bono_month: monthCursor,
            load_history: keepHistoryLoaded ? 1 : 0,
        };
        if (isAdminAnalysisMode && targetUserIdForApi) {
            params.target_user_id = targetUserIdForApi;
            params.from = adminAnalysisFrom === "users" ? "users" : "vips";
        }
        router.get(url, params, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            only: MONTH_NAV_PARTIAL_KEYS,
            onFinish: () => setIsLoadingMonth(false),
        });
    }, [
        monthCursor,
        performanceMonth,
        keepHistoryLoaded,
        isAdminAnalysisMode,
        targetUserIdForApi,
        adminAnalysisFrom,
    ]);

    const selectedData = useMemo(() => {
        if (!selectedEntries.length) return null;
        return selectedEntries[selectedEntryIndex] || selectedEntries[0];
    }, [selectedEntries, selectedEntryIndex]);
    const currentWeekStart = new Date();
    currentWeekStart.setDate(
        currentWeekStart.getDate() - ((currentWeekStart.getDay() + 6) % 7),
    );
    currentWeekStart.setHours(0, 0, 0, 0);
    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekStart.getDate() + 6);

    const goMonth = (delta) => {
        setDirection(delta > 0 ? 1 : -1);
        const d = new Date(parsedMonth);
        d.setMonth(d.getMonth() + delta);
        setMonthCursor(
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        );
    };

    const onTouchStart = (e) => setTouchX(e.touches?.[0]?.clientX ?? null);
    const onTouchEnd = (e) => {
        if (touchX === null) return;
        const endX = e.changedTouches?.[0]?.clientX ?? touchX;
        const diff = endX - touchX;
        if (Math.abs(diff) > 40) goMonth(diff < 0 ? 1 : -1);
        setTouchX(null);
    };

    const cellCls = (c) => {
        const base =
            "relative h-10 rounded-lg border transition-all duration-200";
        const outside = !c.isCurrentMonth ? "opacity-10" : "";
        const selected =
            selectedDate === c.iso
                ? "ring-2 ring-sky-400 shadow-[0_0_18px_rgba(56,189,248,0.45)]"
                : "";
        const hasData = (c.entries?.length || 0) > 0;
        const heat = hasData
            ? "bg-white border-slate-300"
            : "bg-slate-100 border-slate-200";
        const day = new Date(c.iso);
        const pulse = "";
        return `${base} ${outside} ${selected} ${heat} ${pulse}`;
    };

    return (
        <div
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
        >
            <div className="mb-3 flex items-center justify-between">
                <button
                    type="button"
                    onClick={() => goMonth(-1)}
                    className="rounded-lg bg-slate-100 px-3 py-1 text-sm text-slate-700"
                >
                    ◀
                </button>
                <AnimatePresence mode="wait" initial={false}>
                    <motion.p
                        key={monthCursor}
                        initial={{ x: direction > 0 ? 24 : -24, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: direction > 0 ? -24 : 24, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="text-sm font-semibold capitalize text-slate-900"
                    >
                        {monthLabel}
                    </motion.p>
                </AnimatePresence>
                <button
                    type="button"
                    onClick={() => goMonth(1)}
                    className="rounded-lg bg-slate-100 px-3 py-1 text-sm text-slate-700"
                >
                    ▶
                </button>
            </div>

            <div className="mb-2 grid grid-cols-7 gap-2 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
                    <span key={d}>{d}</span>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
                {days.map((c) => (
                    <button
                        key={c.iso}
                        type="button"
                        onClick={() =>
                            c.isCurrentMonth && setSelectedDate(c.iso)
                        }
                        className={cellCls(c)}
                    >
                        {c.entries?.length ? (
                            <div className="absolute inset-0 overflow-hidden rounded-lg">
                                <div className="flex h-full w-full flex-col divide-y-2 divide-white/95">
                                    {c.entries.map((entry, idx) => (
                                        <div
                                            key={`${c.iso}-${idx}`}
                                            className={`w-full flex-1 ${
                                                Number(entry?.uc_cost) === 2
                                                    ? "bg-[#EF4444]"
                                                    : "bg-[#FACC15]"
                                            } cursor-pointer transition-opacity hover:opacity-90`}
                                            role="button"
                                            tabIndex={0}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (!c.isCurrentMonth) return;
                                                const entryLessonUserId =
                                                    Number(
                                                        entry?.lesson_user_id ??
                                                            0,
                                                    );
                                                setSelectedDate(c.iso);
                                                setSelectedEntryIndex(idx);
                                                setSelectedLessonId(
                                                    entryLessonUserId > 0
                                                        ? entryLessonUserId
                                                        : null,
                                                );
                                            }}
                                            onKeyDown={(e) => {
                                                if (
                                                    e.key !== "Enter" &&
                                                    e.key !== " "
                                                )
                                                    return;
                                                e.preventDefault();
                                                if (!c.isCurrentMonth) return;
                                                const entryLessonUserId =
                                                    Number(
                                                        entry?.lesson_user_id ??
                                                            0,
                                                    );
                                                setSelectedDate(c.iso);
                                                setSelectedEntryIndex(idx);
                                                setSelectedLessonId(
                                                    entryLessonUserId > 0
                                                        ? entryLessonUserId
                                                        : null,
                                                );
                                            }}
                                            title={
                                                Number(entry?.uc_cost) === 2
                                                    ? "Clase particular/solo (2 UC)"
                                                    : "Clase grupal (1 UC)"
                                            }
                                        />
                                    ))}
                                </div>
                            </div>
                        ) : null}
                        <span
                            className={`absolute left-1 top-1 z-10 rounded-md px-1 py-0.5 text-[11px] tabular-nums ${
                                c.entries?.length
                                    ? "bg-white/85 text-slate-800 shadow-sm"
                                    : "text-slate-500/70"
                            }`}
                        >
                            {c.dayNumber}
                        </span>
                    </button>
                ))}
            </div>

            <div className="mt-4 rounded-2xl border border-white/40 bg-white/60 p-4 backdrop-blur-xl">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={selectedDate || "empty"}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        {isLoadingMonth ? (
                            <p className="text-sm text-slate-600">
                                Cargando actividad del mes...
                            </p>
                        ) : selectedData || selectedEntries.length > 1 ? (
                            <>
                                {selectedEntries.length > 1 ? (
                                    <div className="mb-3 flex flex-wrap gap-2">
                                        {selectedEntries.map((entry, idx) =>
                                            (() => {
                                                const isPremium =
                                                    Number(entry?.uc_cost) ===
                                                    2;
                                                const isSelected =
                                                    idx === selectedEntryIndex;
                                                const hasSavedFeedback =
                                                    Boolean(
                                                        entry?.admin_note?.id ||
                                                        entry?.note?.text,
                                                    );
                                                const activeCls = isPremium
                                                    ? "border-red-600 bg-red-600 text-white"
                                                    : "border-amber-600 bg-amber-500 text-white";
                                                const inactiveCls = isPremium
                                                    ? "border-red-200 bg-red-50 text-red-800"
                                                    : "border-amber-200 bg-amber-50 text-amber-800";
                                                return (
                                                    <button
                                                        key={`entry-${idx}`}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedEntryIndex(
                                                                idx,
                                                            );
                                                        }}
                                                        className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                                                            isSelected
                                                                ? activeCls
                                                                : inactiveCls
                                                        }`}
                                                    >
                                                        {`Ver detalle ${idx + 1}º clase`}
                                                        {hasSavedFeedback ? (
                                                            <CheckCircleIcon
                                                                className="ml-1.5 h-4 w-4 text-emerald-600"
                                                                aria-hidden
                                                            />
                                                        ) : (
                                                            <PencilSquareIcon
                                                                className="ml-1.5 h-4 w-4 text-slate-600"
                                                                aria-hidden
                                                            />
                                                        )}
                                                    </button>
                                                );
                                            })(),
                                        )}
                                    </div>
                                ) : null}
                                {selectedData ? (
                                    <>
                                        <p className="font-semibold text-slate-900">
                                            {selectedData.lesson?.title ||
                                                "Sesión"}
                                        </p>
                                        <p className="text-sm text-slate-600">
                                            {selectedData.lesson?.starts_at
                                                ? new Date(
                                                      selectedData.lesson
                                                          .starts_at,
                                                  ).toLocaleString("es-ES")
                                                : "Sin hora"}{" "}
                                            ·{" "}
                                            {selectedData.lesson?.spot ||
                                                "Spot por confirmar"}
                                        </p>
                                        <p className="text-sm text-slate-600">
                                            Nivel:{" "}
                                            {selectedData.lesson?.level ||
                                                "iniciacion"}
                                        </p>
                                        <p className="text-sm text-slate-600">
                                            Monitor:{" "}
                                            {selectedData.note?.monitor_name ||
                                                "Por asignar"}
                                        </p>
                                        <div className="mt-2">
                                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                                Crew
                                            </p>
                                            {Array.isArray(selectedData.crew) &&
                                            selectedData.crew.length > 0 ? (
                                                <p className="text-sm text-slate-700">
                                                    {selectedData.crew
                                                        .map((c) => c.name)
                                                        .join(", ")}
                                                </p>
                                            ) : (
                                                <p className="text-sm text-slate-600">
                                                    Solo tú
                                                </p>
                                            )}
                                        </div>
                                        {selectedData.note?.text ? (
                                            <div className="mt-4 flex gap-3 rounded-xl border border-sky-200/90 bg-sky-50 p-4 shadow-sm ring-1 ring-sky-100">
                                                <TrophyIcon
                                                    className="h-8 w-8 shrink-0 text-sky-600"
                                                    aria-hidden
                                                />
                                                <div className="min-w-0">
                                                    <p className="text-[10px] font-bold uppercase tracking-wider text-sky-800">
                                                        Mensaje del coach
                                                    </p>
                                                    <p className="mt-1.5 text-sm font-medium leading-relaxed text-sky-950">
                                                        {selectedData.note
                                                            .monitor_name ||
                                                            "Monitor"}
                                                        :{" "}
                                                        {selectedData.note.text}
                                                    </p>
                                                </div>
                                            </div>
                                        ) : selectedData.lesson
                                              ?.monitor_note ? (
                                            <p className="mt-3 rounded-lg bg-sky-50/90 p-3 text-xs text-sky-900 ring-1 ring-sky-100">
                                                Progreso:{" "}
                                                {
                                                    selectedData.lesson
                                                        .monitor_note
                                                }
                                            </p>
                                        ) : null}
                                    </>
                                ) : null}
                            </>
                        ) : (
                            <p className="text-sm text-slate-600">
                                Día libre. ¡Buen momento para estirar o revisar
                                la previsión de olas!
                            </p>
                        )}
                    </motion.div>
                </AnimatePresence>
                {isAdminAnalysisMode &&
                targetUserIdForApi &&
                typeof renderAdminFeedback === "function" ? (
                    <div className="mt-4 border-t border-slate-200/90 pt-4">
                        {renderAdminFeedback(selectedData, selectedLessonId)}
                    </div>
                ) : null}
            </div>
        </div>
    );
}

function AnalysisDashboardSkeleton() {
    return (
        <div
            className="grid animate-pulse grid-cols-1 gap-4 lg:grid-cols-2"
            aria-hidden
        >
            <div className="h-64 rounded-3xl bg-slate-200/80" />
            <div className="h-64 rounded-2xl bg-slate-200/80" />
            <div className="h-40 rounded-2xl bg-slate-200/60 lg:col-span-2" />
        </div>
    );
}

/**
 * Re-monta la vista al cambiar de alumno en modo análisis o de contexto admin/self (evita estado residual).
 */
export default function MyReservations() {
    const { props } = usePage();
    const remountKey =
        props.isAdminView && props.targetUser?.id != null
            ? `admin-analysis-${props.targetUser.id}`
            : `self-${props.auth?.user?.id ?? "guest"}`;
    return <MyReservationsView key={remountKey} />;
}

/** Datos siempre desde props Inertia; en admin, calendario/stats vía GET admin/vips/{id}/analisis + target_user_id (no /mis-reservas). */
function MyReservationsView() {
    const { props } = usePage();
    const {
        classRows = [],
        rentalRows = [],
        bonoRows = [],
        performanceData = null,
        isAdminView: isAdminViewRaw = false,
        targetUser = null,
        analysisNav = null,
    } = props;

    const isAdminView =
        isAdminViewRaw === true ||
        isAdminViewRaw === 1 ||
        String(isAdminViewRaw) === "1";
    const analysisTargetId =
        targetUser && targetUser.id != null ? Number(targetUser.id) : null;
    const adminAnalysisReady = isAdminView && analysisTargetId > 0;

    const isVip =
        props?.auth?.user?.is_vip === true ||
        String(props?.auth?.user?.is_vip) === "1";
    const isManagementProfile =
        String(performanceData?.profile_mode || "") === "management";
    const isVipEffective = isAdminView || isVip;
    const [tab, setTab] = useState(() =>
        isVipEffective ? TAB_BONOS : TAB_CLASSES,
    );
    const [tick, setTick] = useState(Date.now());
    const [proofModal, setProofModal] = useState(null); // { type, id }
    const [proofFile, setProofFile] = useState(null);
    const [cancelModal, setCancelModal] = useState(null); // { type, id, isWithinCancellationWindow }
    const [processing, setProcessing] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyLoaded, setHistoryLoaded] = useState(
        !!performanceData?.history_loaded,
    );

    useEffect(() => {
        setHistoryLoaded(!!performanceData?.history_loaded);
    }, [performanceData?.history_loaded]);

    const subjectUserId =
        performanceData?.subject_user_id != null
            ? Number(performanceData.subject_user_id)
            : null;
    const contextMismatch =
        adminAnalysisReady &&
        subjectUserId != null &&
        analysisTargetId != null &&
        subjectUserId !== analysisTargetId;

    useEffect(() => {
        if (isAdminView) {
            return;
        }
        if (isVip && tab === TAB_CLASSES) {
            setTab(TAB_BONOS);
        }
        if (!isVip && tab === TAB_BONOS) {
            setTab(TAB_CLASSES);
        }
    }, [isVip, isAdminView, tab]);

    const consumptionHistoryRows = useMemo(() => {
        const rows = Array.isArray(performanceData?.history)
            ? [...performanceData.history]
            : [];
        return rows.sort((a, b) => {
            const ta = a?.lesson?.starts_at
                ? new Date(a.lesson.starts_at).getTime()
                : 0;
            const tb = b?.lesson?.starts_at
                ? new Date(b.lesson.starts_at).getTime()
                : 0;
            return tb - ta;
        });
    }, [performanceData?.history]);

    useEffect(() => {
        const id = setInterval(() => setTick(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    const activeRows = useMemo(() => {
        void tick;
        if (tab === TAB_CLASSES) return classRows;
        if (tab === TAB_RENTALS) return rentalRows;
        return bonoRows;
    }, [tab, classRows, rentalRows, bonoRows, tick]);

    const { upcomingRows, historyRows } = useMemo(() => {
        const now = Date.now();
        const rows = activeRows || [];
        const upcoming = [];
        const history = [];
        rows.forEach((row) => {
            const rawDate =
                row?.start_time || row?.end_time || row?.created_at || null;
            const ts = rawDate ? new Date(rawDate).getTime() : null;
            if (ts !== null && Number.isFinite(ts) && ts >= now) {
                upcoming.push(row);
            } else {
                history.push(row);
            }
        });
        return { upcomingRows: upcoming, historyRows: history };
    }, [activeRows]);

    const submitProof = () => {
        if (!proofModal?.id || !proofFile || processing) return;
        setProcessing(true);
        const routeName =
            proofModal.type === "class"
                ? "my-reservations.class.upload-proof"
                : "my-reservations.rental.upload-proof";
        router.post(
            route(routeName, proofModal.id),
            { proof: proofFile, payment_method: "transferencia" },
            {
                forceFormData: true,
                preserveScroll: true,
                onSuccess: () => {
                    setProofModal(null);
                    setProofFile(null);
                },
                onFinish: () => setProcessing(false),
            },
        );
    };

    const cancelReservation = () => {
        if (!cancelModal?.id || processing) return;
        setProcessing(true);
        const routeName =
            cancelModal.type === "class"
                ? "my-reservations.class.cancel"
                : "my-reservations.rental.cancel";
        const payload = {};
        if (
            cancelModal.type === "class" &&
            cancelModal.isWithinCancellationWindow
        ) {
            payload.late_policy =
                cancelModal.latePolicy === "rescue" ? "rescue" : "lose";
        }
        router.post(route(routeName, cancelModal.id), payload, {
            preserveScroll: true,
            onSuccess: () => setCancelModal(null),
            onFinish: () => setProcessing(false),
        });
    };

    const analysisListFrom = analysisNav?.from === "users" ? "users" : "vips";
    const performanceReloadUrl = adminAnalysisReady
        ? route("admin.vips.analysis", analysisTargetId)
        : route("my-reservations.index");

    const targetDisplayName =
        [targetUser?.nombre, targetUser?.apellido]
            .filter(Boolean)
            .join(" ")
            .trim() || "Alumno";

    const listBackHref =
        analysisListFrom === "users"
            ? route("admin.users.index")
            : route("admin.vips.index");
    const listBackLabel =
        analysisListFrom === "users"
            ? "Volver al listado de usuarios"
            : "Volver al listado VIP";

    const showAdminSkeleton = false;

    return (
        <>
            <Head
                title={
                    isAdminView
                        ? `Análisis · ${targetDisplayName}`
                        : "Mis Reservas"
                }
            />
            {isAdminView ? (
                <div className="sticky top-0 z-40 border-b border-blue-200/80 bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white shadow-sm">
                    MODO ANÁLISIS: viendo datos de {targetDisplayName}
                </div>
            ) : null}
            <div
                className={`mx-auto max-w-6xl space-y-5 p-4 sm:p-6 ${
                    isAdminView
                        ? "border-l-4 border-blue-500 bg-slate-50/90"
                        : ""
                }`}
            >
                {isAdminView && !adminAnalysisReady ? (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                        <strong>Contexto de análisis inválido.</strong> Falta el
                        alumno objetivo en la sesión Inertia. Cierra esta
                        pestaña y abre el análisis desde el CRM VIP o Usuarios
                        con el enlace correcto (incluye{" "}
                        <code className="rounded bg-white px-1">
                            target_user_id
                        </code>
                        ).
                    </div>
                ) : null}

                {!isAdminView && isManagementProfile ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
                        Panel de Gestión: Para reservar clases, usa tu cuenta de
                        alumno.
                    </div>
                ) : null}

                {contextMismatch ? (
                    <div className="rounded-xl border border-rose-300 bg-rose-100 px-4 py-3 text-sm font-medium text-rose-950">
                        Conflicto de datos: el calendario no coincide con el
                        alumno seleccionado.{" "}
                        <button
                            type="button"
                            className="underline"
                            onClick={() =>
                                router.reload({
                                    only: RESERVATIONS_PARTIAL_KEYS,
                                })
                            }
                        >
                            Recargar contexto
                        </button>
                    </div>
                ) : null}
                {isAdminView && targetUser ? (
                    <>
                        <nav
                            className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-slate-500"
                            aria-label="Migas de pan"
                        >
                            <Link
                                href={route("admin.users.index")}
                                className="font-medium hover:text-slate-800"
                            >
                                Admin
                            </Link>
                            <span className="text-slate-300" aria-hidden>
                                /
                            </span>
                            {analysisListFrom === "users" ? (
                                <Link
                                    href={route("admin.users.index")}
                                    className="hover:text-slate-800"
                                >
                                    Usuarios
                                </Link>
                            ) : (
                                <Link
                                    href={route("admin.vips.index")}
                                    className="hover:text-slate-800"
                                >
                                    Usuarios VIP
                                </Link>
                            )}
                            <span className="text-slate-300" aria-hidden>
                                /
                            </span>
                            <span className="font-semibold text-slate-700">
                                {targetDisplayName}
                            </span>
                        </nav>
                        <div className="flex flex-col gap-3 rounded-2xl border border-indigo-200/90 bg-gradient-to-r from-indigo-50 via-white to-sky-50 px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm font-semibold text-slate-900">
                                Visualizando perfil de:{" "}
                                <span className="text-indigo-950">
                                    {targetDisplayName}
                                </span>
                            </p>
                            <Link
                                href={listBackHref}
                                className="inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
                            >
                                {listBackLabel}
                            </Link>
                        </div>
                    </>
                ) : null}

                <h1 className="text-2xl font-bold text-slate-900">
                    {isAdminView ? "Modo análisis" : "Mis Reservas"}
                </h1>

                <div className="flex flex-wrap gap-2">
                    {isAdminView ? (
                        <>
                            <button
                                type="button"
                                onClick={() => setTab(TAB_BONOS)}
                                className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === TAB_BONOS ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700"}`}
                            >
                                Resumen VIP
                            </button>
                            <button
                                type="button"
                                onClick={() => setTab(TAB_CLASSES)}
                                className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === TAB_CLASSES ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700"}`}
                            >
                                Clases del alumno
                            </button>
                            <button
                                type="button"
                                onClick={() => setTab(TAB_RENTALS)}
                                className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === TAB_RENTALS ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700"}`}
                            >
                                Alquileres
                            </button>
                        </>
                    ) : !isAdminView && isVip ? (
                        <>
                            <button
                                type="button"
                                onClick={() => setTab(TAB_BONOS)}
                                className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === TAB_BONOS ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-700"}`}
                            >
                                Mis Créditos
                            </button>
                            <button
                                type="button"
                                onClick={() => setTab(TAB_RENTALS)}
                                className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === TAB_RENTALS ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-700"}`}
                            >
                                Alquileres
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={() => setTab(TAB_CLASSES)}
                                className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === TAB_CLASSES ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-700"}`}
                            >
                                Clases
                            </button>
                            <button
                                type="button"
                                onClick={() => setTab(TAB_RENTALS)}
                                className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === TAB_RENTALS ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-700"}`}
                            >
                                Alquileres
                            </button>
                        </>
                    )}
                </div>

                {(tab === TAB_BONOS && isVipEffective) ||
                (isAdminView && tab === TAB_BONOS) ? (
                    showAdminSkeleton && !contextMismatch ? (
                        <AnalysisDashboardSkeleton />
                    ) : (
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                            <BonoWallet
                                performanceData={performanceData || {}}
                            />
                            <AttendanceHeatmap
                                key={`heatmap-${adminAnalysisReady ? analysisTargetId : "self"}`}
                                attendanceMap={
                                    performanceData?.attendanceMap || []
                                }
                                performanceMonth={
                                    performanceData?.month || null
                                }
                                keepHistoryLoaded={historyLoaded}
                                identityKey={
                                    adminAnalysisReady
                                        ? `admin-${analysisTargetId}`
                                        : "self"
                                }
                                isAdminAnalysisMode={adminAnalysisReady}
                                targetUserIdForApi={
                                    adminAnalysisReady ? analysisTargetId : null
                                }
                                adminAnalysisFrom={analysisListFrom}
                                renderAdminFeedback={
                                    adminAnalysisReady && targetUser
                                        ? (selectedData, selectedLessonId) => (
                                              <AdminAttendanceNoteForm
                                                  key={`${selectedData?.date ?? "none"}-${selectedLessonId ?? 0}-${selectedData?.admin_note?.id ?? "new"}`}
                                                  targetUser={targetUser}
                                                  selectedData={selectedData}
                                                  selectedLessonUserId={
                                                      selectedLessonId
                                                  }
                                              />
                                          )
                                        : null
                                }
                            />
                            <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                    Extracto de Movimientos de Crédito
                                </p>
                                {!historyLoaded ? (
                                    <div className="mt-4 flex justify-center">
                                        <button
                                            type="button"
                                            title="Carga tu registro detallado de sesiones pasadas"
                                            onClick={() => {
                                                if (historyLoading) return;
                                                setHistoryLoading(true);
                                                router.get(
                                                    performanceReloadUrl,
                                                    {
                                                        bono_month:
                                                            performanceData?.month ||
                                                            toLocalYmd(
                                                                new Date(),
                                                            ).slice(0, 7),
                                                        load_history: 1,
                                                        ...(adminAnalysisReady
                                                            ? {
                                                                  from: analysisListFrom,
                                                                  target_user_id:
                                                                      analysisTargetId,
                                                              }
                                                            : {}),
                                                    },
                                                    {
                                                        only: RESERVATIONS_PARTIAL_KEYS,
                                                        preserveState: true,
                                                        preserveScroll: true,
                                                        onFinish: () => {
                                                            setHistoryLoading(
                                                                false,
                                                            );
                                                            setHistoryLoaded(
                                                                true,
                                                            );
                                                        },
                                                    },
                                                );
                                            }}
                                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-100"
                                        >
                                            {historyLoading ? (
                                                <span className="inline-flex items-center gap-2">
                                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                                                    Cargando...
                                                </span>
                                            ) : (
                                                "Cargar Historial de Clases"
                                            )}
                                        </button>
                                    </div>
                                ) : (
                                    <motion.div
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.22 }}
                                        className="mt-3 overflow-auto"
                                    >
                                        {performanceData?.activeBono ? (
                                            <div className="mb-4 rounded-xl border border-emerald-200/90 bg-gradient-to-r from-emerald-50/95 via-teal-50/80 to-emerald-50/90 px-4 py-3 shadow-sm">
                                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                                                    <p className="text-sm font-bold leading-snug text-emerald-950">
                                                        {
                                                            performanceData
                                                                .activeBono.name
                                                        }
                                                        {Number(
                                                            performanceData
                                                                .activeBono
                                                                .num_classes,
                                                        ) > 0
                                                            ? ` · ${performanceData.activeBono.num_classes} créditos`
                                                            : ""}
                                                        <span className="ml-1.5 font-semibold text-emerald-800">
                                                            (Última Recarga de
                                                            Créditos)
                                                        </span>
                                                    </p>
                                                    <p className="shrink-0 text-sm tabular-nums text-emerald-900">
                                                        <span className="font-medium text-emerald-700">
                                                            Créditos restantes
                                                            totales:
                                                        </span>{" "}
                                                        <span className="text-lg font-extrabold tracking-tight text-emerald-950">
                                                            {Number(
                                                                performanceData
                                                                    .activeBono
                                                                    .remaining_uc ??
                                                                    performanceData
                                                                        .activeBono
                                                                        .remaining ??
                                                                    0,
                                                            )}
                                                        </span>
                                                    </p>
                                                </div>
                                            </div>
                                        ) : null}
                                        <table className="min-w-full text-sm">
                                            <thead className="bg-slate-50 text-slate-600">
                                                <tr>
                                                    <th className="px-3 py-2 text-left">
                                                        Fecha
                                                    </th>
                                                    <th className="px-3 py-2 text-left">
                                                        Clase
                                                    </th>
                                                    <th className="px-3 py-2 text-left">
                                                        SKU
                                                    </th>
                                                    <th className="px-3 py-2 text-left">
                                                        Créditos
                                                    </th>
                                                    <th className="px-3 py-2 text-left">
                                                        Restante
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white">
                                                {consumptionHistoryRows.map(
                                                    (h) => {
                                                        const tone =
                                                            skuColorToken(
                                                                h.bono_sku,
                                                            );
                                                        return (
                                                            <tr
                                                                key={h.id}
                                                                className={`border-t ${tone.border} ${tone.bg}`}
                                                            >
                                                                <td className="px-3 py-2">
                                                                    {h.lesson
                                                                        ?.starts_at
                                                                        ? new Date(
                                                                              h
                                                                                  .lesson
                                                                                  .starts_at,
                                                                          ).toLocaleDateString(
                                                                              "es-ES",
                                                                          )
                                                                        : "—"}
                                                                </td>
                                                                <td className="px-3 py-2">
                                                                    {h.lesson
                                                                        ?.title ||
                                                                        "Sesión"}
                                                                </td>
                                                                <td className="px-3 py-2 text-[11px] font-semibold text-slate-600">
                                                                    {h.bono_sku ||
                                                                        "—"}
                                                                </td>
                                                                <td className="px-3 py-2">
                                                                    <span
                                                                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${Number(h.uc_cost) === 2 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}
                                                                    >
                                                                        {Number(
                                                                            h.uc_cost,
                                                                        ) === 2
                                                                            ? "Consumo: 2 Créditos"
                                                                            : "Consumo: 1 Crédito"}
                                                                    </span>
                                                                </td>
                                                                <td className="px-3 py-2 tabular-nums font-medium text-slate-900">
                                                                    {
                                                                        h.remaining_after
                                                                    }
                                                                </td>
                                                            </tr>
                                                        );
                                                    },
                                                )}
                                            </tbody>
                                        </table>
                                    </motion.div>
                                )}
                            </div>
                        </div>
                    )
                ) : activeRows.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                        <p className="text-slate-700">
                            {isAdminView
                                ? "Este alumno no tiene registros en esta sección."
                                : isManagementProfile
                                  ? "Panel de Gestión: Para reservar clases, usa tu cuenta de alumno."
                                  : "Aún no tienes reservas aquí. ¡El mar te espera! 🌊"}
                        </p>
                        {!isAdminView && !isManagementProfile ? (
                            <div className="mt-4 flex flex-wrap justify-center gap-3">
                                {isVipEffective ? (
                                    <Link
                                        href={route("bonos.index")}
                                        className="rounded-lg bg-amber-500 px-4 py-2 font-semibold text-slate-900 hover:bg-amber-400"
                                    >
                                        Mis créditos / recargar
                                    </Link>
                                ) : (
                                    <Link
                                        href={route("academy.lessons.index")}
                                        className="rounded-lg bg-sky-600 px-4 py-2 text-white"
                                    >
                                        Ver clases
                                    </Link>
                                )}
                                <Link
                                    href={route("tienda")}
                                    className="rounded-lg bg-slate-800 px-4 py-2 text-white"
                                >
                                    Ir a tienda
                                </Link>
                            </div>
                        ) : null}
                    </div>
                ) : (
                    <div className="space-y-7">
                        <section className="space-y-3">
                            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                Tus Próximas Citas
                            </p>
                            {upcomingRows.length === 0 ? (
                                <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
                                    <p>
                                        No tienes próximas reservas en esta
                                        sección.
                                    </p>
                                    <div className="mt-3">
                                        <Link
                                            href={
                                                tab === TAB_RENTALS
                                                    ? route(
                                                          "rentals.surfboards.index",
                                                      )
                                                    : tab === TAB_BONOS
                                                      ? route("bonos.index")
                                                      : route(
                                                            "academy.lessons.index",
                                                        )
                                            }
                                            className="inline-flex rounded-lg bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-700"
                                        >
                                            {tab === TAB_RENTALS
                                                ? "Reservar alquiler"
                                                : tab === TAB_BONOS
                                                  ? "Ver / recargar créditos"
                                                  : "Reservar clase"}
                                        </Link>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4">
                                    {upcomingRows.map((row) => {
                                        const badge = badgeByStatus(row);
                                        const countdown =
                                            row.payment_status === "pending"
                                                ? formatCountdown(
                                                      row.created_at,
                                                  )
                                                : null;
                                        const expired =
                                            countdown === "Reserva Expirada";
                                        const isClass = tab === TAB_CLASSES;
                                        const isRental = tab === TAB_RENTALS;
                                        const isBono = tab === TAB_BONOS;
                                        return (
                                            <article
                                                key={`${tab}-upcoming-${row.id}`}
                                                className={`rounded-xl border bg-white p-4 transition-all duration-300 ${expired ? "border-slate-300 shadow-none" : "border-slate-200 shadow-sm hover:scale-[1.01] hover:shadow-md"}`}
                                            >
                                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-2">
                                                            {isClass ? (
                                                                <AcademicCapIcon className="h-5 w-5 text-sky-600" />
                                                            ) : null}
                                                            {isRental ? (
                                                                <BuildingStorefrontIcon className="h-5 w-5 text-indigo-600" />
                                                            ) : null}
                                                            {isBono ? (
                                                                <StarIcon className="h-5 w-5 text-amber-500" />
                                                            ) : null}
                                                            <h2 className="text-base font-semibold text-slate-900">
                                                                {row.title}
                                                            </h2>
                                                        </div>
                                                        <p className="text-sm text-slate-600">
                                                            {row.start_time
                                                                ? new Date(
                                                                      row.start_time,
                                                                  ).toLocaleString(
                                                                      "es-ES",
                                                                  )
                                                                : "Sin fecha"}
                                                        </p>
                                                        {isClass ? (
                                                            <p className="text-sm text-slate-600">
                                                                {row.level ||
                                                                    "Iniciación"}{" "}
                                                                ·{" "}
                                                                {row.modality ||
                                                                    "grupal"}{" "}
                                                                ·{" "}
                                                                {row.location ||
                                                                    "Zurriola"}
                                                            </p>
                                                        ) : null}
                                                        {isBono ? (
                                                            <p className="text-sm text-slate-600">
                                                                {
                                                                    row.clases_restantes
                                                                }
                                                                /
                                                                {row.num_clases}{" "}
                                                                créditos
                                                                restantes ·{" "}
                                                                {Number(
                                                                    row.price ||
                                                                        0,
                                                                ).toFixed(
                                                                    2,
                                                                )}{" "}
                                                                €
                                                            </p>
                                                        ) : null}
                                                    </div>
                                                    <span
                                                        className={`inline-flex h-7 items-center rounded-full px-3 text-xs font-semibold ${badge.cls}`}
                                                    >
                                                        {expired
                                                            ? "Reserva Expirada"
                                                            : badge.label}
                                                    </span>
                                                </div>

                                                {countdown ? (
                                                    <div
                                                        className={`mt-3 rounded-lg border p-3 text-sm transition-all duration-300 ${expired ? "border-slate-300 bg-slate-50 text-slate-600" : "border-rose-200 bg-rose-50 text-rose-700"}`}
                                                    >
                                                        <div className="inline-flex items-center gap-2">
                                                            <ClockIcon className="h-4 w-4" />
                                                            <span className="font-semibold">
                                                                {countdown}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ) : null}

                                                {!isAdminView &&
                                                !isManagementProfile ? (
                                                    <div className="mt-4 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
                                                        {(isClass ||
                                                            isRental) &&
                                                        row.payment_status ===
                                                            "pending" &&
                                                        !expired ? (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setProofModal(
                                                                        {
                                                                            type: isClass
                                                                                ? "class"
                                                                                : "rental",
                                                                            id: row.id,
                                                                        },
                                                                    )
                                                                }
                                                                className="w-full rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 sm:w-auto"
                                                            >
                                                                Subir
                                                                Justificante
                                                            </button>
                                                        ) : null}
                                                        {(isClass ||
                                                            isRental) &&
                                                        row.payment_status ===
                                                            "pending" &&
                                                        expired ? (
                                                            <span className="w-full rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-600 sm:w-auto">
                                                                Sesión expirada
                                                                por falta de
                                                                pago
                                                            </span>
                                                        ) : null}

                                                        {isClass ? (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setCancelModal(
                                                                        {
                                                                            type: "class",
                                                                            id: row.id,
                                                                            isWithinCancellationWindow:
                                                                                !!row.is_within_cancellation_window,
                                                                            latePolicy:
                                                                                "lose",
                                                                        },
                                                                    )
                                                                }
                                                                className="w-full rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 sm:w-auto"
                                                            >
                                                                Cancelar Reserva
                                                            </button>
                                                        ) : null}
                                                        {isRental ? (
                                                            row.can_cancel ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setCancelModal(
                                                                            {
                                                                                type: isClass
                                                                                    ? "class"
                                                                                    : "rental",
                                                                                id: row.id,
                                                                            },
                                                                        )
                                                                    }
                                                                    className="w-full rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 sm:w-auto"
                                                                >
                                                                    Cancelar
                                                                    Reserva
                                                                </button>
                                                            ) : (
                                                                <span className="w-full rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-600 sm:w-auto">
                                                                    {row.cancel_block_reason ||
                                                                        "Fuera de plazo de cancelación (requiere 24h de antelación)"}
                                                                </span>
                                                            )
                                                        ) : null}
                                                        {isClass &&
                                                        row.is_within_cancellation_window ? (
                                                            <span className="w-full rounded-lg bg-amber-100 px-4 py-2 text-sm text-amber-900 sm:w-auto">
                                                                Fuera de plazo:
                                                                puedes perder la
                                                                clase o
                                                                rescatarla
                                                                pagando 30EUR.
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                ) : null}
                                            </article>
                                        );
                                    })}
                                </div>
                            )}
                        </section>

                        <section className="space-y-3">
                            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                Historial / Pasadas
                            </p>
                            {historyRows.length === 0 ? (
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                                    Sin historial todavía en esta sección.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-3">
                                    {historyRows.map((row) => {
                                        const badge = badgeByStatus(row);
                                        const isClass = tab === TAB_CLASSES;
                                        const isRental = tab === TAB_RENTALS;
                                        const isBono = tab === TAB_BONOS;
                                        return (
                                            <article
                                                key={`${tab}-history-${row.id}`}
                                                className="rounded-xl border border-slate-200 bg-slate-50 p-4 opacity-70 grayscale transition-all"
                                            >
                                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            {isClass ? (
                                                                <AcademicCapIcon className="h-5 w-5 text-slate-500" />
                                                            ) : null}
                                                            {isRental ? (
                                                                <BuildingStorefrontIcon className="h-5 w-5 text-slate-500" />
                                                            ) : null}
                                                            {isBono ? (
                                                                <StarIcon className="h-5 w-5 text-slate-500" />
                                                            ) : null}
                                                            <h2 className="text-base font-semibold text-slate-700">
                                                                {row.title}
                                                            </h2>
                                                        </div>
                                                        <p className="text-sm text-slate-500">
                                                            {row.start_time
                                                                ? new Date(
                                                                      row.start_time,
                                                                  ).toLocaleString(
                                                                      "es-ES",
                                                                  )
                                                                : "Sin fecha"}
                                                        </p>
                                                    </div>
                                                    <span
                                                        className={`inline-flex h-7 items-center rounded-full px-3 text-xs font-semibold ${badge.cls}`}
                                                    >
                                                        {badge.label}
                                                    </span>
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    </div>
                )}
            </div>

            {proofModal ? (
                <div
                    className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 p-4"
                    onClick={() => setProofModal(null)}
                >
                    <div
                        className="w-full max-w-md rounded-2xl bg-white p-5 space-y-3"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <p className="text-lg font-bold text-slate-900">
                            Subir justificante
                        </p>
                        <input
                            type="file"
                            accept=".jpg,.jpeg,.png,.webp,.gif,.pdf"
                            onChange={(e) =>
                                setProofFile(e.target.files?.[0] || null)
                            }
                            className="w-full rounded-lg border border-slate-300 p-2"
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setProofModal(null)}
                                className="rounded-lg bg-slate-200 px-3 py-1.5 text-slate-700"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={submitProof}
                                disabled={!proofFile || processing}
                                className="rounded-lg bg-sky-600 px-3 py-1.5 text-white disabled:opacity-60"
                            >
                                {processing ? "Subiendo..." : "Subir"}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {cancelModal ? (
                <div
                    className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 p-4"
                    onClick={() => setCancelModal(null)}
                >
                    <div
                        className="w-full max-w-md rounded-2xl bg-white p-5 space-y-3"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {cancelModal.type === "class" &&
                        cancelModal.isWithinCancellationWindow ? (
                            <>
                                <p className="text-lg font-bold text-slate-900">
                                    Estás fuera de plazo. ¿Prefieres perder la
                                    clase o pagar 30EUR de gastos de gestión
                                    para recuperarla?
                                </p>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setCancelModal((prev) => ({
                                                ...prev,
                                                latePolicy: "lose",
                                            }))
                                        }
                                        className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                                            cancelModal.latePolicy === "lose"
                                                ? "bg-rose-600 text-white"
                                                : "bg-rose-50 text-rose-700"
                                        }`}
                                    >
                                        Perder clase
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setCancelModal((prev) => ({
                                                ...prev,
                                                latePolicy: "rescue",
                                            }))
                                        }
                                        className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                                            cancelModal.latePolicy === "rescue"
                                                ? "bg-amber-600 text-white"
                                                : "bg-amber-50 text-amber-700"
                                        }`}
                                    >
                                        Rescatar clase (+30EUR)
                                    </button>
                                </div>
                                <div className="flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setCancelModal(null)}
                                        className="rounded-lg bg-slate-200 px-3 py-1.5 text-slate-700"
                                    >
                                        Volver
                                    </button>
                                    <button
                                        type="button"
                                        onClick={cancelReservation}
                                        disabled={processing}
                                        className="rounded-lg bg-slate-900 px-3 py-1.5 text-white disabled:opacity-60"
                                    >
                                        {processing
                                            ? "Procesando..."
                                            : "Confirmar opción"}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <p className="text-lg font-bold text-slate-900">
                                    ¿Estás seguro? Esta acción es irreversible.
                                </p>
                                <div className="flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setCancelModal(null)}
                                        className="rounded-lg bg-slate-200 px-3 py-1.5 text-slate-700"
                                    >
                                        Volver
                                    </button>
                                    <button
                                        type="button"
                                        onClick={cancelReservation}
                                        disabled={processing}
                                        className="rounded-lg bg-rose-600 px-3 py-1.5 text-white disabled:opacity-60"
                                    >
                                        {processing
                                            ? "Cancelando..."
                                            : "Confirmar cancelación"}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            ) : null}
        </>
    );
}
