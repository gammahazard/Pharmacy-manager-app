// src-tauri/src/models.rs
use serde::{Deserialize, Serialize};

// This struct represents what we receive from the Frontend
#[derive(Debug, Deserialize, Serialize)]
pub struct CreatePatientDto {
    pub name: String,
    pub birth_date: String, // Format: YYYY-MM-DD
    pub phone: String,
    pub insurance_provider: Option<String>, // Optional field
    pub insurance_id: Option<String>,       // Optional field
}

// This struct represents what sits in the Database (includes the ID)
#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct Patient {
    pub id: i64,
    pub name: String,
    pub birth_date: String,
    pub phone: String,
    pub insurance_provider: Option<String>,
    pub insurance_id: Option<String>,
}