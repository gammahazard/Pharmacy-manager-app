// src-tauri/src/main.rs
mod model;
mod seed;
use tauri::{State, Manager};
use sqlx::sqlite::{SqlitePool, SqlitePoolOptions, SqliteConnectOptions};
use model::{CreatePatientDto, Patient, CreateMedicationDto, Medication};

// =====================================================
// COMMANDS: PATIENT MANAGEMENT
// =====================================================

#[tauri::command]
async fn add_patient(pool: State<'_, SqlitePool>, data: CreatePatientDto) -> Result<String, String> {
    println!("Saving patient: {}", data.name);
    
    let result = sqlx::query(
        "INSERT INTO patients (
            name, birth_date, phone, email, address, city, state, postal_code, 
            health_card_num, allergies, insurance_provider, insurance_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&data.name)
    .bind(&data.birth_date)
    .bind(&data.phone)
    .bind(&data.email)
    .bind(&data.address)
    .bind(&data.city)
    .bind(&data.state)
    .bind(&data.postal_code)
    .bind(&data.health_card_num)
    .bind(&data.allergies)
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

#[tauri::command]
async fn get_patients(pool: State<'_, SqlitePool>) -> Result<Vec<Patient>, String> {
    let patients = sqlx::query_as::<_, Patient>("SELECT * FROM patients ORDER BY id DESC")
        .fetch_all(pool.inner())
        .await
        .map_err(|e| e.to_string())?;
        
    Ok(patients)
}

// =====================================================
// COMMANDS: INVENTORY & FORMULARY (NEW)
// =====================================================

#[tauri::command]
async fn add_medication(pool: State<'_, SqlitePool>, data: CreateMedicationDto) -> Result<String, String> {
    println!("Adding medication: {} (DIN: {})", data.name, data.din);

    let result = sqlx::query(
        "INSERT INTO medications (name, din, ndc, description, stock, price, expiration) 
         VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&data.name)
    .bind(&data.din)     // Required (Canadian Standard)
    .bind(&data.ndc)     // Optional
    .bind(&data.description)
    .bind(data.stock)
    .bind(data.price)
    .bind(&data.expiration)
    .execute(pool.inner())
    .await;

    match result {
        Ok(_) => Ok("Medication added to formulary.".to_string()),
        Err(e) => {
            eprintln!("Error: {:?}", e);
            Err(format!("Failed to save medication: {}", e))
        }
    }
}

#[tauri::command]
async fn get_medications(pool: State<'_, SqlitePool>) -> Result<Vec<Medication>, String> {
    // Return list alphabetically by name
    let meds = sqlx::query_as::<_, Medication>("SELECT * FROM medications ORDER BY name ASC")
        .fetch_all(pool.inner())
        .await
        .map_err(|e| e.to_string())?;
        
    Ok(meds)
}

// =====================================================
// MAIN APPLICATION ENTRY
// =====================================================

#[tokio::main]
async fn main() {
    // 1. Setup Database Connection (Create file if missing)
    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(
            SqliteConnectOptions::new()
                .filename("pharmacy.db")
                .create_if_missing(true)
        )
        .await
        .expect("Failed to connect to database");

    // 2. Migration: Patients Table
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

    // 3. Migration: Medications Table (New)
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS medications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            din TEXT UNIQUE NOT NULL,
            ndc TEXT,
            description TEXT,
            stock INTEGER DEFAULT 0,
            price REAL DEFAULT 0.0,
            expiration TEXT NOT NULL
        )"
    )
    .execute(&pool)
    .await
    .unwrap();
    //seed db
seed::init_db(&pool).await;
    // 4. Launch App
    tauri::Builder::default()
        .manage(pool)
        .invoke_handler(tauri::generate_handler![
            add_patient,
            get_patients,
            add_medication, // Register New Command
            get_medications // Register New Command
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}