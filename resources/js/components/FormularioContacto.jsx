import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useForm, usePage } from "@inertiajs/react";
import { ArrowRight, Loader2, Mail, MessageSquareText, UserRound } from "lucide-react";

const fieldShell =
    "group relative flex items-start gap-3 rounded-2xl border border-slate-200/90 bg-slate-50/90 px-4 py-3 transition-all duration-200 focus-within:border-orange-400/80 focus-within:bg-white focus-within:ring-4 focus-within:ring-orange-500/10";

const fieldInput =
    "min-w-0 flex-1 border-0 bg-transparent py-1 text-[15px] text-slate-900 outline-none placeholder:text-slate-400";

const ContactForm = () => {
    const [formStatus, setFormStatus] = useState(null);
    const { flash } = usePage().props;

    const { data, setData, post, processing, errors, reset } = useForm({
        name: "",
        email: "",
        message: "",
        website: "",
    });

    useEffect(() => {
        if (flash?.success) setFormStatus(flash.success);
    }, [flash?.success]);

    const handleChange = (e) => setData(e.target.name, e.target.value);

    const handleSubmit = (e) => {
        e.preventDefault();
        setFormStatus(null);
        post(route("contacto.store"), {
            preserveScroll: true,
            onSuccess: () => reset("name", "email", "message", "website"),
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="relative mx-auto w-full max-w-lg overflow-hidden rounded-[1.75rem] border border-white/60 bg-white shadow-[0_24px_60px_-28px_rgba(15,23,42,0.35)]"
        >
            <div
                className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-amber-400 to-cyan-500"
                aria-hidden
            />

            <div className="p-6 sm:p-8">
                <div className="mb-8">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        San Sebastián Surf School
                    </p>
                    <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                        ¿En qué podemos{" "}
                        <span className="bg-gradient-to-r from-orange-600 to-amber-500 bg-clip-text text-transparent">
                            ayudarte?
                        </span>
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-slate-500">
                        Reservas, clases, bonos VIP o cualquier duda. Te respondemos lo antes posible.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="text"
                        name="website"
                        value={data.website}
                        onChange={handleChange}
                        autoComplete="off"
                        tabIndex={-1}
                        className="hidden"
                        aria-hidden="true"
                    />

                    <div className="space-y-1.5">
                        <label htmlFor="name" className="ml-1 text-xs font-semibold text-slate-600">
                            Nombre
                        </label>
                        <div className={fieldShell}>
                            <UserRound
                                className="mt-1 h-5 w-5 shrink-0 text-slate-400 transition-colors group-focus-within:text-orange-500"
                                aria-hidden
                            />
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={data.name}
                                onChange={handleChange}
                                placeholder="Tu nombre"
                                autoComplete="name"
                                className={fieldInput}
                            />
                        </div>
                        {errors.name ? (
                            <p className="ml-1 text-xs text-rose-600">{errors.name}</p>
                        ) : null}
                    </div>

                    <div className="space-y-1.5">
                        <label htmlFor="email" className="ml-1 text-xs font-semibold text-slate-600">
                            Correo electrónico
                        </label>
                        <div className={fieldShell}>
                            <Mail
                                className="mt-1 h-5 w-5 shrink-0 text-slate-400 transition-colors group-focus-within:text-orange-500"
                                aria-hidden
                            />
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={data.email}
                                onChange={handleChange}
                                placeholder="tu@email.com"
                                autoComplete="email"
                                className={fieldInput}
                            />
                        </div>
                        {errors.email ? (
                            <p className="ml-1 text-xs text-rose-600">{errors.email}</p>
                        ) : null}
                    </div>

                    <div className="space-y-1.5">
                        <label htmlFor="message" className="ml-1 text-xs font-semibold text-slate-600">
                            Mensaje
                        </label>
                        <div className={`${fieldShell} items-start`}>
                            <MessageSquareText
                                className="mt-1 h-5 w-5 shrink-0 text-slate-400 transition-colors group-focus-within:text-orange-500"
                                aria-hidden
                            />
                            <textarea
                                id="message"
                                name="message"
                                value={data.message}
                                onChange={handleChange}
                                rows={5}
                                placeholder="Cuéntanos qué necesitas…"
                                className={`${fieldInput} min-h-[8.5rem] resize-y`}
                            />
                        </div>
                        {errors.message ? (
                            <p className="ml-1 text-xs text-rose-600">{errors.message}</p>
                        ) : null}
                    </div>

                    <motion.button
                        type="submit"
                        disabled={processing}
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.98 }}
                        className="group mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {processing ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Enviando…
                            </>
                        ) : (
                            <>
                                Enviar mensaje
                                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                            </>
                        )}
                    </motion.button>
                </form>

                {errors.contact ? (
                    <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        {errors.contact}
                    </div>
                ) : null}

                {formStatus ? (
                    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                        {formStatus}
                    </div>
                ) : null}
            </div>
        </motion.div>
    );
};

export default ContactForm;
