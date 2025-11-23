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

interface InventoryProps {
  currentUser: { username: string; role: string } | null;
}

const Inventory: Component<InventoryProps> = (props) => {
  const [medList, setMedList] = createSignal<Medication[]>([]);
  
  // Modal State
  const [isModalOpen, setModalOpen] = createSignal(false);
  const [modalMode, setModalMode] = createSignal<"add" | "edit">("add");
  const [editingId, setEditingId] = createSignal<number | null>(null);
  
  // Form Fields (Signals for binding)
  const [name, setName] = createSignal("");
  const [din, setDin] = createSignal("");
  const [ndc, setNdc] = createSignal("");
  const [desc, setDesc] = createSignal("");
  const [stock, setStock] = createSignal<number | "">("");
  const [price, setPrice] = createSignal<number | "">("");
  const [exp, setExp] = createSignal("");

  const [statusMsg, setStatusMsg] = createSignal("");

  // --- ACTIONS ---

  async function fetchMeds() {
    try {
      setMedList(await invoke("get_medications"));
    } catch (e) { 
        console.error(e); // <--- FIX IS HERE (Added curly braces)
    }
  }

  onMount(fetchMeds);

  // Open "Add" Modal
  function openAdd() {
    setModalMode("add");
    setEditingId(null);
    // Clear form
    setName(""); setDin(""); setNdc(""); setDesc(""); setStock(""); setPrice(""); setExp("");
    setStatusMsg("");
    setModalOpen(true);
  }

  // Open "Edit" Modal
  function openEdit(med: Medication) {
    setModalMode("edit");
    setEditingId(med.id);
    // Pre-fill form
    setName(med.name);
    setDin(med.din);
    setNdc(med.ndc || "");
    setDesc(med.description || "");
    setStock(med.stock);
    setPrice(med.price);
    setExp(med.expiration);
    setStatusMsg("");
    setModalOpen(true);
  }

  async function handleSave(e: Event) {
    e.preventDefault();
    setStatusMsg("Saving...");

    const stockVal = Number(stock());
    const priceVal = Number(price());

    try {
      if (modalMode() === "add") {
        // --- ADD LOGIC ---
        await invoke("add_medication", { 
            data: { 
                logged_in_user: props.currentUser?.username || "unknown",
                name: name(), din: din(), ndc: ndc() || null, description: desc() || null,
                stock: stockVal, price: priceVal, expiration: exp()
            } 
        });
      } else {
        // --- EDIT LOGIC ---
        await invoke("update_medication", {
            data: {
                logged_in_user: props.currentUser?.username || "unknown",
                id: editingId(),
                stock: stockVal,
                price: priceVal,
                description: desc() || null
                // Name/DIN not sent to prevent identity changes
            }
        });
      }
      
      setStatusMsg("Saved!");
      setModalOpen(false);
      fetchMeds();
    } catch (err) {
      console.error(err);
      setStatusMsg("Error: " + err);
    }
  }

  return (
    <div class="p-content">
      <div class="header-row">
        <div><h2>Inventory</h2><p class="subtitle">{medList().length} Items</p></div>
        <button class="btn-primary" onClick={openAdd}>+ Add Drug</button>
      </div>

      <div class="panel table-panel">
        <div class="table-container">
          <table class="patient-table">
            <thead>
              <tr>
                <th>DIN</th><th>Name</th><th>Stock</th><th>Price</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              <For each={medList()}>
                {(med) => (
                  <tr>
                    <td class="text-muted">{med.din}</td>
                    <td class="fw-bold">{med.name}</td>
                    <td style={med.stock < 100 ? "color:red" : ""}>{med.stock}</td>
                    <td>${med.price.toFixed(2)}</td>
                    <td>
                      <button class="btn-small" onClick={() => openEdit(med)}>Edit</button>
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

      {/* MODAL FORM */}
      <Show when={isModalOpen()}>
        <div class="modal-overlay">
            <div class="modal">
                <div class="modal-header">
                    <h3>{modalMode() === "add" ? "Add Drug" : "Edit Inventory"}</h3>
                    <button class="close-btn" onClick={() => setModalOpen(false)}>×</button>
                </div>
                <form onSubmit={handleSave} class="modal-form">
                    <div class="form-grid">
                        <label class="span-2">Name 
                            <input value={name()} onInput={(e)=>setName(e.currentTarget.value)} disabled={modalMode()==="edit"} required />
                        </label>
                        <label>DIN 
                            <input value={din()} onInput={(e)=>setDin(e.currentTarget.value)} disabled={modalMode()==="edit"} required />
                        </label>
                        <label>Stock 
                            <input type="number" value={stock()} onInput={(e)=>setStock(e.currentTarget.valueAsNumber)} required />
                        </label>
                        <label>Price 
                            <input type="number" step="0.01" value={price()} onInput={(e)=>setPrice(e.currentTarget.valueAsNumber)} required />
                        </label>
                        <label>Expiration 
                            <input type="date" value={exp()} onInput={(e)=>setExp(e.currentTarget.value)} required />
                        </label>
                        <label>Description 
                            <input value={desc()} onInput={(e)=>setDesc(e.currentTarget.value)} />
                        </label>
                        <label>NDC (Optional) 
                            <input value={ndc()} onInput={(e)=>setNdc(e.currentTarget.value)} disabled={modalMode()==="edit"} />
                        </label>
                    </div>
                    <div class="modal-footer">
                        <button type="submit" class="btn-primary">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
      </Show>
    </div>
  );
};

export default Inventory;