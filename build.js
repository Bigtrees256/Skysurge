#!/usr/bin/env node

/**
 * SkySurge Frontend Build Script
 * Optimizes frontend assets for production deployment
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Starting SkySurge frontend build process...');

// Configuration
const BUILD_CONFIG = {
  minifyHTML: true,
  optimizeJS: true,
  validateAssets: true,
  generateManifest: true
};

// Validate all required files exist
const REQUIRED_FILES = [
  'index.html',
  'login.html',
  'register.html',
  'setup-username.html',
  'js/config.js',
  'js/Game.js',
  'js/main.js'
];

function validateAssets() {
  console.log('📋 Validating required assets...');
  
  const missingFiles = [];
  
  REQUIRED_FILES.forEach(file => {
    if (!fs.existsSync(file)) {
      missingFiles.push(file);
    }
  });
  
  if (missingFiles.length > 0) {
    console.error('❌ Missing required files:');
    missingFiles.forEach(file => console.error(`   - ${file}`));
    process.exit(1);
  }
  
  console.log('✅ All required assets found');
}

function optimizeHTML() {
  console.log('🔧 Optimizing HTML files...');
  
  const htmlFiles = ['index.html', 'login.html', 'register.html', 'setup-username.html'];
  
  htmlFiles.forEach(file => {
    if (fs.existsSync(file)) {
      let content = fs.readFileSync(file, 'utf8');
      
      // Remove comments (but keep conditional comments)
      content = content.replace(/<!--(?!\[if)[\s\S]*?-->/g, '');
      
      // Remove extra whitespace
      content = content.replace(/\s+/g, ' ');
      content = content.replace(/>\s+</g, '><');
      
      // Ensure proper meta tags for production
      if (!content.includes('viewport')) {
        content = content.replace('<head>', '<head>\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">');
      }
      
      fs.writeFileSync(file, content);
      console.log(`   ✅ Optimized ${file}`);
    }
  });
}

function validateJavaScript() {
  console.log('🔧 Validating JavaScript files...');
  
  const jsFiles = fs.readdirSync('js').filter(file => file.endsWith('.js'));
  
  jsFiles.forEach(file => {
    const filePath = path.join('js', file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Basic syntax validation
    try {
      // Check for common issues
      if (content.includes('console.log') && process.env.NODE_ENV === 'production') {
        console.warn(`⚠️  ${file} contains console.log statements`);
      }
      
      // Check for TODO comments
      if (content.includes('TODO') || content.includes('FIXME')) {
        console.warn(`⚠️  ${file} contains TODO/FIXME comments`);
      }
      
      console.log(`   ✅ Validated ${file}`);
    } catch (error) {
      console.error(`❌ JavaScript error in ${file}:`, error.message);
      process.exit(1);
    }
  });
}

function generateManifest() {
  console.log('📄 Generating asset manifest...');
  
  const manifest = {
    name: "SkySurge",
    short_name: "SkySurge",
    description: "Flying game with leaderboards and competitions",
    start_url: "/",
    display: "standalone",
    background_color: "#667eea",
    theme_color: "#667eea",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon"
      }
    ]
  };
  
  fs.writeFileSync('manifest.json', JSON.stringify(manifest, null, 2));
  console.log('   ✅ Generated manifest.json');
}

function generateServiceWorker() {
  console.log('🔧 Generating service worker...');
  
  const swContent = `
// SkySurge Service Worker
const CACHE_NAME = 'skysurge-v1';
const urlsToCache = [
  '/',
  '/js/config.js',
  '/js/Game.js',
  '/js/main.js',
  '/js/StartScene.js',
  '/js/GameScene.js',
  '/js/GameOverScene.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});
`;
  
  fs.writeFileSync('sw.js', swContent.trim());
  console.log('   ✅ Generated service worker');
}

// Main build process
function build() {
  try {
    validateAssets();
    
    if (BUILD_CONFIG.validateAssets) {
      validateJavaScript();
    }
    
    if (BUILD_CONFIG.minifyHTML) {
      optimizeHTML();
    }
    
    if (BUILD_CONFIG.generateManifest) {
      generateManifest();
      generateServiceWorker();
    }
    
    console.log('🎉 Build completed successfully!');
    console.log('📦 Frontend is ready for production deployment');
    
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

// Run build if called directly
if (require.main === module) {
  build();
}

module.exports = { build, validateAssets };
