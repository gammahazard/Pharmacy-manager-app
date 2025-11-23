mod model;

use tauri::{State, Manager};
use sqlx::sqlite::{SqlitePool, SqlitePoolOptions, SqliteConnectOptions};
use model::{CreatePatientDto, Patient};

// --- COMMAND: ADD PATIENT ---
#[tauri::command]
async fn add_patient(pool: State<'_, SqlitePool>, data: CreatePatientDto) -> Result<String, String> {
    println!("Saving patient: {}", data.name);
    
    // We added the new columns to the INSERT statement
    let result = sqlx::query(
        "INSERT INTO patients (
            name, birth_date, phone, email, address, city, state, postal_code, 
            health_card_num, allergies, insurance_provider, insurance_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&data.name)
    .bind(&data.birth_date)
    .bind(&data.phone)
    .bind(&data.email)           // New
    .bind(&data.address)         // New
    .bind(&data.city)            // New
    .bind(&data.state)           // New
    .bind(&data.postal_code)     // New
    .bind(&data.health_card_num) // New
    .bind(&data.allergies)       // New
    .bind(&data.insurance_provider)
    .bind(&data.insurance_id)
    .execute(pool.inner())
    .await;

    match result {
        Ok(_) => Ok("Patient saved successfully!".to_string()),
        Err(e) => {
            eprintln!("Error: {:?}", e);
            Err(format!("Failed to save: {}", e))
        }
    }
}

// --- COMMAND: GET PATIENTS ---
#[tauri::command]
async fn get_patients(pool: State<'_, SqlitePool>) -> Result<Vec<Patient>, String> {
    let patients = sqlx::query_as::<_, Patient>("SELECT * FROM patients ORDER BY id DESC")
        .fetch_all(pool.inner())
        .await
        .map_err(|e| e.to_string())?;
        
    Ok(patients)
}

// --- MAIN ---
#[tokio::main]
async fn main() {
    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(
            SqliteConnectOptions::new()
                .filename("pharmacy.db")
                .create_if_missing(true)
        )
        .await
        .expect("Failed to connect to database");

    // MIGRATION: Added new columns here
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS patients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            birth_date TEXT NOT NULL,
            phone TEXT NOT NULL,
            email TEXT,
            address TEXT NOT NULL,
            city TEXT NOT NULL,
            state TEXT NOT NULL,
            postal_code TEXT NOT NULL,
            health_card_num TEXT NOT NULL,
            allergies TEXT,
            insurance_provider TEXT,
            insurance_id TEXT
        )"
    )
    .execute(&pool)
    .await
    .unwrap();

    tauri::Builder::default()
        .manage(pool)
        .invoke_handler(tauri::generate_handler![
            add_patient,
            get_patients
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}