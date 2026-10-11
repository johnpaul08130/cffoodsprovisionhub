// ============================================================
// ProvisionHub - Firebase Configuration
// CF Foods and Beverages - cf-foods-provisionhub
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyDEmsRlBUmWNkQ0lLEOdRy0Mh7xlud5W3A",
  authDomain: "cf-foods-provisionhub.firebaseapp.com",
  projectId: "cf-foods-provisionhub",
  storageBucket: "cf-foods-provisionhub.firebasestorage.app",
  messagingSenderId: "285994983031",
  appId: "1:285994983031:web:409ab284c6548f40c53072"
};

// Initialize Firebase (compat SDK)
firebase.initializeApp(firebaseConfig);

// Firebase services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Enable offline persistence
db.enablePersistence().catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
  } else if (err.code === 'unimplemented') {
    console.warn('The current browser does not support offline persistence.');
  }
});
