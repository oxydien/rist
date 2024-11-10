import { render } from "preact";
import { App } from "./app.tsx";

import "./assets/styles/variables.css";

const root = document.getElementById("rist_app");
if (root) {
	render(<App />, root);
}
