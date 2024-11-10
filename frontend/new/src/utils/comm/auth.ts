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
          return res.json()
        }
        throw new Error(`Authorization failed with ${res.status} ${res.statusText}`);}
      )
      .then((data) => {
        if (data.role) {
          useAppStore().updateToken(token);
          useAppStore().updateRole(data.role);
          localStorage.setItem("token", token);
          resolve();
        } else {
          reject(data.error);
        }
      })
      .catch((error) => reject(error));
  });
}

