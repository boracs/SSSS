import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import AuthShell, { AuthSubmitButton, AuthTextInput, authLabelClass } from "@/components/auth/AuthShell";
import { Link, useForm } from "@inertiajs/react";

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm({
        nombre: "",
        apellido: "",
        email: "",
        telefono: "",
        numeroTaquilla: "",
        password: "",
        password_confirmation: "",
    });

    const submit = (e) => {
        e.preventDefault();
        post(route("register"), {
            onFinish: () => reset("password", "password_confirmation"),
        });
    };

    return (
        <AuthShell
            headTitle="Registro"
            title="Crea tu cuenta S4"
            subtitle="Regístrate para reservar clases, alquilar material y acceder a la tienda oficial de la escuela."
            maxWidth="max-w-xl"
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
                <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                        <InputLabel htmlFor="nombre" value="Nombre" className={authLabelClass} />
                        <AuthTextInput
                            id="nombre"
                            name="nombre"
                            value={data.nombre}
                            onChange={(e) => setData("nombre", e.target.value)}
                            placeholder="Tu nombre"
                            required
                        />
                        <InputError message={errors.nombre} className="mt-2 text-sm text-rose-300" />
                    </div>

                    <div>
                        <InputLabel htmlFor="apellido" value="Apellido" className={authLabelClass} />
                        <AuthTextInput
                            id="apellido"
                            name="apellido"
                            value={data.apellido}
                            onChange={(e) => setData("apellido", e.target.value)}
                            placeholder="Tu apellido"
                            required
                        />
                        <InputError message={errors.apellido} className="mt-2 text-sm text-rose-300" />
                    </div>
                </div>

                <div>
                    <InputLabel htmlFor="email" value="Correo electrónico" className={authLabelClass} />
                    <AuthTextInput
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        onChange={(e) => setData("email", e.target.value)}
                        placeholder="correo@ejemplo.com"
                        autoComplete="username"
                        required
                    />
                    <InputError message={errors.email} className="mt-2 text-sm text-rose-300" />
                </div>

                <div>
                    <InputLabel htmlFor="telefono" value="Teléfono" className={authLabelClass} />
                    <AuthTextInput
                        id="telefono"
                        name="telefono"
                        value={data.telefono}
                        onChange={(e) => setData("telefono", e.target.value)}
                        placeholder="+34 612 345 678"
                        required
                    />
                    <InputError message={errors.telefono} className="mt-2 text-sm text-rose-300" />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                        <InputLabel htmlFor="password" value="Contraseña" className={authLabelClass} />
                        <AuthTextInput
                            id="password"
                            type="password"
                            name="password"
                            value={data.password}
                            onChange={(e) => setData("password", e.target.value)}
                            autoComplete="new-password"
                            required
                        />
                        <InputError message={errors.password} className="mt-2 text-sm text-rose-300" />
                    </div>

                    <div>
                        <InputLabel htmlFor="password_confirmation" value="Confirmar contraseña" className={authLabelClass} />
                        <AuthTextInput
                            id="password_confirmation"
                            type="password"
                            name="password_confirmation"
                            value={data.password_confirmation}
                            onChange={(e) => setData("password_confirmation", e.target.value)}
                            autoComplete="new-password"
                            required
                        />
                        <InputError message={errors.password_confirmation} className="mt-2 text-sm text-rose-300" />
                    </div>
                </div>

                <AuthSubmitButton disabled={processing}>
                    {processing ? "Creando cuenta…" : "Crear cuenta"}
                </AuthSubmitButton>
            </form>
        </AuthShell>
    );
}
