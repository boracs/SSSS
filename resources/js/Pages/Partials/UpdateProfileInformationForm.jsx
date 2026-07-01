import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import TextInput from "@/Components/TextInput";
import { Transition } from "@headlessui/react";
import { Link, useForm, usePage } from "@inertiajs/react";
import { CheckCircle2, UserRound } from "lucide-react";

const fieldClass =
    "mt-1 block w-full !rounded-xl !border-slate-200 !bg-white !px-4 !py-2.5 !text-sm !text-slate-900 !shadow-sm placeholder:!text-slate-400 focus:!border-sky-500 focus:!outline-none focus:!ring-2 focus:!ring-sky-500/20";

export default function UpdateProfileInformation({
    mustVerifyEmail,
    status,
    className = "",
}) {
    const user = usePage().props.auth.user;

    const { data, setData, patch, errors, processing, recentlySuccessful } =
        useForm({
            apellido: user.apellido || "",
            telefono: user.telefono || "",
            nombre: user.nombre || "",
            email: user.email || "",
        });

    const submit = (e) => {
        e.preventDefault();
        patch(route("profile.update"));
    };

    return (
        <section
            className={`overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 ${className}`}
        >
            <div className="border-b border-slate-100 bg-gradient-to-r from-slate-900 via-slate-800 to-sky-950 px-6 py-5">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
                        <UserRound className="h-5 w-5 text-sky-200" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">
                            Información de tu perfil
                        </h2>
                        <p className="text-sm text-slate-300">
                            Modifica tus datos personales cuando lo necesites.
                        </p>
                    </div>
                </div>
            </div>

            <form onSubmit={submit} className="space-y-6 p-6 sm:p-8">
                <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                        <InputLabel htmlFor="nombre" value="Nombre" />
                        <TextInput
                            id="nombre"
                            className={fieldClass}
                            value={data.nombre}
                            onChange={(e) => setData("nombre", e.target.value)}
                            required
                            isFocused
                            autoComplete="given-name"
                            placeholder="Tu nombre"
                        />
                        <InputError className="mt-2" message={errors.nombre} />
                    </div>

                    <div>
                        <InputLabel htmlFor="apellido" value="Apellido" />
                        <TextInput
                            id="apellido"
                            className={fieldClass}
                            value={data.apellido}
                            onChange={(e) => setData("apellido", e.target.value)}
                            required
                            autoComplete="family-name"
                            placeholder="Tu apellido"
                        />
                        <InputError className="mt-2" message={errors.apellido} />
                    </div>

                    <div>
                        <InputLabel htmlFor="telefono" value="Teléfono" />
                        <TextInput
                            id="telefono"
                            className={fieldClass}
                            value={data.telefono}
                            onChange={(e) => setData("telefono", e.target.value)}
                            autoComplete="tel"
                            placeholder="Tu teléfono"
                        />
                        <InputError className="mt-2" message={errors.telefono} />
                    </div>

                    <div>
                        <InputLabel htmlFor="email" value="Email" />
                        <TextInput
                            id="email"
                            type="email"
                            className={fieldClass}
                            value={data.email}
                            onChange={(e) => setData("email", e.target.value)}
                            required
                            autoComplete="email"
                            placeholder="Tu email"
                        />
                        <InputError className="mt-2" message={errors.email} />
                    </div>
                </div>

                {mustVerifyEmail && user.email_verified_at === null && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        <p>
                            Tu email aún no está verificado.{" "}
                            <Link
                                href={route("verification.send")}
                                method="post"
                                as="button"
                                className="font-semibold underline hover:text-amber-950"
                            >
                                Reenviar email de verificación
                            </Link>
                        </p>

                        {status === "verification-link-sent" && (
                            <p className="mt-2 font-medium text-emerald-700">
                                Hemos enviado un nuevo enlace de verificación a tu email.
                            </p>
                        )}
                    </div>
                )}

                <div className="flex flex-wrap items-center gap-4 border-t border-slate-100 pt-6">
                    <button
                        type="submit"
                        disabled={processing}
                        className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {processing ? "Guardando…" : "Guardar cambios"}
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
                            Cambios guardados
                        </p>
                    </Transition>
                </div>
            </form>
        </section>
    );
}
