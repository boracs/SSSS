import React from 'react';
import { Link } from '@inertiajs/react';

const OpcionesIntro = () => {
  const opciones = [
    { texto: 'Clases de Surf', imagen: '/img/sunset_surf.webp', url: '/clases-de-surf', externa: false },
    { texto: 'Surftrips', imagen: '/img/trip.jpg', url: '/surftrips', externa: false },
    { texto: 'Surfskate', imagen: '/img/surf_skate.webp', url: '/surfskate', externa: false },
    { texto: 'Tienda', imagen: '/img/tienda_1.webp', url: '/tienda', externa: false },
    { texto: 'Taquillas', imagen: '/img/instalaciones.jpg', url: '/taquillas', externa: false },
    { texto: 'Webcam', imagen: '/img/zurriola_webcam.webp', url: 'https://www.zurriolacam.com.es', externa: true },
    { texto: 'Ofertas', imagen: '/img/ofertas.webp', url: 'https://www.google.com', externa: true },
  ];

  return (
    <div className="w-full h-[300px] flex bg-gray-800">
      {opciones.map((opcion, index) => (
        opcion.externa ? (
          // Si es una URL externa
          <a
            key={index}
            href={opcion.url}
            target="_blank"
            rel="noopener noreferrer"
            className="relative flex-1 h-full bg-cover bg-center group"
            style={{ backgroundImage: `url(${opcion.imagen})` }}
          >
            <div className="absolute inset-0 bg-black bg-opacity-50 group-hover:bg-opacity-20 transition-opacity duration-300"></div>
            <span className="absolute inset-0 flex items-center justify-center text-white font-bold transform">
              <span className="text-sm sm:text-base md:text-lg rotate-2">
                {opcion.texto}
              </span>
            </span>
          </a>
        ) : (
          // Si es una URL interna
          <Link
            key={index}
            href={opcion.url}
            className="relative flex-1 h-full bg-cover bg-center group"
            style={{ backgroundImage: `url(${opcion.imagen})` }}
          >
            <div className="absolute inset-0 bg-black bg-opacity-50 group-hover:bg-opacity-20 transition-opacity duration-300"></div>
            <span className="absolute inset-0 flex items-center justify-center text-white font-bold transform">
              <span className="text-sm sm:text-base md:text-lg rotate-2">
                {opcion.texto}
              </span>
            </span>
          </Link>
        )
      ))}
    </div>
  );
};

export default OpcionesIntro;
