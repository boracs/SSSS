import { useForm } from "@inertiajs/react";
import { useRef, useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";

const fieldClass =
    "mt-2 block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20";

export default function DeleteUserForm({ className = "" }) {
    const [confirmingUserDeletion, setConfirmingUserDeletion] = useState(false);
    const passwordInput = useRef();

    const {
        data,
        setData,
        delete: destroy,
        processing,
        reset,
        errors,
        clearErrors,
    } = useForm({
        password: "",
    });

    const confirmUserDeletion = () => {
        setConfirmingUserDeletion(true);
    };

    const deleteUser = (e) => {
        e.preventDefault();

        destroy(route("profile.destroy"), {
            preserveScroll: true,
            onSuccess: () => closeModal(),
            onError: () => passwordInput.current.focus(),
            onFinish: () => reset(),
        });
    };

    const closeModal = () => {
        setConfirmingUserDeletion(false);
        clearErrors();
        reset();
    };

    return (
        <section
            className={`overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-rose-200 ${className}`}
        >
            <div className="border-b border-rose-100 bg-gradient-to-r from-rose-950 via-rose-900 to-slate-900 px-6 py-5">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
                        <Trash2 className="h-5 w-5 text-rose-200" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">
                            Eliminar cuenta
                        </h2>
                        <p className="text-sm text-rose-100/80">
                            Esta acción es permanente y no se puede deshacer.
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-4 p-6 sm:p-8">
                <p className="text-sm leading-relaxed text-slate-600">
                    Al eliminar tu cuenta se borrarán de forma definitiva todos tus datos,
                    reservas e historial asociados. Descarga cualquier información que
                    quieras conservar antes de continuar.
                </p>

                <button
                    type="button"
                    onClick={confirmUserDeletion}
                    className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700"
                >
                    <AlertTriangle className="h-4 w-4" />
                    Eliminar mi cuenta
                </button>
            </div>

            {confirmingUserDeletion && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 backdrop-blur-sm">
                    <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
                        <div className="border-b border-rose-100 bg-rose-50 px-6 py-4">
                            <h3 className="text-lg font-bold text-rose-950">
                                ¿Confirmar eliminación?
                            </h3>
                            <p className="mt-1 text-sm text-rose-800/80">
                                Introduce tu contraseña para confirmar que deseas eliminar
                                tu cuenta de forma permanente.
                            </p>
                        </div>

                        <form onSubmit={deleteUser} className="space-y-4 p-6">
                            <div>
                                <label
                                    htmlFor="password"
                                    className="text-sm font-medium text-slate-700"
                                >
                                    Contraseña
                                </label>
                                <input
                                    id="password"
                                    type="password"
                                    name="password"
                                    ref={passwordInput}
                                    value={data.password}
                                    onChange={(e) =>
                                        setData("password", e.target.value)
                                    }
                                    className={fieldClass}
                                    placeholder="Tu contraseña actual"
                                />

                                {errors.password && (
                                    <p className="mt-2 text-sm text-rose-600">
                                        {errors.password}
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-wrap justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
                                >
                                    {processing ? "Eliminando…" : "Sí, eliminar cuenta"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </section>
    );
}
