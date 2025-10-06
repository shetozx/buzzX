/**
 * Room Management Module
 * Handles room creation, joining, and leaving
 */

// ==================== Generate Room ID ====================
function generateRoomId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ==================== Create Room ====================
async function createRoom() {
  const roomName = document.getElementById('roomNameInput').value.trim();

  if (!roomName) {
    showNotification('Please enter a room name!', 'error');
    return;
  }

  try {
    const newRoomId = generateRoomId();
    roomId = newRoomId;
    isHost = true;

    await db.collection('rooms').doc(roomId).set({
      roomName: safeDisplay(roomName),
      createdAt: Date.now(),
      createdBy: currentUser.username,
      status: 'active',
      question: '',
      timer: 0,
      timerPaused: false,
      questionActive: false,
      buzzedBy: '',
      buzzedByUsername: '',
      wrongAnswers: [],
      buzzQueue: [],
      teamsMode: false,
      teams: [],
      questionPoints: 1
    });

    await logAdminActivity('Room created', `Room: ${roomName} (${roomId}) by ${currentUser.username}`);

    document.getElementById('createRoomBox').classList.add('hidden');
    document.getElementById('roomCreatedBox').classList.remove('hidden');
    document.getElementById('generatedRoomId').value = roomId;

    const roomUrl = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
    document.getElementById('roomQrCode').innerHTML = '';
    new QRCode(document.getElementById('roomQrCode'), {
      text: roomUrl,
      width: 200,
      height: 200,
      colorDark: '#0891b2',
      colorLight: '#ffffff'
    });
  } catch (error) {
    console.error('Error creating room:', error);
    showNotification('Failed to create room: ' + error.message, 'error');
  }
}

// ==================== Copy Room ID ====================
function copyRoomId() {
  const roomIdInput = document.getElementById('generatedRoomId');
  roomIdInput.select();
  document.execCommand('copy');
  showNotification('Room ID copied to clipboard!', 'success');
}

function copyCurrentRoomId() {
  const roomIdText = document.getElementById('currentRoomId').textContent;
  navigator.clipboard.writeText(roomIdText).then(() => {
    showNotification('Room ID copied to clipboard!', 'success');
  }).catch(err => {
    console.error('Failed to copy:', err);
    showNotification('Failed to copy Room ID', 'error');
  });
}

// ==================== Toggle Game QR ====================
function toggleGameQR() {
  const qrSection = document.getElementById('gameQrSection');
  const toggleBtn = document.getElementById('toggleQrBtn');

  if (qrSection.classList.contains('hidden')) {
    qrSection.classList.remove('hidden');
    if (document.getElementById('gameQrCode').innerHTML === '') {
      const roomUrl = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
      new QRCode(document.getElementById('gameQrCode'), {
        text: roomUrl,
        width: 150,
        height: 150,
        colorDark: '#0891b2',
        colorLight: '#ffffff'
      });
    }
    toggleBtn.innerHTML = '<i class="fa-solid fa-eye-slash mr-1"></i><span data-i18n="hide_qr">Hide QR</span>';
  } else {
    qrSection.classList.add('hidden');
    toggleBtn.innerHTML = '<i class="fa-solid fa-qrcode mr-1"></i><span data-i18n="show_qr">Show QR</span>';
  }
}

// ==================== Enter as Host ====================
function enterAsHost() {
  document.getElementById('roomCreatedBox').classList.add('hidden');
  joinRoomLogic();
}

// ==================== Join Room ====================
async function joinRoom() {
  const inputRoomId = document.getElementById('roomIdInput').value.trim();

  if (!inputRoomId) {
    showNotification('Please enter Room ID!', 'error');
    return;
  }

  try {
    const roomDoc = await db.collection('rooms').doc(inputRoomId).get();
    if (!roomDoc.exists) {
      showNotification('Room does not exist!', 'error');
      return;
    }

    const roomData = roomDoc.data();
    if (roomData.status !== 'active') {
      showNotification('This room is no longer active!', 'error');
      return;
    }

    roomId = inputRoomId;
    if (roomData.createdBy === currentUser.username) {
      isHost = true;
    } else {
      isHost = false;
    }

    document.getElementById('joinBox').classList.add('hidden');
    joinRoomLogic();
  } catch (error) {
    console.error('Error joining room:', error);
    showNotification('Failed to join room: ' + error.message, 'error');
  }
}

// ==================== Join Room Logic ====================
async function joinRoomLogic() {
  document.getElementById('homeScreen').classList.add('hidden');
  document.getElementById('game').classList.remove('hidden');

  if (isHost) {
    document.getElementById('hostControls').classList.remove('hidden');
  }

  const roomRef = db.collection('rooms').doc(roomId);
  const playersRef = roomRef.collection('players');

  const roomDoc = await roomRef.get();
  if (roomDoc.exists) {
    const roomData = roomDoc.data();
    document.getElementById('currentRoomName').textContent = roomData.roomName;
    document.getElementById('currentRoomId').textContent = roomId;
  }

  playerDocRef = playersRef.doc(currentUser.username);
  await playerDocRef.set({
    name: currentUser.displayName,
    username: currentUser.username,
    joinedAt: Date.now(),
    team: null,
    muted: false,
    score: 0,
    isHost: isHost,
    isOwner: isOwner || false,
    role: currentUser.role
  });

  listenToRoom(roomRef);
  listenToPlayers(playersRef);
  listenToChat(roomRef);

  window.addEventListener('beforeunload', async () => {
    if (playerDocRef && !isHost) {
      await playerDocRef.delete();
    }
  });
}

// ==================== Leave Room ====================
async function leaveRoom() {
  if (confirm('Are you sure you want to leave the room?')) {
    try {
      await recordMatchHistory();

      if (roomUnsubscribe) roomUnsubscribe();
      if (playersUnsubscribe) playersUnsubscribe();
      if (chatUnsubscribe) chatUnsubscribe();

      if (playerDocRef && !isHost) {
        await playerDocRef.delete();
      }

      roomId = null;
      isHost = false;
      isOwner = false;
      playerDocRef = null;
      clearInterval(timerInterval);
      timerPaused = false;
      questionActive = false;
      currentQuestionId = null;
      answerHistory = [];

      document.getElementById('game').classList.add('hidden');
      document.getElementById('hostControls').classList.add('hidden');
      showHomeScreen();

      showNotification('You left the room', 'info');
    } catch (error) {
      console.error('Error leaving room:', error);
      showNotification('Error leaving room', 'error');
    }
  }
}

// ==================== Record Match History ====================
async function recordMatchHistory() {
  if (!roomId || !currentUser) return;
  try {
    const roomRef = db.collection('rooms').doc(roomId);
    const roomDoc = await roomRef.get();
    if (!roomDoc.exists) return;
    const roomData = roomDoc.data();
    const playerDoc = await roomRef.collection('players').doc(currentUser.username).get();
    if (!playerDoc.exists) return;
    const playerData = playerDoc.data();
    await db.collection('users').doc(currentUser.username).collection('matchHistory').add({
      roomId: roomId,
      roomName: roomData.roomName,
      timestamp: Date.now(),
      score: playerData.score || 0,
      correct: 0,
      wrong: 0
    });
  } catch (error) {
    console.error('Error recording match history:', error);
  }
}