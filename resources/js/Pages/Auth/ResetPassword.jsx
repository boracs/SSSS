import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import AuthShell, { AuthSubmitButton, AuthTextInput, authLabelClass } from "@/components/auth/AuthShell";
import { Link, useForm } from "@inertiajs/react";

export default function ResetPassword({ token, email }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        token: token,
        email: email,
        password: "",
        password_confirmation: "",
    });

    const submit = (e) => {
        e.preventDefault();

        post(route("password.store"), {
            onFinish: () => reset("password", "password_confirmation"),
        });
    };

    return (
        <AuthShell
            headTitle="Nueva contraseña"
            title="Restablecer contraseña"
            subtitle="Elige una contraseña segura para tu cuenta S4."
            footer={
                <p className="text-center text-sm text-slate-400">
                    ¿Ya tienes cuenta?{" "}
                    <Link
                        href={route("login")}
                        className="font-semibold text-cyan-300 transition hover:text-cyan-200"
                    >
                        Iniciar sesión
                    </Link>
                </p>
            }
        >
            <form onSubmit={submit} className="space-y-5">
                <div>
                    <InputLabel htmlFor="email" value="Correo electrónico" className={authLabelClass} />
                    <AuthTextInput
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        autoComplete="username"
                        onChange={(e) => setData("email", e.target.value)}
                    />
                    <InputError message={errors.email} className="mt-2 text-sm text-rose-300" />
                </div>

                <div>
                    <InputLabel htmlFor="password" value="Contraseña" className={authLabelClass} />
                    <AuthTextInput
                        id="password"
                        type="password"
                        name="password"
                        value={data.password}
                        autoComplete="new-password"
                        isFocused
                        onChange={(e) => setData("password", e.target.value)}
                    />
                    <InputError message={errors.password} className="mt-2 text-sm text-rose-300" />
                </div>

                <div>
                    <InputLabel
                        htmlFor="password_confirmation"
                        value="Confirmar contraseña"
                        className={authLabelClass}
                    />
                    <AuthTextInput
                        type="password"
                        id="password_confirmation"
                        name="password_confirmation"
                        value={data.password_confirmation}
                        autoComplete="new-password"
                        onChange={(e) => setData("password_confirmation", e.target.value)}
                    />
                    <InputError message={errors.password_confirmation} className="mt-2 text-sm text-rose-300" />
                </div>

                <AuthSubmitButton disabled={processing}>
                    {processing ? "Guardando…" : "Restablecer contraseña"}
                </AuthSubmitButton>
            </form>
        </AuthShell>
    );
}
