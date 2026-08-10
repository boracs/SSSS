import React, { useEffect, useMemo, useRef, useState } from "react";
import { Combobox } from "@headlessui/react";
import { ChevronUpDownIcon, XMarkIcon } from "@heroicons/react/24/outline";
import AdminButton from "@/components/admin/ui/AdminButton";
import AdminCard from "@/components/admin/ui/AdminCard";
import AdminFormField from "@/components/admin/ui/AdminFormField";
import {
    DAY_PACKS as DAY_PACK_COLUMNS,
    MINUTE_PACKS as MINUTE_PACK_COLUMNS,
    MINUTES_PER_DAY,
    packLabel,
    priceForMinutes,
    buildPacksFromSchema,
} from "@/lib/rentalPricing";
import {
    addMinutes,
    atMinutesOfDay,
    buildPickupSlots,
    formatTime,
    localDate,
    localDateTime,
    overlapsBlocked,
    resolveRentalPolicy,
    toDateSafe,
} from "@/lib/rentalAvailability";

const RENTAL_POLICY = resolveRentalPolicy();

const CATEGORY_LABELS = {
    taquilla: "Taquilla",
    bono: "Bono",
    alquiler: "Alquiler",
    clase: "Clase",
    fotos: "Fotos",
    producto: "Producto",
};

const GUEST_ALLOWED = ["producto", "fotos", "alquiler", "clase"];

const LESSON_TYPE_LABELS = {
    surf: "Surf",
    skate: "Skate",
};

const LESSON_MODALITY_LABELS = {
    grupal: "Grupal",
    semanal: "Semanal",
    particular: "Particular",
};

const LESSON_LEVEL_LABELS = {
    iniciacion: "Iniciación",
    intermedio: "Intermedio",
    avanzado: "Avanzado",
};

function emptyCreateLessonForm(type = "surf", modality = "particular") {
    const safeModality =
        modality === "grupal" || modality === "particular"
            ? modality
            : "particular";
    return {
        starts_at: nowAsDatetimeLocalValue(),
        duration_minutes: 90,
        type: type === "skate" ? "skate" : "surf",
        modality: safeModality,
        level: "iniciacion",
        price: safeModality === "particular" ? "55" : "35",
    };
}

function csrfToken() {
    return (
        document.querySelector('meta[name="csrf-token"]')?.getAttribute(
            "content",
        ) || ""
    );
}

function pad2(n) {
    return String(n).padStart(2, "0");
}

function nowAsDatetimeLocalValue() {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function nowAsDateValue() {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function eurosToCents(euros) {
    return Math.round(Number(euros || 0) * 100);
}

function ErrorList({ errors }) {
    if (!errors || typeof errors !== "object") return null;
    const messages = Object.values(errors)
        .flat()
        .filter(Boolean)
        .map(String);
    if (messages.length === 0) return null;
    return (
        <ul className="space-y-1 rounded-lg border border-rose-500/30 bg-rose-950/40 px-3 py-2 text-sm text-rose-200">
            {messages.map((msg) => (
                <li key={msg}>{msg}</li>
            ))}
        </ul>
    );
}

function emptyDraft(category = "producto", rentalMode = "hour") {
    const mode = rentalMode === "day" ? "day" : "hour";
    return {
        category,
        payable_id: "",
        product_ids: [],
        photo_session_id: "",
        fecha_inicio: nowAsDatetimeLocalValue(),
        party_size: 1,
        plan_taquilla_id: "",
        pack_bono_id: "",
        surfboard_id: "",
        rental_mode: mode,
        rental_pickup_at:
            mode === "day"
                ? nowAsDateValue()
                : `${nowAsDateValue()}T00:00`,
        rental_pack_minutes: 120,
        rental_pack_days: 1,
        lesson_id: "",
        lesson_type: "",
        lesson_modality: "",
        amount_cents: 0,
    };
}

function quoteRentalCents(board, mode, packMinutes, packDays) {
    if (!board?.prices) return 0;
    const packs = buildPacksFromSchema(board.prices);
    if (!packs) return 0;
    const minutes =
        mode === "day"
            ? Math.max(1, Number(packDays) || 1) * MINUTES_PER_DAY
            : Math.max(1, Number(packMinutes) || 60);
    return eurosToCents(priceForMinutes(packs, minutes));
}

function formatEurosLabel(euros) {
    return `${Number(euros || 0).toLocaleString("es-ES", {
        minimumFractionDigits: 2,
    })} €`;
}

function formatCentsLabel(cents) {
    return formatEurosLabel(Number(cents || 0) / 100);
}

/** Packs vendibles (precio > 0) para el modo actual. */
function availableRentalPackOptions(board, rentalMode) {
    const prices = board?.prices;
    if (!prices) return [];
    const map =
        rentalMode === "day" ? DAY_PACK_COLUMNS : MINUTE_PACK_COLUMNS;
    return Object.entries(map)
        .map(([value, column]) => {
            const price = Number(prices[column] || 0);
            if (!(price > 0)) return null;
            return {
                value: Number(value),
                column,
                label: packLabel(column),
                price,
            };
        })
        .filter(Boolean);
}

function withSyncedRentalPack(draft, board, rentalMode) {
    const options = availableRentalPackOptions(board, rentalMode);
    const current =
        rentalMode === "day"
            ? Number(draft.rental_pack_days)
            : Number(draft.rental_pack_minutes);
    const stillOk = options.some((o) => o.value === current);
    const next = stillOk ? current : (options[0]?.value ?? null);
    if (rentalMode === "day") {
        return {
            ...draft,
            rental_mode: "day",
            rental_pack_days: next ?? draft.rental_pack_days,
        };
    }
    return {
        ...draft,
        rental_mode: "hour",
        rental_pack_minutes: next ?? draft.rental_pack_minutes,
    };
}

/** Ventana de inventario (con buffer) para pack por días. */
function dayPackInventoryWindow(pickupDate, packDays, policy = RENTAL_POLICY) {
    const start = toDateSafe(pickupDate);
    const days = Math.max(1, Number(packDays) || 1);
    if (!start) return null;
    const pickupAt = atMinutesOfDay(
        start,
        Number(policy.day_mode_pickup_hour) * 60,
    );
    if (!pickupAt) return null;
    const returnAt = new Date(pickupAt.getTime());
    returnAt.setDate(returnAt.getDate() + days);
    const blockEnd = addMinutes(
        returnAt,
        Number(policy.turnover_buffer_minutes) || 0,
    );
    return { pickupAt, returnAt, blockEnd };
}

function pickupDayValue(raw) {
    if (!raw) return nowAsDateValue();
    return String(raw).slice(0, 10);
}

/**
 * mode: "cash" | "tpv"
 * fixedAmountCents: required for tpv
 */
export default function MostradorTicketModal({
    open,
    mode = "cash",
    fixedAmountCents = null,
    title,
    subtitle,
    terminals = [],
    users = [],
    productos = [],
    photoSessions = [],
    planesTaquilla = [],
    packsBono = [],
    lessons = [],
    surfboards = [],
    categories = [],
    guestAllowedCategories = GUEST_ALLOWED,
    errors = {},
    busy = false,
    onClose,
    onSubmit,
    initialGuestName = "",
}) {
    const [useGuest, setUseGuest] = useState(Boolean(initialGuestName));
    const [userId, setUserId] = useState(null);
    const [guestName, setGuestName] = useState(initialGuestName || "");
    const [guestEmail, setGuestEmail] = useState("");
    const [userQuery, setUserQuery] = useState("");
    const [productQuery, setProductQuery] = useState("");
    const [paidAt, setPaidAt] = useState(nowAsDatetimeLocalValue());
    const [terminalId, setTerminalId] = useState(terminals[0]?.id || "");
    const [notes, setNotes] = useState("");
    const [showNotes, setShowNotes] = useState(false);
    const [lines, setLines] = useState([]);
    const [draft, setDraft] = useState(emptyDraft());
    const [candidates, setCandidates] = useState([]);
    const [extraLessons, setExtraLessons] = useState([]);
    const [createLessonOpen, setCreateLessonOpen] = useState(false);
    const [createLessonForm, setCreateLessonForm] = useState(
        emptyCreateLessonForm(),
    );
    const [createLessonBusy, setCreateLessonBusy] = useState(false);
    const [createLessonError, setCreateLessonError] = useState("");
    const [blockedRanges, setBlockedRanges] = useState([]);
    const [availabilityLoading, setAvailabilityLoading] = useState(false);
    const autoSuggestAppliedRef = useRef(false);

    useEffect(() => {
        if (!open) return;
        setUseGuest(Boolean(initialGuestName));
        setGuestName(initialGuestName || "");
        setGuestEmail("");
        setUserId(null);
        setUserQuery("");
        setLines([]);
        setDraft(emptyDraft(useGuest ? "producto" : "producto"));
        setPaidAt(nowAsDatetimeLocalValue());
        setTerminalId(terminals[0]?.id || "");
        setNotes("");
        setShowNotes(false);
        setExtraLessons([]);
        setCreateLessonOpen(false);
        setCreateLessonForm(emptyCreateLessonForm());
        setCreateLessonBusy(false);
        setCreateLessonError("");
        setBlockedRanges([]);
        setAvailabilityLoading(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, initialGuestName]);

    useEffect(() => {
        if (!open || draft.category !== "alquiler" || !draft.surfboard_id) {
            setBlockedRanges([]);
            setAvailabilityLoading(false);
            return undefined;
        }

        const now = new Date();
        const from = localDate(now);
        const toDate = new Date(now.getTime());
        toDate.setDate(toDate.getDate() + 60);
        const to = localDate(toDate);
        let cancelled = false;

        setAvailabilityLoading(true);
        window.axios
            .get(route("admin.bookings.check-availability"), {
                params: {
                    surfboard_id: draft.surfboard_id,
                    from,
                    to,
                },
            })
            .then((res) => {
                if (!cancelled) {
                    setBlockedRanges(res?.data?.blocked_ranges || []);
                }
            })
            .catch(() => {
                if (!cancelled) setBlockedRanges([]);
            })
            .finally(() => {
                if (!cancelled) setAvailabilityLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [open, draft.category, draft.surfboard_id]);

    const selectedUser = useMemo(
        () => users.find((u) => u.id === userId) || null,
        [users, userId],
    );

    const allowedCategories = useMemo(() => {
        const all = categories.length ? categories : Object.keys(CATEGORY_LABELS);
        if (useGuest) {
            return all.filter((c) => guestAllowedCategories.includes(c));
        }
        return all.filter((c) => {
            if (c === "taquilla") return selectedUser?.has_active_locker;
            if (c === "bono") return selectedUser?.can_buy_bono;
            return true;
        });
    }, [categories, useGuest, guestAllowedCategories, selectedUser]);

    const filteredUsers = useMemo(() => {
        const q = userQuery.trim().toLowerCase();
        if (!q) return users.slice(0, 40);
        return users
            .filter(
                (u) =>
                    (u.nombre || "").toLowerCase().includes(q) ||
                    (u.email || "").toLowerCase().includes(q),
            )
            .slice(0, 40);
    }, [users, userQuery]);

    const filteredProducts = useMemo(() => {
        const q = productQuery.trim().toLowerCase();
        const list = Array.isArray(productos) ? productos : [];
        if (!q) return list.slice(0, 40);
        return list
            .filter((p) => (p.nombre || "").toLowerCase().includes(q))
            .slice(0, 40);
    }, [productos, productQuery]);

    const mergedLessons = useMemo(() => {
        const base = Array.isArray(lessons) ? lessons : [];
        const extras = Array.isArray(extraLessons) ? extraLessons : [];
        const byId = new Map();
        [...extras, ...base].forEach((l) => {
            if (l?.id != null) byId.set(l.id, l);
        });
        return Array.from(byId.values());
    }, [lessons, extraLessons]);

    const filteredLessons = useMemo(() => {
        return mergedLessons.filter((l) => {
            if (draft.lesson_type && l.type !== draft.lesson_type) return false;
            if (draft.lesson_modality && l.modality !== draft.lesson_modality)
                return false;
            return true;
        });
    }, [mergedLessons, draft.lesson_type, draft.lesson_modality]);

    const canCreateLessonFromTicket =
        draft.lesson_modality !== "semanal";

    const createLessonFromTicket = async () => {
        setCreateLessonBusy(true);
        setCreateLessonError("");
        try {
            const res = await fetch(
                route("admin.payments.datafono.lessons.store"),
                {
                    method: "POST",
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json",
                        "X-CSRF-TOKEN": csrfToken(),
                        "X-Requested-With": "XMLHttpRequest",
                    },
                    body: JSON.stringify({
                        starts_at: createLessonForm.starts_at,
                        duration_minutes: Number(
                            createLessonForm.duration_minutes,
                        ),
                        type: createLessonForm.type,
                        modality: createLessonForm.modality,
                        level: createLessonForm.level,
                        price: Number(createLessonForm.price),
                    }),
                },
            );
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setCreateLessonError(
                    data.message ||
                        Object.values(data.errors || {})
                            .flat()
                            .find(Boolean) ||
                        "No se pudo crear la clase.",
                );
                return;
            }
            const lesson = data.lesson;
            if (!lesson?.id) {
                setCreateLessonError("Respuesta inválida del servidor.");
                return;
            }
            setExtraLessons((prev) => [lesson, ...prev]);
            setDraft((f) => ({
                ...f,
                lesson_id: lesson.id,
                lesson_type: lesson.type || f.lesson_type,
                lesson_modality: lesson.modality || f.lesson_modality,
            }));
            setCreateLessonOpen(false);
            setCreateLessonError("");
        } catch {
            setCreateLessonError("Error de red al crear la clase.");
        } finally {
            setCreateLessonBusy(false);
        }
    };

    useEffect(() => {
        autoSuggestAppliedRef.current = false;
        if (!open || useGuest || !userId || !draft.category) {
            setCandidates([]);
            return;
        }
        if (draft.category === "producto") {
            setCandidates([]);
            return;
        }
        fetch(
            route("admin.payments.datafono.pending", userId) +
                `?category=${encodeURIComponent(draft.category)}`,
            { headers: { Accept: "application/json" } },
        )
            .then((r) => r.json())
            .then((data) => setCandidates(data.candidates || []))
            .catch(() => setCandidates([]));
    }, [open, useGuest, userId, draft.category]);

    const draftAmountCents = useMemo(() => {
        if (draft.payable_id) {
            const c = candidates.find(
                (x) => String(x.id) === String(draft.payable_id),
            );
            return c ? Number(c.amount_cents || 0) : 0;
        }
        if (draft.category === "producto") {
            return draft.product_ids.reduce((sum, id) => {
                const p = productos.find((x) => x.id === id);
                return sum + Number(p?.precio_cents || 0);
            }, 0);
        }
        if (draft.category === "fotos" && draft.photo_session_id) {
            const s = photoSessions.find(
                (x) => String(x.id) === String(draft.photo_session_id),
            );
            if (!s) return 0;
            const n = Math.max(1, Number(draft.party_size) || 1);
            return (
                Number(s.precio_cents || 0) +
                n * Number(s.plus_por_persona_cents || 0)
            );
        }
        if (draft.category === "taquilla" && draft.plan_taquilla_id) {
            const p = planesTaquilla.find(
                (x) => String(x.id) === String(draft.plan_taquilla_id),
            );
            return Number(p?.precio_cents || 0);
        }
        if (draft.category === "bono" && draft.pack_bono_id) {
            const p = packsBono.find(
                (x) => String(x.id) === String(draft.pack_bono_id),
            );
            return Number(p?.precio_cents || 0);
        }
        if (draft.category === "alquiler" && draft.surfboard_id) {
            const board = surfboards.find(
                (x) => String(x.id) === String(draft.surfboard_id),
            );
            return quoteRentalCents(
                board,
                draft.rental_mode,
                draft.rental_pack_minutes,
                draft.rental_pack_days,
            );
        }
        if (draft.category === "clase" && draft.lesson_id) {
            const lesson = mergedLessons.find(
                (x) => String(x.id) === String(draft.lesson_id),
            );
            return Number(lesson?.precio_cents || 0);
        }
        return 0;
    }, [
        draft,
        candidates,
        productos,
        photoSessions,
        planesTaquilla,
        packsBono,
        surfboards,
        mergedLessons,
    ]);

    const linesTotal = useMemo(
        () => lines.reduce((s, l) => s + Number(l.amount_cents || 0), 0),
        [lines],
    );

    const tpvRemainingCents =
        mode === "tpv" && fixedAmountCents != null
            ? Number(fixedAmountCents) - linesTotal
            : null;

    const tpvMatchingCandidateId = useMemo(() => {
        if (tpvRemainingCents == null || tpvRemainingCents <= 0) return null;
        const match = candidates.find(
            (c) => Number(c.amount_cents) === tpvRemainingCents,
        );
        return match ? String(match.id) : null;
    }, [candidates, tpvRemainingCents]);

    useEffect(() => {
        if (!tpvMatchingCandidateId) return;
        if (autoSuggestAppliedRef.current) return;
        if (draft.payable_id) return;
        autoSuggestAppliedRef.current = true;
        setDraft((f) =>
            f.payable_id ? f : { ...f, payable_id: tpvMatchingCandidateId },
        );
    }, [tpvMatchingCandidateId, draft.payable_id]);

    const selectedRentalBoard = useMemo(() => {
        if (!draft.surfboard_id) return null;
        return (
            surfboards.find(
                (x) => String(x.id) === String(draft.surfboard_id),
            ) || null
        );
    }, [surfboards, draft.surfboard_id]);

    const rentalPackOptions = useMemo(
        () =>
            availableRentalPackOptions(
                selectedRentalBoard,
                draft.rental_mode,
            ),
        [selectedRentalBoard, draft.rental_mode],
    );

    const rentalPickupDay = useMemo(
        () => pickupDayValue(draft.rental_pickup_at),
        [draft.rental_pickup_at],
    );

    const hourPickupSlots = useMemo(() => {
        if (draft.rental_mode !== "hour") return [];
        const packMinutes = Number(draft.rental_pack_minutes);
        if (!Number.isFinite(packMinutes) || packMinutes <= 0) return [];
        return buildPickupSlots({
            date: rentalPickupDay,
            packMinutes,
            policy: RENTAL_POLICY,
            blockedRanges,
        });
    }, [
        draft.rental_mode,
        draft.rental_pack_minutes,
        rentalPickupDay,
        blockedRanges,
    ]);

    const selectedHourSlot = useMemo(() => {
        if (draft.rental_mode !== "hour" || !draft.rental_pickup_at) return null;
        const pickup = toDateSafe(draft.rental_pickup_at);
        if (!pickup) return null;
        const time = formatTime(pickup);
        return (
            hourPickupSlots.find(
                (slot) => slot.time === time && slot.available,
            ) || null
        );
    }, [draft.rental_mode, draft.rental_pickup_at, hourPickupSlots]);

    const dayWindowUnavailable = useMemo(() => {
        if (draft.rental_mode !== "day" || !draft.rental_pickup_at) return false;
        const window = dayPackInventoryWindow(
            draft.rental_pickup_at,
            draft.rental_pack_days,
            RENTAL_POLICY,
        );
        if (!window) return false;
        return overlapsBlocked(
            blockedRanges,
            window.pickupAt,
            window.blockEnd,
        );
    }, [
        draft.rental_mode,
        draft.rental_pickup_at,
        draft.rental_pack_days,
        blockedRanges,
    ]);

    // Si el pack/día deja inválida la hora elegida, saltar al primer slot libre.
    useEffect(() => {
        if (
            !open ||
            draft.category !== "alquiler" ||
            draft.rental_mode !== "hour" ||
            !draft.surfboard_id ||
            availabilityLoading
        ) {
            return;
        }
        if (selectedHourSlot) return;

        const first = hourPickupSlots.find((slot) => slot.available);
        const nextValue = first
            ? localDateTime(first.pickupAt)
            : `${rentalPickupDay}T00:00`;
        if (draft.rental_pickup_at === nextValue) return;

        setDraft((f) =>
            f.rental_pickup_at === nextValue
                ? f
                : { ...f, rental_pickup_at: nextValue },
        );
    }, [
        open,
        draft.category,
        draft.rental_mode,
        draft.surfboard_id,
        draft.rental_pickup_at,
        selectedHourSlot,
        hourPickupSlots,
        rentalPickupDay,
        availabilityLoading,
    ]);

    const alquilerUnavailable =
        draft.category === "alquiler" &&
        !draft.payable_id &&
        Boolean(draft.surfboard_id) &&
        !availabilityLoading &&
        ((draft.rental_mode === "hour" &&
            draft.rental_pickup_at &&
            !selectedHourSlot) ||
            (draft.rental_mode === "day" && dayWindowUnavailable));

    const alquilerAddDisabled =
        draft.category === "alquiler" &&
        !draft.payable_id &&
        (!draft.surfboard_id ||
            !draft.rental_pickup_at ||
            draftAmountCents <= 0 ||
            availabilityLoading ||
            alquilerUnavailable);

    const alquilerAddHint = !alquilerAddDisabled
        ? null
        : !draft.surfboard_id
          ? "Elige una tabla"
          : draftAmountCents <= 0
            ? "Elige un pack con precio"
            : !draft.rental_pickup_at
              ? "Indica la recogida"
              : availabilityLoading
                ? "Comprobando disponibilidad…"
                : alquilerUnavailable
                  ? draft.rental_mode === "day"
                      ? "Ese rango de días está ocupado"
                      : "Esa hora no está disponible"
                  : null;

    const tpvMismatch =
        mode === "tpv" &&
        fixedAmountCents != null &&
        linesTotal !== Number(fixedAmountCents);

    const tpvMismatchDiffCents = tpvMismatch
        ? Number(fixedAmountCents) - linesTotal
        : 0;

    const addLine = () => {
        const amount = draftAmountCents;
        if (amount <= 0 && draft.category !== "alquiler") return;
        if (draft.category === "producto" && draft.product_ids.length === 0)
            return;
        if (
            draft.category === "fotos" &&
            !draft.payable_id &&
            (!draft.photo_session_id || !draft.fecha_inicio)
        )
            return;
        if (
            draft.category === "alquiler" &&
            !draft.payable_id &&
            (!draft.surfboard_id ||
                !draft.rental_pickup_at ||
                amount <= 0 ||
                availabilityLoading ||
                alquilerUnavailable)
        )
            return;
        if (
            (draft.category === "taquilla" || draft.category === "bono") &&
            !draft.payable_id &&
            !(draft.category === "taquilla"
                ? draft.plan_taquilla_id
                : draft.pack_bono_id)
        )
            return;
        if (
            draft.category === "clase" &&
            !draft.payable_id &&
            (!draft.lesson_id || amount <= 0)
        )
            return;

        const labelParts = [CATEGORY_LABELS[draft.category] || draft.category];
        if (draft.category === "producto") {
            labelParts.push(
                draft.product_ids
                    .map(
                        (id) =>
                            productos.find((p) => p.id === id)?.nombre || id,
                    )
                    .join(", "),
            );
        } else if (draft.payable_id) {
            const c = candidates.find(
                (x) => String(x.id) === String(draft.payable_id),
            );
            if (c) labelParts.push(c.label);
        } else if (draft.category === "fotos") {
            const s = photoSessions.find(
                (x) => String(x.id) === String(draft.photo_session_id),
            );
            labelParts.push(s?.nombre || "Pack");
        } else if (draft.category === "alquiler") {
            const s = surfboards.find(
                (x) => String(x.id) === String(draft.surfboard_id),
            );
            labelParts.push(s?.name || "Tabla");
        } else if (draft.category === "clase") {
            const lesson = mergedLessons.find(
                (x) => String(x.id) === String(draft.lesson_id),
            );
            labelParts.push(lesson?.label || lesson?.title || "Reserva");
        }

        setLines((prev) => [
            ...prev,
            {
                ...draft,
                amount_cents: amount,
                label: labelParts.filter(Boolean).join(" · "),
            },
        ]);
        setDraft(emptyDraft(draft.category));
        setProductQuery("");
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (lines.length === 0) return;
        if (useGuest && !guestName.trim()) return;
        if (!useGuest && !userId) return;
        if (tpvMismatch) return;

        onSubmit({
            payment_terminal_id: terminalId || undefined,
            paid_at: paidAt,
            user_id: useGuest ? null : userId,
            guest_name: useGuest ? guestName.trim() : null,
            guest_email: useGuest ? guestEmail.trim() || null : null,
            notes: notes || null,
            lines: lines.map((l) => ({
                category: l.category,
                amount_cents: Number(l.amount_cents),
                payable_id: l.payable_id || null,
                product_ids: l.product_ids || [],
                photo_session_id: l.photo_session_id || null,
                fecha_inicio: l.fecha_inicio || null,
                party_size: l.party_size || 1,
                plan_taquilla_id: l.plan_taquilla_id || null,
                pack_bono_id: l.pack_bono_id || null,
                surfboard_id: l.surfboard_id || null,
                rental_mode: l.rental_mode || null,
                rental_pickup_at: l.rental_pickup_at || null,
                rental_pack_minutes: l.rental_pack_minutes || null,
                rental_pack_days: l.rental_pack_days || null,
            })),
        });
    };

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        >
            <form
                onSubmit={handleSubmit}
                onClick={(e) => e.stopPropagation()}
                className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl"
            >
                <div className="shrink-0 border-b border-white/10 px-5 py-4 sm:px-6">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h3 className="text-lg font-bold text-white">
                                {title}
                            </h3>
                            {subtitle ? (
                                <p className="mt-0.5 text-xs text-slate-400">
                                    {subtitle}
                                </p>
                            ) : null}
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={busy}
                            aria-label="Cerrar"
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <XMarkIcon className="h-5 w-5" />
                        </button>
                    </div>
                    <div className="mt-2">
                        <ErrorList errors={errors} />
                    </div>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4 sm:px-6">

                {mode === "cash" ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                        {terminals.length > 1 ? (
                            <AdminFormField
                                as="select"
                                label="Terminal"
                                inputProps={{
                                    required: true,
                                    value: terminalId,
                                    onChange: (e) =>
                                        setTerminalId(e.target.value),
                                }}
                            >
                                {terminals.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.codigo} · {t.nombre}
                                    </option>
                                ))}
                            </AdminFormField>
                        ) : null}
                        <AdminFormField
                            type="datetime-local"
                            label="Fecha cobro"
                            inputProps={{
                                required: true,
                                value: paidAt,
                                onChange: (e) => setPaidAt(e.target.value),
                            }}
                        />
                    </div>
                ) : null}

                <div>
                    <p className="mb-1 text-sm text-slate-300">¿Quién paga?</p>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setUseGuest(false);
                                setGuestName("");
                                setGuestEmail("");
                            }}
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ring-1 ${
                                !useGuest
                                    ? "bg-cyan-600 text-white ring-cyan-400/40"
                                    : "bg-slate-800 text-slate-300 ring-white/10"
                            }`}
                        >
                            Socio registrado
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setUseGuest(true);
                                setUserId(null);
                                setUserQuery("");
                                setDraft(emptyDraft("producto"));
                            }}
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ring-1 ${
                                useGuest
                                    ? "bg-amber-600 text-white ring-amber-400/40"
                                    : "bg-slate-800 text-slate-300 ring-white/10"
                            }`}
                        >
                            Cliente no registrado
                        </button>
                    </div>
                </div>

                {!useGuest ? (
                    <Combobox
                        value={selectedUser}
                        onChange={(u) => {
                            setUserId(u?.id ?? null);
                            setDraft(emptyDraft("producto"));
                        }}
                        nullable
                    >
                        <div className="relative">
                            <Combobox.Input
                                className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm"
                                displayValue={(u) => u?.nombre || ""}
                                onChange={(e) => setUserQuery(e.target.value)}
                                placeholder="Buscar socio…"
                            />
                            <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2 text-slate-400">
                                <ChevronUpDownIcon className="h-5 w-5" />
                            </Combobox.Button>
                            <Combobox.Options className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-white/10 bg-slate-950 py-1 text-sm shadow-xl">
                                {filteredUsers.map((u) => (
                                    <Combobox.Option
                                        key={u.id}
                                        value={u}
                                        className="cursor-pointer px-3 py-2 ui-active:bg-slate-800"
                                    >
                                        <div className="font-medium">
                                            {u.nombre}
                                            {u.has_active_locker
                                                ? " · taquilla"
                                                : u.can_buy_bono
                                                  ? " · VIP"
                                                  : ""}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {u.email}
                                        </div>
                                    </Combobox.Option>
                                ))}
                            </Combobox.Options>
                        </div>
                    </Combobox>
                ) : (
                    <div className="space-y-2 rounded-lg border border-amber-500/30 bg-amber-950/20 p-3">
                        <AdminFormField
                            label="Nombre y apellidos *"
                            inputProps={{
                                required: true,
                                value: guestName,
                                onChange: (e) => setGuestName(e.target.value),
                                placeholder: "Ej. Ana García",
                            }}
                        />
                        <AdminFormField
                            type="email"
                            label="Email (opcional)"
                            inputProps={{
                                value: guestEmail,
                                onChange: (e) => setGuestEmail(e.target.value),
                            }}
                        />
                    </div>
                )}

                <AdminCard className="p-3 sm:p-3">
                    <p className="mb-2 text-sm font-semibold text-slate-200">
                        Añadir línea
                    </p>
                    <div className="mb-2 flex flex-wrap gap-2">
                        {allowedCategories.map((c) => (
                            <button
                                key={c}
                                type="button"
                                onClick={() => setDraft(emptyDraft(c))}
                                className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                                    draft.category === c
                                        ? "bg-cyan-600 text-white ring-cyan-400/40"
                                        : "bg-slate-800 text-slate-300 ring-white/10"
                                }`}
                            >
                                {CATEGORY_LABELS[c] || c}
                            </button>
                        ))}
                    </div>

                    {draft.category === "producto" ? (
                        <div>
                            <AdminFormField
                                className="mb-2"
                                inputProps={{
                                    value: productQuery,
                                    onChange: (e) =>
                                        setProductQuery(e.target.value),
                                    placeholder: "Filtrar productos…",
                                }}
                            />
                            <div className="max-h-36 space-y-1 overflow-auto rounded-lg border border-white/10 p-2">
                                {filteredProducts.map((p) => {
                                    const checked =
                                        draft.product_ids.includes(p.id);
                                    return (
                                        <label
                                            key={p.id}
                                            className="flex items-center gap-2 text-sm text-slate-300"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() =>
                                                    setDraft((f) => ({
                                                        ...f,
                                                        product_ids: checked
                                                            ? f.product_ids.filter(
                                                                  (id) =>
                                                                      id !==
                                                                      p.id,
                                                              )
                                                            : [
                                                                  ...f.product_ids,
                                                                  p.id,
                                                              ],
                                                    }))
                                                }
                                            />
                                            {p.nombre} · {p.precio} €
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    ) : null}

                    {draft.category !== "producto" && candidates.length > 0 ? (
                        <AdminFormField
                            as="select"
                            label="Pendiente a enlazar (o deja vacío para crear nuevo)"
                            className="mb-2"
                            inputProps={{
                                value: draft.payable_id,
                                onChange: (e) =>
                                    setDraft((f) => ({
                                        ...f,
                                        payable_id: e.target.value,
                                    })),
                            }}
                        >
                            <option value="">— Crear / elegir abajo —</option>
                            {candidates.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {String(c.id) === tpvMatchingCandidateId
                                        ? `✓ ${c.label} (coincide con el cobro)`
                                        : c.label}
                                </option>
                            ))}
                        </AdminFormField>
                    ) : null}

                    {draft.category === "fotos" && !draft.payable_id ? (
                        <div className="space-y-2">
                            <AdminFormField
                                as="select"
                                label="Pack de fotos"
                                inputProps={{
                                    value: draft.photo_session_id,
                                    onChange: (e) =>
                                        setDraft((f) => ({
                                            ...f,
                                            photo_session_id: e.target.value,
                                        })),
                                }}
                            >
                                <option value="">—</option>
                                {photoSessions.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.nombre}
                                    </option>
                                ))}
                            </AdminFormField>
                            <AdminFormField
                                type="number"
                                label="Nº personas"
                                inputProps={{
                                    min: 1,
                                    value: draft.party_size,
                                    onChange: (e) =>
                                        setDraft((f) => ({
                                            ...f,
                                            party_size: Math.max(
                                                1,
                                                Number(e.target.value) || 1,
                                            ),
                                        })),
                                }}
                            />
                            <AdminFormField
                                type="datetime-local"
                                label="Fecha inicio"
                                inputProps={{
                                    value: draft.fecha_inicio,
                                    onChange: (e) =>
                                        setDraft((f) => ({
                                            ...f,
                                            fecha_inicio: e.target.value,
                                        })),
                                }}
                            />
                        </div>
                    ) : null}

                    {draft.category === "alquiler" && !draft.payable_id ? (
                        <div className="space-y-3">
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-3">
                                    <AdminFormField
                                        as="select"
                                        label="Tabla"
                                        inputProps={{
                                            value: draft.surfboard_id,
                                            onChange: (e) => {
                                                const nextId = e.target.value;
                                                const board =
                                                    surfboards.find(
                                                        (x) =>
                                                            String(x.id) ===
                                                            String(nextId),
                                                    ) || null;
                                                setDraft((f) =>
                                                    withSyncedRentalPack(
                                                        {
                                                            ...f,
                                                            surfboard_id:
                                                                nextId,
                                                        },
                                                        board,
                                                        f.rental_mode,
                                                    ),
                                                );
                                            },
                                        }}
                                    >
                                        <option value="">—</option>
                                        {surfboards.map((s) => (
                                            <option key={s.id} value={s.id}>
                                                {s.name}
                                            </option>
                                        ))}
                                    </AdminFormField>

                                    <div>
                                        <p className="mb-1.5 text-xs font-medium text-slate-400">
                                            Modo
                                        </p>
                                        <div
                                            role="group"
                                            aria-label="Modo de alquiler"
                                            className="flex flex-wrap gap-2"
                                        >
                                            {[
                                                {
                                                    value: "hour",
                                                    label: "Por horas",
                                                },
                                                {
                                                    value: "day",
                                                    label: "Por días",
                                                },
                                            ].map((opt) => {
                                                const active =
                                                    draft.rental_mode ===
                                                    opt.value;
                                                return (
                                                    <button
                                                        key={opt.value}
                                                        type="button"
                                                        aria-pressed={active}
                                                        onClick={() => {
                                                            setDraft((f) => {
                                                                const nextMode =
                                                                    opt.value;
                                                                const synced =
                                                                    withSyncedRentalPack(
                                                                        f,
                                                                        selectedRentalBoard,
                                                                        nextMode,
                                                                    );
                                                                return {
                                                                    ...synced,
                                                                    rental_mode:
                                                                        nextMode,
                                                                    rental_pickup_at:
                                                                        nextMode ===
                                                                        "day"
                                                                            ? nowAsDateValue()
                                                                            : `${nowAsDateValue()}T00:00`,
                                                                };
                                                            });
                                                        }}
                                                        className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                                                            active
                                                                ? "bg-cyan-600 text-white ring-cyan-400/40"
                                                                : "bg-slate-800 text-slate-300 ring-white/10"
                                                        }`}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <p className="mb-1.5 text-xs font-medium text-slate-400">
                                            Pack
                                        </p>
                                        {!draft.surfboard_id ? (
                                            <p className="text-xs text-slate-400">
                                                Elige una tabla para ver packs e
                                                importe
                                            </p>
                                        ) : rentalPackOptions.length === 0 ? (
                                            <p className="text-xs text-slate-500">
                                                Esta tabla no tiene packs
                                                vendibles en este modo.
                                            </p>
                                        ) : (
                                            <div className="flex flex-wrap gap-2">
                                                {rentalPackOptions.map(
                                                    (pack) => {
                                                        const selected =
                                                            draft.rental_mode ===
                                                            "day"
                                                                ? Number(
                                                                      draft.rental_pack_days,
                                                                  ) ===
                                                                  pack.value
                                                                : Number(
                                                                      draft.rental_pack_minutes,
                                                                  ) ===
                                                                  pack.value;
                                                        return (
                                                            <button
                                                                key={
                                                                    pack.column
                                                                }
                                                                type="button"
                                                                onClick={() =>
                                                                    setDraft(
                                                                        (f) => ({
                                                                            ...f,
                                                                            ...(f.rental_mode ===
                                                                            "day"
                                                                                ? {
                                                                                      rental_pack_days:
                                                                                          pack.value,
                                                                                  }
                                                                                : {
                                                                                      rental_pack_minutes:
                                                                                          pack.value,
                                                                                  }),
                                                                        }),
                                                                    )
                                                                }
                                                                className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                                                                    selected
                                                                        ? "bg-cyan-600 text-white ring-cyan-400/40"
                                                                        : "bg-slate-800 text-slate-300 ring-white/10"
                                                                }`}
                                                            >
                                                                {pack.label} ·{" "}
                                                                {formatEurosLabel(
                                                                    pack.price,
                                                                )}
                                                            </button>
                                                        );
                                                    },
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <AdminFormField
                                            type="date"
                                            label="Recogida"
                                            inputProps={{
                                                value: rentalPickupDay,
                                                min: nowAsDateValue(),
                                                onChange: (e) => {
                                                    const day =
                                                        e.target.value ||
                                                        nowAsDateValue();
                                                    setDraft((f) => ({
                                                        ...f,
                                                        rental_pickup_at:
                                                            f.rental_mode ===
                                                            "day"
                                                                ? day
                                                                : `${day}T00:00`,
                                                    }));
                                                },
                                            }}
                                        />

                                        {draft.surfboard_id &&
                                        availabilityLoading ? (
                                            <p className="text-xs text-slate-500">
                                                Comprobando disponibilidad de la
                                                tabla…
                                            </p>
                                        ) : null}

                                        {draft.rental_mode === "hour" &&
                                        draft.surfboard_id &&
                                        !availabilityLoading ? (
                                            hourPickupSlots.length === 0 ? (
                                                <p className="text-xs text-slate-500">
                                                    No hay horas para este pack
                                                    dentro del horario de la
                                                    escuela.
                                                </p>
                                            ) : (
                                                <>
                                                    <p className="text-xs font-medium text-slate-400">
                                                        Hora (tachadas = ya
                                                        reservadas)
                                                    </p>
                                                    <div
                                                        className="grid grid-cols-4 gap-1.5 sm:grid-cols-6"
                                                        role="group"
                                                        aria-label="Hora de recogida"
                                                    >
                                                        {hourPickupSlots.map(
                                                            (slot) => {
                                                                const active =
                                                                    selectedHourSlot?.time ===
                                                                    slot.time;
                                                                return (
                                                                    <button
                                                                        key={
                                                                            slot.time
                                                                        }
                                                                        type="button"
                                                                        disabled={
                                                                            !slot.available
                                                                        }
                                                                        aria-pressed={
                                                                            active
                                                                        }
                                                                        title={
                                                                            slot.available
                                                                                ? `Devolución ${formatTime(slot.returnAt)}`
                                                                                : "No disponible"
                                                                        }
                                                                        onClick={() =>
                                                                            setDraft(
                                                                                (
                                                                                    f,
                                                                                ) => ({
                                                                                    ...f,
                                                                                    rental_pickup_at:
                                                                                        localDateTime(
                                                                                            slot.pickupAt,
                                                                                        ),
                                                                                }),
                                                                            )
                                                                        }
                                                                        className={`rounded-lg px-1.5 py-1.5 text-xs font-semibold tabular-nums ring-1 ring-inset transition ${
                                                                            active
                                                                                ? "bg-cyan-600 text-white ring-cyan-500"
                                                                                : slot.available
                                                                                  ? "bg-slate-950/60 text-slate-200 ring-white/10 hover:bg-slate-800"
                                                                                  : "cursor-not-allowed bg-slate-900/40 text-slate-600 line-through ring-white/5"
                                                                        }`}
                                                                    >
                                                                        {
                                                                            slot.time
                                                                        }
                                                                    </button>
                                                                );
                                                            },
                                                        )}
                                                    </div>
                                                    {!hourPickupSlots.some(
                                                        (s) => s.available,
                                                    ) ? (
                                                        <p className="text-xs text-amber-300/90">
                                                            Este día está
                                                            completo para esta
                                                            duración. Prueba
                                                            otro día u otro
                                                            pack.
                                                        </p>
                                                    ) : selectedHourSlot ? (
                                                        <p className="text-xs text-slate-500">
                                                            Devolución{" "}
                                                            {formatTime(
                                                                selectedHourSlot.returnAt,
                                                            )}{" "}
                                                            (incluye buffer de
                                                            rotación en
                                                            inventario).
                                                        </p>
                                                    ) : null}
                                                </>
                                            )
                                        ) : null}

                                        {draft.rental_mode === "day" &&
                                        draft.surfboard_id &&
                                        !availabilityLoading &&
                                        dayWindowUnavailable ? (
                                            <p className="text-xs text-amber-300/90">
                                                Esa tabla ya está reservada en
                                                ese rango de días. Elige otra
                                                fecha o pack.
                                            </p>
                                        ) : null}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-baseline justify-between gap-2 rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2">
                                <span className="text-xs text-slate-400">
                                    Importe línea
                                </span>
                                <span className="text-sm font-semibold tabular-nums text-white">
                                    {formatCentsLabel(draftAmountCents)}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500">
                                Importe según tarifa de la tabla; la
                                disponibilidad usa las mismas reservas que el
                                alquiler online.
                            </p>
                        </div>
                    ) : null}

                    {draft.category === "taquilla" && !draft.payable_id ? (
                        <AdminFormField
                            as="select"
                            label="Plan taquilla nuevo"
                            inputProps={{
                                value: draft.plan_taquilla_id,
                                onChange: (e) =>
                                    setDraft((f) => ({
                                        ...f,
                                        plan_taquilla_id: e.target.value,
                                    })),
                            }}
                        >
                            <option value="">—</option>
                            {planesTaquilla.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.nombre} · {p.precio} €
                                </option>
                            ))}
                        </AdminFormField>
                    ) : null}

                    {draft.category === "bono" && !draft.payable_id ? (
                        <AdminFormField
                            as="select"
                            label="Pack bono nuevo"
                            inputProps={{
                                value: draft.pack_bono_id,
                                onChange: (e) =>
                                    setDraft((f) => ({
                                        ...f,
                                        pack_bono_id: e.target.value,
                                    })),
                            }}
                        >
                            <option value="">—</option>
                            {packsBono.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.nombre} · {p.precio} €
                                </option>
                            ))}
                        </AdminFormField>
                    ) : null}

                    {draft.category === "clase" && !draft.payable_id ? (
                        <div className="space-y-2">
                            <p className="text-xs text-slate-400">
                                Reserva walk-in: filtra por tipo/modalidad,
                                elige la clase y añádela al ticket (se cobra e
                                inscribe al cerrar).
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                                <AdminFormField
                                    as="select"
                                    label="Tipo"
                                    inputProps={{
                                        value: draft.lesson_type,
                                        onChange: (e) =>
                                            setDraft((f) => ({
                                                ...f,
                                                lesson_type: e.target.value,
                                                lesson_id: "",
                                            })),
                                    }}
                                >
                                    <option value="">Todos</option>
                                    {Object.entries(LESSON_TYPE_LABELS).map(
                                        ([value, label]) => (
                                            <option key={value} value={value}>
                                                {label}
                                            </option>
                                        ),
                                    )}
                                </AdminFormField>
                                <AdminFormField
                                    as="select"
                                    label="Modalidad"
                                    inputProps={{
                                        value: draft.lesson_modality,
                                        onChange: (e) =>
                                            setDraft((f) => ({
                                                ...f,
                                                lesson_modality: e.target.value,
                                                lesson_id: "",
                                            })),
                                    }}
                                >
                                    <option value="">Todas</option>
                                    {Object.entries(LESSON_MODALITY_LABELS).map(
                                        ([value, label]) => (
                                            <option key={value} value={value}>
                                                {label}
                                            </option>
                                        ),
                                    )}
                                </AdminFormField>
                            </div>
                            <AdminFormField
                                as="select"
                                label="Clase a reservar"
                                inputProps={{
                                    value: draft.lesson_id,
                                    onChange: (e) =>
                                        setDraft((f) => ({
                                            ...f,
                                            lesson_id: e.target.value,
                                        })),
                                }}
                            >
                                <option value="">—</option>
                                {filteredLessons.map((l) => (
                                    <option key={l.id} value={l.id}>
                                        {l.label || l.title}
                                    </option>
                                ))}
                            </AdminFormField>
                            {filteredLessons.length === 0 ? (
                                <div className="space-y-2 rounded-lg border border-dashed border-white/15 bg-slate-950/30 px-3 py-2.5">
                                    <p className="text-xs text-slate-500">
                                        No hay clases programadas en los próximos
                                        días con ese filtro.
                                        {draft.lesson_modality === "semanal"
                                            ? " El semanal se crea en Commander."
                                            : " También puedes enlazar una pendiente arriba si el socio ya reservó online."}
                                    </p>
                                    {canCreateLessonFromTicket ? (
                                        <AdminButton
                                            type="button"
                                            className="w-full px-3 py-1.5 text-xs sm:w-auto"
                                            onClick={() => {
                                                setCreateLessonForm(
                                                    emptyCreateLessonForm(
                                                        draft.lesson_type ||
                                                            "surf",
                                                        draft.lesson_modality ||
                                                            "particular",
                                                    ),
                                                );
                                                setCreateLessonOpen(true);
                                                setCreateLessonError("");
                                            }}
                                        >
                                            + Crear clase
                                        </AdminButton>
                                    ) : null}
                                </div>
                            ) : canCreateLessonFromTicket ? (
                                <button
                                    type="button"
                                    className="text-xs font-semibold text-cyan-300 hover:underline"
                                    onClick={() => {
                                        setCreateLessonForm(
                                            emptyCreateLessonForm(
                                                draft.lesson_type || "surf",
                                                draft.lesson_modality ||
                                                    "particular",
                                            ),
                                        );
                                        setCreateLessonOpen(true);
                                        setCreateLessonError("");
                                    }}
                                >
                                    + Crear clase nueva
                                </button>
                            ) : null}

                            {createLessonOpen && canCreateLessonFromTicket ? (
                                <div className="space-y-2 rounded-lg border border-cyan-500/30 bg-cyan-950/20 p-3">
                                    <p className="text-xs font-semibold text-cyan-100">
                                        Nueva clase (walk-in)
                                    </p>
                                    <AdminFormField
                                        type="datetime-local"
                                        label="Inicio"
                                        inputProps={{
                                            value: createLessonForm.starts_at,
                                            onChange: (e) =>
                                                setCreateLessonForm((f) => ({
                                                    ...f,
                                                    starts_at: e.target.value,
                                                })),
                                        }}
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                        <AdminFormField
                                            as="select"
                                            label="Duración"
                                            inputProps={{
                                                value: createLessonForm.duration_minutes,
                                                onChange: (e) =>
                                                    setCreateLessonForm(
                                                        (f) => ({
                                                            ...f,
                                                            duration_minutes:
                                                                Number(
                                                                    e.target
                                                                        .value,
                                                                ),
                                                        }),
                                                    ),
                                            }}
                                        >
                                            <option value={60}>60 min</option>
                                            <option value={90}>90 min</option>
                                        </AdminFormField>
                                        <AdminFormField
                                            as="select"
                                            label="Nivel"
                                            inputProps={{
                                                value: createLessonForm.level,
                                                onChange: (e) =>
                                                    setCreateLessonForm(
                                                        (f) => ({
                                                            ...f,
                                                            level: e.target
                                                                .value,
                                                        }),
                                                    ),
                                            }}
                                        >
                                            {Object.entries(
                                                LESSON_LEVEL_LABELS,
                                            ).map(([value, label]) => (
                                                <option
                                                    key={value}
                                                    value={value}
                                                >
                                                    {label}
                                                </option>
                                            ))}
                                        </AdminFormField>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <AdminFormField
                                            as="select"
                                            label="Tipo"
                                            inputProps={{
                                                value: createLessonForm.type,
                                                onChange: (e) =>
                                                    setCreateLessonForm(
                                                        (f) => ({
                                                            ...f,
                                                            type: e.target
                                                                .value,
                                                        }),
                                                    ),
                                            }}
                                        >
                                            {Object.entries(
                                                LESSON_TYPE_LABELS,
                                            ).map(([value, label]) => (
                                                <option
                                                    key={value}
                                                    value={value}
                                                >
                                                    {label}
                                                </option>
                                            ))}
                                        </AdminFormField>
                                        <AdminFormField
                                            as="select"
                                            label="Modalidad"
                                            inputProps={{
                                                value: createLessonForm.modality,
                                                onChange: (e) => {
                                                    const modality =
                                                        e.target.value;
                                                    setCreateLessonForm(
                                                        (f) => ({
                                                            ...f,
                                                            modality,
                                                            price:
                                                                modality ===
                                                                "particular"
                                                                    ? f.price ||
                                                                      "55"
                                                                    : f.price ||
                                                                      "35",
                                                        }),
                                                    );
                                                },
                                            }}
                                        >
                                            <option value="particular">
                                                Particular
                                            </option>
                                            <option value="grupal">
                                                Grupal
                                            </option>
                                        </AdminFormField>
                                    </div>
                                    <AdminFormField
                                        type="number"
                                        label="Precio (€)"
                                        inputProps={{
                                            min: "0.01",
                                            step: "0.01",
                                            value: createLessonForm.price,
                                            onChange: (e) =>
                                                setCreateLessonForm((f) => ({
                                                    ...f,
                                                    price: e.target.value,
                                                })),
                                        }}
                                    />
                                    {createLessonError ? (
                                        <p className="text-xs text-rose-300">
                                            {createLessonError}
                                        </p>
                                    ) : null}
                                    <div className="flex flex-wrap gap-2">
                                        <AdminButton
                                            type="button"
                                            className="px-3 py-1.5 text-xs"
                                            disabled={createLessonBusy}
                                            onClick={createLessonFromTicket}
                                        >
                                            {createLessonBusy
                                                ? "Creando…"
                                                : "Crear y seleccionar"}
                                        </AdminButton>
                                        <AdminButton
                                            type="button"
                                            variant="ghost"
                                            className="px-3 py-1.5 text-xs"
                                            disabled={createLessonBusy}
                                            onClick={() => {
                                                setCreateLessonOpen(false);
                                                setCreateLessonError("");
                                            }}
                                        >
                                            Cancelar
                                        </AdminButton>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    ) : null}

                    <div className="mt-2 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                            {draft.category === "alquiler" &&
                            !draft.payable_id ? (
                                <span className="text-xs text-slate-500">
                                    {alquilerAddHint || "\u00a0"}
                                </span>
                            ) : (
                                <p className="text-xs text-slate-400">
                                    Importe línea:{" "}
                                    {formatCentsLabel(draftAmountCents)}
                                </p>
                            )}
                            <AdminButton
                                type="button"
                                className="px-3 py-1.5 text-xs"
                                onClick={addLine}
                                disabled={alquilerAddDisabled}
                            >
                                + Añadir al ticket
                            </AdminButton>
                        </div>
                    </div>
                </AdminCard>

                <AdminCard className="p-3 sm:p-3">
                    <p className="mb-2 text-sm font-semibold text-slate-200">
                        Ticket ({lines.length})
                    </p>
                    {lines.length === 0 ? (
                        <p className="text-xs text-slate-500">
                            Sin líneas todavía.
                        </p>
                    ) : (
                        <ul className="divide-y divide-white/5">
                            {lines.map((l, idx) => (
                                <li
                                    key={`${l.category}-${idx}`}
                                    className="flex items-center justify-between gap-2 py-1.5 text-sm text-slate-300"
                                >
                                    <span className="truncate">{l.label}</span>
                                    <span className="flex items-center gap-3 tabular-nums">
                                        {(
                                            Number(l.amount_cents) / 100
                                        ).toLocaleString("es-ES", {
                                            minimumFractionDigits: 2,
                                        })}{" "}
                                        €
                                        <button
                                            type="button"
                                            className="text-xs font-semibold text-rose-300/90 hover:text-rose-200"
                                            onClick={() =>
                                                setLines((prev) =>
                                                    prev.filter(
                                                        (_, i) => i !== idx,
                                                    ),
                                                )
                                            }
                                        >
                                            Quitar
                                        </button>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </AdminCard>

                {showNotes ? (
                    <AdminFormField
                        as="textarea"
                        label="Notas"
                        inputProps={{
                            value: notes,
                            onChange: (e) => setNotes(e.target.value),
                            rows: 2,
                            placeholder: "Opcional",
                            autoFocus: true,
                        }}
                    />
                ) : (
                    <button
                        type="button"
                        className="text-xs font-semibold text-slate-400 hover:text-slate-200"
                        onClick={() => setShowNotes(true)}
                    >
                        + Añadir nota
                    </button>
                )}
                </div>

                <div className="shrink-0 space-y-2 border-t border-white/10 bg-slate-900/95 px-5 py-4 sm:px-6">
                    <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-200">
                            Total ticket
                        </span>
                        <span className="text-lg font-bold tabular-nums text-white">
                            {(linesTotal / 100).toLocaleString("es-ES", {
                                minimumFractionDigits: 2,
                            })}{" "}
                            €
                            {mode === "tpv" && fixedAmountCents != null ? (
                                <span className="ml-2 text-xs font-normal text-slate-400">
                                    (cobro TPV:{" "}
                                    {(
                                        Number(fixedAmountCents) / 100
                                    ).toLocaleString("es-ES", {
                                        minimumFractionDigits: 2,
                                    })}{" "}
                                    €)
                                </span>
                            ) : null}
                        </span>
                    </div>
                    {tpvMismatch ? (
                        <p className="text-xs text-amber-300">
                            {tpvMismatchDiffCents > 0
                                ? `Faltan ${(tpvMismatchDiffCents / 100).toLocaleString("es-ES", { minimumFractionDigits: 2 })} € en líneas para llegar al cobro TPV.`
                                : `Sobran ${(Math.abs(tpvMismatchDiffCents) / 100).toLocaleString("es-ES", { minimumFractionDigits: 2 })} € en líneas respecto al cobro TPV.`}
                        </p>
                    ) : null}
                    <div className="flex justify-end gap-2 pt-1">
                        <AdminButton
                            type="button"
                            variant="ghost"
                            disabled={busy}
                            onClick={onClose}
                        >
                            Cancelar
                        </AdminButton>
                        <AdminButton
                            type="submit"
                            disabled={busy || lines.length === 0 || tpvMismatch}
                        >
                            {mode === "cash"
                                ? "Cobrar ticket"
                                : "Conciliar ticket"}
                        </AdminButton>
                    </div>
                </div>
            </form>
        </div>
    );
}
