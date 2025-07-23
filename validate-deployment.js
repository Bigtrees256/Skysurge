#!/usr/bin/env node

/**
 * SkySurge Deployment Validation Script
 * Checks if the codebase is ready for production deployment
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 SkySurge Deployment Validation');
console.log('=' .repeat(50));

let errors = [];
let warnings = [];
let passed = 0;

function check(description, condition, isWarning = false) {
    if (condition) {
        console.log(`✅ ${description}`);
        passed++;
    } else {
        const symbol = isWarning ? '⚠️ ' : '❌';
        console.log(`${symbol} ${description}`);
        if (isWarning) {
            warnings.push(description);
        } else {
            errors.push(description);
        }
    }
}

function fileExists(filePath) {
    return fs.existsSync(filePath);
}

function fileContains(filePath, searchString) {
    if (!fileExists(filePath)) return false;
    const content = fs.readFileSync(filePath, 'utf8');
    return content.includes(searchString);
}

function directoryExists(dirPath) {
    return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
}

// Check essential files
console.log('\n📁 Essential Files:');
check('README.md exists', fileExists('README.md'));
check('LICENSE exists', fileExists('LICENSE'));
check('render.yaml exists', fileExists('render.yaml'));
check('DEPLOYMENT_GUIDE.md exists', fileExists('DEPLOYMENT_GUIDE.md'));
check('SECURITY.md exists', fileExists('SECURITY.md'));

// Check backend structure
console.log('\n🔧 Backend Structure:');
check('backend directory exists', directoryExists('backend'));
check('backend/package.json exists', fileExists('backend/package.json'));
check('backend/src directory exists', directoryExists('backend/src'));
check('backend/src/server.js exists', fileExists('backend/src/server.js'));
check('backend/.env.example exists', fileExists('backend/.env.example'));

// Check frontend structure
console.log('\n🎮 Frontend Structure:');
check('index.html exists', fileExists('index.html'));
check('js directory exists', directoryExists('js'));
check('js/config.js exists', fileExists('js/config.js'));
check('js/Game.js exists', fileExists('js/Game.js'));
check('js/AuthManager.js exists', fileExists('js/AuthManager.js'));

// Check security
console.log('\n🛡️  Security Checks:');
check('No .env file in root (good)', !fileExists('.env'));
check('No .env file in backend (good)', !fileExists('backend/.env'));
check('No firebase-service-account.json (good)', !fileExists('backend/firebase-service-account.json'));
check('.gitignore includes .env', fileContains('.gitignore', '.env'));
check('.gitignore includes firebase-service-account.json', fileContains('.gitignore', 'firebase-service-account.json'));

// Check for removed test files
console.log('\n🧹 Cleanup Verification:');
const testFiles = [
    'test-simple.html',
    'debug-auth.html',
    'check-database.js',
    'start-backend.bat'
];

testFiles.forEach(file => {
    check(`${file} removed`, !fileExists(file));
});

// Check configuration
console.log('\n⚙️  Configuration:');
check('Config.js uses dynamic API URL', fileContains('js/config.js', 'window.location.origin'));
check('Server.js has production CORS', fileContains('backend/src/server.js', 'NODE_ENV === \'production\''));
check('Firebase admin uses env vars', fileContains('backend/src/firebaseAdmin.js', 'process.env.FIREBASE_PROJECT_ID'));

// Check render.yaml
console.log('\n🚀 Render Configuration:');
check('render.yaml has NODE_ENV=production', fileContains('render.yaml', 'NODE_ENV'));
check('render.yaml has MONGODB_URI', fileContains('render.yaml', 'MONGODB_URI'));
check('render.yaml has Firebase config', fileContains('render.yaml', 'FIREBASE_PROJECT_ID'));
check('render.yaml has Stripe config', fileContains('render.yaml', 'STRIPE_SECRET_KEY'));

// Summary
console.log('\n' + '=' .repeat(50));
console.log('📊 Validation Summary:');
console.log(`✅ Passed: ${passed}`);
console.log(`⚠️  Warnings: ${warnings.length}`);
console.log(`❌ Errors: ${errors.length}`);

if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    warnings.forEach(warning => console.log(`  - ${warning}`));
}

if (errors.length > 0) {
    console.log('\n❌ Errors that must be fixed:');
    errors.forEach(error => console.log(`  - ${error}`));
    console.log('\n🚨 Please fix these errors before deploying to production!');
    process.exit(1);
} else {
    console.log('\n🎉 All checks passed! Your codebase is ready for deployment.');
    console.log('\n📋 Next steps:');
    console.log('1. Push your code to GitHub');
    console.log('2. Set up environment variables in Render');
    console.log('3. Deploy using render.yaml');
    console.log('4. Test the deployed application');
    console.log('\nSee DEPLOYMENT_GUIDE.md for detailed instructions.');
}
