import Checkbox from "@/Components/Checkbox";
import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import PrimaryButton from "@/Components/PrimaryButton";
import TextInput from "@/Components/TextInput";
import { Link, useForm } from "@inertiajs/react";
import Boton_go_back from "../../components/Boton_go_back";

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
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 text-white px-4">
                <div className="backdrop-blur-xl bg-white/5 border border-white/10 shadow-xl rounded-2xl p-10 w-full max-w-md transition-all duration-300">
                    <h2 className="text-3xl font-bold text-white text-center mb-8">
                        Welcome Back 👋
                    </h2>

                    {status && (
                        <div className="mb-4 text-sm font-medium text-green-400 text-center">
                            {status}
                        </div>
                    )}

                    <form onSubmit={submit} className="space-y-6">
                        <div>
                            <InputLabel
                                htmlFor="email"
                                value="Email Address"
                                className="text-white"
                            />
                            <TextInput
                                id="email"
                                type="email"
                                name="email"
                                value={data.email}
                                className="mt-1 block w-full rounded-lg bg-white/10 text-white border border-white/20 placeholder-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
                                autoComplete="username"
                                isFocused={true}
                                onChange={(e) =>
                                    setData("email", e.target.value)
                                }
                                placeholder="you@example.com"
                            />
                            <InputError
                                message={errors.email}
                                className="mt-2 text-red-400"
                            />
                        </div>

                        <div>
                            <InputLabel
                                htmlFor="password"
                                value="Password"
                                className="text-white"
                            />
                            <TextInput
                                id="password"
                                type="password"
                                name="password"
                                value={data.password}
                                className="mt-1 block w-full rounded-lg bg-white/10 text-white border border-white/20 placeholder-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
                                autoComplete="current-password"
                                onChange={(e) =>
                                    setData("password", e.target.value)
                                }
                                placeholder="••••••••"
                            />
                            <InputError
                                message={errors.password}
                                className="mt-2 text-red-400"
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <label className="flex items-center text-sm text-gray-300">
                                <Checkbox
                                    name="remember"
                                    checked={data.remember}
                                    onChange={(e) =>
                                        setData("remember", e.target.checked)
                                    }
                                />
                                <span className="ml-2">Remember me</span>
                            </label>

                            {canResetPassword && (
                                <Link
                                    href={route("password.request")}
                                    className="text-sm text-indigo-400 hover:text-indigo-300 transition"
                                >
                                    Forgot?
                                </Link>
                            )}
                        </div>

                        <PrimaryButton
                            className="w-full py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            disabled={processing}
                        >
                            {processing ? "Logging in..." : "Sign In"}
                        </PrimaryButton>
                    </form>

                    <div className="mt-6 text-center text-sm text-gray-400">
                        <span>Don't have an account?</span>{" "}
                        <Link
                            href={route("register")}
                            className="text-indigo-400 hover:text-indigo-300"
                        >
                            Register
                        </Link>
                    </div>

                    <div className="mt-6 text-center">
                        <Boton_go_back />
                    </div>
                </div>
            </div>
    );
}
