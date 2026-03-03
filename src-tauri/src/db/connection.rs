use rusqlite::{Connection, Result};
use tauri::{AppHandle, Manager, path::BaseDirectory};

pub fn establish_connection(app_handle: AppHandle) -> Result<Connection, rusqlite::Error> {
    // Get the app data directory (e.g. AppData on Windows, ~/Library/Application Support on macOS)
    let path = app_handle
        .path()
        .resolve("card_tracker.db", BaseDirectory::AppData)
        .expect("Failed to resolve app data directory");

    // Ensure parent directory exists
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).expect("Failed to create data directory");
    }

    let conn = Connection::open(&path)?;
    Ok(conn)
}