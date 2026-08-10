import React, { useEffect, useMemo, useState } from "react";
import { Mail, User } from "lucide-react";
import WhatsAppIcon from "../../icons/WhatsAppIcon";
import { whatsappUrlFromPhone } from "../../../lib/whatsapp";

function occupantLabel(o) {
    if (!o) return "";
    return [o.nombre, o.apellido].filter(Boolean).join(" ").trim() || "Socio";
}

function daysDebt(o) {
    return Math.max(0, Number(o?.dias_deuda || 0));
}

/**
 * Mapa de ocupación de taquillas (solo lectura).
 * Panel superior solo cambia con click (sticky).
 * Ocupada al día = verde + User; cuota vencida con días de deuda = rojo granate suave.
 */
export default function LockerOccupancyMap({ lockerMap = null }) {
    const max = Math.max(1, Number(lockerMap?.max) || 200);
    const occupants = Array.isArray(lockerMap?.occupants) ? lockerMap.occupants : [];

    const byNumber = useMemo(() => {
        const map = new Map();
        occupants.forEach((o) => {
            const n = Number(o?.number);
            if (!Number.isFinite(n) || n <= 0 || map.has(n)) return;
            map.set(n, o);
        });
        return map;
    }, [occupants]);

    const overdueCount = useMemo(
        () => occupants.filter((o) => daysDebt(o) > 0).length,
        [occupants],
    );

    const cells = useMemo(
        () => Array.from({ length: max }, (_, i) => i + 1),
        [max],
    );

    const [selected, setSelected] = useState(null);

    useEffect(() => {
        if (selected == null) return undefined;
        const onKey = (e) => {
            if (e.key === "Escape") setSelected(null);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [selected]);

    const activeOccupant = selected != null ? byNumber.get(selected) : null;
    const activeOccupied = selected != null && Boolean(activeOccupant);
    const activeDebt = activeOccupied ? daysDebt(activeOccupant) : 0;

    const email = String(activeOccupant?.email || "").trim();
    const phone = String(activeOccupant?.telefono || "").trim();
    const waUrl = activeOccupied ? whatsappUrlFromPhone(phone) : null;

    return (
        <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 shadow-xl shadow-black/20 sm:p-5">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                <p className="text-xs text-slate-500">
                    {byNumber.size} ocupadas · {Math.max(0, max - byNumber.size)} libres
                    {overdueCount > 0 ? (
                        <>
                            {" "}
                            · <span className="font-semibold text-rose-300/90">{overdueCount} con deuda</span>
                        </>
                    ) : null}{" "}
                    · pulsa una taquilla para fijarla
                </p>
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                    <span className="inline-flex items-center gap-1.5">
                        <span
                            className="h-3 w-3 rounded-sm bg-emerald-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]"
                            aria-hidden
                        />{" "}
                        Libre
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <span
                            className="inline-flex h-3 w-3 items-center justify-center rounded-sm bg-emerald-600 text-emerald-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]"
                            aria-hidden
                        >
                            <User className="h-2 w-2" strokeWidth={3} />
                        </span>{" "}
                        Al día
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <span
                            className="inline-flex h-3 w-3 items-center justify-center rounded-sm bg-rose-900/85 text-rose-100 ring-1 ring-rose-700/50"
                            aria-hidden
                        >
                            <User className="h-2 w-2" strokeWidth={3} />
                        </span>{" "}
                        Debe días
                    </span>
                </div>
            </div>

            <div
                className="mb-3 min-h-[4.5rem] rounded-xl border border-cyan-400/30 bg-slate-950/80 px-3 py-2.5"
                role="status"
                aria-live="polite"
            >
                {selected != null ? (
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1 space-y-1.5">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-300/80">
                                    Taquilla #{selected}
                                </p>
                                <p className="truncate text-sm font-semibold text-white">
                                    {activeOccupied
                                        ? occupantLabel(activeOccupant)
                                        : "Libre — sin socio asignado"}
                                </p>
                                {activeDebt > 0 ? (
                                    <p className="mt-1 text-xs font-semibold text-rose-300">
                                        Cuota vencida · {activeDebt}{" "}
                                        {activeDebt === 1 ? "día" : "días"} de deuda
                                    </p>
                                ) : null}
                            </div>
                            {activeOccupied ? (
                                <div className="flex flex-wrap items-center gap-2">
                                    {email ? (
                                        <a
                                            href={`mailto:${encodeURIComponent(email)}`}
                                            className="inline-flex max-w-full items-center gap-1.5 truncate rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-medium text-slate-200 transition hover:border-cyan-400/40 hover:text-cyan-100"
                                            aria-label={`Enviar email a ${email}`}
                                        >
                                            <Mail className="h-3 w-3 shrink-0 text-cyan-300" aria-hidden />
                                            <span className="truncate">{email}</span>
                                        </a>
                                    ) : (
                                        <span className="text-[11px] text-slate-500">Sin email</span>
                                    )}
                                    {waUrl ? (
                                        <a
                                            href={waUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-200 transition hover:bg-emerald-500/20"
                                            aria-label={`Abrir WhatsApp de ${occupantLabel(activeOccupant)}`}
                                            title="WhatsApp"
                                        >
                                            <WhatsAppIcon className="h-4 w-4" aria-hidden />
                                        </a>
                                    ) : null}
                                </div>
                            ) : null}
                        </div>
                        <button
                            type="button"
                            onClick={() => setSelected(null)}
                            className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-slate-400 hover:bg-white/5 hover:text-white"
                        >
                            Limpiar
                        </button>
                    </div>
                ) : (
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Detalle
                        </p>
                        <p className="text-sm font-semibold text-slate-400">
                            Selecciona una taquilla
                        </p>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-6 gap-2 sm:grid-cols-10">
                {cells.map((n) => {
                    const occ = byNumber.get(n);
                    const occupied = Boolean(occ);
                    const isSelected = selected === n;
                    const overdue = occupied && daysDebt(occ) > 0;

                    const base3d =
                        "relative overflow-hidden rounded-lg border text-[11px] font-bold transition " +
                        "shadow-[0_2px_0_0_rgba(0,0,0,0.22),inset_0_1px_0_0_rgba(255,255,255,0.45)] " +
                        "motion-safe:active:translate-y-[1px] motion-safe:active:scale-[0.98] " +
                        "motion-safe:active:shadow-[0_1px_0_0_rgba(0,0,0,0.2),inset_0_1px_0_0_rgba(255,255,255,0.35)]";

                    let tone;
                    if (occupied && overdue) {
                        tone = isSelected
                            ? "border-rose-300/60 bg-rose-800 text-rose-50 ring-2 ring-rose-300/45 " +
                              "shadow-[0_3px_0_0_rgba(127,29,29,0.85),inset_0_1px_0_0_rgba(255,255,255,0.25)]"
                            : "border-rose-900/50 bg-rose-950/90 text-rose-100 hover:bg-rose-900/90";
                    } else if (occupied) {
                        tone = isSelected
                            ? "border-cyan-300/70 bg-emerald-600 text-emerald-50 ring-2 ring-cyan-300/50 " +
                              "shadow-[0_3px_0_0_rgba(6,78,59,0.85),inset_0_1px_0_0_rgba(255,255,255,0.35)]"
                            : "border-emerald-800/40 bg-emerald-700 text-emerald-50 hover:bg-emerald-600";
                    } else {
                        tone = isSelected
                            ? "border-cyan-300/70 bg-emerald-200 text-emerald-950 ring-2 ring-cyan-300/45 " +
                              "shadow-[0_3px_0_0_rgba(16,185,129,0.35),inset_0_1px_0_0_rgba(255,255,255,0.7)]"
                            : "border-emerald-300/60 bg-emerald-100 text-emerald-800 hover:bg-emerald-200/90";
                    }

                    return (
                        <button
                            key={`locker-cell-${n}`}
                            type="button"
                            aria-label={
                                occupied
                                    ? overdue
                                        ? `Taquilla ${n}, ${occupantLabel(occ)}, cuota vencida ${daysDebt(occ)} días`
                                        : `Taquilla ${n}, ${occupantLabel(occ)}`
                                    : `Taquilla ${n}, libre`
                            }
                            aria-pressed={isSelected}
                            onClick={() => {
                                setSelected((p) => (p === n ? null : n));
                            }}
                            className={`flex h-10 flex-col items-center justify-center gap-0.5 ${base3d} ${tone}`}
                        >
                            {occupied ? (
                                <User className="h-3 w-3 opacity-90" aria-hidden strokeWidth={2.5} />
                            ) : null}
                            <span className="leading-none tabular-nums">{n}</span>
                        </button>
                    );
                })}
            </div>
        </section>
    );
}
