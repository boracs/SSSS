import { Head, router, useForm, usePage } from "@inertiajs/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useMemo, useState, useEffect } from "react";
import { toast } from "react-toastify";
import {
    formatDateTimeMadrid,
    formatMonthYearMadridFromYearMonth,
    formatTimeMadrid,
    isPastCalendarDayMadrid,
    todayYmdInMadrid,
    toYmdInMadrid,
} from "../../../lib/madridTime";
import { MODALITY_FILTERS, modalityMeta, resolveModality } from "../../../lib/classManagerModality";
import ClassManagerCalendarDay from "../../../components/Academy/ClassManagerCalendarDay";
import StaffAvatar from "../../../components/Academy/StaffAvatar";
import TimePicker24h from "../../../components/Academy/TimePicker24h";
import ClassGuestEnrollmentModal from "../../../components/Academy/ClassGuestEnrollmentModal";
import ConfirmPaymentModal from "../../../components/Academy/ConfirmPaymentModal";
import CancelLessonContactsPanel from "../../../components/Academy/CancelLessonContactsPanel";
import LessonStaffAssignFields from "../../../components/Academy/LessonStaffAssignFields";
import StaffConflictAlert from "../../../components/Academy/StaffConflictAlert";
import { emptyGuestForm } from "../../../lib/guestEnrollment";
import { getStaffAssignConflict } from "../../../lib/staffAssignValidation";

/** Recarga suave tras mutaciones: solo clases y stats, sin resetear filtros ni UI local. */
const CALENDAR_PARTIAL_RELOAD = {
    preserveScroll: true,
    preserveState: true,
    only: ["lessons", "monthStats"],
};

export default function ClassManagerIndex({
    month,
    lessons = [],
    staff = [],
    selectedDay: selectedDayProp = null,
    monthStats = {},
}) {
    const [monthCursor, setMonthCursor] = useState(month || todayYmdInMadrid().slice(0, 7));
    const [modalityFilter, setModalityFilter] = useState("all");
    const [monitorFilter, setMonitorFilter] = useState(null);
    const [selectedDate, setSelectedDate] = useState(selectedDayProp);
    const [createPickerOpen, setCreatePickerOpen] = useState(false);
    const [createPickerDate, setCreatePickerDate] = useState(null);

    useEffect(() => {
        setSelectedDate(selectedDayProp);
    }, [selectedDayProp]);

    const filteredLessons = useMemo(() => {
        let out = lessons;
        if (modalityFilter !== "all") {
            out = out.filter((l) => resolveModality(l) === modalityFilter);
        }
        if (monitorFilter !== null) {
            out = out.filter((l) => Number(l.monitor_id) === Number(monitorFilter));
        }
        return out;
    }, [lessons, modalityFilter, monitorFilter]);

    const toggleMonitorFilter = (staffId) => {
        setMonitorFilter((current) => (current === staffId ? null : staffId));
    };

    const [availability, setAvailability] = useState(null);
    const [checkingAvailability, setCheckingAvailability] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerModality, setDrawerModality] = useState(null);
    const [editingLessonId, setEditingLessonId] = useState(null);
    const [staffPool, setStaffPool] = useState({ available: staff || [], occupied: [] });
    const [loadingMonth, setLoadingMonth] = useState(false);
    const [pendingDeleteLesson, setPendingDeleteLesson] = useState(null);
    const [deleteProcessing, setDeleteProcessing] = useState(false);
    const [timeNotice, setTimeNotice] = useState("");
    const [availabilityError, setAvailabilityError] = useState("");
    const [scheduleConflict, setScheduleConflict] = useState(null);
    const [scheduleWarning, setScheduleWarning] = useState("");
    const [overlapModalOpen, setOverlapModalOpen] = useState(false);
    const [forceCreateProcessing, setForceCreateProcessing] = useState(false);
    const [guestModal, setGuestModal] = useState({ open: false, mode: "create", lesson: null, enrollment: null });
    const [paymentConfirm, setPaymentConfirm] = useState({ open: false, enrollment: null, nextStatus: "confirmed" });
    const [quotaDeny, setQuotaDeny] = useState({ open: false, enrollment: null });
    const [guestProcessing, setGuestProcessing] = useState(false);
    const [createParticipants, setCreateParticipants] = useState([]);
    const { flash } = usePage().props;

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash?.success, flash?.error]);

    const form = useForm({
        date: "",
        time: "",
        duration_minutes: 90,
        level: "iniciacion",
        monitor_id: "",
        monitor_2_id: "",
        has_photographer: false,
        photographer_id: "",
        location: "Zurriola",
        max_capacity: 12,
        force_create: false,
    });

    const academyForm = useForm({
        date: "",
        time: "",
        duration_minutes: 90,
        level: "iniciacion",
        modality: "grupal",
        max_slots: 6,
        weekly_start: "",
        weekly_end: "",
        booker_first_name: "",
        booker_last_name: "",
        booker_phone: "",
        monitor_id: "",
        monitor_2_id: "",
        has_photographer: false,
        photographer_id: "",
    });

    const [year, monthNum] = useMemo(() => {
        const p = monthCursor.split("-").map((n) => Number(n));
        return [p[0] || 1970, p[1] || 1];
    }, [monthCursor]);

    const monthLabel = useMemo(() => formatMonthYearMadridFromYearMonth(year, monthNum), [year, monthNum]);

    const vipStaffConflict = useMemo(
        () => getStaffAssignConflict({
            monitorId: form.data.monitor_id,
            monitor2Id: form.data.monitor_2_id,
            hasPhotographer: form.data.has_photographer,
            photographerId: form.data.photographer_id,
        }),
        [form.data.monitor_id, form.data.monitor_2_id, form.data.has_photographer, form.data.photographer_id],
    );

    const academyStaffConflict = useMemo(
        () => (editingLessonId ? getStaffAssignConflict({
            monitorId: academyForm.data.monitor_id,
            monitor2Id: academyForm.data.monitor_2_id,
            hasPhotographer: academyForm.data.has_photographer,
            photographerId: academyForm.data.photographer_id,
        }) : null),
        [
            editingLessonId,
            academyForm.data.monitor_id,
            academyForm.data.monitor_2_id,
            academyForm.data.has_photographer,
            academyForm.data.photographer_id,
        ],
    );

    const firstDayMondayBased = useMemo(() => {
        const d = new Date(Date.UTC(year, monthNum - 1, 1, 12, 0, 0));
        return (d.getUTCDay() + 6) % 7;
    }, [year, monthNum]);

    const daysInMonth = useMemo(
        () => new Date(Date.UTC(year, monthNum, 0, 12, 0, 0)).getUTCDate(),
        [year, monthNum],
    );

    const lessonsByDate = useMemo(() => {
        const out = {};
        for (const lesson of filteredLessons) {
            if (!lesson?.starts_at) continue;
            const key = toYmdInMadrid(lesson.starts_at);
            if (!out[key]) out[key] = [];
            out[key].push(lesson);
        }
        Object.keys(out).forEach((k) => {
            out[k].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
        });
        return out;
    }, [filteredLessons]);

    const cells = useMemo(() => {
        const list = [];
        const prevMonth = monthNum === 1 ? 12 : monthNum - 1;
        const prevYear = monthNum === 1 ? year - 1 : year;
        const prevMonthDays = new Date(Date.UTC(prevYear, prevMonth, 0, 12, 0, 0)).getUTCDate();

        for (let i = 0; i < firstDayMondayBased; i += 1) {
            const day = prevMonthDays - firstDayMondayBased + i + 1;
            const iso = `${prevYear}-${String(prevMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            list.push({ iso, dayNumber: day, current: false, entries: lessonsByDate[iso] || [] });
        }
        for (let d = 1; d <= daysInMonth; d += 1) {
            const iso = `${year}-${String(monthNum).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            list.push({ iso, dayNumber: d, current: true, entries: lessonsByDate[iso] || [] });
        }
        let nextY = year;
        let nextM = monthNum + 1;
        if (nextM > 12) {
            nextM = 1;
            nextY += 1;
        }
        let nd = 1;
        while (list.length < 42) {
            const iso = `${nextY}-${String(nextM).padStart(2, "0")}-${String(nd).padStart(2, "0")}`;
            list.push({ iso, dayNumber: nd, current: false, entries: lessonsByDate[iso] || [] });
            nd += 1;
        }
        return list;
    }, [year, monthNum, firstDayMondayBased, daysInMonth, lessonsByDate]);

    const goMonth = (delta) => {
        let y = year;
        let m = monthNum + delta;
        while (m > 12) {
            m -= 12;
            y += 1;
        }
        while (m < 1) {
            m += 12;
            y -= 1;
        }
        const next = `${y}-${String(m).padStart(2, "0")}`;
        setMonthCursor(next);
        router.get(route("admin.class-manager.index"), { month: next, day: selectedDate || undefined }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            onStart: () => setLoadingMonth(true),
            onFinish: () => setLoadingMonth(false),
        });
    };

    const submit = async (e) => {
        e.preventDefault();
        const minDurationOk = Number(form.data.duration_minutes || 90) >= 60;
        if (!minDurationOk) return;
        if (vipStaffConflict) {
            toast.error(vipStaffConflict);
            return;
        }
        if (scheduleConflict) {
            toast.error("Hay un conflicto de monitores en la hora seleccionada.");
            return;
        }
        if (editingLessonId) {
            form.patch(route("admin.vip-manager.lessons.update", editingLessonId), {
                ...CALENDAR_PARTIAL_RELOAD,
                onSuccess: () => {
                    toast.success("Clase actualizada con éxito.");
                    setEditingLessonId(null);
                    setAvailability(null);
                    setDrawerOpen(false);
                },
            });
            return;
        }

        let latestAvailability = availability;
        if (form.data.date && form.data.time) {
            latestAvailability = await checkAvailability(form.data.date, form.data.time, 0, {
                duration_minutes: Number(form.data.duration_minutes || 90),
            });
        }

        const shouldWarnOverlap =
            form.data.time &&
            Number(latestAvailability?.max_capacity ?? 12) === 0 &&
            (
                (Array.isArray(latestAvailability?.conflicts) && latestAvailability.conflicts.length > 0)
                || (Array.isArray(latestAvailability?.occupied_staff) && latestAvailability.occupied_staff.length > 0)
            );

        if (shouldWarnOverlap) {
            setOverlapModalOpen(true);
            return;
        }

        form.post(route("admin.vip-manager.lessons.store"), {
            ...CALENDAR_PARTIAL_RELOAD,
            onSuccess: () => {
                toast.success("Clase VIP creada con éxito.");
                form.reset("time", "monitor_id", "monitor_2_id", "photographer_id");
                setAvailability(null);
                setDrawerOpen(false);
            },
        });
    };

    const forceCreateWithConflict = () => {
        if (forceCreateProcessing) return;
        setForceCreateProcessing(true);
        form.setData("force_create", true);
        form.post(route("admin.vip-manager.lessons.store"), {
            ...CALENDAR_PARTIAL_RELOAD,
            onSuccess: () => {
                toast.success("Clase VIP creada con éxito.");
                setOverlapModalOpen(false);
                form.reset("time", "monitor_id", "monitor_2_id", "photographer_id");
                setAvailability(null);
                setDrawerOpen(false);
            },
            onFinish: () => {
                form.setData("force_create", false);
                setForceCreateProcessing(false);
            },
        });
    };

    const enterEditMode = (entry) => {
        if (isPastEntry(entry) || entry?.status !== "scheduled") return;

        const start = entry?.starts_at ? new Date(entry.starts_at) : null;
        if (!start) return;
        const date = toYmdInMadrid(start);
        const time = formatTimeMadrid(start);
        const end = entry?.ends_at ? new Date(entry.ends_at) : null;
        const durationMinutes = end ? Math.max(30, Math.round((end.getTime() - start.getTime()) / 60000)) : 90;
        const modality = resolveModality(entry);

        setEditingLessonId(Number(entry.id));
        setSelectedDate(date);
        setDrawerOpen(true);

        if (modality === "vip") {
            setDrawerModality("vip");
            form.setData({
                date,
                time,
                duration_minutes: [60, 90].includes(durationMinutes) ? durationMinutes : 90,
                level: entry?.level || "iniciacion",
                monitor_id: entry?.monitor_id ? String(entry.monitor_id) : "",
                monitor_2_id: entry?.monitor_2_id ? String(entry.monitor_2_id) : "",
                has_photographer: Boolean(entry?.has_photographer),
                photographer_id: entry?.photographer_id ? String(entry.photographer_id) : "",
                location: entry?.location || "Zurriola",
                max_capacity: Number(entry?.max_capacity || 12),
            });
            checkAvailability(date, time, Number(entry.id));
            return;
        }

        setDrawerModality(modality);
        academyForm.setData({
            date,
            time,
            duration_minutes: [60, 90].includes(durationMinutes) ? durationMinutes : 90,
            level: entry?.level || "iniciacion",
            modality,
            max_slots: Number(entry?.max_capacity || entry?.max_slots || 6),
            weekly_start: date,
            weekly_end: date,
            monitor_id: entry?.monitor_id ? String(entry.monitor_id) : "",
            monitor_2_id: entry?.monitor_2_id ? String(entry.monitor_2_id) : "",
            has_photographer: Boolean(entry?.has_photographer),
            photographer_id: entry?.photographer_id ? String(entry.photographer_id) : "",
        });
        checkAcademySchedule(date, time, Number(entry.id));
    };

    const cancelEditMode = () => {
        setEditingLessonId(null);
        setDrawerModality(null);
        setAvailability(null);
        setScheduleConflict(null);
        setScheduleWarning("");
        setTimeNotice("");
        setDrawerOpen(false);
    };

    const isPastEntry = (entry) => {
        const startsAt = entry?.starts_at ? new Date(entry.starts_at) : null;
        return startsAt ? startsAt.getTime() < Date.now() : false;
    };

    const getDurationValidationMessage = () => {
        if (!form.data.time) return "";
        const duration = Number(form.data.duration_minutes || 90);
        const minDuration = 60;
        if (duration >= minDuration) return "";
        return "La duración mínima de una sesión es de 1 hora.";
    };

    const hasAvailability = availability && Number.isFinite(Number(availability?.max_capacity));
    const resolvedMaxCapacity = hasAvailability ? Number(availability.max_capacity) : null;

    const applyScheduleAvailabilityResponse = (data, ok) => {
        if (data?.conflict_detail) {
            setScheduleConflict(data.conflict_detail);
            setScheduleWarning("");
            return;
        }

        setScheduleConflict(null);
        if (ok && data?.message) {
            setScheduleWarning(String(data.message));
        } else {
            setScheduleWarning("");
        }
    };

    const checkAvailability = async (dateValue, timeValue, excludeLessonId = 0, overrides = {}) => {
        if (!dateValue || !timeValue) return null;
        setCheckingAvailability(true);
        setAvailabilityError("");
        setScheduleConflict(null);
        setScheduleWarning("");
        try {
            const durationMinutes = Number(overrides.duration_minutes ?? form.data.duration_minutes ?? 90);
            const url = route("admin.vip-manager.check-availability", {
                date: dateValue,
                time: timeValue,
                duration_minutes: durationMinutes,
                projected_party_size: Number(overrides.projected_party_size ?? form.data.max_capacity ?? 12),
                exclude_lesson_id: excludeLessonId || undefined,
            });
            const res = await fetch(url, { headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" } });
            const contentType = res.headers.get("content-type") || "";
            if (!contentType.includes("application/json")) {
                setAvailabilityError("Respuesta no válida del servidor al comprobar disponibilidad.");
                setAvailability(null);
                return null;
            }
            const data = await res.json();
            setAvailability(data);
            setStaffPool(data?.staff || { available: [], occupied: [] });
            form.setData("max_capacity", Number(data?.max_capacity ?? 12));
            applyScheduleAvailabilityResponse(data, res.ok);
            if (!res.ok && !data?.conflict_detail) {
                setAvailabilityError(data?.message || "No se pudo comprobar la disponibilidad.");
            }
            return data;
        } finally {
            setCheckingAvailability(false);
        }
    };

    const checkAcademySchedule = async (dateValue, timeValue, excludeLessonId = 0, overrides = {}) => {
        if (!dateValue || !timeValue) return null;
        setCheckingAvailability(true);
        setAvailabilityError("");
        setScheduleConflict(null);
        setScheduleWarning("");
        try {
            const durationMinutes = Number(overrides.duration_minutes ?? academyForm.data.duration_minutes ?? 90);
            const maxSlots = Number(overrides.max_slots ?? academyForm.data.max_slots ?? 6);
            const url = route("admin.academy.check-availability", {
                date: dateValue,
                time: timeValue,
                duration_minutes: durationMinutes,
                projected_party_size: maxSlots,
                exclude_lesson_id: excludeLessonId || undefined,
            });
            const res = await fetch(url, { headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" } });
            const contentType = res.headers.get("content-type") || "";
            if (!contentType.includes("application/json")) {
                setAvailabilityError("Respuesta no válida del servidor al comprobar disponibilidad.");
                return null;
            }
            const data = await res.json();
            applyScheduleAvailabilityResponse(data, res.ok);
            if (!res.ok && !data?.conflict_detail) {
                setAvailabilityError(data?.message || "No se pudo comprobar la disponibilidad.");
            }
            return data;
        } finally {
            setCheckingAvailability(false);
        }
    };

    const selectDay = (iso, { openCreate = false } = {}) => {
        setSelectedDate(iso);
        router.get(route("admin.class-manager.index"), { month: monthCursor, day: iso }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
        if (openCreate && !isPastCalendarDayMadrid(iso)) {
            setCreatePickerDate(iso);
            setCreatePickerOpen(true);
        }
    };

    const openCreateDrawer = (iso) => {
        if (isPastCalendarDayMadrid(iso)) return;
        setCreatePickerDate(iso);
        setCreatePickerOpen(true);
    };

    const openVipCreateDrawer = (iso) => {
        setCreatePickerOpen(false);
        setSelectedDate(iso);
        setEditingLessonId(null);
        setDrawerModality("vip");
        setAvailability(null);
        setStaffPool({ available: staff || [], occupied: [] });
        form.setData({
            date: iso,
            time: "",
            duration_minutes: 90,
            level: "iniciacion",
            monitor_id: "",
            monitor_2_id: "",
            has_photographer: false,
            photographer_id: "",
            location: "Zurriola",
            max_capacity: 12,
            force_create: false,
        });
        setDrawerOpen(true);
    };

    const openAcademyCreateDrawer = (iso, modality) => {
        setCreatePickerOpen(false);
        setSelectedDate(iso);
        setEditingLessonId(null);
        setCreateParticipants([]);
        setDrawerModality(modality);
        setAvailability(null);
        academyForm.setData({
            date: iso,
            time: "",
            duration_minutes: 90,
            level: "iniciacion",
            modality,
            max_slots: modality === "particular" ? 6 : 6,
            weekly_start: iso,
            weekly_end: iso,
        });
        setDrawerOpen(true);
    };

    const submitAcademy = (e) => {
        e.preventDefault();
        const duration = Number(academyForm.data.duration_minutes || 90);
        if (duration < 60 || !academyForm.data.time) return;
        if (academyStaffConflict) {
            toast.error(academyStaffConflict);
            return;
        }
        if (scheduleConflict) {
            toast.error("Hay un conflicto de monitores en la hora seleccionada.");
            return;
        }

        const schedulePayload = {
            starts_at: `${academyForm.data.date} ${academyForm.data.time}:00`,
            duration_minutes: Number(academyForm.data.duration_minutes || 90),
            level: academyForm.data.level,
            max_slots: Number(academyForm.data.max_slots || 6),
        };

        if (editingLessonId) {
            schedulePayload.monitor_id = academyForm.data.monitor_id || null;
            schedulePayload.monitor_2_id = academyForm.data.monitor_2_id || null;
            schedulePayload.has_photographer = Boolean(academyForm.data.has_photographer);
            schedulePayload.photographer_id = academyForm.data.has_photographer
                ? (academyForm.data.photographer_id || null)
                : null;
        }

        const resetTransform = () => {
            academyForm.transform((d) => d);
        };

        if (editingLessonId) {
            academyForm.transform(() => schedulePayload);
            academyForm.put(route("admin.academy.lessons.update", editingLessonId), {
                ...CALENDAR_PARTIAL_RELOAD,
                onSuccess: () => {
                    toast.success("Clase actualizada con éxito.");
                    academyForm.reset();
                    cancelEditMode();
                },
                onFinish: resetTransform,
            });
            return;
        }

        academyForm.transform((data) => ({
            ...schedulePayload,
            modality: data.modality,
            weekly_start: data.modality === "semanal" ? data.weekly_start : undefined,
            weekly_end: data.modality === "semanal" ? data.weekly_end : undefined,
            booker_first_name: data.booker_first_name || undefined,
            booker_last_name: data.booker_last_name || undefined,
            booker_phone: data.booker_phone || undefined,
            participants: createParticipants.filter((p) => p.first_name?.trim() && p.last_name?.trim()),
        }));
        academyForm.post(route("admin.academy.lessons.store"), {
            ...CALENDAR_PARTIAL_RELOAD,
            onSuccess: () => {
                toast.success("Clase creada con éxito.");
                academyForm.reset();
                setCreateParticipants([]);
                setDrawerOpen(false);
                setDrawerModality(null);
            },
            onFinish: resetTransform,
        });
    };

    const goAcademyConsole = (iso) => {
        const params = { date: iso };
        router.get(route("admin.academy.index"), params, { preserveScroll: false });
    };

    const requestDeleteLesson = (entry) => {
        setPendingDeleteLesson(entry || null);
    };

    const cancelDeleteLesson = () => {
        if (deleteProcessing) return;
        setPendingDeleteLesson(null);
    };

    const confirmDeleteLesson = () => {
        const lesson = pendingDeleteLesson;
        const lessonId = Number(lesson?.id || 0);
        if (lessonId <= 0 || deleteProcessing) return;

        setDeleteProcessing(true);
        const isVip = resolveModality(lesson) === "vip";
        const onFinish = () => {
            setDeleteProcessing(false);
            setPendingDeleteLesson(null);
        };

        if (isVip) {
            router.delete(route("admin.vip-manager.lessons.destroy", lessonId), {
                ...CALENDAR_PARTIAL_RELOAD,
                onSuccess: () => toast.success("Clase eliminada con éxito."),
                onFinish,
            });
            return;
        }

        router.post(route("admin.academy.lessons.cancel", lessonId), {}, {
            ...CALENDAR_PARTIAL_RELOAD,
            onSuccess: () => toast.success("Clase cancelada con éxito."),
            onFinish,
        });
    };

    const drawerTitle = useMemo(() => {
        const dateLabel = academyForm.data.date || form.data.date || selectedDate || createPickerDate || "";
        if (drawerModality === "vip") {
            return editingLessonId ? `Editar clase VIP #${editingLessonId}` : `Crear clase VIP · ${dateLabel}`;
        }
        if (drawerModality) {
            const meta = modalityMeta({ modality: drawerModality });
            if (editingLessonId) {
                return `Editar ${meta.label.toLowerCase()} #${editingLessonId}`;
            }
            return `Crear ${meta.label.toLowerCase()} · ${dateLabel}`;
        }
        return "Gestionar clase";
    }, [drawerModality, editingLessonId, academyForm.data.date, form.data.date, selectedDate, createPickerDate]);

    const openAddGuest = (lesson) => {
        setGuestModal({ open: true, mode: "create", lesson, enrollment: null });
    };

    const openEditGuest = (lesson, enrollment) => {
        setGuestModal({ open: true, mode: "edit", lesson, enrollment });
    };

    const closeGuestModal = () => {
        if (guestProcessing) return;
        setGuestModal({ open: false, mode: "create", lesson: null, enrollment: null });
    };

    const submitGuestForm = (formData) => {
        const lesson = guestModal.lesson;
        if (!lesson?.id || guestProcessing) return;
        setGuestProcessing(true);

        const onFinish = () => setGuestProcessing(false);
        const onSuccess = () => {
            closeGuestModal();
        };

        if (guestModal.mode === "edit" && guestModal.enrollment?.id) {
            router.patch(route("admin.class-manager.guest-enrollments.update", guestModal.enrollment.id), formData, {
                ...CALENDAR_PARTIAL_RELOAD,
                onSuccess,
                onFinish,
            });
            return;
        }

        router.post(route("admin.class-manager.guest-enrollments.store", lesson.id), formData, {
            ...CALENDAR_PARTIAL_RELOAD,
            onSuccess,
            onFinish,
        });
    };

    const requestPaymentChange = (enrollment, nextStatus) => {
        setPaymentConfirm({ open: true, enrollment, nextStatus });
    };

    const confirmPaymentChange = () => {
        const { enrollment, nextStatus } = paymentConfirm;
        if (!enrollment?.id || guestProcessing) return;
        setGuestProcessing(true);
        router.patch(route("admin.class-manager.guest-enrollments.payment", enrollment.id), {
            payment_status: nextStatus,
        }, {
            ...CALENDAR_PARTIAL_RELOAD,
            onSuccess: () => {
                setPaymentConfirm({ open: false, enrollment: null, nextStatus: "confirmed" });
            },
            onFinish: () => setGuestProcessing(false),
        });
    };

    const removeGuest = (lesson, enrollment) => {
        if (!enrollment?.id || !window.confirm(`¿Quitar a ${enrollment.name} de esta clase?`)) return;
        router.delete(route("admin.class-manager.guest-enrollments.destroy", enrollment.id), {
            ...CALENDAR_PARTIAL_RELOAD,
        });
    };

    const approveQuota = (_lesson, enrollment) => {
        if (!enrollment?.id || guestProcessing) return;
        setGuestProcessing(true);
        router.post(route("admin.class-manager.guest-enrollments.approve-quota", enrollment.id), {}, {
            ...CALENDAR_PARTIAL_RELOAD,
            onFinish: () => setGuestProcessing(false),
        });
    };

    const requestDenyQuota = (_lesson, enrollment) => {
        setQuotaDeny({ open: true, enrollment });
    };

    const confirmDenyQuota = () => {
        const { enrollment } = quotaDeny;
        if (!enrollment?.id || guestProcessing) return;
        setGuestProcessing(true);
        router.post(route("admin.class-manager.guest-enrollments.deny-quota", enrollment.id), {}, {
            ...CALENDAR_PARTIAL_RELOAD,
            onSuccess: () => setQuotaDeny({ open: false, enrollment: null }),
            onFinish: () => setGuestProcessing(false),
        });
    };

    const addCreateParticipantRow = () => {
        setCreateParticipants((rows) => [...rows, emptyGuestForm()]);
    };

    const updateCreateParticipant = (index, key, value) => {
        setCreateParticipants((rows) => rows.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
    };

    const removeCreateParticipant = (index) => {
        setCreateParticipants((rows) => rows.filter((_, i) => i !== index));
    };

    const currentMonthCells = useMemo(() => cells.filter((c) => c.current), [cells]);

    const renderCalendarDay = (cell, layout) => {
        const isPast = cell.current && isPastCalendarDayMadrid(cell.iso);
        const isTodayCell = cell.iso === todayYmdInMadrid();
        const isSelectedDay = selectedDate === cell.iso;
        const canCreateHere = cell.current && !isPast;
        const visibleEntries = cell.entries;

        return (
            <ClassManagerCalendarDay
                key={`${layout}-${cell.iso}`}
                cell={cell}
                layout={layout}
                isPast={isPast}
                isTodayCell={isTodayCell}
                isSelectedDay={isSelectedDay}
                canCreateHere={canCreateHere}
                visibleEntries={visibleEntries}
                isPastEntry={isPastEntry}
                onSelectDay={selectDay}
                onCreate={openCreateDrawer}
                onEdit={enterEditMode}
                onDelete={requestDeleteLesson}
                onAddGuest={openAddGuest}
                onEditGuest={openEditGuest}
                onRequestPaymentChange={requestPaymentChange}
                onRemoveGuest={removeGuest}
                onApproveQuota={approveQuota}
                onDenyQuota={requestDenyQuota}
            />
        );
    };

    return (
        <>
            <Head title="Admin · Gestor de clases" />
            <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-400">Admin · Academia S4</p>
                        <h1 className="text-2xl font-bold text-white sm:text-3xl">Gestor de clases</h1>
                        <p className="mt-1 max-w-xl text-sm text-gray-500">
                            Calendario unificado: VIP, grupales, semanales y particulares.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-center">
                        {[
                            { key: "total", label: "Mes", value: monthStats.total ?? filteredLessons.length },
                            { key: "vip", label: "VIP", value: monthStats.vip ?? 0, color: "text-violet-300" },
                            { key: "grupal", label: "Grup.", value: monthStats.grupal ?? 0, color: "text-emerald-300" },
                            { key: "semanal", label: "Sem.", value: monthStats.semanal ?? 0, color: "text-sky-300" },
                            { key: "particular", label: "Part.", value: monthStats.particular ?? 0, color: "text-amber-300" },
                        ].map((s) => (
                            <div key={s.key} className="min-w-[52px] rounded-xl border border-white/10 bg-gray-900/80 px-2.5 py-1.5">
                                <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-500">{s.label}</p>
                                <p className={`text-lg font-extrabold ${s.color || "text-white"}`}>{s.value}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-gray-900/60 p-3 sm:p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Filtrar por tipo</p>
                        <div className="flex flex-wrap gap-1.5">
                            {MODALITY_FILTERS.map((f) => (
                                <button
                                    key={f.id}
                                    type="button"
                                    onClick={() => setModalityFilter(f.id)}
                                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition sm:text-xs ${
                                        modalityFilter === f.id
                                            ? "bg-cyan-600 text-white shadow-sm shadow-cyan-950/30"
                                            : "border border-white/10 bg-gray-950/60 text-gray-400 hover:bg-white/5 hover:text-gray-200"
                                    }`}
                                >
                                    {f.dot ? <span className={`h-2 w-2 rounded-full ${f.dot}`} aria-hidden /> : null}
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    {staff.length > 0 ? (
                        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/5 pt-3">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Monitores</span>
                            {monitorFilter !== null ? (
                                <button
                                    type="button"
                                    onClick={() => setMonitorFilter(null)}
                                    className="rounded-lg border border-white/10 bg-gray-950/60 px-2 py-1 text-[10px] font-semibold text-gray-400 hover:text-gray-200"
                                >
                                    Todos
                                </button>
                            ) : null}
                            {staff.map((s) => {
                                const active = monitorFilter === s.id;
                                return (
                                    <button
                                        key={s.id}
                                        type="button"
                                        onClick={() => toggleMonitorFilter(s.id)}
                                        title={active ? `Quitar filtro · ${s.name}` : `Ver clases de ${s.name}`}
                                        className={`inline-flex items-center gap-1 rounded-full border py-0.5 pl-0.5 pr-2 transition ${
                                            active
                                                ? "border-cyan-500/60 bg-cyan-950/40 ring-1 ring-cyan-500/40"
                                                : "border-white/10 bg-gray-950/50 hover:border-white/20 hover:bg-white/5"
                                        }`}
                                    >
                                        <StaffAvatar
                                            initials={s.initials}
                                            color={s.color}
                                            textColor={s.text_color}
                                            size="xs"
                                        />
                                        <span className={`max-w-[5.5rem] truncate text-[10px] ${active ? "font-semibold text-cyan-100" : "text-gray-300"}`}>
                                            {s.name.split(" ")[0]}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 border-t border-white/5 pt-2 text-[10px] text-gray-500">
                        <span className="inline-flex items-center gap-1.5">
                            <span className="h-3 w-3 rounded border border-amber-500/50" aria-hidden />
                            Borde naranja = 1 monitor libre (máx. 6)
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <span className="h-3 w-3 rounded border border-rose-500/50" aria-hidden />
                            Borde rojo = sin monitores
                        </span>
                        <span className="text-gray-600">Clic en la clase para ver detalle</span>
                    </div>
                </div>

                <section className="rounded-xl border border-white/5 bg-gray-900 p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between">
                        <button type="button" onClick={() => goMonth(-1)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-gray-800 text-base font-semibold text-gray-300 transition-all duration-200 ease-in-out hover:text-white hover:bg-white/10">
                            ◀
                        </button>
                        <p className="text-sm font-semibold capitalize text-white">{monthLabel}</p>
                        <button type="button" onClick={() => goMonth(1)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-gray-800 text-base font-semibold text-gray-300 transition-all duration-200 ease-in-out hover:text-white hover:bg-white/10">
                            ▶
                        </button>
                    </div>

                    <div className="mb-2 hidden grid-cols-7 gap-2 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-500 xl:grid">
                        {["L", "M", "X", "J", "V", "S", "D"].map((d) => <span key={d}>{d}</span>)}
                    </div>

                    {/* Móvil y tablet: un día por fila (evita recortes en columnas estrechas) */}
                    <div className={`flex flex-col gap-1.5 xl:hidden ${loadingMonth ? "opacity-60" : "opacity-100"}`}>
                        {currentMonthCells.map((cell) => renderCalendarDay(cell, "list"))}
                    </div>

                    {/* Escritorio ancho: calendario mensual 7 columnas */}
                    <div className={`hidden grid-cols-7 gap-2 xl:grid ${loadingMonth ? "opacity-60" : "opacity-100"}`}>
                        {cells.map((cell) => renderCalendarDay(cell, "grid"))}
                    </div>
                </section>
            </div>
            {createPickerOpen && createPickerDate ? (
                <div className="fixed inset-0 z-[1150] flex items-center justify-center p-4">
                    <button type="button" className="absolute inset-0 bg-gray-950/75 backdrop-blur-sm" onClick={() => setCreatePickerOpen(false)} aria-label="Cerrar" />
                    <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-gradient-to-b from-gray-800 to-gray-900 p-5 shadow-2xl ring-1 ring-white/10">
                        <h3 className="text-lg font-bold text-white">Nueva clase · {createPickerDate}</h3>
                        <p className="mt-1 text-sm text-gray-400">Elige el tipo de sesión. Se creará desde el gestor.</p>
                        <div className="mt-4 grid gap-2">
                            <button type="button" onClick={() => openVipCreateDrawer(createPickerDate)} className="flex items-center gap-3 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-left hover:bg-violet-500/15">
                                <span className="h-3 w-3 rounded-full bg-violet-400" />
                                <span><span className="block text-sm font-semibold text-violet-100">Clase VIP</span><span className="text-xs text-violet-200/70">Bonos y socios VIP</span></span>
                            </button>
                            {["grupal", "semanal", "particular"].map((mod) => {
                                const meta = modalityMeta({ modality: mod });
                                return (
                                    <button
                                        key={mod}
                                        type="button"
                                        onClick={() => openAcademyCreateDrawer(createPickerDate, mod)}
                                        className="flex items-center gap-3 rounded-xl border border-white/10 bg-gray-900 px-4 py-3 text-left hover:bg-white/5"
                                    >
                                        <span className={`h-3 w-3 rounded-full ${meta.dot}`} />
                                        <span><span className="block text-sm font-semibold text-gray-100">{meta.label}</span><span className="text-xs text-gray-500">Crear en el gestor</span></span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            ) : null}
            {pendingDeleteLesson ? (
                <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
                    <button
                        type="button"
                        className="absolute inset-0 bg-gray-950/70"
                        onClick={cancelDeleteLesson}
                        aria-label="Cerrar modal de cancelación"
                    />
                    <div className="relative z-10 w-full max-w-xl rounded-xl border border-white/5 bg-gradient-to-b from-gray-800 to-gray-900 p-5 shadow-2xl ring-1 ring-white/10">
                        <h3 className="text-lg font-bold text-gray-100">
                            {resolveModality(pendingDeleteLesson) === "vip" ? "Eliminar clase VIP" : "Cancelar clase"}
                        </h3>
                        <p className="mt-1 text-sm text-gray-400">
                            {resolveModality(pendingDeleteLesson) === "vip"
                                ? "Esta acción eliminará la clase y revertirá el consumo de créditos de los alumnos inscritos."
                                : "La clase quedará cancelada. Avisa a los alumnos antes de confirmar si es posible."}
                        </p>
                        <div className="mt-4 rounded-xl border border-gray-700 bg-gray-900 p-3 text-sm text-gray-300">
                            <p><span className="font-semibold">Hora:</span> {pendingDeleteLesson?.starts_at ? formatDateTimeMadrid(pendingDeleteLesson.starts_at) : "—"}</p>
                            <p><span className="font-semibold">Nivel:</span> {pendingDeleteLesson?.level || "—"}</p>
                            <p><span className="font-semibold">Ocupación:</span> {pendingDeleteLesson?.occupancy ?? 0}/{pendingDeleteLesson?.max_capacity ?? 0}</p>
                            <p><span className="font-semibold">Monitor:</span> {pendingDeleteLesson?.monitor_name || "Sin asignar"}</p>
                        </div>
                        <CancelLessonContactsPanel lesson={pendingDeleteLesson} className="mt-4" />
                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={cancelDeleteLesson}
                                disabled={deleteProcessing}
                                className="rounded-xl border border-gray-600 px-4 py-2 text-sm font-semibold text-gray-200 transition-all duration-200 ease-in-out hover:bg-gray-700 disabled:opacity-60"
                            >
                                Volver
                            </button>
                            <button
                                type="button"
                                onClick={confirmDeleteLesson}
                                disabled={deleteProcessing}
                                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 ease-in-out hover:bg-rose-700 disabled:opacity-60"
                            >
                                {deleteProcessing
                                    ? (resolveModality(pendingDeleteLesson) === "vip" ? "Eliminando..." : "Cancelando...")
                                    : (resolveModality(pendingDeleteLesson) === "vip" ? "Eliminar clase" : "Confirmar cancelación")}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
            {drawerOpen ? (
                <div className="fixed inset-0 z-[1100] flex">
                    <button type="button" className="flex-1 bg-gray-950/70 backdrop-blur-md" onClick={cancelEditMode} aria-label="Cerrar panel" />
                    <aside className="h-full w-full max-w-md overflow-y-auto border-l border-white/5 bg-gradient-to-b from-gray-800 to-gray-900 p-4 shadow-2xl ring-1 ring-white/10">
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-100">{drawerTitle}</h2>
                            <button type="button" onClick={cancelEditMode} className="rounded-md p-1 text-gray-300 hover:bg-gray-700">
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        </div>
                        {drawerModality === "vip" ? (
                        <form className="grid grid-cols-1 gap-4" onSubmit={submit}>
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">Hora</label>
                                <TimePicker24h
                                    value={form.data.time}
                                    onChange={(raw) => {
                                        form.setData("time", raw);
                                        setTimeNotice("");
                                        if (!raw) {
                                            setAvailability(null);
                                            setScheduleConflict(null);
                                            setScheduleWarning("");
                                            return;
                                        }
                                        checkAvailability(form.data.date, raw, editingLessonId || 0);
                                    }}
                                    required
                                />
                                <StaffConflictAlert
                                    checking={checkingAvailability}
                                    conflict={scheduleConflict}
                                    warningMessage={!scheduleConflict ? scheduleWarning : ""}
                                    className="mt-2"
                                />
                                {availabilityError ? (
                                    <p className="mt-2 text-xs text-rose-300">{availabilityError}</p>
                                ) : null}
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">Duración</label>
                                <select
                                    value={String(form.data.duration_minutes || 90)}
                                    onChange={(e) => {
                                        const v = e.target.value;
                                        form.setData("duration_minutes", Number(v));
                                        setAvailabilityError("");
                                        if (form.data.time) {
                                            checkAvailability(form.data.date, form.data.time, editingLessonId || 0, {
                                                duration_minutes: Number(v),
                                                projected_party_size: Number(form.data.max_capacity || 12),
                                            });
                                        }
                                    }}
                                    className="w-full rounded-xl border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                >
                                    <option value="60">1 hora</option>
                                    <option value="90">1,5 horas</option>
                                </select>
                            </div>
                            {timeNotice ? (
                                <div className="rounded-xl border border-amber-700 bg-amber-900/30 px-3 py-2 text-xs text-amber-200">
                                    {timeNotice}
                                </div>
                            ) : null}
                            {getDurationValidationMessage() ? (
                                <div className="rounded-xl border border-rose-700 bg-rose-900/30 px-3 py-2 text-xs text-rose-200">
                                    {getDurationValidationMessage()}
                                </div>
                            ) : null}
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">Nivel</label>
                                <select value={form.data.level} onChange={(e) => form.setData("level", e.target.value)} className="w-full rounded-xl border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                                    <option value="iniciacion">Iniciación</option>
                                    <option value="intermedio">Intermedio</option>
                                    <option value="avanzado">Avanzado</option>
                                </select>
                            </div>
                            <LessonStaffAssignFields
                                staff={staff}
                                staffPool={staffPool}
                                monitorId={form.data.monitor_id}
                                monitor2Id={form.data.monitor_2_id}
                                hasPhotographer={form.data.has_photographer}
                                photographerId={form.data.photographer_id}
                                onMonitorChange={(v) => form.setData("monitor_id", v)}
                                onMonitor2Change={(v) => form.setData("monitor_2_id", v)}
                                onHasPhotographerChange={(v) => form.setData("has_photographer", v)}
                                onPhotographerChange={(v) => form.setData("photographer_id", v)}
                            />
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">Plazas</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={12}
                                    value={form.data.max_capacity}
                                    onChange={(e) => {
                                        const maxCapacity = Number(e.target.value);
                                        form.setData("max_capacity", maxCapacity);
                                        if (form.data.time) {
                                            checkAvailability(form.data.date, form.data.time, editingLessonId || 0, {
                                                projected_party_size: maxCapacity,
                                            });
                                        }
                                    }}
                                    className="w-full rounded-xl border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">Ubicación</label>
                                <input
                                    type="text"
                                    value={form.data.location}
                                    onChange={(e) => form.setData("location", e.target.value)}
                                    className="w-full rounded-xl border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                />
                            </div>
                            <div className={`rounded-xl border px-3 py-2 text-sm ${
                                !form.data.time
                                    ? "border-gray-700 bg-gray-900 text-gray-300"
                                    : !hasAvailability
                                        ? "border-gray-700 bg-gray-900 text-gray-300"
                                        : resolvedMaxCapacity === 12
                                            ? "border-emerald-700 bg-emerald-900/20 text-emerald-200"
                                            : resolvedMaxCapacity === 6
                                                ? "border-amber-700 bg-amber-900/20 text-amber-200"
                                                : "border-rose-700 bg-rose-900/20 text-rose-200"
                            }`}>
                                {!form.data.time
                                    ? "Selecciona una hora para calcular la capacidad por ocupación de monitores."
                                    : checkingAvailability
                                        ? "Calculando capacidad por ocupación de monitores..."
                                        : !hasAvailability
                                            ? "Ajusta hora y duración para calcular disponibilidad real."
                                            : (resolvedMaxCapacity === 0
                                                ? (availabilityError || "No quedan monitores disponibles en este horario (se requiere disponibilidad 15 min antes y 15 min después).")
                                                : `Capacidad detectada: ${resolvedMaxCapacity} alumnos por ocupación de monitores`)}
                            </div>
                            {hasAvailability && form.data.time ? (
                                <div className="rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-gray-300">
                                    Ventana operativa calculada:{" "}
                                    <span className="font-semibold">
                                        {availability?.range_start
                                            ? formatDateTimeMadrid(availability.range_start, { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })
                                            : "—"}
                                    </span>
                                    {" - "}
                                    <span className="font-semibold">
                                        {availability?.range_end
                                            ? formatDateTimeMadrid(availability.range_end, { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })
                                            : "—"}
                                    </span>
                                </div>
                            ) : null}
                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={
                                        form.processing
                                        || !!vipStaffConflict
                                        || !!scheduleConflict
                                        || (() => {
                                            return !!getDurationValidationMessage();
                                        })()
                                    }
                                    className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 ease-in-out hover:bg-sky-700 disabled:opacity-60"
                                >
                                    {form.processing ? "Guardando..." : (editingLessonId ? "Guardar modificación" : "Crear clase VIP")}
                                </button>
                            </div>
                        </form>
                        ) : (
                        <form className="grid grid-cols-1 gap-4" onSubmit={submitAcademy}>
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">Hora</label>
                                <TimePicker24h
                                    value={academyForm.data.time}
                                    onChange={(raw) => {
                                        academyForm.setData("time", raw);
                                        setTimeNotice("");
                                        if (!raw) {
                                            setScheduleConflict(null);
                                            setScheduleWarning("");
                                            return;
                                        }
                                        checkAcademySchedule(academyForm.data.date, raw, editingLessonId || 0);
                                    }}
                                    required
                                />
                                <StaffConflictAlert
                                    checking={checkingAvailability}
                                    conflict={scheduleConflict}
                                    warningMessage={!scheduleConflict ? scheduleWarning : ""}
                                    className="mt-2"
                                />
                                {availabilityError ? (
                                    <p className="mt-2 text-xs text-rose-300">{availabilityError}</p>
                                ) : null}
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">Duración</label>
                                <select
                                    value={String(academyForm.data.duration_minutes || 90)}
                                    onChange={(e) => {
                                        const duration = Number(e.target.value);
                                        academyForm.setData("duration_minutes", duration);
                                        if (academyForm.data.time) {
                                            checkAcademySchedule(academyForm.data.date, academyForm.data.time, editingLessonId || 0, {
                                                duration_minutes: duration,
                                            });
                                        }
                                    }}
                                    className="w-full rounded-xl border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                >
                                    <option value="60">1 hora</option>
                                    <option value="90">1,5 horas</option>
                                </select>
                            </div>
                            {timeNotice ? (
                                <div className="rounded-xl border border-amber-700 bg-amber-900/30 px-3 py-2 text-xs text-amber-200">
                                    {timeNotice}
                                </div>
                            ) : null}
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">Nivel</label>
                                <select value={academyForm.data.level} onChange={(e) => academyForm.setData("level", e.target.value)} className="w-full rounded-xl border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                                    <option value="iniciacion">Iniciación</option>
                                    <option value="intermedio">Intermedio</option>
                                    <option value="avanzado">Avanzado</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">Plazas</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={12}
                                    value={academyForm.data.max_slots}
                                    onChange={(e) => {
                                        const maxSlots = Number(e.target.value);
                                        academyForm.setData("max_slots", maxSlots);
                                        if (academyForm.data.time) {
                                            checkAcademySchedule(academyForm.data.date, academyForm.data.time, editingLessonId || 0, {
                                                max_slots: maxSlots,
                                            });
                                        }
                                    }}
                                    className="w-full rounded-xl border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                />
                                {drawerModality === "particular" ? (
                                    <p className="mt-1 text-[11px] text-amber-200/90">
                                        Particular = grupo cerrado (familia/amigos), con plazas configurables.
                                    </p>
                                ) : null}
                            </div>
                            {drawerModality === "semanal" && !editingLessonId ? (
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <div>
                                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">Inicio pack</label>
                                        <input
                                            type="date"
                                            value={academyForm.data.weekly_start}
                                            onChange={(e) => academyForm.setData("weekly_start", e.target.value)}
                                            className="w-full rounded-xl border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-100"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">Fin pack</label>
                                        <input
                                            type="date"
                                            value={academyForm.data.weekly_end}
                                            onChange={(e) => academyForm.setData("weekly_end", e.target.value)}
                                            className="w-full rounded-xl border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-100"
                                            required
                                        />
                                    </div>
                                </div>
                            ) : null}
                            {!editingLessonId ? (
                                <div className="rounded-xl border border-white/10 bg-gray-950/40 p-3">
                                    <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Reserva telefónica (opcional)</p>
                                    <p className="mt-1 text-[10px] text-gray-500">Sin registro en web — solo visible para administración.</p>
                                    <div className="mt-3 grid grid-cols-2 gap-2">
                                        <input
                                            placeholder="Nombre contacto"
                                            value={academyForm.data.booker_first_name}
                                            onChange={(e) => academyForm.setData("booker_first_name", e.target.value)}
                                            className="rounded-lg border border-gray-600 bg-gray-900 px-2 py-1.5 text-sm text-gray-100"
                                        />
                                        <input
                                            placeholder="Apellidos contacto"
                                            value={academyForm.data.booker_last_name}
                                            onChange={(e) => academyForm.setData("booker_last_name", e.target.value)}
                                            className="rounded-lg border border-gray-600 bg-gray-900 px-2 py-1.5 text-sm text-gray-100"
                                        />
                                    </div>
                                    <input
                                        placeholder="Teléfono contacto"
                                        value={academyForm.data.booker_phone}
                                        onChange={(e) => academyForm.setData("booker_phone", e.target.value)}
                                        className="mt-2 w-full rounded-lg border border-gray-600 bg-gray-900 px-2 py-1.5 text-sm text-gray-100"
                                    />
                                    <div className="mt-3 flex items-center justify-between">
                                        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Personas a apuntar</span>
                                        <button type="button" onClick={addCreateParticipantRow} className="text-[10px] font-semibold text-cyan-300 hover:text-cyan-200">
                                            + Añadir
                                        </button>
                                    </div>
                                    {createParticipants.length > 0 ? (
                                        <div className="mt-2 space-y-2">
                                            {createParticipants.map((row, idx) => (
                                                <div key={`create-part-${idx}`} className="rounded-lg border border-white/5 bg-gray-900/80 p-2">
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <input
                                                            placeholder="Nombre"
                                                            value={row.first_name}
                                                            onChange={(e) => updateCreateParticipant(idx, "first_name", e.target.value)}
                                                            className="rounded border border-gray-600 bg-gray-950 px-2 py-1 text-xs text-gray-100"
                                                        />
                                                        <input
                                                            placeholder="Apellidos"
                                                            value={row.last_name}
                                                            onChange={(e) => updateCreateParticipant(idx, "last_name", e.target.value)}
                                                            className="rounded border border-gray-600 bg-gray-950 px-2 py-1 text-xs text-gray-100"
                                                        />
                                                    </div>
                                                    <div className="mt-2 flex gap-2">
                                                        <select
                                                            value={row.payment_status}
                                                            onChange={(e) => updateCreateParticipant(idx, "payment_status", e.target.value)}
                                                            className="flex-1 rounded border border-gray-600 bg-gray-950 px-2 py-1 text-xs text-gray-100"
                                                        >
                                                            <option value="pending">Pago pendiente</option>
                                                            <option value="confirmed">Pagado</option>
                                                        </select>
                                                        <button type="button" onClick={() => removeCreateParticipant(idx)} className="rounded border border-rose-600/40 px-2 text-[10px] text-rose-300">
                                                            Quitar
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : null}
                                </div>
                            ) : null}
                            {editingLessonId ? (
                                <LessonStaffAssignFields
                                    staff={staff}
                                    monitorId={academyForm.data.monitor_id}
                                    monitor2Id={academyForm.data.monitor_2_id}
                                    hasPhotographer={academyForm.data.has_photographer}
                                    photographerId={academyForm.data.photographer_id}
                                    onMonitorChange={(v) => academyForm.setData("monitor_id", v)}
                                    onMonitor2Change={(v) => academyForm.setData("monitor_2_id", v)}
                                    onHasPhotographerChange={(v) => academyForm.setData("has_photographer", v)}
                                    onPhotographerChange={(v) => academyForm.setData("photographer_id", v)}
                                />
                            ) : null}
                            {academyForm.errors && Object.keys(academyForm.errors).length > 0 ? (
                                <div className="rounded-xl border border-rose-700 bg-rose-900/30 px-3 py-2 text-xs text-rose-200">
                                    {Object.values(academyForm.errors).join(" ")}
                                </div>
                            ) : null}
                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={academyForm.processing || !!academyStaffConflict || !!scheduleConflict || !academyForm.data.time || Number(academyForm.data.duration_minutes) < 60}
                                    className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 ease-in-out hover:bg-cyan-700 disabled:opacity-60"
                                >
                                    {academyForm.processing
                                        ? (editingLessonId ? "Guardando..." : "Creando...")
                                        : (editingLessonId ? "Guardar cambios" : "Crear clase")}
                                </button>
                            </div>
                        </form>
                        )}
                    </aside>
                </div>
            ) : null}
            {overlapModalOpen ? (
                <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4">
                    <button
                        type="button"
                        className="absolute inset-0 bg-gray-950/80"
                        onClick={() => setOverlapModalOpen(false)}
                        aria-label="Cerrar aviso de solape"
                    />
                    <div className="relative z-10 w-full max-w-3xl rounded-xl border border-white/10 bg-gradient-to-b from-gray-800 to-gray-900 p-5 shadow-2xl ring-1 ring-white/10">
                        <h3 className="text-lg font-bold text-gray-100">Solape detectado: monitores ocupados</h3>
                        <p className="mt-1 text-sm text-gray-300">
                            Esta clase se solapa con sesiones activas y ahora no hay monitores libres.
                        </p>

                        <div className="mt-4 grid gap-4 lg:grid-cols-2">
                            <div className="rounded-xl border border-amber-700/40 bg-amber-900/20 p-3">
                                <p className="text-xs font-semibold uppercase tracking-wider text-amber-200">Clase(s) en conflicto</p>
                                {Array.isArray(availability?.conflicts) && availability.conflicts.length > 0 ? (
                                    <ul className="mt-2 space-y-2 text-sm text-amber-100">
                                        {availability.conflicts.map((c, idx) => (
                                            <li key={`conflict-${c.lesson_id || idx}`} className="rounded-lg border border-amber-700/30 bg-amber-900/10 px-2 py-1.5">
                                                <p className="font-semibold">{c.title || "Clase"}</p>
                                                <p className="text-xs text-amber-200">
                                                    {c.window_start ? formatDateTimeMadrid(c.window_start) : "—"} - {c.window_end ? formatDateTimeMadrid(c.window_end) : "—"}
                                                </p>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="mt-2 text-sm text-amber-100">No se pudo detallar el conflicto.</p>
                                )}
                            </div>

                            <div className="rounded-xl border border-gray-700 bg-gray-900 p-3">
                                <p className="text-xs font-semibold uppercase tracking-wider text-gray-300">Monitores ocupados</p>
                                {Array.isArray(availability?.occupied_staff) && availability.occupied_staff.length > 0 ? (
                                    <ul className="mt-2 space-y-1 text-sm text-gray-200">
                                        {availability.occupied_staff.map((person) => (
                                            <li key={`busy-${person.id}`} className="rounded-md bg-gray-800 px-2 py-1">
                                                {person.name}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="mt-2 text-sm text-gray-400">Sin detalle de staff ocupado.</p>
                                )}
                            </div>
                        </div>

                        <div className="mt-4 rounded-xl border border-gray-700 bg-gray-900 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-300">Todas las clases de ese día</p>
                            {Array.isArray(availability?.daily_schedule) && availability.daily_schedule.length > 0 ? (
                                <div className="mt-2 max-h-56 overflow-auto space-y-1.5 pr-1">
                                    {availability.daily_schedule.map((entry) => (
                                        <div key={`day-${entry.id}`} className="rounded-lg border border-gray-700 bg-gray-800 px-2 py-1.5 text-xs text-gray-200">
                                            <p className="font-semibold text-gray-100">{entry.title} · {entry.modality}</p>
                                            <p>
                                                {entry.starts_at ? formatDateTimeMadrid(entry.starts_at, { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }) : "—"}
                                                {" - "}
                                                {entry.ends_at ? formatDateTimeMadrid(entry.ends_at, { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }) : "—"}
                                            </p>
                                            <p className="text-gray-300">Monitor: {entry.monitor_name}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="mt-2 text-sm text-gray-400">Sin clases registradas en ese día.</p>
                            )}
                        </div>

                        <div className="mt-5 flex flex-col-reverse justify-end gap-2 sm:flex-row">
                            <button
                                type="button"
                                onClick={() => setOverlapModalOpen(false)}
                                className="rounded-xl border border-gray-600 px-4 py-2 text-sm font-semibold text-gray-200 transition-all duration-200 ease-in-out hover:bg-gray-700"
                            >
                                Modificar hora
                            </button>
                            <button
                                type="button"
                                onClick={forceCreateWithConflict}
                                disabled={forceCreateProcessing}
                                className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 ease-in-out hover:bg-amber-700 disabled:opacity-60"
                            >
                                {forceCreateProcessing ? "Creando..." : "Continuar y crear igualmente"}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
            <ClassGuestEnrollmentModal
                open={guestModal.open}
                mode={guestModal.mode}
                enrollment={guestModal.enrollment}
                onClose={closeGuestModal}
                onSubmit={submitGuestForm}
                processing={guestProcessing}
            />
            <ConfirmPaymentModal
                open={paymentConfirm.open}
                enrollment={paymentConfirm.enrollment}
                nextStatus={paymentConfirm.nextStatus}
                onCancel={() => !guestProcessing && setPaymentConfirm({ open: false, enrollment: null, nextStatus: "confirmed" })}
                onConfirm={confirmPaymentChange}
                processing={guestProcessing}
            />
            {quotaDeny.open ? (
                <div className="fixed inset-0 z-[1400] flex items-center justify-center bg-black/70 p-4">
                    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-gray-900 p-5 shadow-2xl">
                        <h3 className="text-lg font-bold text-white">Denegar solicitud de cupo</h3>
                        <p className="mt-2 text-sm text-gray-300">
                            ¿Denegar la solicitud de{" "}
                            <span className="font-semibold text-white">{quotaDeny.enrollment?.name || "este alumno"}</span>?
                            Se eliminará de la lista de pendientes.
                        </p>
                        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => !guestProcessing && setQuotaDeny({ open: false, enrollment: null })}
                                className="rounded-xl border border-gray-600 px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-800"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={confirmDenyQuota}
                                disabled={guestProcessing}
                                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                            >
                                {guestProcessing ? "Denegando..." : "Confirmar denegación"}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
}

