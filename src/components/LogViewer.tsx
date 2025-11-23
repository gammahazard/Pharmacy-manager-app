import { createSignal, onMount, For, type Component } from "solid-js";
import { invoke } from "@tauri-apps/api/core";

interface LogItem {
  id: number;
  username: string;
  action: string;
  details: string;
  timestamp: string;
}

const LogViewer: Component = () => {
  const [logs, setLogs] = createSignal<LogItem[]>([]);

  async function fetchLogs() {
    try {
      const data = await invoke<LogItem[]>("get_audit_logs");
      setLogs(data);
    } catch (e) {
      console.error("Failed to fetch logs:", e);
    }
  }

  onMount(fetchLogs);

  return (
    <div class="p-content">
      <h2>System Audit Logs</h2>
      <div class="panel table-panel">
        <div class="table-container">
          <table class="patient-table">
            <thead>
              <tr>
                <th style="width: 180px;">Timestamp</th>
                <th style="width: 100px;">User</th>
                <th style="width: 150px;">Action</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              <For each={logs()}>
                {(log) => (
                  <tr>
                    <td class="text-muted" style="font-size: 0.85rem;">{log.timestamp}</td>
                    <td class="fw-bold">{log.username}</td>
                    <td><span class="badge-gray">{log.action}</span></td>
                    <td class="text-muted">{log.details}</td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LogViewer;