import React from "react";
import Layout1 from "../layouts/Layout1";
import ListaUsuarios from "../components/ListaUsuarios";

export default function ListaUsuariosPage({ usuarios = [] }) {
    return (
        <Layout1>
            <ListaUsuarios usuarios={usuarios} />
        </Layout1>
    );
}
