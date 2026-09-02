import React, { useMemo, useState } from "react";
import { Link, router, usePage } from "@inertiajs/react";
import SeoHead from "../components/seo/SeoHead";
import S4Button from "@/components/S4Button";
import {
    Camera,
    CheckCircle2,
    Image as ImageIcon,
    ArrowRight,
    Aperture,
    X,
} from "lucide-react";

const ACCENT_SUBMIT =
    "w-full rounded-xl bg-gradient-to-r from-fuchsia-500 to-pink-400 font-bold text-white disabled:opacity-60";
const RESERVE_PILL =
    "rounded-full bg-fuchsia-500/15 font-semibold text-fuchsia-200 ring-1 ring-fuchsia-400/30 hover:bg-fuchsia-500/25";

function formatPrice(euros) {
    const n = Number(euros);
    if (!Number.isFinite(n)) return "—";
    return `${n.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €`;
}

function durationLabel(minutes) {
    const m = Number(minutes);
    if (!Number.isFinite(m) || m <= 0) return null;
    if (m < 60) return `${m} min`;
    const h = m / 60;
    if (Number.isInteger(h)) return `${h} h`;
    return `${h.toLocaleString("es-ES", { maximumFractionDigits: 1 })} h`;
}

const SessionCard = ({ session, onReserve }) => {
    const details = [
        durationLabel(session.duracion_minutos)
            ? `Duración: ${durationLabel(session.duracion_minutos)}`
            : null,
        session.capacidad_maxima
            ? `Máximo ${session.capacidad_maxima} personas`
            : "Fotos incluidas (sin garantía en todas)",
    ].filter(Boolean);

    return (
        <div className="relative flex flex-col rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-fuchsia-400/30 hover:bg-white/10">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-fuchsia-500/15 text-fuchsia-200 ring-1 ring-fuchsia-400/30">
                <Camera className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-white">{session.nombre}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
                {session.descripcion || "Sesión fotográfica en la Zurriola."}
            </p>
            <ul className="mt-4 space-y-2">
                {details.map((d) => (
                    <li
                        key={d}
                        className="flex items-start gap-2 text-sm text-slate-300"
                    >
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-fuchsia-400" />
                        {d}
                    </li>
                ))}
            </ul>
            <div className="mt-6 flex items-end justify-between border-t border-white/10 pt-4">
                <div>
                    <p className="text-2xl font-extrabold text-white">
                        {formatPrice(session.precio)}
                    </p>
                    <p className="text-xs text-slate-500">
                        base
                        {Number(session.plus_por_persona) > 0
                            ? ` + ${formatPrice(session.plus_por_persona)}/pers.`
                            : ""}
                    </p>
                </div>
                <S4Button type="button" variant="secondary" size="sm" className={RESERVE_PILL} onClick={() => onReserve(session)}>
                    Reservar
                    <ArrowRight className="h-3.5 w-3.5" />
                </S4Button>
            </div>
        </div>
    );
};

function ErrorBlock({ flash, errors }) {
    const messages = [];
    if (flash?.error) messages.push(String(flash.error));
    if (errors && typeof errors === "object") {
        Object.values(errors)
            .flat()
            .filter(Boolean)
            .forEach((m) => messages.push(String(m)));
    }
    if (messages.length === 0) return null;
    return (
        <ul className="space-y-1 rounded-xl border border-rose-400/30 bg-rose-950/50 px-3 py-2 text-sm text-rose-100">
            {messages.map((msg) => (
                <li key={msg}>{msg}</li>
            ))}
        </ul>
    );
}

export default function ServiciosFotos({ seo = null, sessions = [] }) {
    const { auth, flash, errors } = usePage().props;
    const user = auth?.user || null;
    const [selected, setSelected] = useState(null);
    const [busy, setBusy] = useState(false);
    const [form, setForm] = useState({
        fecha_inicio: "",
        party_size: 1,
        guest_first_name: "",
        guest_last_name: "",
        guest_email: "",
        guest_phone: "",
    });

    const list = useMemo(
        () => (Array.isArray(sessions) ? sessions : []),
        [sessions],
    );

    const quoteTotal = useMemo(() => {
        if (!selected) return null;
        const n = Math.max(1, Number(form.party_size) || 1);
        const base = Number(selected.precio_cents || 0);
        const plus = Number(selected.plus_por_persona_cents || 0);
        return (base + n * plus) / 100;
    }, [selected, form.party_size]);

    const openReserve = (session) => {
        setSelected(session);
        setForm((prev) => ({
            ...prev,
            party_size: 1,
            guest_first_name: user?.nombre || prev.guest_first_name,
            guest_last_name: user?.apellido || prev.guest_last_name,
            guest_email: user?.email || prev.guest_email,
            guest_phone: user?.telefono || prev.guest_phone,
        }));
    };

    const submitReserve = (e) => {
        e.preventDefault();
        if (!selected || busy) return;
        setBusy(true);
        router.post(
            route("servicios.fotos.book"),
            {
                photo_session_id: selected.id,
                fecha_inicio: form.fecha_inicio,
                party_size: Number(form.party_size) || 1,
                guest_first_name: form.guest_first_name || null,
                guest_last_name: form.guest_last_name || null,
                guest_email: form.guest_email || null,
                guest_phone: form.guest_phone || null,
            },
            {
                // Éxito = redirect away a Stripe; si falla, el modal permanece abierto.
                onFinish: () => setBusy(false),
            },
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-[#1a0a24] to-slate-950 text-white">
            <SeoHead seo={seo} />
            <section className="relative overflow-hidden border-b border-fuchsia-950/60">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(112,26,117,0.4),_transparent_55%)]" />
                <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-fuchsia-400/25 bg-fuchsia-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-fuchsia-200">
                        <Aperture className="h-3.5 w-3.5" />
                        Fotografía · San Sebastián Surf School
                    </div>
                    <h1 className="max-w-3xl font-heading text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                        Captura tu mejor ola y{" "}
                        <span className="bg-gradient-to-r from-fuchsia-300 to-pink-300 bg-clip-text text-transparent">
                            llévate el recuerdo
                        </span>
                    </h1>
                    <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
                        Inmortaliza tu sesión en la Zurriola. Elige un bono con
                        reportaje fotográfico y reserva online.
                    </p>
                    {!selected ? (
                        <div className="mt-6 max-w-xl">
                            <ErrorBlock flash={flash} errors={errors} />
                        </div>
                    ) : null}
                </div>
            </section>

            <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
                <div className="mb-10 text-center">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-fuchsia-300">
                        Sesiones con fotos
                    </p>
                    <h2 className="mt-2 text-3xl font-extrabold text-white">
                        Elige tu sesión fotográfica
                    </h2>
                </div>

                {list.length === 0 ? (
                    <p className="text-center text-slate-400">
                        No hay sesiones activas ahora mismo.{" "}
                        <Link
                            href={route("contacto")}
                            className="text-fuchsia-300 underline-offset-2 hover:underline"
                        >
                            Contáctanos
                        </Link>
                        .
                    </p>
                ) : (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {list.map((session) => (
                            <SessionCard
                                key={session.id}
                                session={session}
                                onReserve={openReserve}
                            />
                        ))}
                    </div>
                )}

                <div className="mt-10 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-sm">
                    <ImageIcon className="mt-0.5 h-5 w-5 shrink-0 text-fuchsia-300" />
                    <p className="text-sm leading-relaxed text-slate-400">
                        Las fotos se realizan durante la sesión en condiciones
                        reales de mar. No garantizamos aparecer en todas las
                        tomas, pero seleccionamos siempre las mejores imágenes de
                        cada participante.
                    </p>
                </div>
            </section>

            {selected ? (
                <div
                    className="fixed inset-0 z-50 grid place-items-center bg-slate-950/80 p-4"
                    onClick={() => !busy && setSelected(null)}
                >
                    <form
                        onSubmit={submitReserve}
                        className="w-full max-w-md space-y-3 rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h3 className="text-lg font-bold text-white">
                                    Reservar · {selected.nombre}
                                </h3>
                                <p className="text-sm text-slate-400">
                                    Base {formatPrice(selected.precio)}
                                    {Number(selected.plus_por_persona) > 0
                                        ? ` + ${formatPrice(selected.plus_por_persona)}/pers.`
                                        : ""}
                                    {selected.duracion_minutos
                                        ? ` · ${durationLabel(selected.duracion_minutos)}`
                                        : ""}
                                </p>
                            </div>
                            <button
                                type="button"
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                                onClick={() => !busy && setSelected(null)}
                                aria-label="Cerrar"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <ErrorBlock flash={flash} errors={errors} />

                        <label className="block text-sm text-slate-300">
                            Fecha y hora de inicio
                            <input
                                type="datetime-local"
                                required
                                value={form.fecha_inicio}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        fecha_inicio: e.target.value,
                                    }))
                                }
                                className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white"
                            />
                        </label>

                        <label className="block text-sm text-slate-300">
                            N.º de personas / alumnos
                            <input
                                type="number"
                                min={1}
                                max={selected.capacidad_maxima || 20}
                                required
                                value={form.party_size}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        party_size: e.target.value,
                                    }))
                                }
                                className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white"
                            />
                        </label>

                        {quoteTotal != null ? (
                            <div className="rounded-xl border border-fuchsia-400/25 bg-fuchsia-950/30 px-3 py-2 text-sm text-fuchsia-50">
                                <p className="font-semibold">
                                    Total: {formatPrice(quoteTotal)}
                                </p>
                                <p className="text-xs text-fuchsia-200/80">
                                    {formatPrice(selected.precio)} base
                                    {Number(selected.plus_por_persona) > 0
                                        ? ` + ${Math.max(1, Number(form.party_size) || 1)} × ${formatPrice(selected.plus_por_persona)}`
                                        : ""}
                                </p>
                            </div>
                        ) : null}

                        {!user ? (
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                <label className="block text-sm text-slate-300">
                                    Nombre
                                    <input
                                        type="text"
                                        required
                                        value={form.guest_first_name}
                                        onChange={(e) =>
                                            setForm((f) => ({
                                                ...f,
                                                guest_first_name: e.target.value,
                                            }))
                                        }
                                        className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white"
                                    />
                                </label>
                                <label className="block text-sm text-slate-300">
                                    Apellido
                                    <input
                                        type="text"
                                        value={form.guest_last_name}
                                        onChange={(e) =>
                                            setForm((f) => ({
                                                ...f,
                                                guest_last_name: e.target.value,
                                            }))
                                        }
                                        className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white"
                                    />
                                </label>
                                <label className="block text-sm text-slate-300 sm:col-span-2">
                                    Email
                                    <input
                                        type="email"
                                        required
                                        value={form.guest_email}
                                        onChange={(e) =>
                                            setForm((f) => ({
                                                ...f,
                                                guest_email: e.target.value,
                                            }))
                                        }
                                        className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white"
                                    />
                                </label>
                                <label className="block text-sm text-slate-300 sm:col-span-2">
                                    Teléfono
                                    <input
                                        type="tel"
                                        value={form.guest_phone}
                                        onChange={(e) =>
                                            setForm((f) => ({
                                                ...f,
                                                guest_phone: e.target.value,
                                            }))
                                        }
                                        className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white"
                                    />
                                </label>
                            </div>
                        ) : null}

                        <S4Button type="submit" variant="accent" disabled={busy} className={ACCENT_SUBMIT}>
                            {busy ? "Redirigiendo al pago…" : "Pagar y reservar"}
                        </S4Button>
                    </form>
                </div>
            ) : null}
        </div>
    );
}
