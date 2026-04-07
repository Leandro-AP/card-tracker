#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use rusqlite::{Connection, Result, params};
use tauri::command;

use tauri::{AppHandle};

mod db;
mod models;
mod utils;

use db::connection::establish_connection;
use models::{Collection, Card, MtgCardPayload};

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
            scryfall_id TEXT UNIQUE NOT NULL,
            
            name TEXT NOT NULL,
            set_name TEXT DEFAULT 'N/A',
            rarity TEXT,
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

    // === Collection:Cards Junction Table
    conn.execute("
        CREATE TABLE IF NOT EXISTS collection_cards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            collection_id INTEGER NOT NULL,
            game_id TEXT NOT NULL,
            card_id INTEGER NOT NULL,
            qtt INTEGER NOT NULL DEFAULT 1,
            FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
            UNIQUE(collection_id, card_id)  -- prevents duplicate entries per collection
        )", []).map_err(|e| e.to_string())?;

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

// Private per-game helpers
fn add_mtg_card(conn: &Connection, collection_id: i64, card: MtgCardPayload) -> Result<(), String> {
    conn.execute(
        "INSERT OR IGNORE INTO cards_mtg
            (scryfall_id, name, set_name, rarity, image_url, mana_cost, cmc,
             color_identity, type_line, keywords, oracle_text, power, toughness, loyalty)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14)",
        params![
            card.scryfall_id, card.name, card.set_name, card.rarity, card.image_url,
            card.mana_cost, card.cmc, card.color_identity, card.type_line,
            card.keywords, card.oracle_text, card.power, card.toughness, card.loyalty
        ],
    ).map_err(|e| e.to_string())?;

    let card_id: i64 = conn
        .query_row("SELECT id FROM cards_mtg WHERE scryfall_id = ?1", params![card.scryfall_id], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    conn.execute("INSERT INTO collection_cards (collection_id, game_id, card_id, qtt)
                VALUES (?1, 'MtG', ?2, ?3)
                ON CONFLICT(collection_id, card_id) DO UPDATE SET qtt = qtt + excluded.qtt", 
                params![collection_id, card_id, card.qtt],
            ).map_err(|e| e.to_string())?;

    Ok(())
}

// fn add_pkmn_card(conn: &Connection, collection_id: i64, card: PkmnCardPayload) -> Result<(), String> { ... }
// fn add_ygo_card(conn: &Connection, collection_id: i64, card: YgoCardPayload)  -> Result<(), String> { ... }

// Public - Add a card
#[command]
fn add_card(app_handle: AppHandle, collection_id: i64, game_id: &str, card_data: serde_json::Value) -> Result<(), String> {
    let conn = establish_connection(app_handle).map_err(|e| e.to_string())?;

    match game_id {
        "MtG" => add_mtg_card(&conn, collection_id, serde_json::from_value(card_data).map_err(|e| e.to_string())?),
        "PKMN" => Err("Pokémon not yet implement".to_string()),
        "YGO" => Err("Yu-Gi-Oh! not yet implemented".to_string()),
        _   => Err(format!("Unknown game_id: {}", game_id)),
    }?;

    conn.execute(
        "UPDATE collections SET updated_at = CURRENT_TIMESTAMP WHERE id = ?1", 
        params![collection_id],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

// Get cards from a collection
#[command]
fn get_cards(app_handle: AppHandle, collection_id: i64, game_id: &str) -> Result<Vec<Card>, String> {

    let conn = establish_connection(app_handle).map_err(|e| e.to_string())?;
    let query = format!("SELECT cc.id, cm.name, cm.image_url, cc.qtt FROM collection_cards AS cc JOIN cards_mtg AS cm ON cc.card_id = cm.id WHERE collection_id = ?1");
    let mut stmt = conn
        .prepare(&query)
        .map_err(|e| e.to_string())?;

    let cards = stmt
        .query_map([collection_id], |row| {
            Ok(Card {
                id: row.get(0)?,
                collection_id: collection_id,
                name: row.get(1)?,
                image_url: row.get(2)?,
                qtt: row.get(3)?
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(cards)
}

// #endregion

#[command]
fn debug_schema(app_handle: AppHandle) -> Result<Vec<String>, String> {

    #[cfg(not(debug_assertions))]
    return Err("Not available in release builds".to_string());

    #[cfg(debug_assertions)]
    {
        let conn = establish_connection(app_handle).map_err(|e| e.to_string())?;
        let mut stmt = conn.prepare(
            "SELECT name, sql FROM sqlite_master WHERE type='table' ORDER BY name"
        ).map_err(|e| e.to_string())?;

        let rows = stmt.query_map([], |row| {
            Ok(format!("{}\n{}",
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?
            ))
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

        Ok(rows)
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            init_db,
            add_collection,
            get_collections,
            get_collection,
            add_card,
            get_cards,
            debug_schema,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri app");
}
