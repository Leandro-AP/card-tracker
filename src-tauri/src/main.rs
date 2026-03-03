#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use rusqlite::{params, Result};
use tauri::command;

use tauri::{AppHandle};

mod db;
mod models;
mod utils;

use db::connection::establish_connection;
use models::{Collection, Card};

// Function to initialize the database and create tables
#[command]
fn init_db(app_handle: AppHandle) -> Result<(), String> {
    let conn = establish_connection(app_handle).map_err(|e| e.to_string())?;

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

    //  === MTG Cards Table ===
    conn.execute(
        "CREATE TABLE IF NOT EXISTS cards_mtg (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            collection_id INTEGER,
            
            name TEXT NOT NULL,
            set_name TEXT DEFAULT 'N/A',
            rarity TEXT,
            qtt INTEGER,
            image_url TEXT DEFAULT 'N/A',
            
            mana_cost TEXT, 
            cmc INTEGER,
            color_identity TEXT,
            type_line TEXT,
            
            keywords TEXT DEFAULT 'N/A',
            oracle_text TEXT DEFAULT 'N/A',

            power TEXT DEFAULT 'N/A',
            toughness TEXT DEFAULT 'N/A',
            loyalty TEXT DEFAULT 'N/A'
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
    let conn = establish_connection(app_handle).map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO collections (name, game_id) VALUES (?1, ?2)",
        params![name, game_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[command] // Get all collections
fn get_collections(app_handle: AppHandle) -> Result<Vec<Collection>, String> {
    let conn = establish_connection(app_handle).map_err(|e| e.to_string())?;
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

#[command] // Get collection info
fn get_collection(app_handle: AppHandle, collection_id: i64) -> Result<Collection, String> {

    let conn = establish_connection(app_handle).map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT name, game_id, created_at, updated_at FROM collections WHERE id = ?1")
        .map_err(|e| e.to_string())?;

    let collection = stmt.query_row([collection_id], |row| {
        Ok(Collection {
            id: collection_id,
            name: row.get(0)?,
            game_id: row.get(1)?,
            created_at: row.get(2)?,
            updated_at: row.get(3)?,
        })
    })
    .map_err(|e| e.to_string())?;

    Ok(collection)
}

// #endregion

// #region Card CRUD

// Add a card
#[command]
fn add_card(app_handle: AppHandle, game_id: &str, name: &str) -> Result<(), String> {
    let conn = establish_connection(app_handle).map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO cards (game_id, name) VALUES (?1, ?2)",
        params![game_id, name],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

// Get cards from a collection
#[command]
fn get_cards(app_handle: AppHandle, collection_id: i64, game_id: &str) -> Result<Vec<Card>, String> {
    let mut card_table = "";
    match game_id{
        "MtG" =>card_table = "cards_mtg",
        "PKMN" =>card_table = "",
        "YGO" =>card_table = "",
        _=>println!("Unknown game.")
    }

    let conn = establish_connection(app_handle).map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, name, collection_id, qtt FROM cards WHERE collection_id = ?1")
        .map_err(|e| e.to_string())?;

    let cards = stmt
        .query_map([collection_id], |row| {
            Ok(Card {
                id: row.get(0)?,
                name: row.get(1)?,
                collection_id: row.get(2)?,
                qtt: row.get(3)?
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(cards)
}

// #endregion

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            init_db,
            add_collection,
            get_collections,
            get_collection,
            add_card,
            get_cards
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri app");
}
