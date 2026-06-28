import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import PrimaryButton from "@/Components/PrimaryButton";
import TextInput from "@/Components/TextInput";
import { Head, Link, useForm } from "@inertiajs/react";
import Boton_go_back from "../../components/Boton_go_back";

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
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-gray-800 to-slate-900 px-4 text-white">
                <Head title="Registro" />

                <div className="w-full max-w-2xl p-10 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-2xl">
                    <h2 className="text-3xl font-bold text-white mb-8 text-center tracking-wide">
                        Registro Más Que Surf 🏄‍♂️
                    </h2>

                    <form onSubmit={submit} className="space-y-6">
                        {/* Nombre */}
                        <div>
                            <InputLabel
                                htmlFor="nombre"
                                value="Nombre"
                                className="text-white"
                            />
                            <TextInput
                                id="nombre"
                                name="nombre"
                                value={data.nombre}
                                onChange={(e) =>
                                    setData("nombre", e.target.value)
                                }
                                className="mt-1 w-full rounded-md bg-white/10 border border-white/20 text-white placeholder-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                placeholder="Tu nombre"
                                required
                            />
                            <InputError
                                message={errors.nombre}
                                className="mt-2 text-red-400"
                            />
                        </div>

                        {/* Apellido */}
                        <div>
                            <InputLabel
                                htmlFor="apellido"
                                value="Apellido"
                                className="text-white"
                            />
                            <TextInput
                                id="apellido"
                                name="apellido"
                                value={data.apellido}
                                onChange={(e) =>
                                    setData("apellido", e.target.value)
                                }
                                className="mt-1 w-full rounded-md bg-white/10 border border-white/20 text-white placeholder-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                placeholder="Tu apellido"
                                required
                            />
                            <InputError
                                message={errors.apellido}
                                className="mt-2 text-red-400"
                            />
                        </div>

                        {/* Email */}
                        <div>
                            <InputLabel
                                htmlFor="email"
                                value="Email"
                                className="text-white"
                            />
                            <TextInput
                                id="email"
                                type="email"
                                name="email"
                                value={data.email}
                                onChange={(e) =>
                                    setData("email", e.target.value)
                                }
                                className="mt-1 w-full rounded-md bg-white/10 border border-white/20 text-white placeholder-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                placeholder="correo@ejemplo.com"
                                autoComplete="username"
                                required
                            />
                            <InputError
                                message={errors.email}
                                className="mt-2 text-red-400"
                            />
                        </div>

                        {/* Teléfono */}
                        <div>
                            <InputLabel
                                htmlFor="telefono"
                                value="Teléfono"
                                className="text-white"
                            />
                            <TextInput
                                id="telefono"
                                name="telefono"
                                value={data.telefono}
                                onChange={(e) =>
                                    setData("telefono", e.target.value)
                                }
                                className="mt-1 w-full rounded-md bg-white/10 border border-white/20 text-white placeholder-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                placeholder="+34 612 345 678"
                                required
                            />
                            <InputError
                                message={errors.telefono}
                                className="mt-2 text-red-400"
                            />
                        </div>

                        {/* Contraseña */}
                        <div>
                            <InputLabel
                                htmlFor="password"
                                value="Contraseña"
                                className="text-white"
                            />
                            <TextInput
                                id="password"
                                type="password"
                                name="password"
                                value={data.password}
                                onChange={(e) =>
                                    setData("password", e.target.value)
                                }
                                className="mt-1 w-full rounded-md bg-white/10 border border-white/20 text-white placeholder-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                placeholder="••••••••"
                                autoComplete="new-password"
                                required
                            />
                            <InputError
                                message={errors.password}
                                className="mt-2 text-red-400"
                            />
                        </div>

                        {/* Confirmar Contraseña */}
                        <div>
                            <InputLabel
                                htmlFor="password_confirmation"
                                value="Confirmar Contraseña"
                                className="text-white"
                            />
                            <TextInput
                                id="password_confirmation"
                                type="password"
                                name="password_confirmation"
                                value={data.password_confirmation}
                                onChange={(e) =>
                                    setData(
                                        "password_confirmation",
                                        e.target.value
                                    )
                                }
                                className="mt-1 w-full rounded-md bg-white/10 border border-white/20 text-white placeholder-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                placeholder="••••••••"
                                autoComplete="new-password"
                                required
                            />
                            <InputError
                                message={errors.password_confirmation}
                                className="mt-2 text-red-400"
                            />
                        </div>

                        {/* Botón + Enlace */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <Link
                                href={route("login")}
                                className="text-sm text-indigo-400 hover:text-indigo-300 transition"
                            >
                                ¿Ya tienes cuenta?
                            </Link>

                            <PrimaryButton
                                className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                disabled={processing}
                            >
                                {processing ? "Registrando..." : "Registrar"}
                            </PrimaryButton>
                        </div>

                        <div className="pt-6 text-center">
                            <Boton_go_back />
                        </div>
                    </form>
                </div>
            </div>
    );
}
