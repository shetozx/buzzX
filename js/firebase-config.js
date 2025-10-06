const firebaseConfig = {
  apiKey: "AIzaSyAPncTfAsBWV1ca68bqGkSQOpavLbpYCKo",
  authDomain: "dentalkfs-shetozx.firebaseapp.com",
  projectId: "dentalkfs-shetozx",
  storageBucket: "dentalkfs-shetozx.firebasestorage.app",
  messagingSenderId: "1056207552410",
  appId: "1:1056207552410:web:8bc0d627d73928199f8423"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const db = firebase.firestore();
const storage = firebase.storage();

console.log('✅ Firebase initialized successfully');