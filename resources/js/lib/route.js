import { route as ziggyRoute } from "ziggy-js";
import { Ziggy } from "../ziggy";

export function route(name, params, absolute, config = Ziggy) {
    return ziggyRoute(name, params, absolute, config);
}

export default route;
