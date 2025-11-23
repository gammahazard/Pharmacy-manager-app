// src-tauri/src/main.rs
mod model;

use tauri::{State, Manager};
// We need SqliteConnectOptions to use the "create_if_missing" feature
use sqlx::sqlite::{SqlitePool, SqlitePoolOptions, SqliteConnectOptions};
use model::CreatePatientDto;

// --- COMMANDS ---

#[tauri::command]
async fn add_patient(pool: State<'_, SqlitePool>, data: CreatePatientDto) -> Result<String, String> {
    println!("Saving patient: {}", data.name);
    
    // We use sqlx::query (function) instead of sqlx::query! (macro) 
    // to avoid compile-time checks against a DB that might not exist yet.
    let result = sqlx::query("INSERT INTO patients (name, birth_date, phone, insurance_provider, insurance_id) VALUES (?, ?, ?, ?, ?)")
        .bind(&data.name)
        .bind(&data.birth_date)
        .bind(&data.phone)
        .bind(&data.insurance_provider)
        .bind(&data.insurance_id)
        .execute(pool.inner())
        .await;

    match result {
        Ok(_) => Ok("Patient saved successfully!".to_string()),
        Err(e) => {
            eprintln!("Database error: {:?}", e);
            Err(format!("Failed to save: {}", e))
        }
    }
}

// --- MAIN ---

#[tokio::main]
async fn main() {
    // 1. Connect to the SQLite database (and create file if missing)
    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(
            SqliteConnectOptions::new()
                .filename("pharmacy.db")
                .create_if_missing(true) // <--- THIS IS THE FIX
        )
        .await
        .expect("Failed to connect to database");

    // 2. Run migrations (create tables if they don't exist)
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS patients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            birth_date TEXT NOT NULL,
            phone TEXT NOT NULL,
            insurance_provider TEXT,
            insurance_id TEXT
        )"
    )
    .execute(&pool)
    .await
    .unwrap();

    // 3. Launch the App
    tauri::Builder::default()
        .manage(pool) // Pass the DB connection to the app state
        .invoke_handler(tauri::generate_handler![
            add_patient // Register the command here
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}