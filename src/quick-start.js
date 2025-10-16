#!/usr/bin/env node

/**
 * Quick Start Script for Best Brightness
 * One-command setup and launch
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');

console.log('🚀 Best Brightness Quick Start');
console.log('==============================\n');

function runCommand(command, description) {
  console.log(`📝 ${description}...`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description} completed\n`);
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    process.exit(1);
  }
}

// Check if node_modules exists
if (!fs.existsSync('node_modules')) {
  console.log('📦 Installing dependencies for the first time...');
  runCommand('npm install', 'Installing dependencies');
} else {
  console.log('📦 Dependencies already installed\n');
}

// Initialize offline data
console.log('📱 Setting up offline data...');
runCommand('node scripts/offline-setup.js', 'Setting up offline data');

// Create .env.local if it doesn't exist
if (!fs.existsSync('.env.local')) {
  console.log('🔧 Creating environment configuration...');
  const envContent = `# Best Brightness Environment Variables
# These are optional - the app works fully offline by default

# Optional: For online mode
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Optional: Barcode Lookup API
VITE_BARCODE_LOOKUP_API_KEY=your_barcode_api_key_here

# Development Settings
VITE_DEV_MODE=true
VITE_MOCK_API=true
VITE_OFFLINE_MODE=true
`;
  
  fs.writeFileSync('.env.local', envContent);
  console.log('✅ Created .env.local configuration\n');
}

console.log('🎉 Setup completed successfully!');
console.log('\n🚀 Starting development server...');
console.log('📱 Your app will be available at: http://localhost:3000');
console.log('💡 The app works 100% offline - no server setup required!');
console.log('\n⚡ Features available offline:');
console.log('   ✅ Browse products');
console.log('   ✅ Add to cart');
console.log('   ✅ Manage favorites');
console.log('   ✅ User registration');
console.log('   ✅ Barcode scanning');
console.log('   ✅ All admin features');
console.log('\n🌐 Press Ctrl+C to stop the server\n');

// Start the development server
const devServer = spawn('npm', ['run', 'dev'], { 
  stdio: 'inherit',
  shell: true 
});

// Handle shutdown gracefully
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  devServer.kill();
  process.exit(0);
});

devServer.on('close', (code) => {
  console.log(`\n📋 Development server exited with code ${code}`);
  process.exit(code);
});