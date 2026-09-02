import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import AuthShell, { AuthSubmitButton, AuthTextInput, authLabelClass } from "@/components/auth/AuthShell";
import { useForm } from "@inertiajs/react";

export default function ConfirmPassword() {
    const { data, setData, post, processing, errors, reset } = useForm({
        password: "",
    });

    const submit = (e) => {
        e.preventDefault();

        post(route("password.confirm"), {
            onFinish: () => reset("password"),
        });
    };

    return (
        <AuthShell
            headTitle="Confirmar contraseña"
            title="Área segura"
            subtitle="Confirma tu contraseña antes de continuar."
        >
            <form onSubmit={submit} className="space-y-5">
                <div>
                    <InputLabel htmlFor="password" value="Contraseña" className={authLabelClass} />
                    <AuthTextInput
                        id="password"
                        type="password"
                        name="password"
                        value={data.password}
                        isFocused
                        onChange={(e) => setData("password", e.target.value)}
                    />
                    <InputError message={errors.password} className="mt-2 text-sm text-rose-300" />
                </div>

                <AuthSubmitButton disabled={processing}>
                    {processing ? "Comprobando…" : "Confirmar"}
                </AuthSubmitButton>
            </form>
        </AuthShell>
    );
}
