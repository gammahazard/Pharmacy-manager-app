import { createSignal, Show } from "solid-js";
import "./App.css";

// Import our new split components
import Dashboard from "./components/Dashboard";
import PatientManager from "./components/PatientManager";
import Inventory from "./components/Inventory";

function App() {
  // This state controls which component is visible
  const [currentView, setCurrentView] = createSignal("dashboard");

  return (
    <div class="app-shell">
      {/* SIDEBAR NAVIGATION */}
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

        {/* View Switching Logic */}
        <Show when={currentView() === "dashboard"}>
          <Dashboard />
        </Show>
        
        <Show when={currentView() === "patients"}>
          <PatientManager />
        </Show>
        
        <Show when={currentView() === "inventory"}>
          <Inventory />
        </Show>
      </main>
    </div>
  );
}

export default App;