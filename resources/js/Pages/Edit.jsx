import { Head } from "@inertiajs/react";
import DeleteUserForm from "./Partials/DeleteUserForm";
import UpdatePasswordForm from "./Partials/UpdatePasswordForm";
import UpdateProfileInformationForm from "./Partials/UpdateProfileInformationForm";
import Boton_go_back from "../components/Boton_go_back";

export default function Edit({ mustVerifyEmail, status }) {
    return (
        <>
            <Head title="Profile" />

            {/* Fondo y contenedor principal */}
            <div className="min-h-screen bg-gradient-to-b from-gray-100 via-gray-200 to-gray-300 py-12 flex flex-col justify-center">
                <div className="container mx-auto max-w-7xl px-6 sm:px-8 space-y-8">
                    {/* Botón de Regreso */}
                    <Boton_go_back />

                    {/* Formulario de Información del Perfil */}
                    <div className="bg-white shadow-xl rounded-2xl p-8 sm:p-10 space-y-6 border-t-4 border-indigo-500">
                        <UpdateProfileInformationForm
                            mustVerifyEmail={mustVerifyEmail}
                            status={status}
                            className="max-w-2xl mx-auto"
                        />
                    </div>

                    {/* Formulario de Contraseña */}
                    <div className="bg-white shadow-xl rounded-2xl p-8 sm:p-10 space-y-6 border-t-4 border-indigo-500">
                        <UpdatePasswordForm className="max-w-2xl mx-auto" />
                    </div>

                    {/* Formulario de Eliminar Cuenta */}
                    <div className="bg-white shadow-xl rounded-2xl p-8 sm:p-10 space-y-6 border-t-4 border-indigo-500">
                        <DeleteUserForm className="max-w-2xl mx-auto" />
                    </div>

                    {/* Botón de Regreso */}
                    <Boton_go_back />
                </div>
            </div>
        </>
    );
}
