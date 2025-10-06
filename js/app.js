/**
 * Main Application Initialization
 * Entry point and event listeners
 */

// ==================== DOMContentLoaded ====================
window.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 BuzzX Initializing...');

  // Load theme
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);

  // Load language
  currentLanguage = localStorage.getItem('language') || 'en';
  applyLanguage(currentLanguage);

  // Load sound preference
  soundEnabled = localStorage.getItem('sound') !== 'false';
  updateSoundIcon();

  // Check if user is logged in and verify session
  const savedUser = localStorage.getItem('currentUser');
  if (savedUser) {
    try {
      currentUser = JSON.parse(savedUser);
      const userDoc = await db.collection('users').doc(currentUser.username).get();
      if (userDoc.exists) {
        await loadUserProfile();
        showHomeScreen();
      } else {
        localStorage.removeItem('currentUser');
        currentUser = null;
        document.getElementById('authScreen').classList.remove('hidden');
      }
    } catch (error) {
      console.error('Error verifying user session:', error);
      localStorage.removeItem('currentUser');
      currentUser = null;
      document.getElementById('authScreen').classList.remove('hidden');
    }
  } else {
    document.getElementById('authScreen').classList.remove('hidden');
  }

  // Auto-join from URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const roomParam = urlParams.get('room');
  if (roomParam && currentUser) {
    showJoinRoom();
    document.getElementById('roomIdInput').value = roomParam;
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyboardShortcuts);

  console.log('✅ BuzzX Initialized Successfully');
});

// ==================== PWA Install Prompt ====================
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  showInstallPrompt();
});

// ==================== Service Worker Registration ====================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then(registration => {
        console.log('✅ ServiceWorker registered:', registration.scope);
      })
      .catch(err => {
        console.log('❌ ServiceWorker registration failed:', err);
      });
  });
}

console.log('🎮 BuzzX - Live Quiz Platform v1.0.0');