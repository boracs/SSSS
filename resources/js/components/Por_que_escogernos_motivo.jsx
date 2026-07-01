import React from "react";

const Por_que_escogernos_motivo = ({ icon: Icon, title, paragraph }) => (
    <article className="group rounded-2xl border border-slate-200/80 bg-white p-6 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-cyan-500/25 hover:shadow-lg">
        {Icon ? (
            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#0f5f74]/10 to-cyan-500/10 text-[#0f5f74] transition group-hover:from-[#0f5f74]/15 group-hover:to-cyan-500/15">
                <Icon className="h-5 w-5" />
            </div>
        ) : null}
        <h3 className="font-heading text-lg font-bold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{paragraph}</p>
    </article>
);

export default Por_que_escogernos_motivo;
