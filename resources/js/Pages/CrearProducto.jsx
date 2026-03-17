import React, { useState } from 'react';
import Layout1 from '../layouts/Layout1';
import { router } from '@inertiajs/react';

const CrearProducto = () => {
  const [formData, setFormData] = useState({
    nombre: '',
    precio: '',
    unidades: '',
    imagenes: [], // 👈 ahora es un array
    descuento: '',
    eliminado: false
  });

  // Inputs normales
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Varias imágenes
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setFormData({
      ...formData,
      imagenes: files
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const form = new FormData();
    form.append('nombre', formData.nombre);
    form.append('precio', formData.precio);
    form.append('unidades', formData.unidades);
    form.append('descuento', formData.descuento);
    form.append('eliminado', formData.eliminado ? 1 : 0);

    // 👇 Añadir todas las imágenes
  formData.imagenes.forEach((img) => {
      form.append('imagenes[]', img); // 👈 el nombre con [] simple
    });

    router.post('/producto-store', form, {
      forceFormData: true,
      onSuccess: () => router.visit('/productos'),
      onError: (errors) => console.error(errors),
    });
  };

  return (
    <Layout1>
      <div className="max-w-md mx-auto p-4 border rounded-lg shadow-sm bg-white mb-12 mt-12">
        <h2 className="text-xl font-semibold mb-4">Crear Nuevo Producto</h2>
        <form onSubmit={handleSubmit} className="space-y-4" encType="multipart/form-data">
          
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Nombre</label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Precio */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Precio</label>
            <input
              type="number"
              name="precio"
              value={formData.precio}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Unidades */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Unidades</label>
            <input
              type="number"
              name="unidades"
              value={formData.unidades}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Varias Imágenes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Imágenes</label>
            <input
              id="imagenes"
              type="file"
              name="imagenes"
              multiple // 👈 clave para subir varias
              onChange={handleImageChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:border-0 file:rounded-lg file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              accept="image/*"
            />
            {/* Previsualización */}
            {formData.imagenes.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-2">
                {formData.imagenes.map((img, i) => (
                  <img
                    key={i}
                    src={URL.createObjectURL(img)}
                    alt={`preview-${i}`}
                    className="h-24 w-24 object-cover rounded-md shadow-md"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Descuento */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Descuento (%)</label>
            <input
              type="number"
              name="descuento"
              value={formData.descuento}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Eliminado */}
          <div className="flex items-center">
            <input
              type="checkbox"
              name="eliminado"
              checked={formData.eliminado}
              onChange={(e) => setFormData({ ...formData, eliminado: e.target.checked })}
              className="h-4 w-4 text-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 text-sm text-gray-700">Producto Eliminado</label>
          </div>

          {/* Botón */}
          <div>
            <button
              type="submit"
              className="w-full py-2 px-4 bg-green-600 text-white font-semibold rounded-lg shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              Crear Producto
            </button>
          </div>
        </form>
      </div>
    </Layout1>
  );
};

export default CrearProducto;