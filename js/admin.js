/**
 * Admin Panel Module
 * Owner-only functionality for system management
 */

// ==================== Show Admin Panel ====================
async function showAdminPanel() {
  document.getElementById('adminPanelModal').classList.add('active');
  switchAdminTab('dashboard');
}

function closeAdminPanel() {
  document.getElementById('adminPanelModal').classList.remove('active');
}

// ==================== Switch Admin Tabs ====================
async function switchAdminTab(tab) {
  document.getElementById('adminDashboardTab').classList.add('hidden');
  document.getElementById('adminRoomsTab').classList.add('hidden');
  document.getElementById('adminUsersTab').classList.add('hidden');
  document.getElementById('adminLogsTab').classList.add('hidden');

  ['dashboard', 'rooms', 'users', 'logs'].forEach(t => {
    const btn = document.getElementById('adminTab' + t.charAt(0).toUpperCase() + t.slice(1));
    if (t === tab) {
      btn.className = 'px-4 py-2 font-semibold border-b-2 border-red-600 text-red-600 whitespace-nowrap';
    } else {
      btn.className = 'px-4 py-2 font-semibold whitespace-nowrap';
      btn.style.color = 'var(--text-secondary)';
    }
  });

  document.getElementById('admin' + tab.charAt(0).toUpperCase() + tab.slice(1) + 'Tab').classList.remove('hidden');

  if (tab === 'dashboard') {
    await loadAdminDashboard();
  } else if (tab === 'rooms') {
    await loadActiveRooms();
  } else if (tab === 'users') {
    await loadUsers();
  } else if (tab === 'logs') {
    await loadActivityLogs();
  }
}

// ==================== Dashboard ====================
async function loadAdminDashboard() {
  try {
    const usersSnapshot = await db.collection('users').get();
    document.getElementById('adminTotalUsers').textContent = usersSnapshot.size;

    const roomsSnapshot = await db.collection('rooms').where('status', '==', 'active').get();
    document.getElementById('adminActiveRooms').textContent = roomsSnapshot.size;

    const hostsSnapshot = await db.collection('users').where('role', '==', 'host').get();
    document.getElementById('adminTotalHosts').textContent = hostsSnapshot.size;

    const todayStart = new Date().setHours(0, 0, 0, 0);
    const logsSnapshot = await db.collection('logs').where('timestamp', '>=', todayStart).get();
    document.getElementById('adminTodayActivity').textContent = logsSnapshot.size;

    drawActivityChart();
  } catch (error) {
    console.error('Error loading dashboard:', error);
  }
}

async function drawActivityChart() {
  const ctx = document.getElementById('adminActivityChart').getContext('2d');
  if (window.adminChartInstance) {
    window.adminChartInstance.destroy();
  }

  const labels = [];
  const data = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dayStart = date.setHours(0, 0, 0, 0);
    const dayEnd = date.setHours(23, 59, 59, 999);
    labels.push(date.toLocaleDateString('en', { weekday: 'short' }));
    const logsSnapshot = await db.collection('logs').where('timestamp', '>=', dayStart).where('timestamp', '<=', dayEnd).get();
    data.push(logsSnapshot.size);
  }

  window.adminChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Activity',
        data: data,
        borderColor: '#0891b2',
        backgroundColor: 'rgba(8, 145, 178, 0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0
          }
        }
      }
    }
  });
}

// ==================== Active Rooms ====================
async function loadActiveRooms() {
  const roomsSnapshot = await db.collection('rooms').where('status', '==', 'active').get();
  const container = document.getElementById('activeRoomsList');
  container.innerHTML = '';

  if (roomsSnapshot.empty) {
    container.innerHTML = '<p style="color: var(--text-secondary)" class="text-center">No active rooms</p>';
    return;
  }

  for (const doc of roomsSnapshot.docs) {
    const data = doc.data();
    const playersSnapshot = await db.collection('rooms').doc(doc.id).collection('players').get();
    const div = document.createElement('div');
    div.className = 'glass-card p-4 rounded-xl';
    div.innerHTML = `
      <div class="flex items-center justify-between mb-2">
        <div>
          <h4 class="font-bold text-lg" style="color: var(--text-primary)">${safeDisplay(data.roomName)}</h4>
          <p class="text-sm" style="color: var(--text-secondary)">
            Room ID: <span class="font-mono font-bold">${doc.id}</span> | 
            Players: <span class="font-bold">${playersSnapshot.size}</span> | 
            Created by: <span class="font-bold">${safeDisplay(data.createdBy)}</span>
          </p>
        </div>
        <div class="flex gap-2">
          <button onclick="joinAsOwner('${doc.id}')" class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition text-sm">
            <i class="fa-solid fa-crown mr-1"></i>Join as Owner
          </button>
          <button onclick="closeRoomAdmin('${doc.id}')" class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition text-sm">
            <i class="fa-solid fa-times mr-1"></i>Close
          </button>
        </div>
      </div>
    `;
    container.appendChild(div);
  }
}

async function closeRoomAdmin(rid) {
  if (confirm('Close this room? All players will be disconnected.')) {
    await db.collection('rooms').doc(rid).update({ status: 'closed' });
    await logAdminActivity('Room closed', `Room ${rid} closed by admin`);
    loadActiveRooms();
    showNotification('Room closed successfully!', 'success');
  }
}

async function joinAsOwner(rid) {
  try {
    const roomDoc = await db.collection('rooms').doc(rid).get();
    if (!roomDoc.exists) {
      showNotification('Room does not exist!', 'error');
      return;
    }
    const roomData = roomDoc.data();
    if (roomData.status !== 'active') {
      showNotification('This room is no longer active!', 'error');
      return;
    }
    roomId = rid;
    isHost = true;
    isOwner = true;
    closeAdminPanel();
    joinRoomLogic();
  } catch (error) {
    console.error('Error joining room as owner:', error);
    showNotification('Failed to join room as owner', 'error');
  }
}

// ==================== Manage Users ====================
async function loadUsers() {
  const usersSnapshot = await db.collection('users').get();
  const usersTableBody = document.getElementById('usersTableBody');
  usersTableBody.innerHTML = '';

  if (usersSnapshot.empty) {
    usersTableBody.innerHTML = '<tr><td colspan="5" style="color: var(--text-secondary)" class="text-center p-4">No users found</td></tr>';
    return;
  }

  usersSnapshot.forEach(doc => {
    const data = doc.data();
    const row = document.createElement('tr');
    row.className = 'border-b';
    row.style.borderColor = 'var(--border-color)';

    let roleBadge = '';
    if (data.role === 'owner') {
      roleBadge = '<span class="owner-badge text-white text-xs px-2 py-1 rounded-full">OWNER</span>';
    } else if (data.role === 'host') {
      roleBadge = '<span class="host-badge text-white text-xs px-2 py-1 rounded-full">HOST</span>';
    } else {
      roleBadge = '<span class="bg-gray-500 text-white text-xs px-2 py-1 rounded-full">USER</span>';
    }

    let actionButtons = '';
    if (doc.id !== currentUser.username && data.role !== 'owner') {
      if (data.role === 'host') {
        actionButtons = `<button onclick="demoteUser('${doc.id}')" class="bg-orange-600 text-white px-3 py-1 rounded text-sm hover:bg-orange-700 transition">Demote to User</button>`;
      } else {
        actionButtons = `<button onclick="promoteUser('${doc.id}')" class="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition">Promote to Host</button>`;
      }
    } else if (doc.id === currentUser.username) {
      actionButtons = '<span class="text-sm" style="color: var(--text-secondary)">You</span>';
    }

    row.innerHTML = `
      <td class="p-2 text-sm font-mono">${doc.id}</td>
      <td class="p-2">${safeDisplay(data.username)}</td>
      <td class="p-2">${safeDisplay(data.displayName)}</td>
      <td class="p-2">${roleBadge}</td>
      <td class="p-2">${actionButtons}</td>
    `;
    usersTableBody.appendChild(row);
  });
}

function filterUsers() {
  const input = document.getElementById('userSearchInput').value.toLowerCase();
  const rows = document.querySelectorAll('#usersTableBody tr');
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(input) ? '' : 'none';
  });
}

async function promoteUser(userId) {
  if (confirm('Promote this user to Host?')) {
    try {
      await db.collection('users').doc(userId).update({ role: 'host' });
      const userDoc = await db.collection('users').doc(userId).get();
      const userData = userDoc.data();
      await logAdminActivity('User promoted', `${userData.username} promoted to Host by ${currentUser.username}`);
      loadUsers();
      showNotification(`User promoted to Host successfully!`, 'success');
    } catch (error) {
      console.error('Error promoting user:', error);
      showNotification('Failed to promote user', 'error');
    }
  }
}

async function demoteUser(userId) {
  if (confirm('Demote this Host to User?')) {
    try {
      await db.collection('users').doc(userId).update({ role: 'user' });
      const userDoc = await db.collection('users').doc(userId).get();
      const userData = userDoc.data();
      await logAdminActivity('User demoted', `${userData.username} demoted to User by ${currentUser.username}`);
      loadUsers();
      showNotification(`User demoted to User successfully!`, 'success');
    } catch (error) {
      console.error('Error demoting user:', error);
      showNotification('Failed to demote user', 'error');
    }
  }
}

// ==================== Activity Logs ====================
async function loadActivityLogs() {
  const logsSnapshot = await db.collection('logs').orderBy('timestamp', 'desc').limit(100).get();
  const container = document.getElementById('activityLogs');
  container.innerHTML = '';

  if (logsSnapshot.empty) {
    container.innerHTML = '<p style="color: var(--text-secondary)" class="text-center">No activity logs</p>';
    return;
  }

  logsSnapshot.forEach(doc => {
    const data = doc.data();
    const date = new Date(data.timestamp);
    const div = document.createElement('div');
    div.className = 'glass-card p-3 rounded-lg';
    div.innerHTML = `
      <div class="flex items-center justify-between">
        <div>
          <span class="font-semibold" style="color: var(--text-primary)">${safeDisplay(data.action)}</span>
          <p class="text-sm" style="color: var(--text-secondary)">${safeDisplay(data.details)}</p>
        </div>
        <span class="text-xs whitespace-nowrap ml-4" style="color: var(--text-secondary)">${date.toLocaleString()}</span>
      </div>
    `;
    container.appendChild(div);
  });
}