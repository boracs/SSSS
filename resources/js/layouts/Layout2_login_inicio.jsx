import React from "react";
import Layout1 from "./Layout1";
import Contenedor_opciones from "../layouts/Contenedor_opciones";
import Contenedor_productos from "../layouts/Contenedor_productos";
import "../../css/layout2_login_inicio.css";

const Layout2_login_inicio = ({ productos }) => (
    <Layout1>
        <div className="layout_1">
            <div className="contenedor_del_contenedor_opciones">
                <Contenedor_opciones className="Contenedor_opciones" />
            </div>
            <div className="titulo-descuentos">
                <h1>¡Mayores Descuentos!</h1>
            </div>
            <div>
                <Contenedor_productos productos={productos} />
            </div>
        </div>
    </Layout1>
);

export default Layout2_login_inicio;
