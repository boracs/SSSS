import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import TextInput from "@/Components/TextInput";
import { Transition } from "@headlessui/react";
import { useForm } from "@inertiajs/react";
import { useRef, useState } from "react";
import { CheckCircle2, Eye, EyeOff, LockKeyhole } from "lucide-react";

const fieldClass =
    "mt-1 block w-full !rounded-xl !border-slate-200 !bg-white !px-4 !py-2.5 !text-sm !text-slate-900 !shadow-sm placeholder:!text-slate-400 focus:!border-sky-500 focus:!outline-none focus:!ring-2 focus:!ring-sky-500/20";

function PasswordField({ id, label, inputRef, value, onChange, error, autoComplete, placeholder, show, onToggleShow }) {
    const inputClass = `${fieldClass} !pr-11`;
    return (
        <div>
            <InputLabel htmlFor={id} value={label} />
            <div className="relative">
                <TextInput
                    id={id}
                    ref={inputRef}
                    value={value}
                    onChange={onChange}
                    type={show ? "text" : "password"}
                    className={inputClass}
                    autoComplete={autoComplete}
                    placeholder={placeholder}
                />
                <button
                    type="button"
                    onClick={onToggleShow}
                    aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
                    title={show ? "Ocultar contraseña" : "Mostrar contraseña"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                >
                    {show ? (
                        <EyeOff className="h-4 w-4" aria-hidden />
                    ) : (
                        <Eye className="h-4 w-4" aria-hidden />
                    )}
                </button>
            </div>
            <InputError message={error} className="mt-2" />
        </div>
    );
}

export default function UpdatePasswordForm({ className = "" }) {
    const passwordInput = useRef();
    const currentPasswordInput = useRef();
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const {
        data,
        setData,
        errors,
        put,
        reset,
        processing,
        recentlySuccessful,
    } = useForm({
        current_password: "",
        password: "",
        password_confirmation: "",
    });

    const updatePassword = (e) => {
        e.preventDefault();

        put(route("password.update"), {
            preserveScroll: true,
            onSuccess: () => reset(),
            onError: (errors) => {
                if (errors.password) {
                    reset("password", "password_confirmation");
                    passwordInput.current.focus();
                }

                if (errors.current_password) {
                    reset("current_password");
                    currentPasswordInput.current.focus();
                }
            },
        });
    };

    return (
        <section
            className={`overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 ${className}`}
        >
            <div className="border-b border-slate-100 bg-gradient-to-r from-slate-900 via-slate-800 to-sky-950 px-6 py-5">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
                        <LockKeyhole className="h-5 w-5 text-sky-200" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">
                            Actualizar contraseña
                        </h2>
                        <p className="text-sm text-slate-300">
                            Usa una contraseña larga y segura para proteger tu cuenta.
                        </p>
                    </div>
                </div>
            </div>

            <form onSubmit={updatePassword} className="space-y-5 p-6 sm:p-8">
                <PasswordField
                    id="current_password"
                    label="Contraseña actual"
                    inputRef={currentPasswordInput}
                    value={data.current_password}
                    onChange={(e) =>
                        setData("current_password", e.target.value)
                    }
                    error={errors.current_password}
                    autoComplete="current-password"
                    placeholder="Introduce tu contraseña actual"
                    show={showCurrent}
                    onToggleShow={() => setShowCurrent((v) => !v)}
                />

                <div className="grid gap-5 sm:grid-cols-2">
                    <PasswordField
                        id="password"
                        label="Nueva contraseña"
                        inputRef={passwordInput}
                        value={data.password}
                        onChange={(e) => setData("password", e.target.value)}
                        error={errors.password}
                        autoComplete="new-password"
                        placeholder="Introduce tu nueva contraseña"
                        show={showNew}
                        onToggleShow={() => setShowNew((v) => !v)}
                    />

                    <PasswordField
                        id="password_confirmation"
                        label="Confirmar contraseña"
                        value={data.password_confirmation}
                        onChange={(e) =>
                            setData("password_confirmation", e.target.value)
                        }
                        error={errors.password_confirmation}
                        autoComplete="new-password"
                        placeholder="Repite la nueva contraseña"
                        show={showConfirm}
                        onToggleShow={() => setShowConfirm((v) => !v)}
                    />
                </div>

                <div className="flex flex-wrap items-center gap-4 border-t border-slate-100 pt-6">
                    <button
                        type="submit"
                        disabled={processing}
                        className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {processing ? "Actualizando…" : "Actualizar contraseña"}
                    </button>

                    <Transition
                        show={recentlySuccessful}
                        enter="transition ease-in-out"
                        enterFrom="opacity-0"
                        leave="transition ease-in-out"
                        leaveTo="opacity-0"
                    >
                        <p className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                            <CheckCircle2 className="h-4 w-4" />
                            Contraseña actualizada
                        </p>
                    </Transition>
                </div>
            </form>
        </section>
    );
}
