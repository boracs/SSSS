import React from "react";

const Por_que_escogernos_motivo = ({ title, paragraph, bgColor = "", textColor = "" }) => {
  return (
    <article
      className={`glass-card rounded-2xl px-6 py-6 sm:px-7 sm:py-7 text-left shadow-lg transition-s4 hover:-translate-y-1 hover:shadow-2xl ${bgColor}`}
    >
      <h3
        className={`font-heading text-lg sm:text-xl font-bold mb-2 text-surf-primary ${textColor}`}
      >
        {title}
      </h3>
      <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
        {paragraph}
      </p>
    </article>
  );
};

export default Por_que_escogernos_motivo;