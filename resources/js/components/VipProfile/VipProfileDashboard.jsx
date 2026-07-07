import React, { useEffect, useMemo, useRef, useState } from "react";
import { router, useForm } from "@inertiajs/react";
import { AnimatePresence, motion } from "framer-motion";
import { PencilSquareIcon, TrophyIcon } from "@heroicons/react/24/outline";
import { CheckCircleIcon } from "@heroicons/react/24/solid";

export const PROFILE_PARTIAL_KEYS = [
    "performanceData",
    "analysisNav",
    "isAdminView",
    "targetUser",
];

const MONTH_NAV_PARTIAL_KEYS = ["performanceData", "analysisNav"];
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

/** Reloj de la escuela / alquileres (no la zona del navegador). */
const DISPLAY_TZ = "Europe/Madrid";

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

function formatDateTimeMadrid(iso) {
    if (!iso) return "Sin fecha";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "Sin fecha";
    return d.toLocaleString("es-ES", {
        timeZone: DISPLAY_TZ,
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function formatDateMadrid(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("es-ES", {
        timeZone: DISPLAY_TZ,
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

function skuColorToken(sku = "") {
    if (!sku) {
        return {
            bg: "bg-slate-900/50",
            border: "border-slate-700/60",
            skuText: "text-slate-400",
        };
    }
    const palette = [
        { bg: "bg-sky-950/40", border: "border-sky-500/30", skuText: "text-sky-300" },
        { bg: "bg-emerald-950/40", border: "border-emerald-500/30", skuText: "text-emerald-300" },
        { bg: "bg-violet-950/40", border: "border-violet-500/30", skuText: "text-violet-300" },
        { bg: "bg-amber-950/40", border: "border-amber-500/30", skuText: "text-amber-300" },
        { bg: "bg-rose-950/40", border: "border-rose-500/30", skuText: "text-rose-300" },
        { bg: "bg-cyan-950/40", border: "border-cyan-500/30", skuText: "text-cyan-300" },
    ];
    const hash = Array.from(String(sku)).reduce(
        (acc, ch) => acc + ch.charCodeAt(0),
        0,
    );
    return palette[hash % palette.length];
}

function creditConsumptionBadgeClass(units) {
    const uc = Math.max(1, Number(units || 1));
    if (uc >= 2) {
        return "rounded-full bg-red-500/20 px-2.5 py-0.5 text-xs font-semibold text-red-200 ring-1 ring-red-400/35";
    }
    return "rounded-full bg-amber-500/25 px-2.5 py-0.5 text-xs font-semibold text-amber-100 ring-1 ring-amber-400/45";
}

function WalletSection({ step, title, children, accent = "orange" }) {
    const ring =
        accent === "teal"
            ? "border-teal-500/25 bg-teal-950/20"
            : accent === "sky"
              ? "border-sky-500/25 bg-sky-950/20"
              : "border-orange-500/25 bg-orange-950/15";

    return (
        <section className={`rounded-2xl border p-4 sm:p-5 ${ring}`}>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500">
                {step}
            </p>
            <h4 className="mt-1 text-base font-bold text-white sm:text-lg">{title}</h4>
            <div className="mt-4">{children}</div>
        </section>
    );
}

function BonoWallet({ performanceData = null }) {
    const wallet = performanceData?.wallet ?? null;
    const bono = performanceData?.activeBono ?? null;
    const consuming = performanceData?.consumingBono ?? null;
    const queuedBonos = Array.isArray(wallet?.queued_bonos) ? wallet.queued_bonos : [];

    const totalPurchased = Math.max(
        0,
        Number(wallet?.total_purchased_uc ?? bono?.num_classes ?? 0),
    );
    const totalAvailable = Math.max(
        0,
        Number(wallet?.total_available_uc ?? bono?.remaining_uc ?? bono?.remaining ?? 0),
    );

    const consumingName =
        consuming?.name ?? bono?.last_pack_name ?? "Bono VIP";
    const consumingTotal = Math.max(
        0,
        Number(consuming?.pack_total_uc ?? bono?.last_pack_total_uc ?? 0),
    );
    const consumingRemaining = Math.max(
        0,
        Number(consuming?.remaining_uc ?? bono?.last_pack_remaining_uc ?? 0),
    );
    const consumingUsed = Math.max(
        0,
        Number(
            consuming?.consumed_uc ??
                bono?.last_pack_consumed_uc ??
                consumingTotal - consumingRemaining,
        ),
    );

    const resolvedPrediction = performanceData?.prediction;
    const stats = performanceData?.stats || {};
    const lifetimeClasses = Math.max(
        0,
        Number(stats.lifetime_classes ?? performanceData?.history_count ?? 0),
    );

    const isOverdrawn = totalAvailable < 0;
    const displayAvailable = Math.max(0, totalAvailable);
    const percentage =
        totalPurchased > 0 ? (displayAvailable / totalPurchased) * 100 : 0;
    const progressFraction = totalPurchased > 0 ? percentage / 100 : 0;
    const packConsumedPct =
        consumingTotal > 0
            ? Math.min(100, Math.round((consumingUsed / consumingTotal) * 100))
            : 0;
    const packAvailablePct =
        consumingTotal > 0
            ? Math.min(
                  100,
                  Math.round((consumingRemaining / consumingTotal) * 100),
              )
            : 0;

    const radius = 44;
    const strokeWidth = 10;
    const c = 2 * Math.PI * radius;
    const strokeDasharray = `${c}`;
    const strokeDashoffset = c * (1 - progressFraction);
    const progressStroke = isOverdrawn ? "#ef4444" : "#0ea5e9";

    return (
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 p-5 shadow-xl backdrop-blur-md sm:p-6">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-sky-300/30 blur-2xl" />

            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Saldo VIP
                    </p>
                    <h3 className="mt-1 text-xl font-bold text-white sm:text-2xl">
                        Saldo de Créditos VIP
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray-300">
                        {resolvedPrediction
                            ? resolvedPrediction.replace(
                                  "Al ritmo actual, tus créditos durarán hasta el",
                                  "Con tu ritmo actual, te alcanza aprox. hasta el",
                              )
                            : "Sin predicción disponible."}
                    </p>
                </div>

                <div className="flex shrink-0 flex-col items-center sm:pt-1">
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
                            className={`${isOverdrawn ? "fill-red-300" : "fill-white"} font-semibold`}
                            style={{
                                fontSize: "28px",
                                fontFeatureSettings: '"tnum"',
                                letterSpacing: "-0.02em",
                            }}
                        >
                            {displayAvailable}
                        </text>
                    </svg>
                    <div className="mt-2 w-full max-w-[11rem] text-center">
                        <p className="text-sm text-gray-300">créditos disponibles</p>
                        <p className="mt-1 tabular-nums text-xs text-gray-500">
                            de {totalPurchased} acumulados
                        </p>
                        {isOverdrawn ? (
                            <p className="mt-1 text-xs font-semibold text-red-300">
                                Adelantados: {Math.abs(totalAvailable)}
                            </p>
                        ) : null}
                    </div>
                </div>
            </div>

            <div className="mt-6 space-y-4">
                {consumingTotal > 0 ? (
                    <WalletSection step="1" title="Bono en consumo ahora" accent="orange">
                        <p className="text-sm font-semibold text-orange-200/90">{consumingName}</p>
                        <p className="mt-3 text-2xl font-extrabold tabular-nums text-white sm:text-3xl">
                            {consumingUsed}{" "}
                            <span className="text-lg font-semibold text-gray-400 sm:text-xl">
                                de {consumingTotal} créditos usados
                            </span>
                        </p>
                        <div
                            className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-gray-700/80"
                            role="progressbar"
                            aria-valuemin={0}
                            aria-valuemax={consumingTotal}
                            aria-valuenow={consumingUsed}
                            aria-label={`${consumingUsed} créditos usados de ${consumingTotal} en el bono activo`}
                        >
                            {packConsumedPct > 0 ? (
                                <div
                                    className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
                                    style={{ width: `${packConsumedPct}%` }}
                                />
                            ) : null}
                            {packAvailablePct > 0 ? (
                                <div
                                    className="h-full bg-gradient-to-r from-sky-500 to-cyan-400 transition-all duration-500"
                                    style={{ width: `${packAvailablePct}%` }}
                                />
                            ) : null}
                        </div>
                        <div className="mt-3 flex flex-col gap-2 text-sm sm:flex-row sm:justify-between">
                            <p className="tabular-nums text-amber-200/90">
                                <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-amber-500 align-middle" />
                                {consumingUsed} consumidos en este bono
                            </p>
                            <p className="tabular-nums text-cyan-200/90">
                                <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-cyan-400 align-middle" />
                                {consumingRemaining} disponibles aquí
                            </p>
                        </div>
                    </WalletSection>
                ) : totalAvailable > 0 ? (
                    <WalletSection step="1" title="Bono en consumo ahora" accent="orange">
                        <p className="text-sm leading-relaxed text-gray-300">
                            No hay un bono en consumo parcial. Tus créditos están en bonos en cola,
                            listos para cuando reserves la siguiente clase.
                        </p>
                    </WalletSection>
                ) : null}

                <WalletSection step="2" title="Bonos en cola" accent="teal">
                    {queuedBonos.length > 0 ? (
                        <ul className="space-y-3">
                            {queuedBonos.map((q) => (
                                <li
                                    key={q.id}
                                    className="flex flex-col gap-1 rounded-xl border border-teal-500/20 bg-black/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div>
                                        <p className="font-semibold text-teal-100">{q.name}</p>
                                        <p className="mt-0.5 text-xs text-teal-200/60">
                                            En espera · se activará cuando termines el bono actual
                                        </p>
                                    </div>
                                    <p className="shrink-0 text-lg font-bold tabular-nums text-white sm:text-right">
                                        {q.remaining_uc}{" "}
                                        <span className="text-sm font-medium text-gray-400">
                                            crédito{q.remaining_uc === 1 ? "" : "s"}
                                        </span>
                                    </p>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm leading-relaxed text-gray-400">
                            No tienes bonos en cola. Cuando compres otro pack, aparecerá aquí hasta
                            que empieces a consumirlo.
                        </p>
                    )}
                </WalletSection>

                <p className="border-t border-white/10 pt-4 text-sm text-gray-400">
                    Total clases recibidas con S4:{" "}
                    <span className="font-bold tabular-nums text-sky-300">{lifetimeClasses}</span>
                </p>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                <div className="rounded-xl border border-gray-700 bg-gray-800/70 p-3">
                    <p className="text-xs text-gray-500">Total Surfeado</p>
                    <p className="font-semibold text-gray-100">
                        {Number(stats.total_surfed_hours || 0).toFixed(1)} h
                    </p>
                </div>
                <div className="rounded-xl border border-gray-700 bg-gray-800/70 p-3">
                    <p className="text-xs text-gray-500">Ratio Solo/Grupal</p>
                    <p className="font-semibold text-gray-100">
                        {Number(stats.solo_ratio_percent || 0)}% solo
                    </p>
                </div>
                <div className="rounded-xl border border-gray-700 bg-gray-800/70 p-3">
                    <p className="text-xs text-gray-500">Progreso de Nivel</p>
                    <p className="font-semibold text-gray-100">
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
            only: PROFILE_PARTIAL_KEYS,
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
    profileRouteName = "my-profile.index",
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
                : route(profileRouteName);
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
            ? "bg-gray-900 border-gray-600"
            : "bg-gray-800 border-gray-700";
        const day = new Date(c.iso);
        const pulse = "";
        return `${base} ${outside} ${selected} ${heat} ${pulse}`;
    };

    return (
        <div
            className="rounded-2xl border border-gray-700 bg-gray-900 p-4 shadow-sm"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
        >
            <div className="mb-3 flex items-center justify-between">
                <button
                    type="button"
                    onClick={() => goMonth(-1)}
                    className="rounded-lg bg-gray-800 px-3 py-1 text-sm text-gray-200"
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
                        className="text-sm font-semibold capitalize text-white"
                    >
                        {monthLabel}
                    </motion.p>
                </AnimatePresence>
                <button
                    type="button"
                    onClick={() => goMonth(1)}
                    className="rounded-lg bg-gray-800 px-3 py-1 text-sm text-gray-200"
                >
                    ▶
                </button>
            </div>

            <div className="mb-2 grid grid-cols-7 gap-2 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-400">
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
                                    ? "bg-gray-100 text-gray-900 shadow-sm"
                                    : "text-gray-400/80"
                            }`}
                        >
                            {c.dayNumber}
                        </span>
                    </button>
                ))}
            </div>

            <div className="mt-4 rounded-2xl border border-gray-700 bg-gray-800/70 p-4 backdrop-blur-xl">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={selectedDate || "empty"}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        {isLoadingMonth ? (
                            <p className="text-sm text-gray-300">
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
                                                    ? "border-red-500/30 bg-red-500/15 text-red-200"
                                                    : "border-amber-500/30 bg-amber-500/15 text-amber-100";
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
                                                                className="ml-1.5 h-4 w-4 text-gray-300"
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
                                        <p className="font-semibold text-gray-100">
                                            {selectedData.lesson?.title ||
                                                "Sesión"}
                                        </p>
                                        <p className="text-sm text-gray-300">
                                            {selectedData.lesson?.starts_at
                                                ? formatDateTimeMadrid(
                                                      selectedData.lesson
                                                          .starts_at,
                                                  )
                                                : "Sin hora"}{" "}
                                            ·{" "}
                                            {selectedData.lesson?.spot ||
                                                "Spot por confirmar"}
                                        </p>
                                        <p className="text-sm text-gray-300">
                                            Nivel:{" "}
                                            {selectedData.lesson?.level ||
                                                "iniciacion"}
                                        </p>
                                        <p className="text-sm text-gray-300">
                                            Monitor:{" "}
                                            {selectedData.note?.monitor_name ||
                                                "Por asignar"}
                                        </p>
                                        <div className="mt-2">
                                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                                                Crew
                                            </p>
                                            {Array.isArray(selectedData.crew) &&
                                            selectedData.crew.length > 0 ? (
                                                <p className="text-sm text-gray-200">
                                                    {selectedData.crew
                                                        .map((c) => c.name)
                                                        .join(", ")}
                                                </p>
                                            ) : (
                                                <p className="text-sm text-gray-300">
                                                    Solo tú
                                                </p>
                                            )}
                                        </div>
                                        {selectedData.note?.text ? (
                                            <div className="mt-4 flex gap-3 rounded-xl border border-sky-500/35 bg-sky-900/25 p-4 shadow-sm ring-1 ring-sky-500/25">
                                                <TrophyIcon
                                                    className="h-8 w-8 shrink-0 text-sky-300"
                                                    aria-hidden
                                                />
                                                <div className="min-w-0">
                                                    <p className="text-[10px] font-bold uppercase tracking-wider text-sky-200">
                                                        Mensaje del coach
                                                    </p>
                                                    <p className="mt-1.5 text-sm font-medium leading-relaxed text-sky-100">
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
                                            <p className="mt-3 rounded-lg bg-sky-900/25 p-3 text-xs text-sky-100 ring-1 ring-sky-500/25">
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
                            <p className="text-sm text-gray-300">
                                Día libre. ¡Buen momento para estirar o revisar
                                la previsión de olas!
                            </p>
                        )}
                    </motion.div>
                </AnimatePresence>
                {isAdminAnalysisMode &&
                targetUserIdForApi &&
                typeof renderAdminFeedback === "function" ? (
                    <div className="mt-4 border-t border-gray-700 pt-4">
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

export default function VipProfileDashboard({
    performanceData = null,
    isAdminView = false,
    targetUser = null,
    analysisNav = null,
    showSkeleton = false,
    contextMismatch = false,
    profileRouteName = "my-profile.index",
}) {
    const analysisTargetId =
        targetUser && targetUser.id != null ? Number(targetUser.id) : null;
    const adminAnalysisReady = isAdminView && analysisTargetId > 0;
    const analysisListFrom = analysisNav?.from === "users" ? "users" : "vips";
    const performanceReloadUrl = adminAnalysisReady
        ? route("admin.vips.analysis", analysisTargetId)
        : route(profileRouteName);

    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyLoaded, setHistoryLoaded] = useState(
        !!performanceData?.history_loaded,
    );

    useEffect(() => {
        setHistoryLoaded(!!performanceData?.history_loaded);
    }, [performanceData?.history_loaded]);

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

    if (showSkeleton && !contextMismatch) {
        return <AnalysisDashboardSkeleton />;
    }

    return (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <BonoWallet performanceData={performanceData || {}} />
            <AttendanceHeatmap
                key={`heatmap-${adminAnalysisReady ? analysisTargetId : "self"}`}
                attendanceMap={performanceData?.attendanceMap || []}
                performanceMonth={performanceData?.month || null}
                keepHistoryLoaded={historyLoaded}
                identityKey={adminAnalysisReady ? `admin-${analysisTargetId}` : "self"}
                isAdminAnalysisMode={adminAnalysisReady}
                targetUserIdForApi={adminAnalysisReady ? analysisTargetId : null}
                adminAnalysisFrom={analysisListFrom}
                profileRouteName={profileRouteName}
                renderAdminFeedback={
                    adminAnalysisReady && targetUser
                        ? (selectedData, selectedLessonId) => (
                              <AdminAttendanceNoteForm
                                  key={`${selectedData?.date ?? "none"}-${selectedLessonId ?? 0}-${selectedData?.admin_note?.id ?? "new"}`}
                                  targetUser={targetUser}
                                  selectedData={selectedData}
                                  selectedLessonUserId={selectedLessonId}
                              />
                          )
                        : null
                }
            />
            <div className="lg:col-span-2 rounded-2xl border border-gray-700 bg-gray-900 p-4 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
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
                                            toLocalYmd(new Date()).slice(0, 7),
                                        load_history: 1,
                                        ...(adminAnalysisReady
                                            ? {
                                                  from: analysisListFrom,
                                                  target_user_id: analysisTargetId,
                                              }
                                            : {}),
                                    },
                                    {
                                        only: PROFILE_PARTIAL_KEYS,
                                        preserveState: true,
                                        preserveScroll: true,
                                        onFinish: () => {
                                            setHistoryLoading(false);
                                            setHistoryLoaded(true);
                                        },
                                    },
                                );
                            }}
                            className="inline-flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-semibold text-gray-200 shadow-sm hover:bg-gray-700"
                        >
                            {historyLoading ? (
                                <span className="inline-flex items-center gap-2">
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
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
                        {performanceData?.latestPurchase || performanceData?.activeBono ? (
                            <div className="mb-4 rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/50 via-slate-900 to-teal-950/40 px-4 py-3">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                                    <p className="text-sm font-bold leading-snug text-emerald-100">
                                        {(performanceData.latestPurchase?.name ||
                                            performanceData.activeBono?.last_pack_name ||
                                            "Bono VIP")}
                                        {Number(
                                            performanceData.latestPurchase?.pack_total_uc ??
                                                performanceData.activeBono?.num_classes,
                                        ) > 0
                                            ? ` · ${performanceData.latestPurchase?.pack_total_uc ?? performanceData.activeBono?.num_classes} créditos`
                                            : ""}
                                        <span className="ml-1.5 font-semibold text-emerald-300/90">
                                            (Última recarga)
                                        </span>
                                    </p>
                                    <p className="shrink-0 text-sm tabular-nums text-emerald-100">
                                        <span className="font-medium text-emerald-300/90">
                                            Saldo total disponible:
                                        </span>{" "}
                                        <span className="text-lg font-extrabold tracking-tight text-white">
                                            {Number(
                                                performanceData.wallet?.total_available_uc ??
                                                    performanceData.activeBono?.remaining_uc ??
                                                    performanceData.activeBono?.remaining ??
                                                    0,
                                            )}
                                        </span>
                                    </p>
                                </div>
                            </div>
                        ) : null}
                        <div className="overflow-hidden rounded-xl border border-slate-700/80">
                            <table className="min-w-full text-sm">
                                <thead className="bg-slate-800 text-[11px] font-semibold uppercase tracking-wide text-slate-300">
                                    <tr>
                                        <th className="px-3 py-2.5 text-left">Fecha</th>
                                        <th className="px-3 py-2.5 text-left">Clase</th>
                                        <th className="px-3 py-2.5 text-left">SKU</th>
                                        <th className="px-3 py-2.5 text-left">Créditos</th>
                                        <th className="px-3 py-2.5 text-right">Restante</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-slate-950 text-slate-200">
                                    {consumptionHistoryRows.map((h) => {
                                        const tone = skuColorToken(h.bono_sku);
                                        const uc = Math.max(1, Number(h.uc_cost || 1));
                                        return (
                                            <tr
                                                key={h.id}
                                                className={`border-t ${tone.border} ${tone.bg} hover:brightness-110`}
                                            >
                                                <td className="whitespace-nowrap px-3 py-2.5 text-slate-300">
                                                    {h.lesson?.starts_at
                                                        ? formatDateMadrid(h.lesson.starts_at)
                                                        : "—"}
                                                </td>
                                                <td className="px-3 py-2.5 font-medium text-slate-100">
                                                    {h.lesson?.title || "Sesión"}
                                                </td>
                                                <td
                                                    className={`px-3 py-2.5 text-[11px] font-semibold ${tone.skuText}`}
                                                >
                                                    {h.bono_sku || "—"}
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    <span
                                                        className={creditConsumptionBadgeClass(uc)}
                                                    >
                                                        Consumo: {uc}{" "}
                                                        {uc === 1 ? "Crédito" : "Créditos"}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2.5 text-right tabular-nums font-bold text-teal-300">
                                                    {h.remaining_after}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}

export { AnalysisDashboardSkeleton };
