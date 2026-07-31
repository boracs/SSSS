/**
 * @deprecated Usa Producto con density="compact" / compact.
 * Wrapper fino para no romper imports antiguos.
 */
import Producto from "./Producto";

export default function ProductoOferta(props) {
    return <Producto {...props} density="compact" compact />;
}
