import AuthShell, { AuthSubmitButton } from "@/components/auth/AuthShell";
import { Link, useForm } from "@inertiajs/react";

export default function VerifyEmail({ status }) {
    const { post, processing } = useForm({});

    const submit = (e) => {
        e.preventDefault();

        post(route("verification.send"));
    };

    return (
        <AuthShell
            headTitle="Verificar correo"
            title="Verifica tu correo"
            subtitle="Gracias por registrarte. Haz clic en el enlace que te enviamos. Si no lo recibiste, te lo reenviamos."
        >
            {status === "verification-link-sent" ? (
                <div className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-950/40 px-4 py-3 text-center text-sm font-medium text-emerald-200">
                    Te hemos enviado un nuevo enlace de verificación al correo con el que te registraste.
                </div>
            ) : null}

            <form onSubmit={submit} className="space-y-5">
                <AuthSubmitButton disabled={processing}>
                    {processing ? "Enviando…" : "Reenviar correo de verificación"}
                </AuthSubmitButton>
            </form>

            <div className="mt-5 text-center">
                <Link
                    href={route("logout")}
                    method="post"
                    as="button"
                    className="text-sm font-medium text-cyan-300 transition hover:text-cyan-200"
                >
                    Cerrar sesión
                </Link>
            </div>
        </AuthShell>
    );
}
