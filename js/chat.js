/**
 * Chat Module
 * Handles real-time chat, emojis, and typing indicators
 */

// ==================== Listen to Chat ====================
function listenToChat(roomRef) {
  chatUnsubscribe = roomRef.collection('chat').orderBy('timestamp', 'asc').onSnapshot(snapshot => {
    const chatContainer = document.getElementById('chatContainer');
    chatContainer.innerHTML = '';

    snapshot.forEach(doc => {
      const data = doc.data();
      const isSelf = data.sender === currentUser.displayName;
      const isSystemMessage = data.sender === 'System';

      const div = document.createElement('div');
      div.className = `chat-message ${isSelf ? 'self' : 'other'}`;

      const bubble = document.createElement('div');

      let bubbleClass = `chat-bubble ${isSelf ? 'chat-bubble-self' : 'chat-bubble-other'}`;
      if (isSystemMessage && data.messageType) {
        bubbleClass += ` chat-system-${data.messageType}`;
      }
      bubble.className = bubbleClass;

      let roleBadge = '';
      if (!isSystemMessage) {
        if (data.isOwner) {
          roleBadge = `<span class="chat-role-badge owner-badge text-white">OWNER</span>`;
        } else if (data.isHost) {
          roleBadge = `<span class="chat-role-badge host-badge text-white">HOST</span>`;
        }
      }

      const timestamp = new Date(data.timestamp);
      const timeString = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      if (isSystemMessage) {
        bubble.innerHTML = `
          <div class="flex items-center gap-2">
            <i class="fa-solid fa-info-circle"></i>
            <span>${safeDisplay(data.message)}</span>
          </div>
          <div class="chat-timestamp">${timeString}</div>
        `;
      } else {
        bubble.innerHTML = `
          <div class="flex items-center gap-2 mb-1">
            <span class="font-semibold">${safeDisplay(data.sender)}</span>
            ${roleBadge}
          </div>
          <div>${safeDisplay(data.message)}</div>
          <div class="chat-timestamp">${timeString}</div>
        `;
      }

      div.appendChild(bubble);
      chatContainer.appendChild(div);
    });

    chatContainer.scrollTop = chatContainer.scrollHeight;
  });
}

// ==================== Send Chat ====================
async function sendChat() {
  const input = document.getElementById('chatInput');
  const message = input.value.trim();

  if (!message) return;

  const roomRef = db.collection('rooms').doc(roomId);
  await roomRef.collection('chat').add({
    sender: currentUser.displayName,
    message: safeDisplay(message),
    isHost: isHost,
    isOwner: isOwner,
    timestamp: Date.now()
  });

  input.value = '';
  document.getElementById('typingIndicator').classList.add('hidden');
}

// ==================== Send Emoji ====================
function sendEmoji(emoji) {
  document.getElementById('chatInput').value += emoji;
  document.getElementById('chatInput').focus();
}

// ==================== Chat Input Listeners ====================
document.getElementById('chatInput')?.addEventListener('input', () => {
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    // Hide after 2 seconds
  }, 2000);
});

document.getElementById('chatInput')?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendChat();
  }
});