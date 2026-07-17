import React, { useState } from "react";
import { Head, router, usePage } from "@inertiajs/react";
import Layout1 from "../../../layouts/Layout1";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, MessageCircle, Phone, ShieldAlert } from "lucide-react";

const STATUS_BADGE = {
    active: "bg-emerald-100 text-emerald-700",
    requires_human: "bg-rose-100 text-rose-700",
    resolved: "bg-slate-200 text-slate-600",
};

function InteractionRow({ interaction }) {
    const [expanded, setExpanded] = useState(false);
    const [resolving, setResolving] = useState(false);

    const handleResolve = () => {
        setResolving(true);
        router.patch(route("admin.chatbot.resolve", interaction.id), {}, {
            preserveScroll: true,
            onFinish: () => setResolving(false),
        });
    };

    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-slate-900">{interaction.case_reference}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_BADGE[interaction.status] ?? "bg-slate-100 text-slate-600"}`}>
                            {interaction.status_label}
                        </span>
                        {interaction.flag_reason ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                                <ShieldAlert className="h-3 w-3" aria-hidden="true" />
                                {interaction.flag_reason}
                            </span>
                        ) : null}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                        {interaction.user ? `${interaction.user.name} · ${interaction.user.email}` : "Usuario anónimo"}
                        {interaction.contact_phone ? (
                            <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                                {" "}
                                · <Phone className="h-3 w-3" aria-hidden="true" />
                                {interaction.contact_phone}
                            </span>
                        ) : interaction.user?.telefono ? (
                            <span className="text-slate-400"> · sin móvil en caso (perfil: {interaction.user.telefono})</span>
                        ) : (
                            <span className="text-amber-600"> · sin móvil registrado</span>
                        )}
                        {interaction.ip_address ? ` · IP ${interaction.ip_address}` : ""} · {interaction.created_at}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {interaction.whatsapp_reply_url ? (
                        <a
                            href={interaction.whatsapp_reply_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500"
                        >
                            <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                            Responder por WhatsApp
                        </a>
                    ) : null}
                    <button
                        type="button"
                        onClick={() => setExpanded((v) => !v)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                        {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        Historial
                    </button>
                    {interaction.status !== "resolved" ? (
                        <button
                            type="button"
                            onClick={handleResolve}
                            disabled={resolving}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                        >
                            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                            Marcar resuelto
                        </button>
                    ) : null}
                </div>
            </div>

            {expanded ? (
                <div className="border-t border-slate-100 bg-slate-50/70 p-4">
                    <div className="flex flex-col gap-2">
                        {(interaction.history ?? []).map((turn, index) => (
                            <div
                                key={index}
                                className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                                    turn.role === "user"
                                        ? "self-end bg-slate-900 text-white"
                                        : "self-start border border-slate-200 bg-white text-slate-700"
                                }`}
                            >
                                {turn.text}
                            </div>
                        ))}
                        {(interaction.history ?? []).length === 0 ? (
                            <p className="text-sm text-slate-500">Sin historial registrado.</p>
                        ) : null}
                    </div>
                </div>
            ) : null}
        </div>
    );
}

export default function Index({ interactions, status, statusOptions }) {
    const { flash } = usePage().props;

    return (
        <Layout1>
            <Head title="Admin · Casos del Chatbot" />

            <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
                <header className="mb-6">
                    <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                        Chatbot Maider
                    </p>
                    <h1 className="mt-2 text-2xl font-bold text-slate-900">Casos derivados a soporte humano</h1>
                    <p className="mt-1 text-sm text-slate-600">
                        Mensajes bloqueados por el guard anti-inyección o conversaciones donde el FAQ no supo responder dos veces seguidas.
                    </p>
                </header>

                {flash?.success ? (
                    <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                        {flash.success}
                    </div>
                ) : null}

                <div className="mb-5 flex gap-2">
                    {statusOptions.map((opt) => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => router.get(route("admin.chatbot.index"), { status: opt.value })}
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                                status === opt.value
                                    ? "bg-slate-900 text-white"
                                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>

                <div className="flex flex-col gap-3">
                    {interactions.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
                            <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-slate-300" aria-hidden="true" />
                            No hay casos en este estado.
                        </div>
                    ) : (
                        interactions.map((interaction) => (
                            <InteractionRow key={interaction.id} interaction={interaction} />
                        ))
                    )}
                </div>
            </div>
        </Layout1>
    );
}
