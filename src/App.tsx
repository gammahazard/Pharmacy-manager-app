import { createSignal, Show } from "solid-js";
import "./App.css";
import Dashboard from "./components/Dashboard";
import PatientManager from "./components/PatientManager";
import Inventory from "./components/Inventory";
import PrescriptionManager from "./components/PrescriptionManager";
import Login from "./components/Login";
import LogViewer from "./components/LogViewer";

function App() {
  const [currentUser, setCurrentUser] = createSignal<{username: string, role: string} | null>(null);
  const [currentView, setCurrentView] = createSignal("dashboard");

  const handleLoginSuccess = (user: {username: string, role: string}) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentView("dashboard");
  };

  return (
    <>
      <Show when={!currentUser()}>
        <Login onLogin={handleLoginSuccess} />
      </Show>

      <Show when={currentUser()}>
        <div class="app-shell">
          <nav class="sidebar">
            <div class="brand">Blisstech</div>
            
            <button class={currentView() === "dashboard" ? "nav-btn active" : "nav-btn"} onClick={() => setCurrentView("dashboard")}>Dashboard</button>
            <button class={currentView() === "patients" ? "nav-btn active" : "nav-btn"} onClick={() => setCurrentView("patients")}>Patients</button>
            <button class={currentView() === "inventory" ? "nav-btn active" : "nav-btn"} onClick={() => setCurrentView("inventory")}>Inventory</button>
            <button class={currentView() === "rx" ? "nav-btn active" : "nav-btn"} onClick={() => setCurrentView("rx")}>New Prescription</button>
            
            <Show when={currentUser()?.role === "admin"}>
               <hr style={{border: "0", "border-top": "1px solid #334155", margin: "10px 0"}}/>
               <button class={currentView() === "logs" ? "nav-btn active" : "nav-btn"} onClick={() => setCurrentView("logs")}>Audit Logs</button>
            </Show>

            <div style="margin-top: auto">
                <p style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 10px;">User: {currentUser()?.username}</p>
                <button class="nav-btn" onClick={handleLogout}>Logout</button>
            </div>
          </nav>

          <main class="main-area">
            <Show when={currentView() === "dashboard"}>
                <Dashboard onNavigate={(view) => setCurrentView(view)} />
            </Show>
            
            {/* PASS USER PROP TO MANAGERS */}
            <Show when={currentView() === "patients"}>
                <PatientManager currentUser={currentUser()} /> 
            </Show>
            <Show when={currentView() === "inventory"}>
                <Inventory currentUser={currentUser()} />
            </Show>
            <Show when={currentView() === "rx"}>
                <PrescriptionManager currentUser={currentUser()} />
            </Show>
            
            <Show when={currentView() === "logs" && currentUser()?.role === "admin"}>
                <LogViewer />
            </Show>
          </main>
        </div>
      </Show>
    </>
  );
}

export default App;