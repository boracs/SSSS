import React from 'react';
import { usePage, Link } from '@inertiajs/react';
import Layout1 from '../layouts/Layout1';

const MostrarPedidos = () => {
    const { pedidos } = usePage().props; // Recibimos los pedidos de la página

    // Función para obtener la clase de color según el estado del pedido
    const getStatusClass = (pagado, entregado) => {
        if (pagado && entregado) return 'bg-green-200'; // Pagado y entregado (verde)
        if (!pagado && entregado) return 'bg-red-200';  // Entregado pero no pagado (rojo)
        if (pagado && !entregado) return 'bg-yellow-200'; // Pagado pero no entregado (amarillo)
        return 'bg-gray-200'; // No pagado y no entregado (gris)
    };

    return (
        <Layout1>
            <div className="min-h-screen bg-gray-100 flex items-center justify-center py-8">
                <div className="max-w-4xl w-full bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-3xl font-semibold text-gray-800 mb-6 text-center">Pedidos del Usuario</h2>

                    {/* Explicación sobre los colores */}
                    <div className="mb-4 text-center text-sm text-gray-600">
                        <p><strong>Estado de los pedidos:</strong></p>
                        <p className="text-green-600">Verde: Pagado y entregado</p>
                        <p className="text-red-600">Rojo: Entregado pero no pagado</p>
                        <p className="text-yellow-600">Amarillo: Pagado pero no entregado</p>
                        <p className="text-gray-600">Gris: No pagado y no entregado</p>
                    </div>

                    {/* Mostrar los pedidos */}
                    <div className="space-y-6">
                        {pedidos.length === 0 ? (
                            <p className="text-lg text-gray-600">No tienes pedidos aún.</p>
                        ) : (
                            pedidos.map((pedido) => (
                                <div
                                    key={pedido.id}
                                    className={`${getStatusClass(pedido.pagado, pedido.entregado)} p-6 rounded-lg shadow-sm`}
                                >
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-xl font-semibold text-gray-800">Pedido nº {pedido.id}</h3>
                                        <p className="text-lg text-gray-800 font-semibold">{pedido.precio_total ?? 0} €</p>
                                    </div>
                                    <p className="text-sm text-gray-600">Fecha: {new Date(pedido.created_at).toLocaleDateString('es-ES')}</p>
                                    <p className="text-sm text-gray-600">Estado: {pedido.pagado ? 'Pagado' : 'Pendiente'} - {pedido.entregado ? 'Entregado' : 'No entregado'}</p>

                                    <div className="mt-6">
                                        <Link href={route('mostrar.pedido', pedido.id)} className="text-blue-600 hover:underline">
                                            Ver detalles del pedido
                                        </Link>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </Layout1>
    );
};

export default MostrarPedidos;