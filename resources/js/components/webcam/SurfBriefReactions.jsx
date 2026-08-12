import React, { useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import axios from "axios";

/**
 * Voto 👍/👎 del Parte S4. Un voto por sesión; repetir el mismo quita el voto.
 */
export default function SurfBriefReactions({ initial = null }) {
    const [likes, setLikes] = useState(Number(initial?.likes) || 0);
    const [dislikes, setDislikes] = useState(Number(initial?.dislikes) || 0);
    const [mine, setMine] = useState(initial?.mine ?? null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const vote = async (reaction) => {
        if (busy) return;
        setBusy(true);
        setError("");
        try {
            const { data } = await axios.post(route("servicios.webcams.parte.reaccion"), { reaction });
            setLikes(Number(data.likes) || 0);
            setDislikes(Number(data.dislikes) || 0);
            setMine(data.mine ?? null);
        } catch {
            setError("No se pudo guardar tu voto. Prueba otra vez.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="mt-4 flex flex-col gap-2 border-t border-slate-200/80 pt-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <p className="text-xs text-slate-500">¿Te ha servido el parte?</p>
                {likes > 0 ? (
                    <p className="text-[11px] text-emerald-700">
                        {likes} {likes === 1 ? "persona" : "personas"} lo han encontrado útil hoy
                    </p>
                ) : null}
            </div>
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    disabled={busy}
                    onClick={() => vote("up")}
                    aria-pressed={mine === "up"}
                    aria-label={`Útil${likes ? `, ${likes} votos` : ""}`}
                    className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold transition disabled:opacity-50 ${
                        mine === "up"
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-100"
                    }`}
                >
                    <ThumbsUp className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="tabular-nums">{likes}</span>
                </button>
                <button
                    type="button"
                    disabled={busy}
                    onClick={() => vote("down")}
                    aria-pressed={mine === "down"}
                    aria-label={`Poco útil${dislikes ? `, ${dislikes} votos` : ""}`}
                    className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold transition disabled:opacity-50 ${
                        mine === "down"
                            ? "bg-rose-600 text-white"
                            : "bg-rose-50 text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100"
                    }`}
                >
                    <ThumbsDown className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="tabular-nums">{dislikes}</span>
                </button>
            </div>
            {error ? <p className="w-full text-xs text-rose-600">{error}</p> : null}
        </div>
    );
}
