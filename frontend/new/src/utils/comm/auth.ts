import { useAppStore } from "../../stores/appStore";
import { getRoute } from "../staticRoutes";

export function authorize(token: string): Promise<void> {
  return new Promise((resolve, reject) => {
    fetch(getRoute("AUTHORIZATION"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
    })
      .then((res) => {
        if (res.ok) {
          console.debug("Authorize response OK");
          return res.json()
        }
        throw new Error(`Authorization failed with ${res.status} ${res.statusText}`);}
      )
      .then((data) => {
        if ("role" in data) {
          console.debug("Authorize data role", data.role);
          useAppStore.getState().updateToken(token);
          useAppStore.getState().updateRole(data.role);
          localStorage.setItem("token", token);
          resolve();
        } else {
          console.debug("Authorize data error", data);
          reject(data.error);
        }
      })
      .catch((error) => reject(error));
  });
}

export function logout() {
  useAppStore.getState().updateToken("");
  localStorage.removeItem("token");
  document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  window.location.href = "/";
}
