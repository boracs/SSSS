import React from 'react';

const ListaUsuarios = ({ usuarios }) => {
    // Ordenar los usuarios por el número de taquilla
    const usuariosOrdenados = [...usuarios].sort((a, b) => {
        const taqA = a.numeroTaquilla ?? Number.MAX_SAFE_INTEGER;
        const taqB = b.numeroTaquilla ?? Number.MAX_SAFE_INTEGER;
        if (taqA !== taqB) return taqA - taqB;
        return `${a.nombre ?? ""} ${a.apellido ?? ""}`.localeCompare(
            `${b.nombre ?? ""} ${b.apellido ?? ""}`
        );
    });

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center py-8">
            <div className="p-6 bg-white rounded-lg shadow-md max-w-full mx-auto w-full">
                <h2 className="text-2xl font-semibold text-gray-800 mb-6">Lista de Usuarios</h2>
                
                {usuariosOrdenados.length === 0 ? (
                    <p className="text-gray-600 text-center">No hay usuarios registrados.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full table-auto">
                            <thead>
                                <tr className="bg-gray-200 text-gray-700">
                                    <th className="px-4 py-2 text-left">ID</th>
                                    <th className="px-4 py-2 text-left">Nombre</th>
                                    <th className="px-4 py-2 text-left">Apellido</th>
                                    <th className="px-4 py-2 text-left">Número de Taquilla</th>
                                    <th className="px-4 py-2 text-left">Email</th>
                                    <th className="px-4 py-2 text-left">Teléfono</th>
                                </tr>
                            </thead>
                            <tbody>
                                {usuariosOrdenados.map((usuario) => (
                                    <tr key={usuario.id} className="border-b border-gray-200">
                                        <td className="px-4 py-2">{usuario.id}</td>
                                        <td className="px-4 py-2">{usuario.nombre}</td>
                                        <td className="px-4 py-2">{usuario.apellido}</td>
                                        <td className="px-4 py-2">{usuario.numeroTaquilla}</td>
                                        <td className="px-4 py-2">{usuario.email}</td>
                                        <td className="px-4 py-2">{usuario.telefono}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ListaUsuarios;
