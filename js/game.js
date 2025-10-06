/**
 * Game Logic Module
 * Handles buzzer, questions, scoring, and host controls
 */

// ==================== Listen to Room Updates ====================
function listenToRoom(roomRef) {
  roomUnsubscribe = roomRef.onSnapshot(doc => {
    if (doc.exists) {
      const data = doc.data();
      currentRoomData = data;

      document.getElementById('question').innerText = data.question || 'Waiting for question...';

      const timerValue = data.timer || 0;
      document.getElementById('timer').innerText = timerValue;

      const progress = (timerValue / maxTimerValue) * 100;
      document.getElementById('timerProgress').style.width = progress + '%';

      updateTimerStatusIndicator(data.timerPaused, data.questionActive, timerValue);

      if (data.questionPoints && data.question) {
        document.getElementById('questionPointsDisplay').classList.remove('hidden');
        document.getElementById('currentQuestionPoints').innerText = data.questionPoints;
      } else {
        document.getElementById('questionPointsDisplay').classList.add('hidden');
      }

      teamsMode = data.teamsMode || false;
      document.getElementById('teamsSection').classList.toggle('hidden', !teamsMode);
      document.getElementById('individualBuzzSection').classList.toggle('hidden', teamsMode);

      const wrongAnswers = data.wrongAnswers || [];
      const userHasAnsweredWrong = wrongAnswers.includes(currentUser.username);

      if (data.buzzedBy) {
        document.getElementById('buzzBtn').disabled = true;
        document.getElementById('buzzBtn').classList.add('opacity-50', 'cursor-not-allowed');
        document.getElementById('buzzedInfo').innerHTML = 
          `<i class="fa-solid fa-circle-check mr-2"></i>Buzzed by: <strong>${safeDisplay(data.buzzedBy)}</strong>`;
      } else if (userHasAnsweredWrong) {
        document.getElementById('buzzBtn').disabled = true;
        document.getElementById('buzzBtn').classList.add('opacity-50', 'cursor-not-allowed');
        document.getElementById('buzzedInfo').innerHTML = 
          `<i class="fa-solid fa-ban mr-2 text-red-600"></i><span class="text-red-600">You already answered incorrectly for this question</span>`;
      } else {
        document.getElementById('buzzBtn').disabled = false;
        document.getElementById('buzzBtn').classList.remove('opacity-50', 'cursor-not-allowed');
        document.getElementById('buzzedInfo').innerText = '';
      }

      displayWrongAttempts(wrongAnswers);

      if (data.questionActive && isHost) {
        displayQuestionStatistics(data);
      } else {
        document.getElementById('questionStatsContainer').classList.add('hidden');
      }

      if (teamsMode && data.teams) {
        renderTeamButtons(data.teams);
        renderTeamScores(data.teams);
      }
    }
  });
}

// ==================== Listen to Players ====================
function listenToPlayers(playersRef) {
  playersUnsubscribe = playersRef.onSnapshot(snapshot => {
    const playersList = document.getElementById('playersList');
    document.getElementById('playerCount').innerText = snapshot.size;

    let players = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      players.push({ id: doc.id, ...data });
    });

    players.sort((a, b) => (b.score || 0) - (a.score || 0));

    playersList.innerHTML = '';

    players.forEach((data, index) => {
      let li = document.createElement('li');
      li.className = 'player-rank-animation fade-in p-3 rounded-lg transition hover:bg-gray-100 dark:hover:bg-gray-700';

      const avatarHtml = `<div class="user-icon user-icon-medium">
        ${data.name.charAt(0).toUpperCase()}
      </div>`;

      let badges = '';
      const roomCreator = currentRoomData?.createdBy;

      if (data.username === roomCreator) {
        if (data.role === 'owner' || data.isOwner) {
          badges += `<span class="owner-badge text-white text-xs px-2 py-0.5 rounded-full mr-1">OWNER</span>`;
        } else if (data.role === 'host' || data.isHost) {
          badges += `<span class="host-badge text-white text-xs px-2 py-0.5 rounded-full mr-1">HOST</span>`;
        }
      }

      const teamBadge = data.team 
        ? `<span class="team-badge inline-block ml-1 px-2 py-0.5 rounded-full text-xs text-white" style="background: ${getTeamColor(data.team)};">${data.team}</span>`
        : '';

      const mutedBadge = data.muted 
        ? `<span class="ml-2 text-red-600"><i class="fa-solid fa-volume-xmark"></i></span>`
        : '';

      const rankBadge = index < 3 ? ['🥇', '🥈', '🥉'][index] : `#${index + 1}`;
      const scoreDisplay = teamsMode ? '' : `<span class="text-sm font-bold text-yellow-600">${data.score || 0} pts</span>`;

      const hostControls = isHost && data.username !== currentUser.username
        ? `<div class="flex gap-2 items-center">
            <button onclick="toggleMute('${data.username}')" class="text-yellow-600 hover:text-yellow-700" title="Mute/Unmute">
              <i class="fa-solid fa-volume-${data.muted ? 'xmark' : 'high'}"></i>
            </button>
            <button onclick="kickPlayer('${data.username}')" class="text-red-600 hover:text-red-700" title="Kick">
              <i class="fa-solid fa-user-xmark"></i>
            </button>
            ${teamsMode ? `<select onchange="assignTeam('${data.username}', this.value)" class="text-xs px-2 py-1 rounded" style="background: var(--bg-primary); color: var(--text-primary)">
              <option value="">No Team</option>
              ${getTeamOptionsHTML(data.team)}
            </select>` : ''}
          </div>`
        : '';

      li.innerHTML = `
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="text-xl w-8">${rankBadge}</span>
            ${avatarHtml}
            <div>
              <div>
                ${badges}
                <span class="font-medium" style="color: var(--text-primary)">${safeDisplay(data.name)}</span>
                ${teamBadge}
                ${mutedBadge}
              </div>
              ${scoreDisplay}
            </div>
          </div>
          ${hostControls}
        </div>
      `;
      playersList.appendChild(li);
    });
  });
}

// ==================== Update Timer Status ====================
function updateTimerStatusIndicator(isPaused, isActive, timerValue) {
  const indicator = document.getElementById('timerStatusIndicator');
  const icon = document.getElementById('timerStatusIcon');
  const text = document.getElementById('timerStatusText');

  if (!isActive || timerValue <= 0) {
    indicator.className = 'timer-status timer-stopped';
    icon.className = 'fa-solid fa-stop';
    text.textContent = 'Stopped';
    indicator.classList.remove('hidden');
  } else if (isPaused) {
    indicator.className = 'timer-status timer-paused';
    icon.className = 'fa-solid fa-pause';
    text.textContent = 'Paused';
    indicator.classList.remove('hidden');
  } else {
    indicator.className = 'timer-status timer-running';
    icon.className = 'fa-solid fa-clock';
    text.textContent = 'Running';
    indicator.classList.remove('hidden');
  }
}

// ==================== Display Wrong Attempts ====================
function displayWrongAttempts(wrongAnswers) {
  const container = document.getElementById('wrongAttemptsContainer');
  const listDiv = document.getElementById('wrongAttemptsList');

  if (wrongAnswers.length === 0) {
    container.classList.add('hidden');
    return;
  }

  container.classList.remove('hidden');
  listDiv.innerHTML = '';

  wrongAnswers.forEach(username => {
    const chip = document.createElement('span');
    chip.className = 'wrong-attempt-chip';
    chip.innerHTML = `<i class="fa-solid fa-user-xmark"></i> ${safeDisplay(username)}`;
    listDiv.appendChild(chip);
  });
}

// ==================== Display Question Statistics ====================
async function displayQuestionStatistics(roomData) {
  const container = document.getElementById('questionStatsContainer');
  container.classList.remove('hidden');

  const buzzQueue = roomData.buzzQueue || [];
  const wrongAnswers = roomData.wrongAnswers || [];

  const playersSnapshot = await db.collection('rooms').doc(roomId).collection('players').get();
  const totalPlayers = playersSnapshot.size;
  const remainingPlayers = totalPlayers - wrongAnswers.length - (roomData.buzzedBy ? 1 : 0);

  document.getElementById('totalBuzzAttempts').textContent = buzzQueue.length;
  document.getElementById('wrongAnswersCount').textContent = wrongAnswers.length;
  document.getElementById('remainingPlayersCount').textContent = Math.max(0, remainingPlayers);
}

// ==================== Buzz Function ====================
async function buzz() {
  if (buzzCooldown) {
    showNotification('Please wait before buzzing again!', 'warning');
    return;
  }

  const roomRef = db.collection('rooms').doc(roomId);
  const playerDoc = await roomRef.collection('players').doc(currentUser.username).get();

  if (playerDoc.exists && playerDoc.data().muted) {
    showNotification('You are muted and cannot buzz!', 'error');
    return;
  }

  try {
    const docSnap = await roomRef.get();
    if (!docSnap.exists) return;

    const roomData = docSnap.data();

    if (!roomData.questionActive) {
      showNotification('No active question!', 'error');
      return;
    }

    if (roomData.buzzedBy) {
      showNotification('Someone else has already buzzed!', 'error');
      return;
    }

    const wrongAnswers = roomData.wrongAnswers || [];
    if (wrongAnswers.includes(currentUser.username)) {
      showNotification('You already answered this question incorrectly!', 'error');
      return;
    }

    await roomRef.update({
      buzzedBy: currentUser.displayName,
      buzzedByUsername: currentUser.username,
      timerPaused: true,
      buzzQueue: firebase.firestore.FieldValue.arrayUnion({
        username: currentUser.username,
        displayName: currentUser.displayName,
        timestamp: Date.now()
      })
    });

    const userRef = db.collection('users').doc(currentUser.username);
    await userRef.update({
      'stats.firstBuzzes': firebase.firestore.FieldValue.increment(1)
    });

    createBuzzSound();

    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }

    const btn = document.getElementById('buzzBtn');
    btn.classList.add('buzz-shake', 'buzz-glow');
    setTimeout(() => {
      btn.classList.remove('buzz-shake', 'buzz-glow');
    }, 1000);

    startBuzzCooldown();

    document.getElementById('answerModal').classList.add('active');

  } catch (error) {
    console.error('Error buzzing:', error);
    showNotification('Failed to buzz: ' + error.message, 'error');
  }
}

// ==================== Buzz Cooldown ====================
function startBuzzCooldown() {
  buzzCooldown = true;
  let cooldownTime = 1;

  document.getElementById('buzzBtn').classList.add('buzz-cooldown');
  document.getElementById('buzzCooldownInfo').classList.remove('hidden');
  document.getElementById('buzzCooldownTimer').textContent = cooldownTime;

  buzzCooldownTimer = setInterval(() => {
    cooldownTime--;
    document.getElementById('buzzCooldownTimer').textContent = cooldownTime;

    if (cooldownTime <= 0) {
      clearInterval(buzzCooldownTimer);
      buzzCooldown = false;
      document.getElementById('buzzBtn').classList.remove('buzz-cooldown');
      document.getElementById('buzzCooldownInfo').classList.add('hidden');
    }
  }, 1000);
}

// ==================== Submit Answer ====================
async function submitAnswer() {
  const answer = document.getElementById('playerAnswer').value.trim();

  if (!answer) {
    showNotification('Please enter an answer!', 'error');
    return;
  }

  const roomRef = db.collection('rooms').doc(roomId);

  await roomRef.collection('answerHistory').add({
    username: currentUser.username,
    displayName: currentUser.displayName,
    answer: safeDisplay(answer),
    timestamp: Date.now(),
    result: 'pending'
  });

  await roomRef.collection('chat').add({
    sender: currentUser.displayName,
    message: `💬 Answer: ${safeDisplay(answer)}`,
    isHost: isHost,
    isOwner: isOwner,
    timestamp: Date.now()
  });

  document.getElementById('answerModal').classList.remove('active');
  document.getElementById('playerAnswer').value = '';
  showNotification('Answer submitted! Waiting for host judgment...', 'info');
}

// ==================== Start Question ====================
async function startQuestion() {
  const q = document.getElementById('hostQuestion').value;
  let t = parseInt(document.getElementById('hostTimer').value);
  const points = parseInt(document.getElementById('questionPoints').value) || 1;

  if (!q.trim()) {
    showNotification('Please enter a question!', 'error');
    return;
  }

  maxTimerValue = t;
  currentQuestionId = Date.now().toString();
  answerHistory = [];

  const roomRef = db.collection('rooms').doc(roomId);
  await roomRef.update({
    question: safeDisplay(q),
    timer: t,
    timerPaused: false,
    questionActive: true,
    buzzedBy: '',
    buzzedByUsername: '',
    wrongAnswers: [],
    buzzQueue: [],
    questionPoints: points
  });

  const historySnapshot = await roomRef.collection('answerHistory').get();
  const batch = db.batch();
  historySnapshot.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();

  clearInterval(timerInterval);
  timerInterval = setInterval(async () => {
    const snap = await roomRef.get();
    const data = snap.data();

    if (!data.timerPaused && data.questionActive) {
      t--;
      if (t >= 0) {
        await roomRef.update({ timer: t });
      } else {
        clearInterval(timerInterval);
        await roomRef.update({ questionActive: false, timerPaused: false });
        showNotification('Time is up!', 'warning');
      }
    }
  }, 1000);

  showNotification('Question started!', 'success');
}

// ==================== Mark Correct ====================
async function markCorrect() {
  createCorrectSound();
  const roomRef = db.collection('rooms').doc(roomId);
  const roomData = (await roomRef.get()).data();
  const buzzedUsername = roomData.buzzedByUsername;
  const buzzedDisplayName = roomData.buzzedBy;
  const points = roomData.questionPoints || 1;

  if (!buzzedUsername) {
    showNotification('No one has buzzed!', 'error');
    return;
  }

  if (teamsMode) {
    const teams = roomData.teams || [];
    const teamIndex = teams.findIndex(t => t.name === buzzedDisplayName);
    if (teamIndex !== -1) {
      teams[teamIndex].score = (teams[teamIndex].score || 0) + points;
      await roomRef.update({ teams: teams });
    }
  } else {
    const playerRef = roomRef.collection('players').doc(buzzedUsername);
    await playerRef.update({
      score: firebase.firestore.FieldValue.increment(points)
    });

    const userRef = db.collection('users').doc(buzzedUsername);
    await userRef.update({
      'stats.totalScore': firebase.firestore.FieldValue.increment(points),
      'stats.correctAnswers': firebase.firestore.FieldValue.increment(1)
    });

    triggerConfetti();
  }

  const historySnapshot = await roomRef.collection('answerHistory').where('username', '==', buzzedUsername).where('result', '==', 'pending').get();
  historySnapshot.docs.forEach(async doc => {
    await doc.ref.update({ result: 'correct' });
  });

  await roomRef.collection('chat').add({
    sender: 'System',
    message: `✅ Correct answer by ${safeDisplay(buzzedDisplayName)}! +${points} points`,
    messageType: 'correct',
    isHost: true,
    timestamp: Date.now()
  });

  clearInterval(timerInterval);
  await roomRef.update({
    questionActive: false,
    timerPaused: false,
    buzzedBy: '',
    buzzedByUsername: '',
    timer: 0
  });

  showNotification('Marked as correct! Question ended.', 'success');
}

// ==================== Mark Wrong ====================
async function markWrong() {
  createWrongSound();
  const roomRef = db.collection('rooms').doc(roomId);
  const roomData = (await roomRef.get()).data();
  const buzzedUsername = roomData.buzzedByUsername;
  const buzzedDisplayName = roomData.buzzedBy;

  if (!buzzedUsername) {
    showNotification('No one has buzzed!', 'error');
    return;
  }

  if (!teamsMode) {
    const userRef = db.collection('users').doc(buzzedUsername);
    await userRef.update({
      'stats.wrongAnswers': firebase.firestore.FieldValue.increment(1)
    });
  }

  const historySnapshot = await roomRef.collection('answerHistory').where('username', '==', buzzedUsername).where('result', '==', 'pending').get();
  historySnapshot.docs.forEach(async doc => {
    await doc.ref.update({ result: 'wrong' });
  });

  await roomRef.collection('chat').add({
    sender: 'System',
    message: `❌ Wrong answer by ${safeDisplay(buzzedDisplayName)}!`,
    messageType: 'wrong',
    isHost: true,
    timestamp: Date.now()
  });

  await roomRef.update({
    buzzedBy: '',
    buzzedByUsername: '',
    timerPaused: false,
    wrongAnswers: firebase.firestore.FieldValue.arrayUnion(buzzedUsername)
  });

  showNotification('Marked as wrong! Timer resumed.', 'info');
}

// ==================== Reset Buzz ====================
async function resetBuzz() {
  const roomRef = db.collection('rooms').doc(roomId);
  await roomRef.update({
    buzzedBy: '',
    buzzedByUsername: '',
    timerPaused: false,
    wrongAnswers: [],
    buzzQueue: [],
    questionActive: false,
    timer: 0
  });
  clearInterval(timerInterval);
  showNotification('Question reset!', 'info');
}

// ==================== Player Moderation ====================
async function toggleMute(username) {
  const playerRef = db.collection('rooms').doc(roomId).collection('players').doc(username);
  const doc = await playerRef.get();
  if (doc.exists) {
    const newMuteStatus = !doc.data().muted;
    await playerRef.update({ muted: newMuteStatus });
    showNotification(`Player ${newMuteStatus ? 'muted' : 'unmuted'}!`, 'info');
  }
}

async function kickPlayer(username) {
  if (confirm(`Kick ${username} from the room?`)) {
    await db.collection('rooms').doc(roomId).collection('players').doc(username).delete();
    await logAdminActivity('Player kicked', `${username} kicked from room ${roomId}`);
    showNotification('Player kicked!', 'success');
  }
}

async function assignTeam(username, teamName) {
  const playerRef = db.collection('rooms').doc(roomId).collection('players').doc(username);
  await playerRef.update({ team: teamName || null });
  showNotification('Team assigned!', 'success');
}

function getTeamOptionsHTML(currentTeam) {
  if (!currentRoomData || !currentRoomData.teams) return '';

  let options = '';
  currentRoomData.teams.forEach(team => {
    const selected = team.name === currentTeam ? 'selected' : '';
    options += `<option value="${team.name}" ${selected}>${team.name}</option>`;
  });
  return options;
}

// ==================== Team Management ====================
async function toggleTeamsMode() {
  teamsMode = !teamsMode;
  const roomRef = db.collection('rooms').doc(roomId);
  await roomRef.update({ 
    teamsMode: teamsMode,
    teams: teamsMode ? [
      { name: 'Team A', color: '#3b82f6', score: 0 },
      { name: 'Team B', color: '#10b981', score: 0 }
    ] : []
  });
  document.getElementById('teamManagement').classList.toggle('hidden', !teamsMode);
  showNotification(`Teams mode ${teamsMode ? 'enabled' : 'disabled'}!`, 'info');
}

async function addTeam() {
  const teamName = document.getElementById('teamNameInput').value.trim();
  if (!teamName) {
    showNotification('Enter team name!', 'error');
    return;
  }
  const roomRef = db.collection('rooms').doc(roomId);
  const doc = await roomRef.get();
  const teams = doc.data().teams || [];
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  const color = colors[teams.length % colors.length];
  teams.push({ name: safeDisplay(teamName), color: color, score: 0 });
  await roomRef.update({ teams: teams });
  document.getElementById('teamNameInput').value = '';
  renderTeamsList(teams);
  showNotification('Team added!', 'success');
}

function renderTeamsList(teams) {
  const container = document.getElementById('teamsList');
  container.innerHTML = '';
  teams.forEach((team, idx) => {
    const div = document.createElement('div');
    div.className = 'flex items-center justify-between p-3 rounded-lg';
    div.style.background = 'var(--bg-primary)';
    div.innerHTML = `<div class="flex items-center gap-3"><div class="w-6 h-6 rounded-full" style="background: ${team.color}"></div><span style="color: var(--text-primary)">${safeDisplay(team.name)}</span></div><button onclick="removeTeam(${idx})" class="text-red-600 hover:text-red-700"><i class="fa-solid fa-trash"></i></button>`;
    container.appendChild(div);
  });
}

async function removeTeam(index) {
  const roomRef = db.collection('rooms').doc(roomId);
  const doc = await roomRef.get();
  const teams = doc.data().teams || [];
  if (confirm(`Remove ${teams[index].name}?`)) {
    teams.splice(index, 1);
    await roomRef.update({ teams: teams });
    renderTeamsList(teams);
    showNotification('Team removed!', 'success');
  }
}

function renderTeamButtons(teams) {
  const container = document.getElementById('teamButtons');
  container.innerHTML = '';
  teams.forEach(team => {
    const btn = document.createElement('button');
    btn.onclick = () => teamBuzz(team.name);
    btn.className = 'px-6 py-4 rounded-xl text-white font-bold shadow-lg hover:shadow-xl transition transform hover:scale-105';
    btn.style.background = `linear-gradient(135deg, ${team.color} 0%, ${adjustColor(team.color, -20)} 100%)`;
    btn.innerHTML = `<i class="fa-solid fa-bolt mr-2"></i>${safeDisplay(team.name)}`;
    container.appendChild(btn);
  });
}

function renderTeamScores(teams) {
  const container = document.getElementById('teamScores');
  container.innerHTML = '';
  teams.forEach(team => {
    const div = document.createElement('div');
    div.className = 'p-3 rounded-lg text-center font-bold';
    div.style.background = team.color;
    div.style.color = 'white';
    div.innerHTML = `
      <div class="text-sm">${safeDisplay(team.name)}</div>
      <div class="text-2xl">${team.score || 0} pts</div>
    `;
    container.appendChild(div);
  });
}