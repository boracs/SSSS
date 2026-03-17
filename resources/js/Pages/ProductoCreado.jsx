import React from 'react';
import { router } from '@inertiajs/react';
import Layout1 from '../layouts/Layout1';

const ProductoCreadoExitosamente = () => {
  // Función para redirigir al usuario a la lista de productos o a otra página
  const handleRedirigir = () => {
    // Redirigir a la página de lista de productos
    router.get('/productos');
  };
console.log(productos);
  return (

    <Layout1>
    <div className="max-w-md mx-auto p-4 border rounded-lg shadow-sm bg-green-50">
      <div className="flex items-center justify-center mb-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          className="w-12 h-12 text-green-600"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M9 12l2 2l4 -4m0 0l2 2l4 -4m-4 4l-2 2l-4 -4"
          />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-green-700">Producto Creado Exitosamente</h2>
      <p className="mt-2 text-sm text-green-600">El producto se ha creado correctamente y está listo para ser gestionado.</p>
      <div className="mt-4">
        <button
          onClick={handleRedirigir}
          className="w-full py-2 px-4 bg-green-600 text-white font-semibold rounded-lg shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          Volver a la Lista de Productos
        </button>
      </div>
    </div>
    </Layout1>
  );
};

export default ProductoCreadoExitosamente;