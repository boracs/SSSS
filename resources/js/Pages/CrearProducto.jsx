import React, { useState } from 'react';
import Layout1 from '../layouts/Layout1';
import { Link, useForm } from '@inertiajs/react';
import { toast } from 'react-toastify';
import ProductTagSelector from '../components/ProductTagSelector';
import { showInertiaErrors } from '../lib/inertiaErrors';

const inputClass =
    'mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

function FieldError({ message }) {
    if (!message) return null;
    return <p className="mt-1 text-sm text-rose-600">{message}</p>;
}

const CrearProducto = ({ productTagOptions = [] }) => {
  const [previewUrls, setPreviewUrls] = useState([]);
  const { data, setData, post, processing, errors, reset } = useForm({
    nombre: '',
    precio: '',
    unidades: '',
    imagenes: [],
    descuento: '',
    eliminado: false,
    tags: [],
  });

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    setData('imagenes', files);
    setPreviewUrls(files.map((file) => URL.createObjectURL(file)));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    post(route('producto.create'), {
      forceFormData: true,
      preserveScroll: true,
      onSuccess: () => {
        reset();
        setPreviewUrls([]);
        toast.success('Producto creado correctamente.');
      },
      onError: (errs) => showInertiaErrors(errs, toast, 'No se pudo crear el producto.'),
    });
  };

  return (
    <Layout1>
      <div className="max-w-md mx-auto p-4 border rounded-lg shadow-sm bg-white mb-12 mt-12">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Crear Nuevo Producto</h2>
          <Link
            href={route('mostrar.productos')}
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Volver al listado
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" encType="multipart/form-data">
          <div>
            <label htmlFor="nombre" className="block text-sm font-medium text-gray-700">Nombre</label>
            <input
              id="nombre"
              type="text"
              name="nombre"
              value={data.nombre}
              onChange={(e) => setData('nombre', e.target.value)}
              className={inputClass}
              required
            />
            <FieldError message={errors.nombre} />
          </div>

          <div>
            <label htmlFor="precio" className="block text-sm font-medium text-gray-700">Precio</label>
            <input
              id="precio"
              type="number"
              name="precio"
              value={data.precio}
              onChange={(e) => setData('precio', e.target.value)}
              className={inputClass}
              required
            />
            <FieldError message={errors.precio} />
          </div>

          <div>
            <label htmlFor="unidades" className="block text-sm font-medium text-gray-700">Unidades</label>
            <input
              id="unidades"
              type="number"
              name="unidades"
              value={data.unidades}
              onChange={(e) => setData('unidades', e.target.value)}
              className={inputClass}
              required
            />
            <FieldError message={errors.unidades} />
          </div>

          <div>
            <label htmlFor="imagenes" className="block text-sm font-medium text-gray-700 mb-2">Imágenes</label>
            <input
              id="imagenes"
              type="file"
              name="imagenes"
              multiple
              onChange={handleImageChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:border-0 file:rounded-lg file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              accept="image/*"
            />
            <FieldError message={errors.imagenes} />
            {previewUrls.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-2">
                {previewUrls.map((src, i) => (
                  <img
                    key={src}
                    src={src}
                    alt={`Vista previa ${i + 1}`}
                    className="h-24 w-24 object-cover rounded-md shadow-md"
                  />
                ))}
              </div>
            )}
          </div>

          <ProductTagSelector
            options={productTagOptions}
            selected={data.tags}
            onChange={(tags) => setData('tags', tags)}
            idPrefix="create-product-tag"
          />
          <FieldError message={errors.tags} />

          <div>
            <label htmlFor="descuento" className="block text-sm font-medium text-gray-700">Descuento (%)</label>
            <input
              id="descuento"
              type="number"
              name="descuento"
              value={data.descuento}
              onChange={(e) => setData('descuento', e.target.value)}
              className={inputClass}
            />
            <FieldError message={errors.descuento} />
          </div>

          <div className="flex items-center">
            <input
              id="eliminado"
              type="checkbox"
              name="eliminado"
              checked={data.eliminado}
              onChange={(e) => setData('eliminado', e.target.checked)}
              className="h-4 w-4 text-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="eliminado" className="ml-2 text-sm text-gray-700">Producto Eliminado</label>
          </div>

          <div>
            <button
              type="submit"
              disabled={processing}
              className="w-full py-2 px-4 bg-green-600 text-white font-semibold rounded-lg shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {processing ? 'Creando…' : 'Crear Producto'}
            </button>
          </div>
        </form>
      </div>
    </Layout1>
  );
};

export default CrearProducto;
