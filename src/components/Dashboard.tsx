import type { Component } from 'solid-js';

const Dashboard: Component = () => {
  return (
    <div class="p-content">
      <h2>Dashboard</h2>
      <div class="stats-grid">
        <div class="stat-card"><h3>12</h3><p>Rx To Fill</p></div>
        <div class="stat-card"><h3>5</h3><p>Due Soon</p></div>
        <div class="stat-card alert"><h3>2</h3><p>Stock Warnings</p></div>
      </div>
    </div>
  );
};

export default Dashboard;