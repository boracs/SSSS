import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useForm, usePage } from '@inertiajs/react';
import { Loader2, Mail, MessageSquareText, UserRound } from 'lucide-react';

const ContactForm = () => {
  const [focusedField, setFocusedField] = useState(null);
  const [formStatus, setFormStatus] = useState(null);
  const { flash } = usePage().props;
  const { data, setData, post, processing, errors, reset } = useForm({
    name: '',
    email: '',
    message: '',
    website: '',
  });

  useEffect(() => {
    if (flash?.success) {
      setFormStatus(flash.success);
    }
  }, [flash?.success]);

  const handleChange = e => {
    const { name, value } = e.target;
    setData(name, value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormStatus(null);
    post(route('contacto.store'), {
      preserveScroll: true,
      onSuccess: () => {
        reset('name', 'email', 'message', 'website');
      },
    });
  };

  const inputBaseClass =
    'peer w-full rounded-xl bg-white/55 pl-11 pr-4 pb-3 pt-6 text-slate-800 placeholder-transparent outline-none ring-1 ring-inset ring-slate-300/50 transition-all duration-300 backdrop-blur-sm focus:ring-2 focus:ring-orange-500/70 focus:shadow-[0_0_0_4px_rgba(249,115,22,0.18)]';

  const textareaBaseClass = `${inputBaseClass} min-h-40 resize-y`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="mx-auto w-full max-w-xl rounded-3xl border border-white/20 bg-white/70 p-6 shadow-[0_20px_40px_-18px_rgba(15,23,42,0.45),0_10px_20px_-12px_rgba(15,23,42,0.3),inset_0_1px_0_rgba(255,255,255,0.65)] backdrop-blur-md sm:p-8"
    >
      <h2
        className="mb-8 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600 bg-clip-text text-center font-['Inter','Geist',ui-sans-serif] text-4xl font-bold text-transparent"
        style={{ letterSpacing: '-0.02em' }}
      >
        ¡Hablemos!
      </h2>

      <form onSubmit={handleSubmit} className="space-y-5">
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

        <div className="relative">
          <UserRound className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500 transition-colors peer-focus:text-orange-500" />
          <input
            type="text"
            id="name"
            name="name"
            value={data.name}
            onChange={handleChange}
            onFocus={() => setFocusedField('name')}
            onBlur={() => setFocusedField(null)}
            required
            placeholder="Nombre"
            className={inputBaseClass}
          />
          <motion.label
            htmlFor="name"
            className="pointer-events-none absolute left-11 text-slate-500"
            animate={
              focusedField === 'name' || data.name
                ? { y: -17, scale: 0.86, color: '#f97316' }
                : { y: -1, scale: 1, color: '#64748b' }
            }
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            style={{ transformOrigin: 'left center', top: '1.5rem' }}
          >
            Nombre
          </motion.label>
          {errors.name && <p className="mt-2 text-sm font-medium text-red-600">{errors.name}</p>}
        </div>

        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500 transition-colors peer-focus:text-orange-500" />
          <input
            type="email"
            id="email"
            name="email"
            value={data.email}
            onChange={handleChange}
            onFocus={() => setFocusedField('email')}
            onBlur={() => setFocusedField(null)}
            required
            placeholder="Correo electrónico"
            className={inputBaseClass}
          />
          <motion.label
            htmlFor="email"
            className="pointer-events-none absolute left-11 text-slate-500"
            animate={
              focusedField === 'email' || data.email
                ? { y: -17, scale: 0.86, color: '#f97316' }
                : { y: -1, scale: 1, color: '#64748b' }
            }
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            style={{ transformOrigin: 'left center', top: '1.5rem' }}
          >
            Correo electrónico
          </motion.label>
          {errors.email && <p className="mt-2 text-sm font-medium text-red-600">{errors.email}</p>}
        </div>

        <div className="relative">
          <MessageSquareText className="pointer-events-none absolute left-3 top-7 h-5 w-5 text-slate-500 transition-colors peer-focus:text-orange-500" />
          <textarea
            id="message"
            name="message"
            value={data.message}
            onChange={handleChange}
            onFocus={() => setFocusedField('message')}
            onBlur={() => setFocusedField(null)}
            required
            rows="5"
            placeholder="Mensaje"
            className={textareaBaseClass}
          />
          <motion.label
            htmlFor="message"
            className="pointer-events-none absolute left-11 text-slate-500"
            animate={
              focusedField === 'message' || data.message
                ? { y: -17, scale: 0.86, color: '#f97316' }
                : { y: -1, scale: 1, color: '#64748b' }
            }
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            style={{ transformOrigin: 'left center', top: '1.5rem' }}
          >
            Mensaje
          </motion.label>
          {errors.message && <p className="mt-2 text-sm font-medium text-red-600">{errors.message}</p>}
        </div>

        <motion.button
          type="submit"
          disabled={processing}
          whileHover={{ y: -2, scale: 1.01 }}
          whileTap={{ scale: 0.97 }}
          className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 px-6 py-3 font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_12px_24px_-12px_rgba(234,88,12,0.75)] transition-all duration-300 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_18px_28px_-16px_rgba(234,88,12,0.95)] disabled:cursor-not-allowed disabled:opacity-80"
        >
          <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.4),transparent_45%)] opacity-90 transition-opacity duration-300 group-hover:opacity-100" />
          <span className="relative flex items-center justify-center gap-2">
            {processing && <Loader2 className="h-4 w-4 animate-spin" />}
            {processing ? 'Enviando...' : 'Enviar mensaje'}
          </span>
        </motion.button>
      </form>

      {errors.contact && <p className="mt-4 text-center text-sm font-medium text-red-600">{errors.contact}</p>}
      {formStatus && <p className="mt-6 text-center font-medium text-emerald-600">{formStatus}</p>}
    </motion.div>
  );
};

export default ContactForm;