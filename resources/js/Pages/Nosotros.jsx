import React, { useState } from "react";
import Layout1 from "../layouts/Layout1";
import SafeImage from "../components/SafeImage";
import "../../css/nosotros.css";

const slides = [
    "https://images.pexels.com/photos/111085/pexels-photo-111085.jpeg?cs=srgb&dl=pexels-bradleyhook-111085.jpg&fm=jpg",
    "https://berriasurfschool.com/wp-content/uploads/2023/07/beneficios-del-surf-para-la-salud.jpg",
    "https://c.files.bbci.co.uk/D4EF/production/_129711545_gettyimages-586626621.jpg",
    "https://dus6dayednven.cloudfront.net/app/uploads/2023/03/Alpha-Universe-IG-FF-Waves-Stan-Moniz-2-3.jpg",
];

const instalaciones = [
    { src: "/img/toalla_basica.jpg", alt: "Instalación playa" },
    { src: "/img/zurriola.jpg", alt: "Zurriola" },
    { src: "/img/fondo_olas.jpg", alt: "Olas" },
    { src: "/img/fondo_olas.jpg", alt: "Costa" },
    { src: "/img/zurriola.jpg", alt: "Playa" },
    { src: "/img/toalla_basica.jpg", alt: "Servicios" },
];

export default function SobreNosotros() {
    const [currentSlide, setCurrentSlide] = useState(0);

    const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);
    const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);

    return (
        <Layout1>
            <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12">
                {/* Título editorial */}
                <header className="mb-12 text-center">
                    <h1 className="font-editorial text-scale-3xl font-semibold tracking-tight text-brand-deep sm:text-scale-4xl">
                        Sobre Nosotros
                    </h1>
                    <p className="mt-3 text-scale-base leading-relaxed text-slate-600">
                        San Sebastian Surf School — experiencia y seguridad en el Cantábrico.
                    </p>
                </header>

                {/* Layout editorial: Historia + Slider */}
                <div className="mb-16 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
                    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/60 sm:p-8">
                        <h2 className="font-editorial text-scale-2xl font-semibold text-brand-deep">
                            Nuestra Historia
                        </h2>
                        <p className="mt-4 text-scale-base leading-relaxed text-slate-600">
                            En San Sebastian Surf School nuestra misión es ofrecer experiencias inolvidables
                            a través del surf. Desde nuestros comienzos hemos trabajado para ofrecer un servicio
                            de calidad, seguro e innovador. Nuestra pasión por el mar y la técnica nos ha permitido
                            crecer y construir una comunidad sólida en La Concha y Zurriola.
                        </p>
                    </section>

                    <section className="rounded-2xl bg-brand-bg p-6 ring-1 ring-slate-200/60 sm:p-8">
                        <h2 className="font-editorial text-scale-2xl font-semibold text-brand-deep text-center">
                            Nuestros servicios
                        </h2>
                        <div className="slider-container mt-6">
                            <div className="slider w-full" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
                                {slides.map((url, i) => (
                                    <div key={i} className="slide">
                                        <SafeImage src={url} alt={`Servicio ${i + 1}`} className="w-full h-auto rounded-xl object-cover" />
                                    </div>
                                ))}
                            </div>
                            <button type="button" className="prev button_nosotros" onClick={prevSlide} aria-label="Anterior">❮</button>
                            <button type="button" className="next button_nosotros" onClick={nextSlide} aria-label="Siguiente">❯</button>
                        </div>
                    </section>
                </div>

                {/* Instalaciones: grid asimétrico editorial */}
                <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/60 sm:p-8">
                    <h2 className="font-editorial text-scale-2xl font-semibold text-brand-deep text-center mb-8">
                        Nuestras Instalaciones
                    </h2>
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
                        <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-100 md:col-span-2 md:row-span-2 md:aspect-[3/4] md:min-h-[220px]">
                            <SafeImage src={instalaciones[0].src} alt={instalaciones[0].alt} className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 hover:scale-105" placeholderClassName="rounded-xl" />
                        </div>
                        {instalaciones.slice(1, 5).map((img, i) => (
                            <div key={i} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-100">
                                <SafeImage src={img.src} alt={img.alt} className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 hover:scale-105" placeholderClassName="rounded-xl" />
                            </div>
                        ))}
                        <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-100 md:col-span-2">
                            <SafeImage src={instalaciones[5].src} alt={instalaciones[5].alt} className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 hover:scale-105" placeholderClassName="rounded-xl" />
                        </div>
                    </div>
                </section>
            </div>
        </Layout1>
    );
}
