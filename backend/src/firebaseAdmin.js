const admin = require('firebase-admin');

// Initialize Firebase Admin using environment variables for production security
try {
  // Check if Firebase is already initialized
  if (!admin.apps.length) {
    // For production, use environment variables instead of service account file
    if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PROJECT_ID) {
      console.log('🔧 Initializing Firebase Admin with environment variables...');

      const serviceAccount = {
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

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });

      console.log('✅ Firebase Admin initialized successfully with environment variables');
      console.log('📧 Project ID:', process.env.FIREBASE_PROJECT_ID);
    } else {
      console.log('⚠️  Firebase environment variables not found. Required:');
      console.log('   - FIREBASE_PROJECT_ID');
      console.log('   - FIREBASE_PRIVATE_KEY');
      console.log('   - FIREBASE_CLIENT_EMAIL');
      console.log('   - FIREBASE_PRIVATE_KEY_ID');
      console.log('   - FIREBASE_CLIENT_ID');
      console.log('🔍 Debug - Current Firebase env vars:');
      console.log('   - FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? 'SET' : 'MISSING');
      console.log('   - FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? 'SET' : 'MISSING');
      console.log('   - FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? 'SET' : 'MISSING');
      console.log('   - FIREBASE_PRIVATE_KEY_ID:', process.env.FIREBASE_PRIVATE_KEY_ID ? 'SET' : 'MISSING');
      console.log('   - FIREBASE_CLIENT_ID:', process.env.FIREBASE_CLIENT_ID ? 'SET' : 'MISSING');
      console.log('⚠️  Firebase Admin not initialized');
    }
  } else {
    console.log('✅ Firebase Admin already initialized');
  }
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin:', error.message);
  console.log('⚠️  Firebase Admin not initialized due to configuration error');
}

module.exports = admin; 