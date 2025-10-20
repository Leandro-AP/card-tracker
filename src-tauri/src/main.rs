#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use rusqlite::{params, Connection, Result};
use tauri::command;

use tauri::{AppHandle, Manager, path::BaseDirectory};
use std::path::PathBuf;

fn get_db_path(app_handle: &AppHandle) -> PathBuf {
    // Get the app data directory (e.g. AppData on Windows, ~/Library/Application Support on macOS)
    let path = app_handle
        .path()
        .resolve("card_tracker.db", BaseDirectory::AppData)
        .expect("Failed to resolve app data directory");

    // Ensure parent directory exists
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).expect("Failed to create data directory");
    }
    path
}

#[derive(serde::Serialize, serde::Deserialize)]
struct Collection {
    id: i64,
    name: String,
    game_id: String,
    created_at: String,
    updated_at: String,
}

// Function to initialize the database and create tables
#[command]
fn init_db(app_handle: AppHandle) -> Result<(), String> {
    let db_path = get_db_path(&app_handle);
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
    println!("Using database: {:?}", db_path);

    //  === Collections Table   ===
    conn.execute(
        "CREATE TABLE IF NOT EXISTS collections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            game_id TEXT NOT NULL,
            created_at DATETIME NOT NULL DEFAULT(CURRENT_TIMESTAMP),
            updated_at DATETIME NOT NULL DEFAULT(CURRENT_TIMESTAMP)
        )",
        [],
    )
    .map_err(|e| e.to_string())?;

    //  === Cards Table ===
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
    )
    .map_err(|e| e.to_string())?;

    //  === MTG Cards Table ===
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
    )
    .map_err(|e| e.to_string())?;

    // Make mana cost string like: 'xcolourless|xcolour'

    println!("Database initialized successfully.");
    Ok(())
}

// #region Collections CRUD

#[command] // Create Collection
fn add_collection(app_handle: AppHandle, name: &str, game_id: &str) -> Result<(), String> {
    let db_path = get_db_path(&app_handle);
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO collections (name, game_id) VALUES (?1, ?2)",
        params![name, game_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[command] // Get all collections
fn get_collections(app_handle: AppHandle) -> Result<Vec<Collection>, String> {
    let db_path = get_db_path(&app_handle);
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, name, game_id, created_at, updated_at FROM collections ORDER BY updated_at DESC, created_at DESC")
        .map_err(|e| e.to_string())?;

    let collections = stmt
        .query_map([], |row| {
            Ok(Collection {
                id: row.get(0)?,
                name: row.get(1)?,
                game_id: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(collections)
}

// #endregion

// Add a card
#[command]
fn add_card(app_handle: AppHandle, game_id: &str, name: &str) -> Result<(), String> {
    let db_path = get_db_path(&app_handle);
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO cards (game_id, name) VALUES (?1, ?2)",
        params![game_id, name],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            init_db,
            add_collection,
            get_collections,
            add_card
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri app");
}
