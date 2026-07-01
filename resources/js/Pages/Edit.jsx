import { Head } from "@inertiajs/react";
import { ArrowLeft } from "lucide-react";
import DeleteUserForm from "./Partials/DeleteUserForm";
import UpdatePasswordForm from "./Partials/UpdatePasswordForm";
import UpdateProfileInformationForm from "./Partials/UpdateProfileInformationForm";

export default function Edit({ mustVerifyEmail, status }) {
    return (
        <>
            <Head title="Mi perfil" />

            <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
                <div className="mx-auto w-full max-w-3xl space-y-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                                Mi perfil
                            </h1>
                            <p className="mt-1 text-sm text-slate-500">
                                Actualiza tu información personal, contraseña y preferencias de cuenta.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => window.history.back()}
                            className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Volver atrás
                        </button>
                    </div>

                    <UpdateProfileInformationForm
                        mustVerifyEmail={mustVerifyEmail}
                        status={status}
                    />

                    <UpdatePasswordForm />

                    <DeleteUserForm />
                </div>
            </div>
        </>
    );
}
