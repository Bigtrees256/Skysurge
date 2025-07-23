# SkySurge Deployment Guide

## 🚀 Deploying to Render

### Prerequisites
1. GitHub repository with your cleaned codebase
2. Render account (free tier available)
3. MongoDB Atlas account (free tier available)
4. Firebase project with service account
5. Stripe account (test mode for development)

### Step 1: Environment Variables Setup

You'll need to configure these environment variables in Render:

#### Required Environment Variables:
```
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour-private-key\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

#### Optional Environment Variables:
```
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Step 2: Deploy to Render

1. **Connect Repository**: Link your GitHub repository to Render
2. **Use render.yaml**: Render will automatically detect the `render.yaml` configuration
3. **Set Environment Variables**: Add all required environment variables in Render dashboard
4. **Deploy**: Render will automatically build and deploy your application

### Step 3: Database Setup

1. **MongoDB Atlas**: Create a free cluster and get connection string
2. **Database Name**: Use `skysurge` as the database name
3. **Collections**: The application will automatically create required collections

### Step 4: Firebase Setup

1. **Service Account**: Download service account JSON from Firebase Console
2. **Extract Values**: Copy individual values to environment variables (don't upload the JSON file)
3. **Authentication**: Ensure Firebase Authentication is enabled

### Step 5: Stripe Setup

1. **Test Mode**: Start with test keys for initial deployment
2. **Webhooks**: Configure webhook endpoint: `https://your-app.onrender.com/api/payments/webhook`
3. **Products**: Set up payment products in Stripe dashboard

### Step 6: Post-Deployment

1. **Health Check**: Visit `https://your-app.onrender.com/health` to verify deployment
2. **Test Authentication**: Try logging in with Firebase
3. **Test Game**: Play the game and submit scores
4. **Monitor Logs**: Check Render logs for any issues

## 🔧 Local Development

### Setup
```bash
# Install dependencies
cd backend && npm install

# Create environment file
cp .env.example .env
# Edit .env with your local values

# Start development server
npm run dev
```

### Frontend Development
The frontend is served by the backend in production. For local development:
1. Start the backend server on port 3000
2. Open `index.html` in your browser or use a local server

## 🛡️ Security Notes

1. **Never commit**: `.env` files, service account JSON files, or API keys
2. **Environment Variables**: All sensitive data should be in environment variables
3. **CORS**: Production CORS is configured for your domain only
4. **Rate Limiting**: Enabled in production to prevent abuse
5. **Helmet**: Security headers are configured for production

## 📊 Monitoring

- **Health Endpoint**: `/health` provides system status
- **Logs**: Monitor Render logs for errors
- **Database**: Monitor MongoDB Atlas for performance
- **Firebase**: Check Firebase Console for authentication metrics

## 🔄 Updates

To update your deployment:
1. Push changes to your GitHub repository
2. Render will automatically redeploy
3. Monitor deployment logs for any issues

## 🆘 Troubleshooting

### Common Issues:
1. **Environment Variables**: Ensure all required variables are set
2. **Database Connection**: Check MongoDB URI and network access
3. **Firebase**: Verify service account credentials
4. **CORS**: Ensure your domain is in the allowed origins list

### Debug Steps:
1. Check `/health` endpoint for system status
2. Review Render deployment logs
3. Verify environment variables are set correctly
4. Test individual API endpoints
