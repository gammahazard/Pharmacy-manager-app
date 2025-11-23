import { createSignal, onMount, Show, For, type Component } from 'solid-js';
import { invoke } from "@tauri-apps/api/core";
import { setRefillQueue } from "../store"; 

interface DueRx {
  id: number;
  patient_name: string;
  medication_name: string;
  next_refill_date: string;
  phone: string;
  patient_id: number;
  medication_id: number;
  quantity: number;
  sig: string;
  days_supply: number;
  refills: number;
  prescriber: string;
}

interface DashboardProps {
  onNavigate?: (view: string) => void;
}

const Dashboard: Component<DashboardProps> = (props) => {
  const [stats, setStats] = createSignal({ due_today: 0, due_soon: 0, low_stock: 0 });
  const [upcomingList, setUpcomingList] = createSignal<DueRx[]>([]); // <--- NEW STATE
  
  // Modal State
  const [isModalOpen, setModalOpen] = createSignal(false);
  const [modalTitle, setModalTitle] = createSignal("");
  const [dueList, setDueList] = createSignal<DueRx[]>([]);

  async function loadData() {
    try {
      // 1. Get Stats
      const data = await invoke<any>("get_dashboard_stats");
      setStats(data);

      // 2. Get Next 4 Up (The List)
      const nextUp = await invoke<DueRx[]>("get_upcoming_refills");
      setUpcomingList(nextUp);

    } catch (e) {
      console.error(e);
    }
  }

  onMount(loadData);

  // --- CLICK HANDLER (For Stats Cards) ---
  async function openDueList(type: "today" | "soon") {
    setModalTitle(type === "today" ? "Action Required: Due Today" : "Upcoming Refills (7 Days)");
    try {
      const list = await invoke<DueRx[]>("get_due_prescriptions", { filter: type });
      setDueList(list);
      setModalOpen(true);
    } catch (e) { console.error(e); }
  }

  // --- REFILL ACTION ---
  function handleProcessRefill(rx: DueRx) {
    setRefillQueue(rx);
    setModalOpen(false);
    if (props.onNavigate) props.onNavigate("rx"); 
  }

  return (
    <div class="p-content">
      <h2>Dashboard Overview</h2>
      
      <div class="stats-grid">
        <div 
            class="stat-card clickable" 
            style={stats().due_today > 0 ? "border-left: 5px solid #ef4444" : ""}
            onClick={() => openDueList("today")}
        >
            <h3>{stats().due_today}</h3>
            <p>Rx To Fill (Due Today)</p>
        </div>

        <div 
            class="stat-card clickable"
            onClick={() => openDueList("soon")}
        >
            <h3>{stats().due_soon}</h3>
            <p>Refills Due (7 Days)</p>
        </div>

        <div class="stat-card alert">
            <h3>{stats().low_stock}</h3>
            <p>Stock Warnings</p>
        </div>
      </div>

      {/* --- NEW SECTION: UPCOMING LIST --- */}
      <div style="margin-top: 30px;">
        <h3>Next Up: Priority Refills</h3>
        <div class="panel table-panel">
            <div class="table-container">
                <table class="patient-table">
                    <thead>
                        <tr>
                            <th>Due Date</th>
                            <th>Patient</th>
                            <th>Medication</th>
                            <th>Phone</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        <For each={upcomingList()}>
                            {(item) => (
                                <tr>
                                    {/* Red if today/past, Green if future */}
                                    <td style={ new Date(item.next_refill_date) <= new Date() ? "color: #ef4444; font-weight: bold" : "color: #10b981" }>
                                        {item.next_refill_date}
                                    </td>
                                    <td class="fw-bold">{item.patient_name}</td>
                                    <td>{item.medication_name}</td>
                                    <td class="text-muted">{item.phone}</td>
                                    <td>
                                        <button class="btn-small" onClick={() => handleProcessRefill(item)}>
                                            Refill Now
                                        </button>
                                    </td>
                                </tr>
                            )}
                        </For>
                        <Show when={upcomingList().length === 0}>
                            <tr><td colspan="5" class="empty-state">No upcoming refills found.</td></tr>
                        </Show>
                    </tbody>
                </table>
            </div>
        </div>
      </div>

      {/* --- MODAL (Keep existing modal for detailed lists) --- */}
      <Show when={isModalOpen()}>
        <div class="modal-overlay" onClick={(e) => { if(e.target===e.currentTarget) setModalOpen(false) }}>
          <div class="modal" style="width: 700px">
            <div class="modal-header">
              <h3>{modalTitle()}</h3>
              <button class="close-btn" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <div class="modal-form">
              <table class="patient-table">
                <thead>
                  <tr><th>Patient</th><th>Drug</th><th>Due Date</th><th>Action</th></tr>
                </thead>
                <tbody>
                  <For each={dueList()}>
                    {(item) => (
                      <tr>
                        <td class="fw-bold">{item.patient_name}</td>
                        <td>{item.medication_name}</td>
                        <td style="color: #ef4444">{item.next_refill_date}</td>
                        <td>
                          <button class="btn-small" onClick={() => handleProcessRefill(item)}>
                            Process Refill
                          </button>
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default Dashboard;