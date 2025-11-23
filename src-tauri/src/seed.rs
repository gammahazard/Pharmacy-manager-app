// src-tauri/src/seed.rs
use sqlx::SqlitePool;

pub async fn init_db(pool: &SqlitePool) {
    // 1. Check if patients already exist
    let patient_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM patients")
        .fetch_one(pool)
        .await
        .unwrap_or((0,));

    if patient_count.0 == 0 {
        println!("🌱 Seeding Database with Dummy Patients...");
        
        // Insert Patients
        let patients = vec![
            ("John Smith", "1985-04-12", "416-555-0199", "john.s@email.com", "123 Maple Dr", "Toronto", "ON", "M5V 2T6", "123-456-789-AB", "Penicillin", "SunLife", "SL-998877"),
            ("Sarah Conner", "1992-08-23", "604-555-0122", "s.conner@skynet.net", "4500 Robson St", "Vancouver", "BC", "V6B 3K9", "987-654-321-CC", "Peanuts, Latex", "Manulife", "MN-112233"),
            ("Arthur Dent", "1978-02-11", "905-555-4242", "arthur@hitchhiker.com", "155 Country Ln", "Mississauga", "ON", "L5B 2C9", "424-242-424-ZZ", "None", "None", "None"),
            ("Wayne Campbell", "1990-01-01", "630-555-1010", "wayne@aurora.com", "101 Stan Mikita Way", "Aurora", "IL", "60506", "101-010-101-WW", "Advil", "BlueCross", "BC-555111"),
            ("Geralt Rivera", "1955-11-30", "212-555-1980", "geralt@news.com", "55 West St", "New York", "NY", "10001", "555-999-000-XX", "Sulfa Drugs", "Aetna", "AE-334455"),
        ];

        for p in patients {
            sqlx::query(
                "INSERT INTO patients (name, birth_date, phone, email, address, city, state, postal_code, health_card_num, allergies, insurance_provider, insurance_id) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            )
            .bind(p.0).bind(p.1).bind(p.2).bind(p.3).bind(p.4).bind(p.5)
            .bind(p.6).bind(p.7).bind(p.8).bind(p.9).bind(p.10).bind(p.11)
            .execute(pool).await.unwrap();
        }
    }

    // 2. Check if medications already exist
    let med_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM medications")
        .fetch_one(pool)
        .await
        .unwrap_or((0,));

    if med_count.0 == 0 {
        println!("💊 Seeding Database with Inventory...");

        // Insert Drugs (Name, DIN, NDC, Desc, Stock, Price, Exp)
        let meds = vec![
            ("Amoxicillin 500mg", "02238888", "00000-111-22", "Shelf A1", 500, 12.99, "2025-12-31"),
            ("Atorvastatin 20mg", "02245555", "55555-333-44", "Shelf B3", 200, 45.50, "2026-06-15"),
            ("Metformin 500mg", "02111222", "12345-678-90", "Shelf A2", 1000, 8.25, "2024-11-30"),
            ("Lisinopril 10mg", "02333444", "98765-432-10", "Shelf C1", 30, 15.00, "2023-10-01"), // Low stock example
            ("Escitalopram 10mg", "02444555", "11223-344-55", "Shelf B2", 150, 22.75, "2025-05-20"),
        ];

        for m in meds {
            sqlx::query(
                "INSERT INTO medications (name, din, ndc, description, stock, price, expiration) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)"
            )
            .bind(m.0).bind(m.1).bind(m.2).bind(m.3).bind(m.4).bind(m.5).bind(m.6)
            .execute(pool).await.unwrap();
        }
    }
}