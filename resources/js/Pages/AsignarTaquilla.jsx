import { router, usePage } from '@inertiajs/react';
import React, { useState, useEffect } from 'react';
import Layout1 from '../layouts/Layout1'; // Asegúrate de que tienes tu layout

const AsignarTaquilla = () => {
    const { usuarios, success } = usePage().props; // Obtener los usuarios y el mensaje de éxito
    const [usuarioId, setUsuarioId] = useState('');
    const [numeroTaquilla, setNumeroTaquilla] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);

    // Mostrar el mensaje de éxito si está presente
    useEffect(() => {
        if (success) {
            alert(success);  // Mostrar mensaje de éxito
        }
    }, [success]);

    // Función para manejar el cambio del selector de usuario
    const handleUsuarioChange = (e) => {
        const usuarioId = e.target.value;
        setUsuarioId(usuarioId);
        const usuario = usuarios.find(user => user.id == usuarioId);
        setUsuarioSeleccionado(usuario);
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Validación de los campos
        if (!usuarioId || !numeroTaquilla) {
            alert('Por favor, completa todos los campos.');
            return;
        }

        setIsSubmitting(true);

        // Enviar datos con router de Inertia
        router.post(route('asignar.taquilla'), {
            usuario_id: usuarioId,
            numero_taquilla: numeroTaquilla
        }, {
            onSuccess: () => {
                alert('Taquilla asignada correctamente');
                setIsSubmitting(false);
                setUsuarioId('');
                setNumeroTaquilla('');
                setUsuarioSeleccionado(null);
            },
            onError: () => {
                alert('Hubo un error al asignar la taquilla.');
                setIsSubmitting(false);
            }
        });
    };

    // Ordenar usuarios por número de taquilla (de menor a mayor)
    const usuariosConTaquilla = usuarios.filter(usuario => usuario.numeroTaquilla).sort((a, b) => a.numeroTaquilla - b.numeroTaquilla);

    return (
        <Layout1>
            <div className="container mx-auto py-12">
                <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">
                    Asignar Taquilla a un Usuario
                </h1>

                {/* Mostrar mensaje de éxito */}
                {success && (
                    <div className="p-4 mb-4 text-white rounded-md bg-green-600">
                        {success}
                    </div>
                )}

                {/* Selector de usuario */}
                <div className="mb-6">
                    <label htmlFor="usuario" className="block text-sm font-medium text-gray-700">Seleccionar Usuario</label>
                    <select
                        id="usuario"
                        value={usuarioId}
                        onChange={handleUsuarioChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Seleccione un usuario</option>
                        {usuarios.map((usuario) => (
                            <option key={usuario.id} value={usuario.id}>
                                {usuario.nombre} {usuario.apellido}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Mostrar el número de taquilla en rojo y grande si el usuario está seleccionado */}
                {usuarioSeleccionado && usuarioSeleccionado.numeroTaquilla && (
                    <div className="text-center mb-6">
                        <p className="text-5xl font-bold text-red-600">
                            Número de Taquilla: {usuarioSeleccionado.numeroTaquilla}
                        </p>
                    </div>
                )}

                {/* Mostrar los otros datos del usuario (nombre, apellido, email, teléfono) */}
                {usuarioSeleccionado && (
                    <div className="text-center mb-6">
                        <p className="text-lg font-medium text-black">
                            <strong>Nombre: </strong>{usuarioSeleccionado.nombre} {usuarioSeleccionado.apellido}
                        </p>
                        <p className="text-lg font-medium text-black">
                            <strong>Email: </strong>{usuarioSeleccionado.email}
                        </p>
                        <p className="text-lg font-medium text-black">
                            <strong>Teléfono: </strong>{usuarioSeleccionado.telefono}
                        </p>
                    </div>
                )}

                {/* Formulario para asignar la taquilla */}
                <form onSubmit={handleSubmit} className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
                    <div className="mb-4">
                        <label htmlFor="numeroTaquilla" className="block text-sm font-medium text-gray-700">Número de Taquilla</label>
                        <input
                            type="text"
                            id="numeroTaquilla"
                            value={numeroTaquilla}
                            onChange={(e) => setNumeroTaquilla(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    <div className="flex justify-center">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`w-full px-4 py-2 text-white font-semibold rounded-md focus:outline-none ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                        >
                            {isSubmitting ? 'Asignando...' : 'Asignar Taquilla'}
                        </button>
                    </div>
                </form>

                {/* Lista de usuarios con taquilla */}
                <div className="mt-12 max-h-[50vh] overflow-y-auto bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Usuarios con Taquilla</h2>
                    <table className="min-w-full table-auto">
                        <thead>
                            <tr className="border-b">
                                <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Nombre</th>
                                <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Taquilla</th>
                            </tr>
                        </thead>
                        <tbody>
                            {usuariosConTaquilla.map((usuario) => (
                                <tr key={usuario.id} className="border-b">
                                    <td className="px-4 py-2 text-sm text-gray-800">{usuario.nombre} {usuario.apellido}</td>
                                    <td className="px-4 py-2 text-sm text-gray-800">{usuario.numeroTaquilla}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </Layout1>
    );
};

export default AsignarTaquilla;
