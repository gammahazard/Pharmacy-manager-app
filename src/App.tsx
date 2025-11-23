import { createSignal, Show } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

// Placeholder components for the different pages
const DashboardHome = () => (
  <div class="p-content">
    <h2>Dashboard</h2>
    <div class="stats-grid">
      <div class="stat-card"><h3>12</h3><p>Rx To Fill</p></div>
      <div class="stat-card"><h3>5</h3><p>Due Soon</p></div>
      <div class="stat-card alert"><h3>2</h3><p>Stock Warnings</p></div>
    </div>
  </div>
);

const PatientView = () => {
  // We moved the form logic here to keep App clean
  const [name, setName] = createSignal("");
  const [phone, setPhone] = createSignal("");
  const [status, setStatus] = createSignal("");

  async function savePatient(e: Event) {
    e.preventDefault();
    try {
      await invoke("add_patient", { 
        data: { name: name(), birth_date: "2000-01-01", phone: phone(), insurance_provider: null, insurance_id: null } 
      });
      setStatus("Saved!");
      setName(""); setPhone("");
    } catch (err) {
      console.error(err);
      setStatus("Failed");
    }
  }

  return (
    <div class="p-content">
      <div class="header-row">
        <h2>Patient Management</h2>
        <button class="btn-primary">+ New Patient</button>
      </div>
      
      <div class="panel">
        <h3>Quick Add</h3>
        <form class="inline-form" onSubmit={savePatient}>
          <input placeholder="Name" value={name()} onInput={(e) => setName(e.currentTarget.value)} />
          <input placeholder="Phone" value={phone()} onInput={(e) => setPhone(e.currentTarget.value)} />
          <button type="submit">Save</button>
        </form>
        <p>{status()}</p>
      </div>

      <div class="panel">
        <h3>Patient Directory</h3>
        <p style={{color: "#888"}}>No patients found (List coming soon)</p>
      </div>
    </div>
  );
};

const InventoryView = () => (
  <div class="p-content">
    <h2>Inventory & Formulary</h2>
    <p>Drug database will go here.</p>
  </div>
);

function App() {
  // This controls which "page" is visible
  const [currentView, setCurrentView] = createSignal("dashboard");

  return (
    <div class="app-shell">
      {/* SIDEBAR */}
      <nav class="sidebar">
        <div class="brand">Blisstech</div>
        
        <button 
          class={currentView() === "dashboard" ? "nav-btn active" : "nav-btn"} 
          onClick={() => setCurrentView("dashboard")}
        >
          Dashboard
        </button>
        
        <button 
          class={currentView() === "patients" ? "nav-btn active" : "nav-btn"} 
          onClick={() => setCurrentView("patients")}
        >
          Patients
        </button>
        
        <button 
          class={currentView() === "inventory" ? "nav-btn active" : "nav-btn"} 
          onClick={() => setCurrentView("inventory")}
        >
          Inventory
        </button>
      </nav>

      {/* MAIN CONTENT AREA */}
      <main class="main-area">
        <header class="top-bar">
          <span class="user-info">Logged in: <b>Pharmacist</b></span>
        </header>

        <Show when={currentView() === "dashboard"}>
          <DashboardHome />
        </Show>
        <Show when={currentView() === "patients"}>
          <PatientView />
        </Show>
        <Show when={currentView() === "inventory"}>
          <InventoryView />
        </Show>
      </main>
    </div>
  );
}

export default App;