const admin = require('firebase-admin');

// Initialize Firebase Admin using environment variables for production security
try {
  // Check if Firebase is already initialized
  if (!admin.apps.length) {
    // Try to initialize Firebase using different methods
    let serviceAccount = null;

    // Method 1: Check for FIREBASE_SERVICE_ACCOUNT (JSON string)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        console.log('🔧 Initializing Firebase Admin with FIREBASE_SERVICE_ACCOUNT...');
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        console.log('✅ Successfully parsed FIREBASE_SERVICE_ACCOUNT JSON');
      } catch (error) {
        console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:', error.message);
      }
    }

    // Method 2: Check for individual environment variables (fallback)
    if (!serviceAccount && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PROJECT_ID) {
      console.log('🔧 Initializing Firebase Admin with individual environment variables...');
      try {
        serviceAccount = {
          type: "service_account",
          project_id: process.env.FIREBASE_PROJECT_ID,
          private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
          private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          client_email: process.env.FIREBASE_CLIENT_EMAIL,
          client_id: process.env.FIREBASE_CLIENT_ID,
          auth_uri: "https://accounts.google.com/o/oauth2/auth",
          token_uri: "https://oauth2.googleapis.com/token",
          auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs"
        };
        console.log('✅ Service account object created successfully');
      } catch (error) {
        console.error('❌ Failed to create service account object:', error.message);
        serviceAccount = null;
      }
    }

    // Initialize Firebase if we have valid service account
    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });

      console.log('✅ Firebase Admin initialized successfully');
      console.log('📧 Project ID:', serviceAccount.project_id);
    } else {
      console.log('⚠️  Firebase configuration not found. Checking available options:');
      console.log('🔍 FIREBASE_SERVICE_ACCOUNT:', process.env.FIREBASE_SERVICE_ACCOUNT ? 'SET' : 'MISSING');
      console.log('🔍 Individual Firebase env vars:');
      console.log('   - FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? 'SET' : 'MISSING');
      console.log('   - FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? 'SET (length: ' + (process.env.FIREBASE_PRIVATE_KEY?.length || 0) + ')' : 'MISSING');
      console.log('   - FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? 'SET' : 'MISSING');
      console.log('   - FIREBASE_PRIVATE_KEY_ID:', process.env.FIREBASE_PRIVATE_KEY_ID ? 'SET' : 'MISSING');
      console.log('   - FIREBASE_CLIENT_ID:', process.env.FIREBASE_CLIENT_ID ? 'SET' : 'MISSING');
      console.log('⚠️  Firebase Admin not initialized - Authentication will fail!');
      console.log('📋 To fix this, set the required Firebase environment variables in your Render dashboard');
    }
  } else {
    console.log('✅ Firebase Admin already initialized');
  }
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin:', error.message);
  console.log('⚠️  Firebase Admin not initialized due to configuration error');
}

module.exports = admin; 