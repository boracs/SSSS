import React from 'react';
import FomrularioContacto from '../components/FormularioContacto';
import Layout1 from '../layouts/Layout1';

const Contacto = () => {
  return (
    <Layout1>
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-100 via-white to-slate-100 px-4 py-12 sm:px-6">
        <FomrularioContacto />
      </div>
    </Layout1>
  );
};

export default Contacto;
