# 🚨 URGENT: Fix SkySurge Login System on Render

## Current Issues
Your login system is failing because critical environment variables are missing in your Render deployment.

## 🔧 Immediate Fix Steps

### Step 1: Set Up MongoDB Atlas (Required)
1. Go to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Create a free cluster if you don't have one
3. Get your connection string (should look like: `mongodb+srv://username:password@cluster.mongodb.net/skysurge?retryWrites=true&w=majority`)
4. In Render dashboard, set environment variable:
   - **Key**: `MONGODB_URI`
   - **Value**: Your MongoDB Atlas connection string

### Step 2: Set Up Firebase Admin SDK (Required)
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `skysurge-67edc`
3. Go to Project Settings → Service Accounts
4. Click "Generate new private key" and download the JSON file
5. Extract these values from the JSON and set in Render:

   - **Key**: `FIREBASE_PROJECT_ID`
   - **Value**: `skysurge-67edc`

   - **Key**: `FIREBASE_PRIVATE_KEY_ID`
   - **Value**: (from JSON: `private_key_id`)

   - **Key**: `FIREBASE_PRIVATE_KEY`
   - **Value**: (from JSON: `private_key` - include the full key with `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`)

   - **Key**: `FIREBASE_CLIENT_EMAIL`
   - **Value**: (from JSON: `client_email`)

   - **Key**: `FIREBASE_CLIENT_ID`
   - **Value**: (from JSON: `client_id`)

### Step 3: Set Production Environment
In Render dashboard, set:
- **Key**: `NODE_ENV`
- **Value**: `production`

### Step 4: Optional - Stripe Configuration
If you want payment functionality:
- **Key**: `STRIPE_SECRET_KEY`
- **Value**: Your Stripe secret key

- **Key**: `STRIPE_PUBLISHABLE_KEY`
- **Value**: Your Stripe publishable key

## 🔍 How to Check if It's Working

1. After setting environment variables, redeploy your Render service
2. Visit: `https://your-app-name.onrender.com/health`
3. You should see:
   ```json
   {
     "status": "ok",
     "database": { "connected": true },
     "firebase": { "initialized": true },
     "config": {
       "hasMongoUri": true,
       "hasFirebasePrivateKey": true,
       "hasFirebaseClientEmail": true
     }
   }
   ```

## 🚨 Critical Notes

1. **Never commit** the Firebase service account JSON file to your repository
2. **Use environment variables only** for sensitive data
3. **Test the health endpoint** after each change
4. **Check Render logs** for detailed error messages

## 📞 What to Tell Me

After you've set the environment variables, please:
1. Share your Render app URL so I can check the health endpoint
2. Let me know if you see any errors in the Render deployment logs
3. Tell me if the health endpoint shows all configurations as `true`

## 🔄 Next Steps After Environment Variables Are Set

Once the basic configuration is working, we'll:
1. Test the login flow end-to-end
2. Verify user registration works
3. Check that API authentication is functioning
4. Update CORS settings with your exact domain if needed
