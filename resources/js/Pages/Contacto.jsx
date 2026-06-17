import React from 'react';
import FomrularioContacto from '../components/FormularioContacto';
import Layout1 from '../layouts/Layout1';

const Contacto = () => {
  return (
    <Layout1>
      <div className="flex min-h-screen items-center justify-center bg-gray-100 px-6 py-8">
        <FomrularioContacto />
      </div>
    </Layout1>
  );
};

export default Contacto;
