import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useForm, usePage } from '@inertiajs/react';
import { Loader2, Mail, MessageSquareText, UserRound } from 'lucide-react';

// ─── Clases reutilizables ─────────────────────────────────────────────────────

/**
 * Input con floating label vía Tailwind CSS peer.
 * placeholder-transparent oculta el placeholder nativo; el <label>
 * reacciona a peer-placeholder-shown (vacío) y peer-focus (con foco).
 */
// placeholder-transparent es la ÚNICA clase de placeholder permitida.
// Oculta el texto nativo del <input> para que el <label> flotante sea
// el único indicador visual. :placeholder-shown sigue disparándose en
// CSS (detecta campo vacío) aunque el placeholder sea invisible.
const INPUT_BASE = [
    'peer w-full rounded-xl bg-white/80 pl-11 pr-4 pb-2 pt-6',
    'text-slate-800 placeholder-transparent',
    'border border-slate-200 outline-none',
    'transition-all duration-200',
    'focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20',
].join(' ');

const TEXTAREA_BASE = [
    'peer w-full rounded-xl bg-white/80 pl-11 pr-4 pb-2 pt-7',
    'text-slate-800 placeholder-transparent',
    'border border-slate-200 outline-none',
    'transition-all duration-200 resize-y min-h-40',
    'focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20',
].join(' ');

/**
 * Label flotante para <input>:
 *  · Vacío sin foco → desciende al centro del campo (tamaño normal, gris)
 *  · Con valor o con foco → flota arriba (pequeño, naranja)
 * peer-focus debe venir DESPUÉS de peer-placeholder-shown en la cadena
 * para que gane en especificidad cuando ambas condiciones coincidan.
 */
const LABEL_FLOAT_INPUT = [
    'pointer-events-none absolute left-11 top-2 text-xs font-medium text-orange-500',
    'transition-all duration-200',
    // Vacío sin foco: bajamos al centro
    'peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2',
    'peer-placeholder-shown:text-base peer-placeholder-shown:font-normal peer-placeholder-shown:text-slate-400',
    // Con foco: volvemos arriba (sobreescribe placeholder-shown)
    'peer-focus:top-2 peer-focus:translate-y-0',
    'peer-focus:text-xs peer-focus:font-medium peer-focus:text-orange-500',
].join(' ');

/**
 * Label flotante para <textarea> (no usa top-1/2 porque la altura es variable).
 */
const LABEL_FLOAT_TEXTAREA = [
    'pointer-events-none absolute left-11 top-2 text-xs font-medium text-orange-500',
    'transition-all duration-200',
    'peer-placeholder-shown:top-5 peer-placeholder-shown:text-base',
    'peer-placeholder-shown:font-normal peer-placeholder-shown:text-slate-400',
    'peer-focus:top-2 peer-focus:text-xs peer-focus:font-medium peer-focus:text-orange-500',
].join(' ');

// ─── Componente ───────────────────────────────────────────────────────────────

const ContactForm = () => {
    const [formStatus, setFormStatus] = useState(null);
    const { flash } = usePage().props;

    const { data, setData, post, processing, errors, reset } = useForm({
        name:    '',
        email:   '',
        message: '',
        website: '', // honeypot — oculto al usuario
    });

    useEffect(() => {
        if (flash?.success) setFormStatus(flash.success);
    }, [flash?.success]);

    const handleChange = (e) => setData(e.target.name, e.target.value);

    const handleSubmit = (e) => {
        e.preventDefault();
        setFormStatus(null);
        post(route('contacto.store'), {
            preserveScroll: true,
            onSuccess: () => reset('name', 'email', 'message', 'website'),
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="mx-auto w-full max-w-xl rounded-3xl border border-white/20 bg-white/70 p-6 shadow-[0_20px_40px_-18px_rgba(15,23,42,0.45),0_10px_20px_-12px_rgba(15,23,42,0.3),inset_0_1px_0_rgba(255,255,255,0.65)] backdrop-blur-md sm:p-8"
        >
            <div className="mb-8 text-center">
                <span className="mb-2 block text-center text-sm font-medium text-slate-600 md:text-base">
                    El equipo de San Sebastián Surf School está a tu disposición
                </span>
                <h2
                    className="bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600 bg-clip-text font-['Inter','Geist',ui-sans-serif] text-3xl font-bold text-transparent md:text-4xl"
                    style={{ letterSpacing: '-0.02em' }}
                >
                    ¿En qué podemos ayudarte?
                </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">

                {/* ── Honeypot (invisible para humanos, trampa para bots) ── */}
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

                {/* ── Nombre ── */}
                <div className="relative">
                    <UserRound className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition-colors" />
                    <input
                        type="text"
                        id="name"
                        name="name"
                        value={data.name}
                        onChange={handleChange}
                        placeholder="Nombre"
                        autoComplete="name"
                        className={INPUT_BASE}
                    />
                    <label htmlFor="name" className={LABEL_FLOAT_INPUT}>
                        Nombre
                    </label>
                    {errors.name && (
                        <p className="mt-1 text-xs text-rose-500">{errors.name}</p>
                    )}
                </div>

                {/* ── Email ── */}
                <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition-colors" />
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={data.email}
                        onChange={handleChange}
                        placeholder="Correo electrónico"
                        autoComplete="email"
                        className={INPUT_BASE}
                    />
                    <label htmlFor="email" className={LABEL_FLOAT_INPUT}>
                        Correo electrónico
                    </label>
                    {errors.email && (
                        <p className="mt-1 text-xs text-rose-500">{errors.email}</p>
                    )}
                </div>

                {/* ── Mensaje ── */}
                <div className="relative">
                    <MessageSquareText className="pointer-events-none absolute left-3 top-6 h-5 w-5 text-slate-400 transition-colors" />
                    <textarea
                        id="message"
                        name="message"
                        value={data.message}
                        onChange={handleChange}
                        rows={5}
                        placeholder="Mensaje"
                        className={TEXTAREA_BASE}
                    />
                    <label htmlFor="message" className={LABEL_FLOAT_TEXTAREA}>
                        Mensaje
                    </label>
                    {errors.message && (
                        <p className="mt-1 text-xs text-rose-500">{errors.message}</p>
                    )}
                </div>

                {/* ── Botón de envío ── */}
                <motion.button
                    type="submit"
                    disabled={processing}
                    whileHover={{ y: -2, scale: 1.01 }}
                    whileTap={{ scale: 0.97 }}
                    className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 px-6 py-3 font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_12px_24px_-12px_rgba(234,88,12,0.75)] transition-all duration-300 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_18px_28px_-16px_rgba(234,88,12,0.95)] disabled:cursor-not-allowed disabled:opacity-70"
                >
                    <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.4),transparent_45%)] opacity-90 transition-opacity duration-300 group-hover:opacity-100" />
                    <span className="relative flex items-center justify-center gap-2">
                        {processing && <Loader2 className="h-4 w-4 animate-spin" />}
                        {processing ? 'Enviando…' : 'Enviar mensaje'}
                    </span>
                </motion.button>
            </form>

            {/* ── Error genérico (p.ej. fallo de envío) ── */}
            {errors.contact && (
                <p className="mt-4 text-center text-xs text-rose-500">{errors.contact}</p>
            )}

            {/* ── Mensaje de éxito ── */}
            {formStatus && (
                <p className="mt-6 text-center text-sm font-medium text-emerald-600">
                    {formStatus}
                </p>
            )}
        </motion.div>
    );
};

export default ContactForm;
