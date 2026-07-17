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
        <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-slate-200/70 pt-2.5">
            <p className="text-[11px] text-slate-500">¿Te sirvió? Dale like</p>
            <div className="flex items-center gap-1">
                <button
                    type="button"
                    disabled={busy}
                    onClick={() => vote("up")}
                    aria-pressed={mine === "up"}
                    aria-label={`Me gusta${likes ? `, ${likes}` : ""}`}
                    className={`inline-flex h-7 items-center gap-1 rounded-full px-2 text-[11px] font-semibold transition disabled:opacity-50 ${
                        mine === "up"
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-100 text-slate-600 ring-1 ring-slate-200 hover:bg-emerald-50 hover:text-emerald-800"
                    }`}
                >
                    <ThumbsUp className="h-3 w-3" aria-hidden />
                    <span className="tabular-nums">{likes}</span>
                </button>
                <button
                    type="button"
                    disabled={busy}
                    onClick={() => vote("down")}
                    aria-pressed={mine === "down"}
                    aria-label={`No me gusta${dislikes ? `, ${dislikes}` : ""}`}
                    className={`inline-flex h-7 items-center gap-1 rounded-full px-2 text-[11px] font-semibold transition disabled:opacity-50 ${
                        mine === "down"
                            ? "bg-rose-600 text-white"
                            : "bg-rose-50 text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100"
                    }`}
                >
                    <ThumbsDown className="h-3 w-3" aria-hidden />
                    <span className="tabular-nums">{dislikes}</span>
                </button>
            </div>
            {error ? <p className="w-full text-[10px] text-rose-600">{error}</p> : null}
        </div>
    );
}
