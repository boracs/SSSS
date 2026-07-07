import React, { useMemo, useState, useEffect, useRef } from "react";
import { Head, Link, router, usePage } from "@inertiajs/react";
import {
    AcademicCapIcon,
    BuildingStorefrontIcon,
    ClockIcon,
    PencilSquareIcon,
    StarIcon,
    TrophyIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import ManualPaymentInstructionsModal from "@/components/ManualPaymentInstructionsModal";
import VipProfileDashboard from "@/components/VipProfile/VipProfileDashboard";

const TAB_CLASSES = "classes";
const TAB_RENTALS = "rentals";
const TAB_BONOS = "bonos";

const TAB_DESCRIPTIONS = {
    [TAB_CLASSES]: "Reservas de clases: próximas sesiones, justificantes de pago y cancelaciones.",
    [TAB_RENTALS]: "Alquiler de tablas: recogidas, devoluciones y estado de pago.",
    [TAB_BONOS]: "Saldo VIP, calendario de asistencia e historial de consumo de créditos.",
};

function resolveInitialTab({ isAdminView, isVip }) {
    const fromUrl = new URLSearchParams(window.location.search).get("tab");
    const allowed = new Set([TAB_CLASSES, TAB_RENTALS, TAB_BONOS]);
    if (fromUrl && allowed.has(fromUrl)) {
        if (fromUrl === TAB_BONOS && !isAdminView) {
            return TAB_CLASSES;
        }
        return fromUrl;
    }
    if (isAdminView) {
        return TAB_BONOS;
    }
    return TAB_CLASSES;
}

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
    if (row?.status === "cancelled") {
        if (row?.refund_pending) {
            return {
                label: "Cancelada · devolución pendiente",
                cls: "bg-rose-100 text-rose-900 ring-1 ring-rose-300",
            };
        }
        return {
            label: "Cancelada",
            cls: "bg-slate-200 text-slate-700",
        };
    }
    if (row?.payment_status === "confirmed" || row?.status === "confirmed") {
        return { label: "Confirmado", cls: "bg-emerald-100 text-emerald-700" };
    }
    if (row?.payment_status === "rejected") {
        return { label: "Pago rechazado", cls: "bg-rose-100 text-rose-700" };
    }
    if (row?.payment_status === "pending" || row?.status === "pending") {
        return { label: "Pendiente", cls: "bg-amber-100 text-amber-700" };
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
    if (row?.status === "cancelled_free") {
        return {
            label: "Cancelada sin penalización",
            cls: "bg-slate-200 text-slate-700",
        };
    }
    return { label: row?.status || "—", cls: "bg-slate-100 text-slate-700" };
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

function formatEurEs(n) {
    if (n == null || Number.isNaN(Number(n))) return null;
    return Number(n).toFixed(2).replace(".", ",");
}

/** Señal/depósito y precio total (clases y alquileres), desde buildReservationRows. */
function ReservationPriceLines({ row, dark = false }) {
    const total = row.total_price != null && Number(row.total_price) > 0 ? Number(row.total_price) : null;
    const deposit =
        row.deposit_amount != null && Number(row.deposit_amount) > 0
            ? Number(row.deposit_amount)
            : row.amount != null && Number(row.amount) > 0
              ? Number(row.amount)
              : null;
    if (total == null && deposit == null) return null;
    return (
        <div
            className={
                dark
                    ? "mt-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-300"
                    : "mt-2 rounded-lg border border-slate-200 bg-slate-50/90 px-3 py-2 text-sm text-slate-800"
            }
        >
            <p>
                {deposit != null ? (
                    <>
                        <span className={`font-semibold ${dark ? "text-white" : "text-slate-900"}`}>
                            Compromiso / señal:
                        </span>{" "}
                        {formatEurEs(deposit)} €
                    </>
                ) : null}
                {deposit != null && total != null ? <span className="text-slate-500"> · </span> : null}
                {total != null ? (
                    <>
                        <span className={`font-semibold ${dark ? "text-white" : "text-slate-900"}`}>
                            Precio total:
                        </span>{" "}
                        {formatEurEs(total)} €
                    </>
                ) : null}
            </p>
            {deposit != null && total != null && total > deposit + 0.001 ? (
                <p className={`mt-1 text-xs ${dark ? "text-slate-500" : "text-slate-600"}`}>
                    Puedes formalizar la reserva abonando la señal; el resto se gestiona según la escuela o las
                    condiciones del alquiler.
                </p>
            ) : null}
        </div>
    );
}

function selfTabClass(active, darkUi) {
    if (!darkUi) {
        return active ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-700";
    }
    return active
        ? "bg-cyan-600 text-white shadow-md shadow-cyan-950/30"
        : "bg-white/10 text-slate-300 ring-1 ring-white/10 hover:bg-white/15";
}

function reservationCardClass(darkUi, expired = false) {
    if (!darkUi) {
        return expired
            ? "rounded-xl border border-slate-300 bg-white p-4 shadow-none"
            : "rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 hover:scale-[1.01] hover:shadow-md";
    }
    return expired
        ? "rounded-xl border border-white/5 bg-slate-900/40 p-4 opacity-60"
        : "rounded-xl border border-white/10 bg-slate-900/70 p-4 transition hover:border-cyan-500/20";
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
        paymentIban = "[IBAN]",
        paymentBizumNumber = "[BIZUM_NUMBER]",
        whatsappHelpUrl = null,
        flash = {},
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
    const darkUi = !isAdminView;
    const [tab, setTab] = useState(() => resolveInitialTab({ isAdminView, isVip }));

    const selectTab = (nextTab) => {
        setTab(nextTab);
        const url = new URL(window.location.href);
        url.searchParams.set("tab", nextTab);
        window.history.replaceState({}, "", url);
    };
    const [tick, setTick] = useState(Date.now());
    const [proofModal, setProofModal] = useState(null); // { type, id }
    const [cancelModal, setCancelModal] = useState(null); // { type, id, isWithinCancellationWindow }
    const [flashDismissed, setFlashDismissed] = useState(false);
    const [processing, setProcessing] = useState(false);

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
        if (!isAdminView && tab === TAB_BONOS) {
            router.visit(route("my-profile.index"), { replace: true });
        }
    }, [isAdminView, tab]);

    useEffect(() => {
        const id = setInterval(() => setTick(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    useEffect(() => {
        setFlashDismissed(false);
    }, [flash?.success, flash?.error]);

    const activeRows = useMemo(() => {
        void tick;
        if (tab === TAB_CLASSES) return classRows;
        if (tab === TAB_RENTALS) return rentalRows;
        return bonoRows;
    }, [tab, classRows, rentalRows, bonoRows, tick]);

    const proofTargetRow = useMemo(() => {
        if (!proofModal?.id) return null;
        const list = proofModal.type === "class" ? classRows : rentalRows;
        return (list || []).find((r) => Number(r.id) === Number(proofModal.id)) ?? null;
    }, [proofModal, classRows, rentalRows]);

    const proofPriceBreakdown = useMemo(() => {
        if (!proofTargetRow) return null;
        const total =
            proofTargetRow.total_price != null && Number(proofTargetRow.total_price) > 0
                ? Number(proofTargetRow.total_price)
                : null;
        const deposit =
            proofTargetRow.deposit_amount != null && Number(proofTargetRow.deposit_amount) > 0
                ? Number(proofTargetRow.deposit_amount)
                : proofTargetRow.amount != null && Number(proofTargetRow.amount) > 0
                  ? Number(proofTargetRow.amount)
                  : null;
        const rows = [];
        if (deposit != null && deposit > 0) {
            rows.push({
                label: "Compromiso / señal a pagar",
                value: `${deposit.toFixed(2).replace(".", ",")} €`,
            });
        }
        if (total != null && total > 0) {
            rows.push({
                label: "Precio total del servicio",
                value: `${total.toFixed(2).replace(".", ",")} €`,
            });
        }
        return rows.length ? rows : null;
    }, [proofTargetRow]);

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

    const submitReservationProof = async ({ proofFile, paymentMethod }) => {
        if (!proofModal?.id || processing) throw new Error("blocked");
        setProcessing(true);
        try {
            const routeName =
                proofModal.type === "class"
                    ? "my-reservations.class.upload-proof"
                    : "my-reservations.rental.upload-proof";
            await new Promise((resolve, reject) => {
                router.post(
                    route(routeName, proofModal.id),
                    { proof: proofFile, payment_method: paymentMethod },
                    {
                        forceFormData: true,
                        preserveScroll: true,
                        onSuccess: () => resolve(),
                        onError: () => reject(new Error("proof")),
                    },
                );
            });
        } finally {
            setProcessing(false);
        }
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
            {!isAdminView && !flashDismissed && flash?.success ? (
                <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6">
                    <div className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950 shadow-sm">
                        <p className="font-medium">{flash.success}</p>
                        <button
                            type="button"
                            onClick={() => setFlashDismissed(true)}
                            className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            ) : null}
            {!isAdminView && !flashDismissed && flash?.error ? (
                <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6">
                    <div className="flex items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-950 shadow-sm">
                        <p className="font-medium">{flash.error}</p>
                        <button
                            type="button"
                            onClick={() => setFlashDismissed(true)}
                            className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-rose-800 hover:bg-rose-100"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            ) : null}
            <div
                className={`mx-auto max-w-6xl space-y-5 p-4 sm:p-6 ${
                    isAdminView
                        ? "border-l-4 border-blue-500 bg-slate-50/90"
                        : "min-h-screen bg-gradient-to-b from-slate-950 via-[#0a2233] to-slate-950"
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

                <div className="space-y-1">
                    <h1 className={`text-2xl font-bold ${darkUi ? "text-white" : "text-slate-900"}`}>
                        {isAdminView ? "Modo análisis" : "Mis Reservas"}
                    </h1>
                    {darkUi ? (
                        <p className="text-sm text-slate-400">
                            Clases y alquileres en un solo sitio — próximas citas, pagos y historial.
                        </p>
                    ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                    {isAdminView ? (
                        <>
                            <button
                                type="button"
                                onClick={() => selectTab(TAB_BONOS)}
                                className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === TAB_BONOS ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700"}`}
                            >
                                Resumen VIP
                            </button>
                            <button
                                type="button"
                                onClick={() => selectTab(TAB_CLASSES)}
                                className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === TAB_CLASSES ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700"}`}
                            >
                                Clases del alumno
                            </button>
                            <button
                                type="button"
                                onClick={() => selectTab(TAB_RENTALS)}
                                className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === TAB_RENTALS ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700"}`}
                            >
                                Alquileres
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={() => selectTab(TAB_CLASSES)}
                                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${selfTabClass(tab === TAB_CLASSES, darkUi)}`}
                            >
                                {isVip ? "Mis Clases" : "Clases"}
                            </button>
                            <button
                                type="button"
                                onClick={() => selectTab(TAB_RENTALS)}
                                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${selfTabClass(tab === TAB_RENTALS, darkUi)}`}
                            >
                                Alquileres
                            </button>
                            {isVip ? (
                                <Link
                                    href={route("my-profile.index")}
                                    className="rounded-full border border-teal-500/30 bg-teal-500/10 px-4 py-2 text-sm font-semibold text-teal-200 transition hover:bg-teal-500/20"
                                >
                                    Mi Perfil
                                </Link>
                            ) : null}
                        </>
                    )}
                </div>

                <p className={`max-w-3xl text-sm ${darkUi ? "text-slate-400" : "text-slate-600"}`}>
                    {TAB_DESCRIPTIONS[tab]}
                </p>

                {isAdminView && tab === TAB_BONOS ? (
                    <VipProfileDashboard
                        performanceData={performanceData}
                        isAdminView={isAdminView}
                        targetUser={targetUser}
                        analysisNav={analysisNav}
                        showSkeleton={showAdminSkeleton}
                        contextMismatch={contextMismatch}
                    />
                ) : activeRows.length === 0 ? (
                    <div
                        className={
                            darkUi
                                ? "rounded-2xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-sm"
                                : "rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm"
                        }
                    >
                        <p className={darkUi ? "text-slate-300" : "text-slate-700"}>
                            {isAdminView
                                ? "Este alumno no tiene registros en esta sección."
                                : isManagementProfile
                                  ? "Panel de Gestión: Para reservar clases, usa tu cuenta de alumno."
                                  : "Aún no tienes reservas aquí. ¡El mar te espera! 🌊"}
                        </p>
                        {!isAdminView && !isManagementProfile ? (
                            <div className="mt-4 flex flex-wrap justify-center gap-3">
                                {tab === TAB_RENTALS ? (
                                    <Link
                                        href={route("rentals.surfboards.index")}
                                        className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-500"
                                    >
                                        Reservar alquiler
                                    </Link>
                                ) : (
                                    <Link
                                        href={route("academy.lessons.index")}
                                        className="rounded-lg bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-500"
                                    >
                                        Reservar clase
                                    </Link>
                                )}
                                <Link
                                    href={route("tienda")}
                                    className={
                                        darkUi
                                            ? "rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-white hover:bg-white/10"
                                            : "rounded-lg bg-slate-800 px-4 py-2 text-white"
                                    }
                                >
                                    Ir a tienda
                                </Link>
                            </div>
                        ) : null}
                    </div>
                ) : (
                    <div className="space-y-7">
                        <section className="space-y-3">
                            <p
                                className={`text-xs font-bold uppercase tracking-wider ${darkUi ? "text-slate-500" : "text-gray-500"}`}
                            >
                                Tus Próximas Citas
                            </p>
                            {upcomingRows.length === 0 ? (
                                <div
                                    className={
                                        darkUi
                                            ? "rounded-xl border border-white/10 bg-slate-900/50 p-5 text-sm text-slate-400"
                                            : "rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm"
                                    }
                                >
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
                                            row.status !== "cancelled" &&
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
                                                className={reservationCardClass(darkUi, expired)}
                                            >
                                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-2">
                                                            {isClass ? (
                                                                <AcademicCapIcon
                                                                    className={`h-5 w-5 ${darkUi ? "text-cyan-400" : "text-sky-600"}`}
                                                                />
                                                            ) : null}
                                                            {isRental ? (
                                                                <BuildingStorefrontIcon
                                                                    className={`h-5 w-5 ${darkUi ? "text-indigo-400" : "text-indigo-600"}`}
                                                                />
                                                            ) : null}
                                                            {isBono ? (
                                                                <StarIcon
                                                                    className={`h-5 w-5 ${darkUi ? "text-amber-400" : "text-amber-500"}`}
                                                                />
                                                            ) : null}
                                                            <h2
                                                                className={`text-base font-semibold ${darkUi ? "text-white" : "text-slate-900"}`}
                                                            >
                                                                {row.title}
                                                            </h2>
                                                        </div>
                                                        <p className={`text-sm ${darkUi ? "text-slate-400" : "text-slate-600"}`}>
                                                            {row.start_time
                                                                ? formatDateTimeMadrid(
                                                                      row.start_time,
                                                                  )
                                                                : "Sin fecha"}
                                                        </p>
                                                        {isRental && row.end_time ? (
                                                            <p className="text-xs text-slate-500">
                                                                Fin del alquiler:{" "}
                                                                {formatDateTimeMadrid(
                                                                    row.end_time,
                                                                )}
                                                            </p>
                                                        ) : null}
                                                        {isClass ? (
                                                            <p className={`text-sm ${darkUi ? "text-slate-400" : "text-slate-600"}`}>
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
                                                        {isClass || isRental ? (
                                                            <ReservationPriceLines row={row} dark={darkUi} />
                                                        ) : null}
                                                        {isRental &&
                                                        row.refund_pending ? (
                                                            <p className="text-xs font-medium text-rose-800">
                                                                El club gestionará la
                                                                devolución del importe
                                                                abonado. El administrador
                                                                ha sido avisado en el panel
                                                                de alquileres.
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
                                                        row.status !==
                                                            "cancelled" &&
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
                                                        row.status !==
                                                            "cancelled" &&
                                                        row.payment_status ===
                                                            "pending" &&
                                                        expired ? (
                                                            <span className="w-full rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-600 sm:w-auto">
                                                                Sesión expirada
                                                                por falta de
                                                                pago
                                                            </span>
                                                        ) : null}

                                                        {isClass && !expired ? (
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
                                                        {isRental &&
                                                        row.status !==
                                                            "cancelled" &&
                                                        !expired ? (
                                                            row.can_cancel ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setCancelModal(
                                                                            {
                                                                                type: "rental",
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
                            <p
                                className={`text-xs font-bold uppercase tracking-wider ${darkUi ? "text-slate-500" : "text-gray-500"}`}
                            >
                                Historial / Pasadas
                            </p>
                            {historyRows.length === 0 ? (
                                <div
                                    className={
                                        darkUi
                                            ? "rounded-xl border border-white/10 bg-slate-900/40 p-4 text-sm text-slate-500"
                                            : "rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500"
                                    }
                                >
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
                                                className={
                                                    darkUi
                                                        ? "rounded-xl border border-white/5 bg-slate-900/40 p-4 opacity-75"
                                                        : "rounded-xl border border-slate-200 bg-slate-50 p-4 opacity-70 grayscale transition-all"
                                                }
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
                                                            <h2
                                                                className={`text-base font-semibold ${darkUi ? "text-slate-300" : "text-slate-700"}`}
                                                            >
                                                                {row.title}
                                                            </h2>
                                                        </div>
                                                        <p className="text-sm text-slate-500">
                                                            {row.start_time
                                                                ? formatDateTimeMadrid(
                                                                      row.start_time,
                                                                  )
                                                                : "Sin fecha"}
                                                        </p>
                                                        {isClass || isRental ? (
                                                            <ReservationPriceLines row={row} dark={darkUi} />
                                                        ) : null}
                                                        {isRental &&
                                                        row.refund_pending ? (
                                                            <p className="text-xs font-medium text-rose-800">
                                                                Devolución pendiente de
                                                                gestionar por el club.
                                                            </p>
                                                        ) : null}
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

            <ManualPaymentInstructionsModal
                open={!!proofModal}
                onClose={() => setProofModal(null)}
                bizumNumber={paymentBizumNumber}
                iban={paymentIban}
                whatsappHelpUrl={whatsappHelpUrl}
                useReservationStepsHeading
                showDepositNotice={
                    proofModal?.type === "class" || proofModal?.type === "rental"
                }
                totalPrimaryLine={
                    proofPriceBreakdown
                        ? "Resumen de importes"
                        : !proofTargetRow
                          ? null
                          : (() => {
                                const n =
                                    proofModal?.type === "rental"
                                        ? proofTargetRow.amount
                                        : proofTargetRow.price ?? proofTargetRow.amount;
                                if (n == null || Number(n) <= 0) return null;
                                return `Importe pendiente: ${Number(n).toFixed(2).replace(".", ",")} €`;
                            })()
                }
                priceBreakdownRows={proofPriceBreakdown}
                secondaryNote="Tu reserva se actualizará cuando el equipo confirme el pago manualmente."
                uploadIntro="Sube aquí el justificante de pago para validación manual."
                onSubmit={submitReservationProof}
                onAfterSuccessSubmit={() =>
                    router.reload({ only: RESERVATIONS_PARTIAL_KEYS })
                }
                successSubtitle="Hemos recibido el comprobante. Validaremos el pago en breve."
                whatsappMessageBuilder={() =>
                    proofModal?.type === "class"
                        ? "Hola, tengo una duda con el pago de mi clase reservada."
                        : "Hola, tengo una duda con el pago de mi alquiler."
                }
            />

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
