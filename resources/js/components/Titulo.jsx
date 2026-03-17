import React from "react";

const Titulo = () => {
  return (
    <div className="bg-gradient-to-r from-surf-primary via-slate-900 to-surf-secondary text-surf-sand">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 md:px-10 lg:px-16 py-6 sm:py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="font-heading text-xs sm:text-sm font-semibold tracking-[0.3em] uppercase text-surf-secondary/80">
            S4 · San Sebastian Surf School
          </p>
          <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
            Domina el Cantábrico con{" "}
            <span className="text-surf-secondary">S4</span>
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-surf-sand/80 max-w-xl">
            Escuela de surf premium en San Sebastián. Seguridad, técnica y experiencia
            local en La Concha y Zurriola.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Titulo;