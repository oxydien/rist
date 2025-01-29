import { render } from "preact";
import { App } from "./app.tsx";

import "./assets/styles/variables.css";
import { useAppStore } from "./stores/appStore.ts";

const root = document.getElementById("rist_app");
if (root) {
  render(<App />, root);
}

const token = localStorage.getItem("token");
if (token) {
  useAppStore.getState().updateToken(token);
}
