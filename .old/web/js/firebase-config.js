/**
 * Firebase Configuration
 * =====================
 * 
 * SETUP INSTRUCTIONS:
 * 1. Go to https://console.firebase.google.com/
 * 2. Create a new project
 * 3. Enable Firestore Database (Build → Firestore Database → Create database)
 * 4. Get your config from Project Settings → Your apps → Web app
 * 5. Replace the placeholder values below with your actual config
 */

// ⚠️ REPLACE THESE VALUES WITH YOUR FIREBASE CONFIG ⚠️
const firebaseConfig = {
  apiKey: "AIzaSyC7gxTLRdNfmVzhK83ejoVIQ7lhCN_-_8s",
  authDomain: "warehousestocklogger.firebaseapp.com",
  projectId: "warehousestocklogger",
  storageBucket: "warehousestocklogger.firebasestorage.app",
  messagingSenderId: "1047619497385",
  appId: "1:1047619497385:web:15a4ec0661b869f295a8b8"
};

// Check if Firebase config is set up
const isFirebaseConfigured = () => {
    return firebaseConfig.apiKey && 
           firebaseConfig.apiKey.length > 0 && 
           firebaseConfig.projectId && 
           firebaseConfig.projectId.length > 0 &&
           !firebaseConfig.apiKey.includes('YOUR_') &&
           !firebaseConfig.projectId.includes('YOUR_');
};

// Initialize Firebase only if configured
let db = null;

if (isFirebaseConfigured()) {
    try {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        
        // Enable offline persistence
        db.enablePersistence({ synchronizeTabs: true })
            .catch((err) => {
                if (err.code === 'failed-precondition') {
                    console.warn('Firestore persistence failed: Multiple tabs open');
                } else if (err.code === 'unimplemented') {
                    console.warn('Firestore persistence not available in this browser');
                }
            });
        
        console.log('✅ Firebase initialized successfully');
    } catch (error) {
        console.error('❌ Firebase initialization failed:', error);
    }
} else {
    console.warn('⚠️ Firebase not configured. Running in local-only mode.');
}

// Export for use in other modules
window.firebaseConfig = {
    db,
    isConfigured: isFirebaseConfigured
};
