import { createSignal, onMount, For, Show, type Component } from "solid-js";
import { invoke } from "@tauri-apps/api/core";

// --- TYPES ---
interface Patient {
  id: number;
  name: string;
  birth_date: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  health_card_num: string;
  allergies?: string;
  insurance_provider?: string;
  insurance_id?: string;
}

interface HistoryItem {
  id: number;
  drug_name: string;
  sig: string;
  quantity: number;
  date_filled: string;
  next_refill_date: string;
}

interface PatientManagerProps {
  currentUser: { username: string; role: string } | null;
}

const PatientManager: Component<PatientManagerProps> = (props) => {
  // --- STATE ---
  const [patientList, setPatientList] = createSignal<Patient[]>([]);
  const [isAddModalOpen, setAddModalOpen] = createSignal(false);
  const [selectedPatient, setSelectedPatient] = createSignal<Patient | null>(null);
  const [history, setHistory] = createSignal<HistoryItem[]>([]);
  
  // Search State
  const [searchQuery, setSearchQuery] = createSignal("");
  
  const [statusMsg, setStatusMsg] = createSignal("");

  // --- FETCH LIST (With Search) ---
  async function fetchPatients() {
    try {
      // We pass the optional search query to the backend
      const patients = await invoke<Patient[]>("get_patients", { 
        search: searchQuery() 
      });
      setPatientList(patients);
    } catch (e) {
      console.error("Failed to fetch patients:", e);
    }
  }

  // Auto-search handler
  const handleSearch = (e: InputEvent) => {
    setSearchQuery((e.target as HTMLInputElement).value);
    fetchPatients();
  };

  onMount(fetchPatients);

  // --- FETCH DETAILS & HISTORY ---
  async function openPatientDetails(patient: Patient) {
    setSelectedPatient(patient);
    setHistory([]); 
    
    try {
      const data = await invoke<HistoryItem[]>("get_patient_history", { patientId: patient.id });
      setHistory(data);
    } catch (e) {
      console.error("Failed to load history:", e);
    }
  }

  // --- SAVE NEW PATIENT ---
  async function handleSave(e: Event) {
    e.preventDefault();
    setStatusMsg("Saving...");

    const formData = new FormData(e.target as HTMLFormElement);
    
    const payload = {
      // AUDIT LOGGING: Pass the username
      logged_in_user: props.currentUser?.username || "unknown",
      
      name: formData.get("name") as string,
      birth_date: formData.get("birth_date") as string,
      phone: formData.get("phone") as string,
      email: (formData.get("email") as string) || null,
      address: formData.get("address") as string,
      city: formData.get("city") as string,
      state: formData.get("state") as string,
      postal_code: formData.get("postal_code") as string,
      health_card_num: formData.get("health_card_num") as string,
      allergies: (formData.get("allergies") as string) || null,
      insurance_provider: (formData.get("insurance_provider") as string) || null,
      insurance_id: (formData.get("insurance_id") as string) || null,
    };

    try {
      await invoke("add_patient", { data: payload });
      setStatusMsg("");
      setAddModalOpen(false);
      fetchPatients(); 
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      console.error(err);
      setStatusMsg("Error saving patient.");
    }
  }

  return (
    <div class="p-content">
      {/* --- HEADER --- */}
      <div class="header-row">
        <div>
            <h2>Patient Directory</h2>
            <p class="subtitle">{patientList().length} Profiles Found</p>
        </div>
        
        <div style="display: flex; gap: 10px;">
            {/* SEARCH INPUT */}
            <input 
                type="text" 
                placeholder="Search Name or Medication..." 
                value={searchQuery()} 
                onInput={handleSearch}
                style="padding: 10px; width: 250px; border: 1px solid #cbd5e1; border-radius: 6px;"
            />
            <button class="btn-primary" onClick={() => setAddModalOpen(true)}>
                + New Patient
            </button>
        </div>
      </div>

      {/* --- MAIN TABLE (LIST) --- */}
      <div class="panel table-panel">
        <div class="table-container">
          <table class="patient-table">
            <thead>
              <tr>
                <th style="width: 60px;">ID</th>
                <th>Name</th>
                <th style="width: 120px;">DOB</th>
                <th style="width: 140px;">Phone</th>
                <th style="width: 100px;">Action</th>
              </tr>
            </thead>
            <tbody>
              <For each={patientList()}>
                {(patient) => (
                  <tr onClick={() => openPatientDetails(patient)} style="cursor: pointer">
                    <td class="text-muted">#{patient.id}</td>
                    <td class="fw-bold">{patient.name}</td>
                    <td>{patient.birth_date}</td>
                    <td>{patient.phone}</td>
                    <td>
                      <button class="btn-small">View Details</button>
                    </td>
                  </tr>
                )}
              </For>
              <Show when={patientList().length === 0}>
                  <tr><td colspan="5" class="empty-state">No patients found. Try a different search.</td></tr>
              </Show>
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL 1: ADD NEW PATIENT --- */}
      <Show when={isAddModalOpen()}>
        <div class="modal-overlay">
            <div class="modal">
                <div class="modal-header">
                    <h3>New Patient Profile</h3>
                    <button class="close-btn" onClick={() => setAddModalOpen(false)}>×</button>
                </div>
                <form onSubmit={handleSave} class="modal-form">
                    <div class="form-section">
                        <h4>Demographics</h4>
                        <div class="form-grid">
                            <label>Full Name * <input name="name" required /></label>
                            <label>Date of Birth * <input name="birth_date" type="date" required /></label>
                            <label>Health Card # * <input name="health_card_num" required /></label>
                            <label>Phone * <input name="phone" type="tel" required /></label>
                            <label>Email <input name="email" type="email" /></label>
                        </div>
                    </div>
                    <div class="form-section">
                        <h4>Address</h4>
                        <div class="form-grid">
                            <label class="span-2">Street Address * <input name="address" required /></label>
                            <label>City * <input name="city" required /></label>
                            <label>Prov/State * <input name="state" required /></label>
                            <label>Postal Code * <input name="postal_code" required /></label>
                        </div>
                    </div>
                    <div class="form-section">
                        <h4>Medical & Insurance</h4>
                        <div class="form-grid">
                            <label class="span-2">Allergies <input name="allergies" /></label>
                            <label>Insurance Provider <input name="insurance_provider" /></label>
                            <label>Insurance ID <input name="insurance_id" /></label>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <span class="status">{statusMsg()}</span>
                        <button type="button" class="btn-secondary" onClick={() => setAddModalOpen(false)}>Cancel</button>
                        <button type="submit" class="btn-primary">Create Profile</button>
                    </div>
                </form>
            </div>
        </div>
      </Show>

      {/* --- MODAL 2: VIEW DETAILS & HISTORY --- */}
      <Show when={selectedPatient() !== null}>
        <div class="modal-overlay" onClick={(e) => { if(e.target === e.currentTarget) setSelectedPatient(null) }}>
            <div class="modal" style="width: 800px; max-width: 95%;">
                <div class="modal-header">
                    <h3>{selectedPatient()!.name}</h3>
                    <button class="close-btn" onClick={() => setSelectedPatient(null)}>×</button>
                </div>
                
                <div class="modal-form">
                    {/* TOP: Static Patient Info */}
                    <div class="form-grid" style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <div><label>DOB</label> <div>{selectedPatient()!.birth_date}</div></div>
                        <div><label>Health Card</label> <div>{selectedPatient()!.health_card_num}</div></div>
                        <div><label>Phone</label> <div>{selectedPatient()!.phone}</div></div>
                        <div><label>Address</label> <div>{selectedPatient()!.address}, {selectedPatient()!.city}</div></div>
                        <div class="span-2">
                             <label>Allergies</label> 
                             <div style="color: #ef4444; font-weight: bold;">
                                {selectedPatient()!.allergies || "No Known Allergies"}
                             </div>
                        </div>
                    </div>

                    {/* BOTTOM: Prescription History Table */}
                    <div class="form-section">
                        <h4 style="border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 10px;">Prescription History</h4>
                        
                        <div class="table-container" style="max-height: 300px; overflow-y: auto;">
                          <table class="patient-table" style="font-size: 0.85rem;">
                              <thead>
                                  <tr>
                                      <th>Date</th>
                                      <th>Drug</th>
                                      <th>Sig (Instructions)</th>
                                      <th>Qty</th>
                                      <th>Due</th>
                                  </tr>
                              </thead>
                              <tbody>
                                  <For each={history()}>
                                      {(item) => (
                                          <tr>
                                              <td>{item.date_filled}</td>
                                              <td class="fw-bold">{item.drug_name}</td>
                                              <td class="text-truncate" style="max-width: 150px;" title={item.sig}>{item.sig}</td>
                                              <td>{item.quantity}</td>
                                              
                                              {/* Logic: Red if Refill Date is Today or Past, Green if Future */}
                                              <td style={ new Date(item.next_refill_date) <= new Date() ? "color: #ef4444; font-weight: bold" : "color: #10b981" }>
                                                  {item.next_refill_date}
                                              </td>
                                          </tr>
                                      )}
                                  </For>
                                  <Show when={history().length === 0}>
                                      <tr><td colspan="5" class="empty-state">No prescription history found.</td></tr>
                                  </Show>
                              </tbody>
                          </table>
                        </div>
                    </div>
                </div>

                <div class="modal-footer">
                    <button class="btn-secondary" onClick={() => setSelectedPatient(null)}>Close</button>
                </div>
            </div>
        </div>
      </Show>
    </div>
  );
};

export default PatientManager;