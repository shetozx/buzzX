/**
 * Utility Functions
 * Helper functions used throughout the application
 */

// ==================== Global State Variables ====================
let currentUser = null;
let roomId = null;
let isHost = false;
let isOwner = false;
let timerInterval = null;
let playerDocRef = null;
let questionBank = [];
let currentQuestionIndex = 0;
let teamsMode = false;
let roomUnsubscribe = null;
let playersUnsubscribe = null;
let chatUnsubscribe = null;
let soundEnabled = true;
let currentLanguage = 'en';
let typingTimeout = null;
let maxTimerValue = 30;
let deferredPrompt = null;
let roomCodeVisible = true;
let timerPaused = false;
let questionActive = false;
let currentQuestionId = null;
let answerHistory = [];
let buzzCooldown = false;
let buzzCooldownTimer = null;
let currentRoomData = null;

// ==================== XSS Protection ====================
function safeDisplay(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ==================== Navigation Functions ====================
function showHomeScreen() {
  document.getElementById('authScreen').classList.add('hidden');
  document.getElementById('homeScreen').classList.remove('hidden');
  document.getElementById('createRoomBox').classList.add('hidden');
  document.getElementById('roomCreatedBox').classList.add('hidden');
  document.getElementById('joinBox').classList.add('hidden');
  document.getElementById('game').classList.add('hidden');
}

function showCreateRoom() {
  document.getElementById('homeScreen').classList.add('hidden');
  document.getElementById('createRoomBox').classList.remove('hidden');
}

function showJoinRoom() {
  document.getElementById('homeScreen').classList.add('hidden');
  document.getElementById('joinBox').classList.remove('hidden');
}

function backToHome() {
  document.getElementById('homeScreen').classList.remove('hidden');
  document.getElementById('createRoomBox').classList.add('hidden');
  document.getElementById('roomCreatedBox').classList.add('hidden');
  document.getElementById('joinBox').classList.add('hidden');
}

// ==================== Language Functions ====================
function toggleLanguage() {
  currentLanguage = currentLanguage === 'en' ? 'ar' : 'en';
  localStorage.setItem('language', currentLanguage);
  applyLanguage(currentLanguage);
}

function applyLanguage(lang) {
  document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  document.documentElement.setAttribute('lang', lang);

  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    if (translations[lang][key]) {
      element.textContent = translations[lang][key];
    }
  });
}

// ==================== Theme Functions ====================
function toggleTheme() {
  const html = document.documentElement;
  const currentTheme = html.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', newTheme);
  updateThemeIcon(newTheme);
  localStorage.setItem('theme', newTheme);
}

function updateThemeIcon(theme) {
  const icon = document.getElementById('themeIcon');
  if (icon) {
    icon.className = theme === 'dark' ? 'fa-solid fa-sun mr-2' : 'fa-solid fa-moon mr-2';
  }
}

// ==================== Sound Functions ====================
function toggleSound() {
  soundEnabled = !soundEnabled;
  localStorage.setItem('sound', soundEnabled);
  updateSoundIcon();
  showNotification(soundEnabled ? 'Sound enabled' : 'Sound disabled', 'info');
}

function updateSoundIcon() {
  const icon = document.getElementById('soundIcon');
  if (icon) {
    icon.className = soundEnabled ? 'fa-solid fa-volume-high mr-2' : 'fa-solid fa-volume-xmark mr-2';
  }
}

// ==================== Settings Dropdown ====================
function toggleSettingsDropdown() {
  document.getElementById('settingsDropdown').classList.toggle('active');
}

function toggleProfileDropdown() {
  document.getElementById('profileDropdown').classList.toggle('active');
}

// ==================== Notification System ====================
function showNotification(message, type = 'info') {
  const container = document.getElementById('notificationsContainer');
  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    warning: 'bg-yellow-500'
  };
  const icons = {
    success: 'fa-check-circle',
    error: 'fa-times-circle',
    info: 'fa-info-circle',
    warning: 'fa-exclamation-triangle'
  };

  const notification = document.createElement('div');
  notification.className = `notification-toast ${colors[type]} text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 mb-3`;
  notification.innerHTML = `<i class="fa-solid ${icons[type]} text-2xl"></i><span class="font-semibold">${message}</span>`;
  container.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideInRight 0.3s ease-out reverse';
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 3000);
}

// ==================== Sound Effects ====================
function createBuzzSound() {
  if (!soundEnabled) return;
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = 800;
    oscillator.type = 'square';
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (error) {
    console.error('Audio not supported:', error);
  }
}

function createCorrectSound() {
  if (!soundEnabled) return;
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = 523.25 * (i + 1);
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
      }, i * 100);
    }
  } catch (error) {
    console.error('Audio not supported:', error);
  }
}

function createWrongSound() {
  if (!soundEnabled) return;
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = 200;
    oscillator.type = 'sawtooth';
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (error) {
    console.error('Audio not supported:', error);
  }
}

// ==================== Confetti Animation ====================
function triggerConfetti() {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 }
  });
}

// ==================== Color Utilities ====================
function getTeamColor(teamName) {
  const colors = {
    'Team A': '#3b82f6',
    'Team B': '#10b981',
    'Team C': '#f59e0b',
    'Team D': '#ef4444'
  };
  return colors[teamName] || '#6b7280';
}

function adjustColor(color, amount) {
  return '#' + color.replace(/^#/, '').replace(/../g, color => 
    ('0' + Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2)
  );
}

// ==================== PWA Install ====================
function showInstallPrompt() {
  const prompt = document.getElementById('installPrompt');
  if (!prompt.classList.contains('hidden')) return;
  prompt.classList.remove('hidden');
  setTimeout(() => {
    prompt.classList.add('hidden');
  }, 10000);
}

function closeInstallPrompt() {
  document.getElementById('installPrompt').classList.add('hidden');
}

function installApp() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  deferredPrompt.userChoice.then((choiceResult) => {
    if (choiceResult.outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    deferredPrompt = null;
    closeInstallPrompt();
  });
}

// ==================== Room Code Visibility ====================
function toggleRoomCodeVisibility() {
  const roomIdInput = document.getElementById('generatedRoomId');
  const toggleIcon = document.getElementById('roomCodeToggle');
  roomCodeVisible = !roomCodeVisible;
  if (roomCodeVisible) {
    roomIdInput.classList.remove('room-code-hidden');
    toggleIcon.className = 'room-code-toggle fa-solid fa-eye';
  } else {
    roomIdInput.classList.add('room-code-hidden');
    toggleIcon.className = 'room-code-toggle fa-solid fa-eye-slash';
  }
}

// ==================== Keyboard Shortcuts ====================
function handleKeyboardShortcuts(e) {
  if (!document.getElementById('game').classList.contains('hidden') && 
      !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
    if (isHost) {
      if (e.code === 'Space') {
        e.preventDefault();
        startQuestion();
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        markCorrect();
      } else if (e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        markWrong();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        resetBuzz();
      }
    } else {
      if (e.code === 'Space' && !buzzCooldown && !document.getElementById('buzzBtn').disabled) {
        e.preventDefault();
        buzz();
      }
    }
  }
}

// ==================== Close Dropdowns on Outside Click ====================
document.addEventListener('click', (e) => {
  if (!e.target.closest('.relative')) {
    document.getElementById('settingsDropdown').classList.remove('active');
    const profileDropdown = document.getElementById('profileDropdown');
    if (profileDropdown) {
      profileDropdown.classList.remove('active');
    }
  }
});

// ==================== Admin Activity Logger ====================
async function logAdminActivity(action, details) {
  try {
    await db.collection('logs').add({
      action: action,
      details: details,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}