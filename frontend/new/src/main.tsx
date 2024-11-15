import { render } from "preact";
import { App } from "./app.tsx";

import "./assets/styles/variables.css";
import { useAppStore } from "./stores/appStore.ts";
import { moduleRoutes } from "./utils/staticRoutes.ts";

const root = document.getElementById("rist_app");
if (root) {
  render(<App />, root);
}

for (const module of useAppStore.getState().modules) {
  for (const route of module.apiRoutes) {
    moduleRoutes[route[0]] = route[1];
  }
}

const token = localStorage.getItem("token");
if (token) {
  useAppStore.getState().updateToken(token);
}
