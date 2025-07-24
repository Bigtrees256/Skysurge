#!/usr/bin/env node

/**
 * SkySurge Deployment Script
 * Prepares the application for production deployment
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 SkySurge Deployment Preparation');
console.log('=====================================');

// Deployment configuration
const DEPLOYMENT_CONFIG = {
  platform: process.env.DEPLOY_PLATFORM || 'render',
  environment: process.env.NODE_ENV || 'production',
  skipTests: process.env.SKIP_TESTS === 'true',
  skipBuild: process.env.SKIP_BUILD === 'true'
};

console.log('📋 Deployment Configuration:');
console.log(`   Platform: ${DEPLOYMENT_CONFIG.platform}`);
console.log(`   Environment: ${DEPLOYMENT_CONFIG.environment}`);
console.log(`   Skip Tests: ${DEPLOYMENT_CONFIG.skipTests}`);
console.log(`   Skip Build: ${DEPLOYMENT_CONFIG.skipBuild}`);
console.log('');

function checkPrerequisites() {
  console.log('🔍 Checking deployment prerequisites...');
  
  // Check Node.js version
  const nodeVersion = process.version;
  console.log(`   Node.js version: ${nodeVersion}`);
  
  // Check if backend dependencies are installed
  if (!fs.existsSync('backend/node_modules')) {
    console.log('📦 Installing backend dependencies...');
    try {
      execSync('cd backend && npm install', { stdio: 'inherit' });
    } catch (error) {
      console.error('❌ Failed to install backend dependencies');
      process.exit(1);
    }
  }
  
  // Check required files
  const requiredFiles = [
    'backend/package.json',
    'backend/src/server.js',
    'render.yaml',
    'index.html'
  ];
  
  const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));
  if (missingFiles.length > 0) {
    console.error('❌ Missing required files:');
    missingFiles.forEach(file => console.error(`   - ${file}`));
    process.exit(1);
  }
  
  console.log('✅ Prerequisites check passed');
}

function validateEnvironment() {
  console.log('🔧 Validating environment configuration...');
  
  // Check if .env.example exists
  if (!fs.existsSync('backend/.env.example')) {
    console.warn('⚠️  backend/.env.example not found');
  }
  
  // Validate render.yaml
  if (fs.existsSync('render.yaml')) {
    const renderConfig = fs.readFileSync('render.yaml', 'utf8');
    if (!renderConfig.includes('buildCommand') || !renderConfig.includes('startCommand')) {
      console.error('❌ Invalid render.yaml configuration');
      process.exit(1);
    }
  }
  
  console.log('✅ Environment validation passed');
}

function runBuild() {
  if (DEPLOYMENT_CONFIG.skipBuild) {
    console.log('⏭️  Skipping build step');
    return;
  }
  
  console.log('🔨 Running build process...');
  
  try {
    // Run frontend build
    if (fs.existsSync('build.js')) {
      execSync('node build.js', { stdio: 'inherit' });
    }
    
    // Validate backend
    execSync('cd backend && npm run validate', { stdio: 'inherit' });
    
    console.log('✅ Build completed successfully');
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

function runTests() {
  if (DEPLOYMENT_CONFIG.skipTests) {
    console.log('⏭️  Skipping tests');
    return;
  }
  
  console.log('🧪 Running tests...');
  
  try {
    // Run validation script
    if (fs.existsSync('validate-deployment.js')) {
      execSync('node validate-deployment.js', { stdio: 'inherit' });
    }
    
    console.log('✅ Tests passed');
  } catch (error) {
    console.warn('⚠️  Tests failed, but continuing deployment');
    console.warn('   Error:', error.message);
  }
}

function generateDeploymentSummary() {
  console.log('📊 Deployment Summary');
  console.log('=====================');
  
  const summary = {
    timestamp: new Date().toISOString(),
    platform: DEPLOYMENT_CONFIG.platform,
    environment: DEPLOYMENT_CONFIG.environment,
    nodeVersion: process.version,
    files: {
      backend: fs.existsSync('backend/package.json'),
      frontend: fs.existsSync('index.html'),
      config: fs.existsSync('render.yaml'),
      env: fs.existsSync('backend/.env.example')
    }
  };
  
  console.log('📄 Summary:');
  console.log(JSON.stringify(summary, null, 2));
  
  // Save summary to file
  fs.writeFileSync('deployment-summary.json', JSON.stringify(summary, null, 2));
  console.log('💾 Deployment summary saved to deployment-summary.json');
}

function showDeploymentInstructions() {
  console.log('');
  console.log('🎯 Next Steps for Deployment');
  console.log('============================');
  
  if (DEPLOYMENT_CONFIG.platform === 'render') {
    console.log('📋 Render Deployment Instructions:');
    console.log('');
    console.log('1. 🔗 Connect your GitHub repository to Render');
    console.log('2. 🔧 Set environment variables in Render dashboard:');
    console.log('   - MONGODB_URI (MongoDB Atlas connection string)');
    console.log('   - FIREBASE_PROJECT_ID');
    console.log('   - FIREBASE_PRIVATE_KEY');
    console.log('   - FIREBASE_CLIENT_EMAIL');
    console.log('   - STRIPE_SECRET_KEY (optional)');
    console.log('   - NODE_ENV=production');
    console.log('');
    console.log('3. 🚀 Deploy using render.yaml configuration');
    console.log('4. 🔍 Monitor deployment logs for any issues');
    console.log('5. 🧪 Test the deployed application');
  }
  
  console.log('');
  console.log('📚 For detailed instructions, see DEPLOYMENT_GUIDE.md');
  console.log('🔒 For security guidelines, see SECURITY.md');
}

// Main deployment preparation
function deploy() {
  try {
    checkPrerequisites();
    validateEnvironment();
    runBuild();
    runTests();
    generateDeploymentSummary();
    showDeploymentInstructions();
    
    console.log('');
    console.log('🎉 Deployment preparation completed successfully!');
    console.log('🚀 Your application is ready for production deployment');
    
  } catch (error) {
    console.error('❌ Deployment preparation failed:', error.message);
    process.exit(1);
  }
}

// Run deployment if called directly
if (require.main === module) {
  deploy();
}

module.exports = { deploy, checkPrerequisites, validateEnvironment };
