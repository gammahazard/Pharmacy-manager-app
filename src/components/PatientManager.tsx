import { createSignal, onMount, For, Show, type Component } from "solid-js";
import { invoke } from "@tauri-apps/api/core";

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

const PatientManager: Component = () => {
  const [patientList, setPatientList] = createSignal<Patient[]>([]);
  
  // State for the "Add New" Modal
  const [isAddModalOpen, setAddModalOpen] = createSignal(false);
  
  // State for the "View Details" Modal (Stores the specific patient clicked)
  const [selectedPatient, setSelectedPatient] = createSignal<Patient | null>(null);
  
  const [statusMsg, setStatusMsg] = createSignal("");

  // --- FETCH DATA ---
  async function fetchPatients() {
    try {
      const patients = await invoke<Patient[]>("get_patients");
      setPatientList(patients);
    } catch (e) {
      console.error("Failed to fetch patients:", e);
    }
  }

  onMount(fetchPatients);

  // --- SAVE DATA (For New Patient) ---
  async function handleSave(e: Event) {
    e.preventDefault();
    setStatusMsg("Saving...");

    const formData = new FormData(e.target as HTMLFormElement);
    
    const payload = {
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
      setStatusMsg("Error saving.");
    }
  }

  return (
    <div class="p-content">
      {/* HEADER */}
      <div class="header-row">
        <div>
            <h2>Patient Directory</h2>
            <p class="subtitle">{patientList().length} Active Patients</p>
        </div>
        <button class="btn-primary" onClick={() => setAddModalOpen(true)}>
            + New Patient
        </button>
      </div>

      {/* MINIMAL TABLE (Clean List) */}
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
                  <tr onClick={() => setSelectedPatient(patient)} style="cursor: pointer">
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
                    {/* (Reuse the same form layout we built before) */}
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

      {/* --- MODAL 2: VIEW DETAILS (Read Only) --- */}
      <Show when={selectedPatient() !== null}>
        <div class="modal-overlay" onClick={(e) => { if(e.target === e.currentTarget) setSelectedPatient(null) }}>
            <div class="modal">
                <div class="modal-header">
                    <h3>Patient Details: #{selectedPatient()!.id}</h3>
                    <button class="close-btn" onClick={() => setSelectedPatient(null)}>×</button>
                </div>
                
                <div class="modal-form">
                    {/* Read-Only Display */}
                    <div class="form-section">
                        <h4>Personal Info</h4>
                        <div class="form-grid">
                            <div><label>Full Name</label> <div>{selectedPatient()!.name}</div></div>
                            <div><label>Date of Birth</label> <div>{selectedPatient()!.birth_date}</div></div>
                            <div><label>Health Card</label> <div>{selectedPatient()!.health_card_num}</div></div>
                            <div><label>Phone</label> <div>{selectedPatient()!.phone}</div></div>
                            <div class="span-2"><label>Email</label> <div>{selectedPatient()!.email || "-"}</div></div>
                        </div>
                    </div>

                    <div class="form-section">
                        <h4>Address</h4>
                        <div class="form-grid">
                             <div class="span-2">
                                <div>{selectedPatient()!.address}</div>
                                <div>{selectedPatient()!.city}, {selectedPatient()!.state} {selectedPatient()!.postal_code}</div>
                             </div>
                        </div>
                    </div>

                    <div class="form-section">
                        <h4>Clinical & Billing</h4>
                        <div class="form-grid">
                            <div class="span-2">
                                <label>Allergies</label> 
                                <div style="color: #ef4444; font-weight: bold;">{selectedPatient()!.allergies || "No Known Allergies"}</div>
                            </div>
                            <div><label>Insurance</label> <div>{selectedPatient()!.insurance_provider || "Cash Pay"}</div></div>
                            <div><label>ID #</label> <div>{selectedPatient()!.insurance_id || "-"}</div></div>
                        </div>
                    </div>
                </div>

                <div class="modal-footer" style="padding: 20px; border-top: 1px solid #e2e8f0;">
                    <button class="btn-secondary" onClick={() => setSelectedPatient(null)}>Close</button>
                    {/* Placeholder for future features */}
                    <button class="btn-primary">Create New Prescription</button>
                </div>
            </div>
        </div>
      </Show>

    </div>
  );
};

export default PatientManager;