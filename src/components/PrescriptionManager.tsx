import { createSignal, onMount, For, Show, type Component } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { refillQueue, setRefillQueue } from "../store";

// --- TYPES ---
interface Patient { id: number; name: string; }
interface Medication { id: number; name: string; stock: number; din: string; }

// Define Props Interface
interface PrescriptionManagerProps {
  currentUser: { username: string; role: string } | null;
}

const PrescriptionManager: Component<PrescriptionManagerProps> = (props) => {
  const [patients, setPatients] = createSignal<Patient[]>([]);
  const [meds, setMeds] = createSignal<Medication[]>([]);
  
  const [selectedPid, setSelectedPid] = createSignal("");
  const [selectedMedId, setSelectedMedId] = createSignal("");
  
  const [prescriber, setPrescriber] = createSignal("");
  const [sig, setSig] = createSignal("");
  const [quantity, setQuantity] = createSignal<number | "">("");
  const [daysSupply, setDaysSupply] = createSignal<number | "">("");
  const [refills, setRefills] = createSignal<number | "">("");

  const [statusMsg, setStatusMsg] = createSignal("");
  const [isSuccess, setIsSuccess] = createSignal(false);

  async function loadData() {
    try {
      const p = await invoke<Patient[]>("get_patients");
      const m = await invoke<Medication[]>("get_medications");
      setPatients(p);
      setMeds(m);
    } catch (e) {
      console.error("Error loading dropdowns:", e);
    }
  }

  onMount(async () => {
    await loadData();

    const pending = refillQueue();
    if (pending) {
      console.log("Pre-filling from dashboard:", pending);
      setSelectedPid(pending.patient_id.toString());
      setSelectedMedId(pending.medication_id.toString());
      setPrescriber(pending.prescriber);
      setSig(pending.sig);
      setQuantity(pending.quantity);
      setDaysSupply(pending.days_supply);
      setRefills(pending.refills > 0 ? pending.refills - 1 : 0);
      setStatusMsg(`Loaded refill data for ${pending.patient_name}`);
      setRefillQueue(null); 
    }
  });

  async function handleFill(e: Event) {
    e.preventDefault();
    setStatusMsg("Processing...");
    setIsSuccess(false);

    const qtyVal = Number(quantity());
    
    const med = meds().find(m => m.id.toString() === selectedMedId());
    if (med && med.stock < qtyVal) {
      setStatusMsg(`Error: Insufficient Stock. Only ${med.stock} on hand.`);
      return;
    }

    const payload = {
      // --- FIX: SEND THE USERNAME ---
      logged_in_user: props.currentUser?.username || "system_unknown", 
      // ------------------------------
      patient_id: parseInt(selectedPid()),
      medication_id: parseInt(selectedMedId()),
      prescriber: prescriber(),
      sig: sig(),
      quantity: qtyVal,
      refills: Number(refills()),
      days_supply: Number(daysSupply()),
      date_filled: new Date().toISOString().split('T')[0],
    };

    try {
      await invoke("create_prescription", { data: payload });
      setStatusMsg("✓ Prescription Filled & Inventory Updated");
      setIsSuccess(true);
      loadData(); 
      
      setSelectedPid("");
      setSelectedMedId("");
      setPrescriber("");
      setSig("");
      setQuantity("");
      setDaysSupply("");
      setRefills("");
    } catch (err) {
      console.error(err);
      setStatusMsg(`Transaction Failed: ${err}`);
    }
  }

  return (
    <div class="p-content">
      <div class="header-row">
        <h2>Prescription Processing</h2>
      </div>

      <div class="processing-grid">
        <div class="panel form-panel">
          <h3>New Prescription Order</h3>
          <form onSubmit={handleFill} class="rx-form">
            <div class="form-section">
              <label>Select Patient</label>
              <select required value={selectedPid()} onChange={(e) => setSelectedPid(e.currentTarget.value)}>
                <option value="" disabled selected={selectedPid() === ""}>-- Choose Patient --</option>
                <For each={patients()}>
                  {(p) => <option value={p.id}>{p.name} (ID: {p.id})</option>}
                </For>
              </select>
            </div>

            <div class="form-section">
              <label>Select Medication</label>
              <select required value={selectedMedId()} onChange={(e) => setSelectedMedId(e.currentTarget.value)}>
                <option value="" disabled selected={selectedMedId() === ""}>-- Choose Drug --</option>
                <For each={meds()}>
                  {(m) => (
                    <option value={m.id} disabled={m.stock === 0}>
                      {m.name} (Stock: {m.stock}) {m.stock === 0 ? " - OUT OF STOCK" : ""}
                    </option>
                  )}
                </For>
              </select>
            </div>

            <hr class="divider"/>

            <div class="form-row-2">
               <label>Prescriber Name 
                 <input name="prescriber" value={prescriber()} onInput={(e) => setPrescriber(e.currentTarget.value)} required placeholder="Dr. House" />
               </label>
               <label>Date Filled <input value={new Date().toISOString().split('T')[0]} disabled /></label>
            </div>

            <label>Sig / Instructions 
              <input name="sig" value={sig()} onInput={(e) => setSig(e.currentTarget.value)} required placeholder="e.g. Take 1 tablet PO daily with food" />
            </label>

            <div class="form-row-3">
              <label>Qty Dispensed
                <input name="quantity" type="number" value={quantity()} onInput={(e) => setQuantity(e.currentTarget.valueAsNumber || "")} required placeholder="30" min="1" />
              </label>
              <label>Days Supply
                <input name="days_supply" type="number" value={daysSupply()} onInput={(e) => setDaysSupply(e.currentTarget.valueAsNumber || "")} required placeholder="30" />
              </label>
              <label>Refills
                <input name="refills" type="number" value={refills()} onInput={(e) => setRefills(e.currentTarget.valueAsNumber || "")} required placeholder="0" />
              </label>
            </div>

            <div class="form-footer">
              <div class={isSuccess() ? "status-success" : "status-error"}>
                {statusMsg()}
              </div>
              <button type="submit" class="btn-primary">Process Prescription</button>
            </div>
          </form>
        </div>

        <div class="panel info-panel">
          <h3>Workflow Guide</h3>
          <ul class="guide-list">
            <li>Select Patient to link profile.</li>
            <li>Select Drug to check real-time stock.</li>
            <li><b>Transaction Safety:</b> Inventory is automatically deducted upon processing.</li>
            <li><b>User Tracking:</b> This action will be logged as: <b>{props.currentUser?.username}</b></li>
          </ul>
          
          <div class="alert-box">
             <strong>Current Stock:</strong> 
             {selectedMedId() ? meds().find(m => m.id.toString() === selectedMedId())?.stock : "-"}
          </div>

          <div style="margin-top: 20px; font-size: 0.9em; color: #64748b;">
             <p><strong>Selected Patient:</strong> {selectedPid() ? patients().find(p => p.id.toString() === selectedPid())?.name : "None"}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrescriptionManager;