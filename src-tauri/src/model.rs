use serde::{Deserialize, Serialize};

// --- PATIENT MODELS ---

#[derive(Debug, Deserialize, Serialize)]
pub struct CreatePatientDto {
    pub logged_in_user: String,
    pub name: String,
    pub birth_date: String,
    pub phone: String,
    pub email: Option<String>,
    pub address: String,
    pub city: String,
    pub state: String,
    pub postal_code: String,
    pub health_card_num: String,
    pub allergies: Option<String>,
    pub insurance_provider: Option<String>,
    pub insurance_id: Option<String>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct Patient {
    pub id: i64,
    pub name: String,
    pub birth_date: String,
    pub phone: String,
    pub email: Option<String>,
    pub address: String,
    pub city: String,
    pub state: String,
    pub postal_code: String,
    pub health_card_num: String,
    pub allergies: Option<String>,
    pub insurance_provider: Option<String>,
    pub insurance_id: Option<String>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct PatientHistoryItem {
    pub id: i64,
    pub drug_name: String,
    pub sig: String,
    pub quantity: i32,
    pub date_filled: String,
    pub next_refill_date: String,
}

// --- MEDICATION MODELS ---

#[derive(Debug, Deserialize, Serialize)]
pub struct CreateMedicationDto {
    pub logged_in_user: String,
    pub name: String,
    pub din: String,
    pub ndc: Option<String>,
    pub description: Option<String>,
    pub stock: i32,
    pub price: f64,
    pub expiration: String,
}

// NEW: For editing stock/price
#[derive(Debug, Deserialize, Serialize)]
pub struct UpdateMedicationDto {
    pub logged_in_user: String,
    pub id: i64,
    pub stock: i32,
    pub price: f64,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct Medication {
    pub id: i64,
    pub name: String,
    pub din: String,
    pub ndc: Option<String>,
    pub description: Option<String>,
    pub stock: i32,
    pub price: f64,
    pub expiration: String,
}

// --- PRESCRIPTION MODELS ---

#[derive(Debug, Deserialize, Serialize)]
pub struct CreatePrescriptionDto {
    pub logged_in_user: String,
    pub patient_id: i64,
    pub medication_id: i64,
    pub prescriber: String,
    pub sig: String,
    pub quantity: i32,
    pub refills: i32,
    pub days_supply: i32,
    pub date_filled: String,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct Prescription {
    pub id: i64,
    pub patient_id: i64,
    pub medication_id: i64,
    pub patient_name: String, 
    pub medication_name: String, 
    pub prescriber: String,
    pub sig: String,
    pub quantity: i32,
    pub refills: i32,
    pub days_supply: i32,
    pub date_filled: String,
    pub next_refill_date: String,
}

// --- DASHBOARD MODELS ---

#[derive(Debug, Serialize)]
pub struct DashboardStats {
    pub due_today: i64,
    pub due_soon: i64,
    pub low_stock: i64,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct DueRxItem {
    pub id: i64,
    pub patient_name: String,
    pub medication_name: String,
    pub next_refill_date: String,
    pub phone: String, 
    pub patient_id: i64,
    pub medication_id: i64,
    pub quantity: i32,
    pub sig: String,
    pub days_supply: i32,
    pub refills: i32,
    pub prescriber: String,
}

// --- AUTH & LOG MODELS ---

#[derive(Debug, Deserialize, Serialize)]
pub struct LoginDto {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub success: bool,
    pub role: String, 
    pub username: String,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct AuditLogItem {
    pub id: i64,
    pub username: String,
    pub action: String,
    pub details: Option<String>,
    pub timestamp: String,
}