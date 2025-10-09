#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use rusqlite::{params, Connection, Result};
use tauri::command;

// Example: function to initialize the database and create tables
#[command]
fn init_db() -> Result<(), String> {
    let conn = Connection::open("card_tracker.db").map_err(|e| e.to_string())?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS cards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            game_id TEXT NOT NULL,
            name TEXT NOT NULL,
            set_name TEXT DEFAULT 'N/A',
            collector_number TEXT,
            rarity TEXT,
            image_url TEXT DEFAULT 'N/A'
        )",
        [],
    ).map_err(|e| e.to_string())?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS cards_mtg (
            card_id INTEGER PRIMARY KEY,
            mana_cost TEXT, 
            color_identity TEXT,
            type_line TEXT,
            oracle_text TEXT,
            power TEXT,
            toughness TEXT,
            loyalty TEXT,
            FOREIGN KEY(card_id) REFERENCES cards(id)
        )",
        [],
    ).map_err(|e| e.to_string())?;

    // Make mana cost string like: 'xcolourless|xcolour'

    Ok(())
}

// Example: add a card
#[command]
fn add_card(game_id: &str, name: &str) -> Result<(), String> {
    let conn = Connection::open("card_tracker.db").map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO cards (game_id, name) VALUES (?1, ?2)",
        params![game_id, name],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![init_db, add_card])
        .run(tauri::generate_context!())
        .expect("error while running tauri app");
}
