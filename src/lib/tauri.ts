import { invoke } from "@tauri-apps/api/core";

export async function initDB() {
  return await invoke("init_db");
}

export async function addCard(gameId: string, name: string) {
  return await invoke("add_card", { gameId, name });
}
