mod model;
mod seed;

use tauri::{State, Manager};
use sqlx::sqlite::{SqlitePool, SqlitePoolOptions, SqliteConnectOptions};
use model::{
    CreatePatientDto, Patient, PatientHistoryItem,
    CreateMedicationDto, UpdateMedicationDto, Medication,
    CreatePrescriptionDto, DashboardStats, DueRxItem,
    LoginDto, AuthResponse, AuditLogItem
};

// =====================================================
// COMMANDS: PATIENT MANAGEMENT
// =====================================================

#[tauri::command]
async fn add_patient(pool: State<'_, SqlitePool>, data: CreatePatientDto) -> Result<String, String> {
    let result = sqlx::query(
        "INSERT INTO patients (
            name, birth_date, phone, email, address, city, state, postal_code, 
            health_card_num, allergies, insurance_provider, insurance_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&data.name).bind(&data.birth_date).bind(&data.phone).bind(&data.email)
    .bind(&data.address).bind(&data.city).bind(&data.state).bind(&data.postal_code)
    .bind(&data.health_card_num).bind(&data.allergies).bind(&data.insurance_provider).bind(&data.insurance_id)
    .execute(pool.inner())
    .await;

    match result {
        Ok(_) => {
            let _ = sqlx::query("INSERT INTO audit_logs (username, action, details) VALUES (?, ?, ?)")
                .bind(&data.logged_in_user)
                .bind("ADD_PATIENT")
                .bind(format!("Created profile for: {}", data.name))
                .execute(pool.inner())
                .await;
            Ok("Patient saved successfully!".to_string())
        },
        Err(e) => Err(format!("Failed to save: {}", e))
    }
}

#[tauri::command]
async fn get_patients(pool: State<'_, SqlitePool>, search: Option<String>) -> Result<Vec<Patient>, String> {
    let query = match search {
        Some(s) if !s.is_empty() => {
            let pattern = format!("%{}%", s);
            format!(
                "SELECT DISTINCT p.* FROM patients p
                 LEFT JOIN prescriptions rx ON p.id = rx.patient_id
                 LEFT JOIN medications m ON rx.medication_id = m.id
                 WHERE p.name LIKE '{}' OR m.name LIKE '{}'
                 ORDER BY p.id DESC", 
                 pattern, pattern
            )
        },
        _ => "SELECT * FROM patients ORDER BY id DESC".to_string(),
    };

    let patients = sqlx::query_as::<_, Patient>(&query)
        .fetch_all(pool.inner())
        .await
        .map_err(|e| e.to_string())?;
    Ok(patients)
}

#[tauri::command]
async fn get_patient_history(pool: State<'_, SqlitePool>, patient_id: i64) -> Result<Vec<PatientHistoryItem>, String> {
    let history = sqlx::query_as::<_, PatientHistoryItem>(
        "SELECT p.id, m.name as drug_name, p.sig, p.quantity, p.date_filled, p.next_refill_date
         FROM prescriptions p
         JOIN medications m ON p.medication_id = m.id
         WHERE p.patient_id = ? ORDER BY p.date_filled DESC"
    )
    .bind(patient_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())?;
    Ok(history)
}

// =====================================================
// COMMANDS: INVENTORY
// =====================================================

#[tauri::command]
async fn add_medication(pool: State<'_, SqlitePool>, data: CreateMedicationDto) -> Result<String, String> {
    let result = sqlx::query(
        "INSERT INTO medications (name, din, ndc, description, stock, price, expiration) 
         VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&data.name).bind(&data.din).bind(&data.ndc).bind(&data.description)
    .bind(data.stock).bind(data.price).bind(&data.expiration)
    .execute(pool.inner())
    .await;

    match result {
        Ok(_) => {
            let _ = sqlx::query("INSERT INTO audit_logs (username, action, details) VALUES (?, ?, ?)")
                .bind(&data.logged_in_user)
                .bind("ADD_INVENTORY")
                .bind(format!("Added drug: {} (Stock: {})", data.name, data.stock))
                .execute(pool.inner())
                .await;
            Ok("Medication added.".to_string())
        },
        Err(e) => Err(format!("Failed to save: {}", e))
    }
}

#[tauri::command]
async fn update_medication(pool: State<'_, SqlitePool>, data: UpdateMedicationDto) -> Result<String, String> {
    let old_stock: (i32,) = sqlx::query_as("SELECT stock FROM medications WHERE id = ?")
        .bind(data.id)
        .fetch_one(pool.inner())
        .await
        .map_err(|_| "Drug not found".to_string())?;

    let result = sqlx::query(
        "UPDATE medications SET stock = ?, price = ?, description = ? WHERE id = ?"
    )
    .bind(data.stock)
    .bind(data.price)
    .bind(&data.description)
    .bind(data.id)
    .execute(pool.inner())
    .await;

    match result {
        Ok(_) => {
            let _ = sqlx::query("INSERT INTO audit_logs (username, action, details) VALUES (?, ?, ?)")
                .bind(&data.logged_in_user)
                .bind("UPDATE_INVENTORY")
                .bind(format!("Updated Med ID {}: Stock {} -> {}, Price ${}", data.id, old_stock.0, data.stock, data.price))
                .execute(pool.inner())
                .await;
            Ok("Inventory updated successfully.".to_string())
        },
        Err(e) => Err(format!("Failed to update: {}", e))
    }
}

#[tauri::command]
async fn get_medications(pool: State<'_, SqlitePool>) -> Result<Vec<Medication>, String> {
    let meds = sqlx::query_as::<_, Medication>("SELECT * FROM medications ORDER BY name ASC")
        .fetch_all(pool.inner())
        .await
        .map_err(|e| e.to_string())?;
    Ok(meds)
}

// =====================================================
// COMMANDS: PRESCRIPTIONS
// =====================================================

#[tauri::command]
async fn create_prescription(pool: State<'_, SqlitePool>, data: CreatePrescriptionDto) -> Result<String, String> {
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    // Check Stock
    let med_stock: (i32,) = sqlx::query_as("SELECT stock FROM medications WHERE id = ?")
        .bind(data.medication_id)
        .fetch_one(&mut *tx)
        .await
        .map_err(|_| "Medication not found".to_string())?;

    if med_stock.0 < data.quantity {
        return Err(format!("Insufficient stock! Current: {}, Requested: {}", med_stock.0, data.quantity));
    }

    // Insert Rx
    let insert_result = sqlx::query(
        "INSERT INTO prescriptions (
            patient_id, medication_id, prescriber, sig, quantity, refills, days_supply, date_filled, next_refill_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, date(?, '+' || ? || ' days'))"
    )
    .bind(data.patient_id).bind(data.medication_id).bind(&data.prescriber).bind(&data.sig)
    .bind(data.quantity).bind(data.refills).bind(data.days_supply).bind(&data.date_filled)
    .bind(&data.date_filled).bind(data.days_supply)
    .execute(&mut *tx)
    .await;

    if let Err(e) = insert_result { return Err(format!("Rx Create Failed: {}", e)); }

    // Deduct Stock
    let update_stock = sqlx::query("UPDATE medications SET stock = stock - ? WHERE id = ?")
        .bind(data.quantity).bind(data.medication_id)
        .execute(&mut *tx)
        .await;

    if let Err(e) = update_stock { return Err(format!("Stock Update Failed: {}", e)); }

    tx.commit().await.map_err(|e| e.to_string())?;

    // LOG ACTION (Outside transaction, best effort)
    let _ = sqlx::query("INSERT INTO audit_logs (username, action, details) VALUES (?, ?, ?)")
        .bind(&data.logged_in_user)
        .bind("FILL_RX")
        .bind(format!("Filled Rx for Patient ID: {} (Med ID: {}, Qty: {})", data.patient_id, data.medication_id, data.quantity))
        .execute(pool.inner())
        .await;

    Ok("Filled & Updated.".to_string())
}

// =====================================================
// COMMANDS: DASHBOARD
// =====================================================

#[tauri::command]
async fn get_dashboard_stats(pool: State<'_, SqlitePool>) -> Result<DashboardStats, String> {
    let due_today: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM prescriptions p1
         WHERE next_refill_date <= date('now')
         AND NOT EXISTS (
            SELECT 1 FROM prescriptions p2 
            WHERE p2.patient_id = p1.patient_id 
            AND p2.medication_id = p1.medication_id 
            AND p2.id > p1.id
         )"
    )
    .fetch_one(pool.inner()).await.unwrap_or((0,));

    let due_soon: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM prescriptions p1
         WHERE next_refill_date > date('now') 
         AND next_refill_date <= date('now', '+7 days')
         AND NOT EXISTS (
            SELECT 1 FROM prescriptions p2 
            WHERE p2.patient_id = p1.patient_id 
            AND p2.medication_id = p1.medication_id 
            AND p2.id > p1.id
         )"
    )
    .fetch_one(pool.inner()).await.unwrap_or((0,));

    let low_stock: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM medications WHERE stock < 100")
        .fetch_one(pool.inner()).await.unwrap_or((0,));

    Ok(DashboardStats { due_today: due_today.0, due_soon: due_soon.0, low_stock: low_stock.0 })
}

#[tauri::command]
async fn get_due_prescriptions(pool: State<'_, SqlitePool>, filter: String) -> Result<Vec<DueRxItem>, String> {
    let date_query = if filter == "today" { "<= date('now')" } else { "> date('now') AND next_refill_date <= date('now', '+7 days')" };
    
    let sql = format!(
        "SELECT p.id, pat.name as patient_name, m.name as medication_name, p.next_refill_date, pat.phone,
            p.patient_id, p.medication_id, p.quantity, p.sig, p.days_supply, p.refills, p.prescriber
         FROM prescriptions p
         JOIN patients pat ON p.patient_id = pat.id
         JOIN medications m ON p.medication_id = m.id
         WHERE p.next_refill_date {}
         AND NOT EXISTS (
            SELECT 1 FROM prescriptions p2 
            WHERE p2.patient_id = p.patient_id 
            AND p2.medication_id = p.medication_id 
            AND p2.id > p.id
         )
         ORDER BY p.next_refill_date ASC", date_query
    );

    let items = sqlx::query_as::<_, DueRxItem>(&sql)
        .fetch_all(pool.inner())
        .await
        .map_err(|e| e.to_string())?;
    Ok(items)
}

// --- NEW COMMAND: GET UPCOMING REFILLS ---
#[tauri::command]
async fn get_upcoming_refills(pool: State<'_, SqlitePool>) -> Result<Vec<DueRxItem>, String> {
    let sql = "
        SELECT p.id, pat.name as patient_name, m.name as medication_name, p.next_refill_date, pat.phone,
            p.patient_id, p.medication_id, p.quantity, p.sig, p.days_supply, p.refills, p.prescriber
         FROM prescriptions p
         JOIN patients pat ON p.patient_id = pat.id
         JOIN medications m ON p.medication_id = m.id
         WHERE 
         NOT EXISTS (
            SELECT 1 FROM prescriptions p2 
            WHERE p2.patient_id = p.patient_id 
            AND p2.medication_id = p.medication_id 
            AND p2.id > p.id
         )
         ORDER BY p.next_refill_date ASC
         LIMIT 4
    ";
    let items = sqlx::query_as::<_, DueRxItem>(sql)
        .fetch_all(pool.inner())
        .await
        .map_err(|e| e.to_string())?;
    Ok(items)
}

// =====================================================
// COMMANDS: AUTH & LOGS
// =====================================================

#[tauri::command]
async fn login_user(pool: State<'_, SqlitePool>, creds: LoginDto) -> Result<AuthResponse, String> {
    let user = sqlx::query!(
        "SELECT role FROM users WHERE username = ? AND password = ?",
        creds.username, creds.password
    )
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    match user {
        Some(u) => {
            let _ = sqlx::query("INSERT INTO audit_logs (username, action, details) VALUES (?, ?, ?)")
                .bind(&creds.username)
                .bind("LOGIN")
                .bind("User logged in successfully")
                .execute(pool.inner())
                .await;

            Ok(AuthResponse { success: true, role: u.role, username: creds.username })
        },
        None => Err("Invalid credentials".to_string()),
    }
}

#[tauri::command]
async fn log_action(pool: State<'_, SqlitePool>, username: String, action: String, details: String) -> Result<(), String> {
    sqlx::query("INSERT INTO audit_logs (username, action, details) VALUES (?, ?, ?)")
        .bind(username).bind(action).bind(details)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn get_audit_logs(pool: State<'_, SqlitePool>) -> Result<Vec<AuditLogItem>, String> {
    let logs = sqlx::query_as::<_, AuditLogItem>("SELECT * FROM audit_logs ORDER BY timestamp DESC")
        .fetch_all(pool.inner())
        .await
        .map_err(|e| e.to_string())?;
    Ok(logs)
}

// =====================================================
// MAIN
// =====================================================

#[tokio::main]
async fn main() {
    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(SqliteConnectOptions::new().filename("pharmacy.db").create_if_missing(true))
        .await.expect("DB Connection Failed");

    // Migrations
    sqlx::query("CREATE TABLE IF NOT EXISTS patients (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, birth_date TEXT NOT NULL, phone TEXT NOT NULL, email TEXT, address TEXT NOT NULL, city TEXT NOT NULL, state TEXT NOT NULL, postal_code TEXT NOT NULL, health_card_num TEXT NOT NULL, allergies TEXT, insurance_provider TEXT, insurance_id TEXT)").execute(&pool).await.unwrap();
    sqlx::query("CREATE TABLE IF NOT EXISTS medications (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, din TEXT UNIQUE NOT NULL, ndc TEXT, description TEXT, stock INTEGER DEFAULT 0, price REAL DEFAULT 0.0, expiration TEXT NOT NULL)").execute(&pool).await.unwrap();
    sqlx::query("CREATE TABLE IF NOT EXISTS prescriptions (id INTEGER PRIMARY KEY AUTOINCREMENT, patient_id INTEGER NOT NULL, medication_id INTEGER NOT NULL, prescriber TEXT NOT NULL, sig TEXT NOT NULL, quantity INTEGER NOT NULL, refills INTEGER NOT NULL, days_supply INTEGER NOT NULL, date_filled TEXT NOT NULL, next_refill_date TEXT NOT NULL, FOREIGN KEY(patient_id) REFERENCES patients(id), FOREIGN KEY(medication_id) REFERENCES medications(id))").execute(&pool).await.unwrap();
    
    // New Migrations for Auth
    sqlx::query("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT NOT NULL)").execute(&pool).await.unwrap();
    sqlx::query("CREATE TABLE IF NOT EXISTS audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL, action TEXT NOT NULL, details TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)").execute(&pool).await.unwrap();

    seed::init_db(&pool).await;

    tauri::Builder::default()
        .manage(pool)
        .invoke_handler(tauri::generate_handler![
            add_patient, get_patients, get_patient_history,
            add_medication, get_medications, update_medication,
            create_prescription,
            get_dashboard_stats, get_due_prescriptions, get_upcoming_refills,
            login_user, log_action, get_audit_logs
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}