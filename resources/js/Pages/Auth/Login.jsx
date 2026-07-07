import Checkbox from "@/Components/Checkbox";
import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import AuthShell, { AuthSubmitButton, AuthTextInput, authLabelClass } from "@/components/auth/AuthShell";
import { Link, useForm } from "@inertiajs/react";

export default function Login({ status, canResetPassword }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: "",
        password: "",
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();
        post(route("login"), {
            onFinish: () => reset("password"),
        });
    };

    return (
        <AuthShell
            headTitle="Iniciar sesión"
            title="Bienvenido de nuevo"
            subtitle="Accede a tu cuenta para reservar clases, gestionar tu taquilla y comprar en la tienda S4."
            footer={
                <p className="text-center text-sm text-slate-400">
                    ¿No tienes cuenta?{" "}
                    <Link
                        href={route("register")}
                        className="font-semibold text-cyan-300 transition hover:text-cyan-200"
                    >
                        Crear cuenta
                    </Link>
                </p>
            }
        >
            {status ? (
                <div className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-950/40 px-4 py-3 text-center text-sm font-medium text-emerald-200">
                    {status}
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
                        autoComplete="username"
                        isFocused
                        onChange={(e) => setData("email", e.target.value)}
                        placeholder="tu@email.com"
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
                        autoComplete="current-password"
                        onChange={(e) => setData("password", e.target.value)}
                    />
                    <InputError message={errors.password} className="mt-2 text-sm text-rose-300" />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <label className="flex cursor-pointer items-center text-sm text-slate-300">
                        <Checkbox
                            name="remember"
                            checked={data.remember}
                            onChange={(e) => setData("remember", e.target.checked)}
                        />
                        <span className="ml-2">Recordarme</span>
                    </label>

                    {canResetPassword ? (
                        <Link
                            href={route("password.request")}
                            className="text-sm font-medium text-cyan-300 transition hover:text-cyan-200"
                        >
                            ¿Olvidaste tu contraseña?
                        </Link>
                    ) : null}
                </div>

                <AuthSubmitButton disabled={processing}>
                    {processing ? "Entrando…" : "Iniciar sesión"}
                </AuthSubmitButton>
            </form>
        </AuthShell>
    );
}
