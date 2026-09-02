import React from 'react';
import PageShell from "@/layouts/PageShell";
 // Asegúrate de que la ruta sea correcta
import { Link } from '@inertiajs/react';


const ProductosModificado = ({ productos, mensaje }) => {
  React.useEffect(() => {
    if (mensaje) {
      alert(mensaje); // O cualquier otra forma de mostrar el mensaje
    }
  }, [mensaje]);

  return (
    <PageShell variant="light">
      <div className="min-h-screen flex flex-col bg-gray-50 py-12 sm:py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Artículo modificado con éxito
            </h1>
            <p className="mt-2 text-lg text-gray-500">
              El producto se ha actualizado correctamente en la base de datos.
            </p>
          </div>

          <div className="mt-8 text-center">
         
       
          <Link href={route('mostrar.productos')}    className="inline-block px-6 py-3 text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                 Productos
           </Link>
                      

          </div>
        </div>
      </div>
    </PageShell>
  );
};

export default ProductosModificado;