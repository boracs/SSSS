import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import AuthShell, { AuthSubmitButton, AuthTextInput, authLabelClass } from "@/components/auth/AuthShell";
import { Link, useForm } from "@inertiajs/react";

export default function ForgotPassword({ status }) {
    const { data, setData, post, processing, errors } = useForm({
        email: "",
    });

    const submit = (e) => {
        e.preventDefault();

        post(route("password.email"));
    };

    return (
        <AuthShell
            headTitle="Recuperar contraseña"
            title="¿Olvidaste tu contraseña?"
            subtitle="Introduce tu correo y te enviaremos un enlace para elegir una nueva contraseña."
            footer={
                <p className="text-center text-sm text-slate-400">
                    ¿Recuerdas tu contraseña?{" "}
                    <Link
                        href={route("login")}
                        className="font-semibold text-cyan-300 transition hover:text-cyan-200"
                    >
                        Iniciar sesión
                    </Link>
                </p>
            }
        >
            {status ? (
                <div className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-950/40 px-4 py-3 text-center text-sm font-medium text-emerald-200">
                    Te hemos enviado el enlace de recuperación por correo.
                </div>
            ) : null}

            <form onSubmit={submit} className="space-y-5">
                <div>
                    <InputLabel htmlFor="email" value="Correo electrónico" className={authLabelClass} />
                    <AuthTextInput
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        isFocused
                        autoComplete="username"
                        onChange={(e) => setData("email", e.target.value)}
                        placeholder="tu@email.com"
                    />
                    <InputError message={errors.email} className="mt-2 text-sm text-rose-300" />
                </div>

                <AuthSubmitButton disabled={processing}>
                    {processing ? "Enviando…" : "Enviar enlace de recuperación"}
                </AuthSubmitButton>
            </form>
        </AuthShell>
    );
}
