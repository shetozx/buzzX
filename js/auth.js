/**
 * Authentication Module
 * Handles login, signup, logout, and profile management
 */

// ==================== Form Toggle ====================
function showLogin() {
  document.getElementById('loginForm').classList.remove('hidden');
  document.getElementById('signupForm').classList.add('hidden');
}

function showSignup() {
  document.getElementById('loginForm').classList.add('hidden');
  document.getElementById('signupForm').classList.remove('hidden');
}

// ==================== Login ====================
async function login() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value.trim();

  if (!username || !password) {
    showNotification('Please enter username and password!', 'error');
    return;
  }

  try {
    const userDoc = await db.collection('users').doc(username).get();

    if (!userDoc.exists) {
      showNotification('User not found!', 'error');
      return;
    }

    const userData = userDoc.data();
    if (userData.password !== password) {
      showNotification('Incorrect password!', 'error');
      return;
    }

    currentUser = {
      username: username,
      displayName: userData.displayName,
      role: userData.role || 'user'
    };

    localStorage.setItem('currentUser', JSON.stringify(currentUser));

    await db.collection('users').doc(username).update({
      lastActivityAt: Date.now()
    });

    await loadUserProfile();
    showHomeScreen();
    showNotification('Welcome back, ' + userData.displayName + '!', 'success');
    await logAdminActivity('User login', `${username} logged in`);
  } catch (error) {
    console.error('Login error:', error);
    showNotification('Login failed: ' + error.message, 'error');
  }
}

// ==================== Signup ====================
async function signup() {
  const username = document.getElementById('signupUsername').value.trim();
  const displayName = document.getElementById('signupDisplayName').value.trim();
  const password = document.getElementById('signupPassword').value.trim();

  if (!username || !displayName || !password) {
    showNotification('Please fill all required fields!', 'error');
    return;
  }

  const usernameRegex = /^[a-zA-Z0-9]{3,20}$/;
  if (!usernameRegex.test(username)) {
    showNotification('Username must be 3-20 characters with letters and numbers only!', 'error');
    return;
  }

  if (password.length < 6) {
    showNotification('Password must be at least 6 characters!', 'error');
    return;
  }

  try {
    const userDoc = await db.collection('users').doc(username).get();
    if (userDoc.exists) {
      showNotification('Username already exists!', 'error');
      return;
    }

    await db.collection('users').doc(username).set({
      displayName: safeDisplay(displayName),
      username: safeDisplay(username),
      password: password,
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
      role: 'user',
      badges: [],
      stats: {
        totalScore: 0,
        correctAnswers: 0,
        wrongAnswers: 0,
        firstBuzzes: 0
      }
    });

    currentUser = {
      username: username,
      displayName: displayName,
      role: 'user'
    };

    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    await loadUserProfile();
    showHomeScreen();
    showNotification('Account created successfully!', 'success');
    await logAdminActivity('User signup', `New user: ${username}`);
  } catch (error) {
    console.error('Signup error:', error);
    showNotification('Signup failed: ' + error.message, 'error');
  }
}

// ==================== Load User Profile ====================
async function loadUserProfile() {
  document.getElementById('profileMenu').classList.remove('hidden');

  const headerAvatar = document.getElementById('headerAvatar');
  headerAvatar.textContent = currentUser.displayName.charAt(0).toUpperCase();

  document.getElementById('headerUsername').textContent = currentUser.displayName;
  document.getElementById('dropdownUsername').textContent = currentUser.displayName;

  const roleText = currentUser.role === 'owner' ? 'Owner' : 
                   currentUser.role === 'host' ? 'Host' : 'User';
  document.getElementById('dropdownRole').textContent = roleText;

  updateProfileMenu();
}

// ==================== Update Profile Menu ====================
function updateProfileMenu() {
  const menuMyRooms = document.getElementById('menuMyRooms');
  const menuAdminPanel = document.getElementById('menuAdminPanel');
  const createRoomBtn = document.getElementById('createRoomBtn');

  if (currentUser.role === 'host' || currentUser.role === 'owner') {
    menuMyRooms.classList.remove('hidden');
    createRoomBtn.classList.remove('hidden');
  } else {
    menuMyRooms.classList.add('hidden');
    createRoomBtn.classList.add('hidden');
  }

  if (currentUser.role === 'owner') {
    menuAdminPanel.classList.remove('hidden');
  } else {
    menuAdminPanel.classList.add('hidden');
  }
}

// ==================== Logout ====================
function logout() {
  if (confirm('Are you sure you want to logout?')) {
    localStorage.removeItem('currentUser');
    currentUser = null;
    window.location.reload();
  }
}