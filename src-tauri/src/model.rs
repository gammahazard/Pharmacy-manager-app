use serde::{Deserialize, Serialize};

// INPUT: What the Frontend sends us
#[derive(Debug, Deserialize, Serialize)]
pub struct CreatePatientDto {
    pub name: String,
    pub birth_date: String,
    pub phone: String,
    pub email: Option<String>,         // New
    pub address: String,               // New
    pub city: String,                  // New
    pub state: String,                 // New (Province/State)
    pub postal_code: String,           // New
    pub health_card_num: String,       // New
    pub allergies: Option<String>,     // New (Important!)
    pub insurance_provider: Option<String>,
    pub insurance_id: Option<String>,
}

// OUTPUT: What we pull from the Database
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

#[derive(Debug, Deserialize, Serialize)]
pub struct CreateMedicationDto {
    pub name: String,
    pub din: String,          // The Canadian Standard (Required)
    pub ndc: Option<String>,  // Optional (for barcodes/US imports)
    pub description: Option<String>,
    pub stock: i32,
    pub price: f64,
    pub expiration: String,
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