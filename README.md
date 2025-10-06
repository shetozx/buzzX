# 🎮 BuzzX - Live Quiz Buzzer System

A real-time, multiplayer quiz platform with advanced features including team modes, comprehensive analytics, and role-based access control.

## ✨ Features

### 🎯 Core Features
- **Real-time Buzzer System** - Multi-player competitive buzzing
- **Role-Based Access** - Owner, Host, and Player roles
- **Team Mode** - Organize players into competing teams
- **Multi-Language Support** - English & Arabic (RTL)
- **Dark/Light Theme** - User preference persistence
- **PWA Support** - Install as native app

### 🎓 Game Features
- **Timer System** with pause/resume (Bug 6 fixed)
- **Multi-Attempt Questions** - Players can retry if answered wrong
- **Question Bank** - Import CSV/Excel questions
- **Personal Question Library** - Save frequently used questions
- **Answer History** - Track all attempts with timestamps
- **Live Chat** - Real-time communication with system messages
- **Keyboard Shortcuts** - Quick host controls

### 📊 Analytics
- **Player Statistics** - Score, accuracy, correct/wrong answers
- **Match History** - Track game participation
- **Global Leaderboard** - Rankings by score or accuracy
- **Performance Charts** - Visual analytics (Chart.js)
- **Export Results** - Download CSV reports

### 👑 Admin Panel (Owner Only)
- **Dashboard** - System-wide statistics
- **User Management** - Promote/demote users
- **Room Monitoring** - View and close active rooms
- **Activity Logs** - Audit trail of all actions

## 🚀 Deployment on drv.tw

### Step 1: Prepare Files
Ensure your project structure matches:
buzzx/
├── index.html
├── manifest.json
├── service-worker.js
├── css/
│ └── styles.css
└── js/
├── firebase-config.js
├── translations.js
├── utils.js
├── auth.js
├── room.js
├── game.js
├── chat.js
├── profile.js
├── admin.js
└── app.js
### Step 2: Upload to drv.tw
1. Visit [drv.tw](https://drv.tw)
2. Create a new project or select existing
3. Upload all files maintaining folder structure
4. Set `index.html` as the entry point

### Step 3: Configure Firebase
Update `js/firebase-config.js` with your Firebase credentials:

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

### Step 4: Firestore Security Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;

      match /matchHistory/{historyId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }

      match /questionBank/{questionId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }

    // Rooms collection
    match /rooms/{roomId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null;

      match /players/{playerId} {
        allow read: if true;
        allow write: if request.auth != null;
      }

      match /chat/{messageId} {
        allow read: if true;
        allow create: if request.auth != null;
      }

      match /answerHistory/{answerId} {
        allow read, write: if request.auth != null;
      }
    }

    // Logs collection (admin only)
    match /logs/{logId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
Step 5: Create First Owner Account
Sign up with desired owner credentials
Manually update Firestore:
Navigate to /users/{username}
Change role field to "owner"
📱 PWA Installation
Users can install BuzzX as a native app:

Desktop: Click install prompt or browser menu
Mobile: Add to Home Screen
Offline Support: Cached resources for offline access
🎮 User Roles
Player (Default)
Join rooms
Buzz and answer questions
View leaderboard
Chat with participants
Host
Create rooms
Ask questions
Judge answers (correct/wrong)
Manage teams
Export results
Access question bank
Owner
All Host privileges
Admin panel access
Promote users to Host
Monitor all rooms
View activity logs
System-wide analytics
⌨️ Keyboard Shortcuts
Host Controls
Space - Start question
C - Mark correct
W - Mark wrong
R - Reset question
Player Controls
Space - Buzz (when question active)
🐛 Bug Fixes Implemented
Bug 1: Global roomId variable consistency
Bug 2: Screen navigation cleanup
Bug 3: Room info card with QR toggle
Bug 4: Separate buzzedByUsername field
Bug 5: Removed auto-reset from submitAnswer
Bug 6: Timer pause + multi-attempt system
🚀 Improvements
Timer status indicator (running/paused/stopped)
Wrong attempts display
Buzz cooldown (1 second)
Question statistics for hosts
Typed system messages
Keyboard shortcuts
Answer history tracking
📊 Firestore Structure
text

/users/{username}
  - displayName, password, role, badges
  - stats: {totalScore, correctAnswers, wrongAnswers, firstBuzzes}
  /matchHistory/{id}
  /questionBank/{id}

/rooms/{roomId}
  - roomName, question, timer, timerPaused, questionActive
  - buzzedBy, buzzedByUsername, wrongAnswers[], buzzQueue[]
  - teamsMode, teams[], questionPoints, status
  /players/{username}
  /chat/{id}
  /answerHistory/{id}

/logs/{id}
  - action, details, timestamp
🛠️ Technologies Used
Frontend: HTML5, Tailwind CSS, Vanilla JavaScript
Backend: Firebase (Firestore, Auth, Storage)
Charts: Chart.js
QR Codes: QRCode.js
CSV Parsing: PapaParse
Animations: Canvas Confetti

📄 License
Created by shetozx
Telegram: @shetozx

🆘 Support
For issues or feature requests:

Contact: @shetozx on Telegram
Made with ❤️ by shetozx