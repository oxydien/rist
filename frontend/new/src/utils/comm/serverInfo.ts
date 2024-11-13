import type ServerInfo from "../../types/ServerInfo";
import { getRoute, moduleRoutes } from "../staticRoutes";

export function getServerInfo(): Promise<Response> {
  return fetch(getRoute("SERVER_INFO"), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export async function infoProcess(): Promise<ServerInfo> {
  const response = await getServerInfo();

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json() as ServerInfo;

  for (const module of data.modules) {
    for (const route of module.apiRoutes) {
      moduleRoutes[route[0]] = route[1];
    }
  }

  return data;
}