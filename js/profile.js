/**
 * Profile & Leaderboard Module
 * Handles user profiles, statistics, match history, and leaderboards
 */

// ==================== Show Profile ====================
function showProfile() {
  document.getElementById('profileDropdown').classList.remove('active');
  document.getElementById('profileModal').classList.add('active');
  loadProfileStats();
}

function closeProfile() {
  document.getElementById('profileModal').classList.remove('active');
}

// ==================== Load Profile Stats ====================
async function loadProfileStats() {
  try {
    const userDoc = await db.collection('users').doc(currentUser.username).get();
    const userData = userDoc.data();
    const stats = userData.stats || {};

    document.getElementById('statTotalScore').textContent = stats.totalScore || 0;
    document.getElementById('statCorrect').textContent = stats.correctAnswers || 0;
    document.getElementById('statWrong').textContent = stats.wrongAnswers || 0;
    document.getElementById('statFirstBuzz').textContent = stats.firstBuzzes || 0;

    document.getElementById('profileDisplayName').textContent = userData.displayName;
    document.getElementById('profileUsername').textContent = userData.username;

    const roleText = userData.role === 'owner' ? 'Owner' : userData.role === 'host' ? 'Host' : 'User';
    document.getElementById('profileRole').textContent = roleText;
    document.getElementById('profileRole').className = userData.role === 'owner' ? 'text-red-600 font-bold' : userData.role === 'host' ? 'text-yellow-600 font-bold' : 'text-gray-600 font-bold';

    document.getElementById('profileAvatar').textContent = userData.displayName.charAt(0).toUpperCase();

    drawPerformanceChart(stats);
  } catch (error) {
    console.error('Error loading profile stats:', error);
  }
}

// ==================== Draw Performance Chart ====================
function drawPerformanceChart(stats) {
  const ctx = document.getElementById('performanceChart').getContext('2d');
  if (window.performanceChartInstance) {
    window.performanceChartInstance.destroy();
  }
  window.performanceChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Correct', 'Wrong'],
      datasets: [{
        data: [stats.correctAnswers || 0, stats.wrongAnswers || 0],
        backgroundColor: ['#10b981', '#ef4444'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
}

// ==================== Edit Profile ====================
function showEditProfile() {
  document.getElementById('profileModal').classList.remove('active');
  document.getElementById('editProfileModal').classList.add('active');
  document.getElementById('editDisplayName').value = currentUser.displayName;
}

function closeEditProfile() {
  document.getElementById('editProfileModal').classList.remove('active');
}

async function saveProfile() {
  const newDisplayName = document.getElementById('editDisplayName').value.trim();
  if (!newDisplayName) {
    showNotification('Display name cannot be empty!', 'error');
    return;
  }
  try {
    await db.collection('users').doc(currentUser.username).update({
      displayName: safeDisplay(newDisplayName)
    });
    currentUser.displayName = newDisplayName;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    await loadUserProfile();
    closeEditProfile();
    showNotification('Profile updated successfully!', 'success');
  } catch (error) {
    console.error('Error updating profile:', error);
    showNotification('Failed to update profile', 'error');
  }
}

// ==================== Match History ====================
function showMatchHistory() {
  document.getElementById('profileDropdown').classList.remove('active');
  document.getElementById('matchHistoryModal').classList.add('active');
  loadMatchHistory();
}

async function loadMatchHistory() {
  try {
    const historySnapshot = await db.collection('users').doc(currentUser.username).collection('matchHistory').orderBy('timestamp', 'desc').limit(20).get();
    const container = document.getElementById('historyList');
    container.innerHTML = '';

    if (historySnapshot.empty) {
      container.innerHTML = '<p style="color: var(--text-secondary)" class="text-center">No match history yet</p>';
      return;
    }

    historySnapshot.forEach(doc => {
      const data = doc.data();
      const date = new Date(data.timestamp);
      const div = document.createElement('div');
      div.className = 'glass-card p-4 rounded-xl';
      div.innerHTML = `
        <div class="flex items-center justify-between mb-2">
          <h4 class="font-bold" style="color: var(--text-primary)">${safeDisplay(data.roomName)}</h4>
          <span class="text-sm" style="color: var(--text-secondary)">${date.toLocaleDateString()} ${date.toLocaleTimeString()}</span>
        </div>
        <div class="flex items-center justify-between">
          <div>
            <span class="text-sm" style="color: var(--text-secondary)">Room ID: <span class="font-mono">${data.roomId}</span></span>
          </div>
          <div class="flex gap-4">
            <span class="text-sm"><i class="fa-solid fa-check-circle text-green-500 mr-1"></i>${data.correct || 0}</span>
            <span class="text-sm"><i class="fa-solid fa-times-circle text-red-500 mr-1"></i>${data.wrong || 0}</span>
            <span class="text-sm font-bold"><i class="fa-solid fa-star text-yellow-500 mr-1"></i>${data.score || 0}</span>
          </div>
        </div>
      `;
      container.appendChild(div);
    });
  } catch (error) {
    console.error('Error loading match history:', error);
    showNotification('Failed to load match history', 'error');
  }
}

function closeMatchHistory() {
  document.getElementById('matchHistoryModal').classList.remove('active');
}

// ==================== My Rooms ====================
function showMyRooms() {
  document.getElementById('profileDropdown').classList.remove('active');
  document.getElementById('myRoomsModal').classList.add('active');
  loadMyRooms();
}

async function loadMyRooms() {
  try {
    const roomsSnapshot = await db.collection('rooms').where('createdBy', '==', currentUser.username).where('status', '==', 'active').get();
    const container = document.getElementById('myRoomsList');
    container.innerHTML = '';

    if (roomsSnapshot.empty) {
      container.innerHTML = '<p style="color: var(--text-secondary)" class="text-center">No active rooms created by you</p>';
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
              Created: ${new Date(data.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div class="flex gap-2">
            <button onclick="enterMyRoom('${doc.id}')" class="bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700 transition text-sm">
              <i class="fa-solid fa-right-to-bracket mr-1"></i>Enter
            </button>
            <button onclick="closeMyRoom('${doc.id}')" class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition text-sm">
              <i class="fa-solid fa-times mr-1"></i>Close
            </button>
          </div>
        </div>
      `;
      container.appendChild(div);
    }
  } catch (error) {
    console.error('Error loading my rooms:', error);
    showNotification('Failed to load your rooms', 'error');
  }
}

async function enterMyRoom(rid) {
  try {
    const roomDoc = await db.collection('rooms').doc(rid).get();
    if (!roomDoc.exists || roomDoc.data().status !== 'active') {
      showNotification('This room is no longer active!', 'error');
      loadMyRooms();
      return;
    }
    roomId = rid;
    isHost = true;
    closeMyRooms();
    joinRoomLogic();
  } catch (error) {
    console.error('Error entering room:', error);
    showNotification('Failed to enter room', 'error');
  }
}

async function closeMyRoom(rid) {
  if (confirm('Close this room? All players will be disconnected.')) {
    try {
      await db.collection('rooms').doc(rid).update({ status: 'closed' });
      await logAdminActivity('Room closed', `Room ${rid} closed by owner ${currentUser.username}`);
      loadMyRooms();
      showNotification('Room closed successfully!', 'success');
    } catch (error) {
      console.error('Error closing room:', error);
      showNotification('Failed to close room', 'error');
    }
  }
}

function closeMyRooms() {
  document.getElementById('myRoomsModal').classList.remove('active');
}

// ==================== Leaderboard ====================
function showLeaderboard() {
  document.getElementById('leaderboardModal').classList.add('active');
  switchLeaderboardTab('score');
}

function closeLeaderboard() {
  document.getElementById('leaderboardModal').classList.remove('active');
}

async function switchLeaderboardTab(type) {
  document.getElementById('lbTabScore').className = type === 'score' ? 'flex-1 px-4 py-2 rounded-lg bg-cyan-600 text-white font-semibold' : 'flex-1 px-4 py-2 rounded-lg font-semibold';
  document.getElementById('lbTabScore').style.background = type === 'score' ? '#0891b2' : 'var(--bg-secondary)';
  document.getElementById('lbTabScore').style.color = type === 'score' ? 'white' : 'var(--text-primary)';

  document.getElementById('lbTabAccuracy').className = type === 'accuracy' ? 'flex-1 px-4 py-2 rounded-lg bg-cyan-600 text-white font-semibold' : 'flex-1 px-4 py-2 rounded-lg font-semibold';
  document.getElementById('lbTabAccuracy').style.background = type === 'accuracy' ? '#0891b2' : 'var(--bg-secondary)';
  document.getElementById('lbTabAccuracy').style.color = type === 'accuracy' ? 'white' : 'var(--text-primary)';

  const leaderboardList = document.getElementById('leaderboardList');
  leaderboardList.innerHTML = '<p class="text-center" style="color: var(--text-secondary)">Loading...</p>';

  try {
    const usersSnapshot = await db.collection('users').get();
    let users = [];

    usersSnapshot.forEach(doc => {
      const data = doc.data();
      const stats = data.stats || {};
      const totalAnswers = (stats.correctAnswers || 0) + (stats.wrongAnswers || 0);
      const accuracy = totalAnswers > 0 ? ((stats.correctAnswers || 0) / totalAnswers * 100).toFixed(1) : 0;

      users.push({
        id: doc.id,
        displayName: data.displayName,
        totalScore: stats.totalScore || 0,
        correctAnswers: stats.correctAnswers || 0,
        wrongAnswers: stats.wrongAnswers || 0,
        accuracy: parseFloat(accuracy)
      });
    });

    if (type === 'score') {
      users.sort((a, b) => b.totalScore - a.totalScore);
    } else {
      users.sort((a, b) => b.accuracy - a.accuracy);
    }

    leaderboardList.innerHTML = '';

    users.slice(0, 20).forEach((user, index) => {
      const div = document.createElement('div');
      div.className = 'glass-card p-3 rounded-xl flex items-center justify-between';

      let medal = '';
      if (index === 0) medal = '<span class="leaderboard-medal">🥇</span>';
      else if (index === 1) medal = '<span class="leaderboard-medal">🥈</span>';
      else if (index === 2) medal = '<span class="leaderboard-medal">🥉</span>';
      else medal = `<span class="text-lg font-bold w-8 text-center">#${index + 1}</span>`;

      if (user.id === currentUser.username) {
        div.style.background = 'linear-gradient(135deg, rgba(8, 145, 178, 0.1) 0%, rgba(2, 132, 199, 0.1) 100%)';
        div.style.border = '2px solid var(--accent-primary)';
      }

      div.innerHTML = `
        <div class="flex items-center gap-3">
          ${medal}
          <div class="user-icon user-icon-medium">${user.displayName.charAt(0).toUpperCase()}</div>
          <div>
            <div class="font-semibold" style="color: var(--text-primary)">${safeDisplay(user.displayName)}</div>
            <div class="text-xs" style="color: var(--text-secondary)">@${safeDisplay(user.id)}</div>
          </div>
        </div>
        <div class="text-right">
          ${type === 'score' ? 
            `<div class="text-lg font-bold" style="color: var(--text-primary)">${user.totalScore}</div>
             <div class="text-xs" style="color: var(--text-secondary)">points</div>` : 
            `<div class="text-lg font-bold" style="color: var(--text-primary)">${user.accuracy}%</div>
             <div class="text-xs" style="color: var(--text-secondary)">accuracy</div>`
          }
        </div>
      `;
      leaderboardList.appendChild(div);
    });
  } catch (error) {
    console.error('Error loading leaderboard:', error);
    leaderboardList.innerHTML = '<p class="text-center" style="color: var(--text-secondary)">Failed to load leaderboard</p>';
  }
}

// ==================== Question Bank ====================
function showQuestionBank() {
  document.getElementById('questionBankModal').classList.add('active');
}

function closeQuestionBank() {
  document.getElementById('questionBankModal').classList.remove('active');
}

async function loadQuestions() {
  const fileInput = document.getElementById('questionFile');
  const file = fileInput.files[0];
  if (!file) {
    showNotification('Please select a file!', 'error');
    return;
  }
  Papa.parse(file, {
    complete: function(results) {
      questionBank = results.data.filter(row => row[0] && row[0].trim());
      const listDiv = document.getElementById('questionsList');
      listDiv.innerHTML = '';
      questionBank.forEach((q, idx) => {
        const div = document.createElement('div');
        div.className = 'p-3 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition';
        div.style.background = 'var(--bg-secondary)';
        div.style.color = 'var(--text-primary)';
        div.onclick = () => {
          document.getElementById('hostQuestion').value = q[0];
          closeQuestionBank();
        };
        div.innerHTML = `<strong>${idx + 1}.</strong> ${safeDisplay(q[0])}`;
        listDiv.appendChild(div);
      });
      showNotification(`Loaded ${questionBank.length} questions!`, 'success');
    },
    error: function(error) {
      showNotification('Error loading file: ' + error.message, 'error');
    }
  });
}

function useRandomQuestion() {
  if (questionBank.length === 0) {
    showNotification('Load questions first!', 'error');
    return;
  }
  const randomIdx = Math.floor(Math.random() * questionBank.length);
  document.getElementById('hostQuestion').value = questionBank[randomIdx][0];
  closeQuestionBank();
  showNotification('Random question loaded!', 'success');
}

function useNextQuestion() {
  if (questionBank.length === 0) {
    showNotification('Load questions first!', 'error');
    return;
  }
  document.getElementById('hostQuestion').value = questionBank[currentQuestionIndex][0];
  currentQuestionIndex = (currentQuestionIndex + 1) % questionBank.length;
  closeQuestionBank();
  showNotification('Next question loaded!', 'success');
}

// ==================== My Question Bank ====================
function showMyQuestionBank() {
  document.getElementById('myQuestionBankModal').classList.add('active');
  loadMyQuestionBank();
}

function closeMyQuestionBank() {
  document.getElementById('myQuestionBankModal').classList.remove('active');
}

async function loadMyQuestionBank() {
  try {
    const questionsSnapshot = await db.collection('users').doc(currentUser.username).collection('questionBank').orderBy('timestamp', 'desc').get();
    const container = document.getElementById('savedQuestionsList');
    container.innerHTML = '';

    if (questionsSnapshot.empty) {
      container.innerHTML = '<p style="color: var(--text-secondary)" class="text-center">No saved questions yet</p>';
      return;
    }

    questionsSnapshot.forEach(doc => {
      const data = doc.data();
      const div = document.createElement('div');
      div.className = 'flex items-center justify-between p-3 rounded-lg';
      div.style.background = 'var(--bg-secondary)';
      div.innerHTML = `
        <div class="flex-1 cursor-pointer" onclick="useMyQuestion('${doc.id}', \`${data.question.replace(/`/g, '\\`')}\`)">
          <p style="color: var(--text-primary)">${safeDisplay(data.question)}</p>
        </div>
        <button onclick="deleteMyQuestion('${doc.id}')" class="text-red-600 hover:text-red-700 ml-2">
          <i class="fa-solid fa-trash"></i>
        </button>
      `;
      container.appendChild(div);
    });
  } catch (error) {
    console.error('Error loading question bank:', error);
    showNotification('Failed to load question bank', 'error');
  }
}

async function saveQuestionToBank() {
  const question = document.getElementById('saveQuestionInput').value.trim();
  if (!question) {
    showNotification('Enter a question to save!', 'error');
    return;
  }
  try {
    await db.collection('users').doc(currentUser.username).collection('questionBank').add({
      question: safeDisplay(question),
      timestamp: Date.now()
    });
    document.getElementById('saveQuestionInput').value = '';
    loadMyQuestionBank();
    showNotification('Question saved!', 'success');
  } catch (error) {
    console.error('Error saving question:', error);
    showNotification('Failed to save question', 'error');
  }
}

function useMyQuestion(id, question) {
  document.getElementById('hostQuestion').value = question;
  closeMyQuestionBank();
  showNotification('Question loaded!', 'success');
}

async function deleteMyQuestion(id) {
  if (confirm('Delete this question?')) {
    try {
      await db.collection('users').doc(currentUser.username).collection('questionBank').doc(id).delete();
      loadMyQuestionBank();
      showNotification('Question deleted!', 'success');
    } catch (error) {
      console.error('Error deleting question:', error);
      showNotification('Failed to delete question', 'error');
    }
  }
}

// ==================== Export Results ====================
async function exportResults() {
  try {
    const playersSnapshot = await db.collection('rooms').doc(roomId).collection('players').get();
    let csv = 'Rank,Player,Username,Score\n';
    let players = [];

    playersSnapshot.forEach(doc => {
      const data = doc.data();
      players.push(data);
    });

    players.sort((a, b) => (b.score || 0) - (a.score || 0));

    players.forEach((player, index) => {
      csv += `${index + 1},${safeDisplay(player.name)},${safeDisplay(player.username)},${player.score || 0}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `room_${roomId}_results.csv`;
    a.click();
    showNotification('Results exported!', 'success');
  } catch (error) {
    console.error('Error exporting results:', error);
    showNotification('Failed to export results', 'error');
  }
}

// ==================== Answer History ====================
function showAnswerHistory() {
  document.getElementById('answerHistoryModal').classList.add('active');
  loadAnswerHistory();
}

function closeAnswerHistory() {
  document.getElementById('answerHistoryModal').classList.remove('active');
}

async function loadAnswerHistory() {
  try {
    const roomRef = db.collection('rooms').doc(roomId);
    const historySnapshot = await roomRef.collection('answerHistory').orderBy('timestamp', 'desc').get();
    const container = document.getElementById('answerHistoryList');
    container.innerHTML = '';

    if (historySnapshot.empty) {
      container.innerHTML = '<p style="color: var(--text-secondary)" class="text-center">No answer history</p>';
      return;
    }

    historySnapshot.forEach(doc => {
      const data = doc.data();
      const div = document.createElement('div');
      div.className = `answer-history-item answer-${data.result}`;
      const icon = data.result === 'correct' ? '<i class="fa-solid fa-check-circle text-green-600"></i>' : 
                   data.result === 'wrong' ? '<i class="fa-solid fa-times-circle text-red-600"></i>' : 
                   '<i class="fa-solid fa-clock text-yellow-600"></i>';
      const time = new Date(data.timestamp).toLocaleTimeString();
      div.innerHTML = `
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            ${icon}
            <span class="font-semibold">${safeDisplay(data.displayName)}</span>
          </div>
          <span class="text-xs" style="color: var(--text-secondary)">${time}</span>
        </div>
        <div class="mt-1 text-sm">${safeDisplay(data.answer)}</div>
      `;
      container.appendChild(div);
    });
  } catch (error) {
    console.error('Error loading answer history:', error);
  }
}