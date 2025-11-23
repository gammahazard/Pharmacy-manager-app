import { createSignal, onMount, For, Show, type Component } from "solid-js";
import { invoke } from "@tauri-apps/api/core";

// Match the Rust Struct exactly
interface Medication {
  id: number;
  name: string;
  din: string;          // Canadian ID
  ndc?: string;         // US/Barcode ID
  description?: string;
  stock: number;
  price: number;
  expiration: string;
}

const Inventory: Component = () => {
  const [medList, setMedList] = createSignal<Medication[]>([]);
  const [isAddModalOpen, setAddModalOpen] = createSignal(false);
  const [statusMsg, setStatusMsg] = createSignal("");

  // --- FETCH DATA ---
  async function fetchMeds() {
    try {
      const meds = await invoke<Medication[]>("get_medications");
      setMedList(meds);
    } catch (e) {
      console.error("Failed to fetch inventory:", e);
    }
  }

  onMount(fetchMeds);

  // --- SAVE DATA ---
  async function handleSave(e: Event) {
    e.preventDefault();
    setStatusMsg("Adding to formulary...");

    const formData = new FormData(e.target as HTMLFormElement);
    
    // Parse numbers correctly for Rust (i32 and f64)
    const stockVal = parseInt(formData.get("stock") as string) || 0;
    const priceVal = parseFloat(formData.get("price") as string) || 0.0;

    const payload = {
      name: formData.get("name") as string,
      din: formData.get("din") as string,
      ndc: (formData.get("ndc") as string) || null,
      description: (formData.get("description") as string) || null,
      stock: stockVal,
      price: priceVal,
      expiration: formData.get("expiration") as string,
    };

    try {
      await invoke("add_medication", { data: payload });
      setStatusMsg("");
      setAddModalOpen(false);
      fetchMeds(); // Refresh table
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      console.error(err);
      setStatusMsg("Error: Check console (DIN might be duplicate)");
    }
  }

  return (
    <div class="p-content">
      {/* HEADER */}
      <div class="header-row">
        <div>
            <h2>Inventory & Formulary</h2>
            <p class="subtitle">Total SKUs: {medList().length}</p>
        </div>
        <button class="btn-primary" onClick={() => setAddModalOpen(true)}>
            + Add Drug
        </button>
      </div>

      {/* DATA TABLE */}
      <div class="panel table-panel">
        <div class="table-container">
          {/* Reusing 'patient-table' class for consistent styling */}
          <table class="patient-table">
            <thead>
              <tr>
                <th style="width: 100px;">DIN</th>
                <th>Drug Name</th>
                <th style="width: 80px;">Stock</th>
                <th style="width: 100px;">Price</th>
                <th style="width: 120px;">Expires</th>
                <th style="width: 80px;">Action</th>
              </tr>
            </thead>
            <tbody>
              <For each={medList()}>
                {(med) => (
                  <tr>
                    <td class="fw-bold text-muted">{med.din}</td>
                    <td class="fw-bold">{med.name}</td>
                    
                    {/* Visual Logic: Red text if stock is low (< 100) */}
                    <td style={med.stock < 100 ? "color: #ef4444; font-weight: bold" : ""}>
                        {med.stock}
                    </td>
                    
                    <td>${med.price.toFixed(2)}</td>
                    <td>{med.expiration}</td>
                    <td>
                      <button class="btn-small">Edit</button>
                    </td>
                  </tr>
                )}
              </For>
              <Show when={medList().length === 0}>
                <tr><td colspan="6" class="empty-state">Inventory empty. Add medications to begin.</td></tr>
              </Show>
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL: ADD MEDICATION --- */}
      <Show when={isAddModalOpen()}>
        <div class="modal-overlay">
            <div class="modal">
                <div class="modal-header">
                    <h3>Add to Formulary</h3>
                    <button class="close-btn" onClick={() => setAddModalOpen(false)}>×</button>
                </div>
                
                <form onSubmit={handleSave} class="modal-form">
                    
                    <div class="form-section">
                        <h4>Identification</h4>
                        <div class="form-grid">
                            <label class="span-2">Drug Name (Brand/Generic) * <input name="name" required placeholder="e.g. Amoxicillin 500mg" />
                            </label>
                            <label>DIN (Health Canada) * <input name="din" required placeholder="02245678" />
                            </label>
                            <label>NDC / UPC (Optional)
                                <input name="ndc" placeholder="Barcode" />
                            </label>
                        </div>
                    </div>

                    <div class="form-section">
                        <h4>Inventory Control</h4>
                        <div class="form-grid">
                            <label>Initial Stock * <input name="stock" type="number" required placeholder="0" />
                            </label>
                            <label>Cash Price ($) * <input name="price" type="number" step="0.01" required placeholder="0.00" />
                            </label>
                            <label>Expiration Date * <input name="expiration" type="date" required />
                            </label>
                            <label>Description / Location 
                                <input name="description" placeholder="Shelf A2" />
                            </label>
                        </div>
                    </div>

                    <div class="modal-footer">
                        <span class="status">{statusMsg()}</span>
                        <button type="button" class="btn-secondary" onClick={() => setAddModalOpen(false)}>Cancel</button>
                        <button type="submit" class="btn-primary">Add Item</button>
                    </div>
                </form>
            </div>
        </div>
      </Show>
    </div>
  );
};

export default Inventory;